import { db } from "../../db/index.ts";
import { questionPapers, subjects, examTypes, semesters, branches, users } from "../../db/schema.ts";
import { eq, and, ne } from "drizzle-orm";
import { uploadFile, deleteFile } from "../../lib/storage.ts";
import { ApiError } from "../errors/ApiError.ts";
import crypto from "crypto";
import path from "path";
import { logger } from "../utils/logger.ts";

export interface CreatePaperDto {
  subjectId: number;
  examTypeId: number;
  year: number;
  session: string;
  notes?: string;
  uploadedById: number;
}

export const AdminService = {
  sanitizeFilename(name: string) {
    return name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
  },
  
  async addPaper(dto: CreatePaperDto, file: Express.Multer.File) {
    // Check for duplicates before inserting
    const duplicate = await db.select({ id: questionPapers.id }).from(questionPapers).where(
      and(
        eq(questionPapers.subjectId, dto.subjectId),
        eq(questionPapers.examTypeId, dto.examTypeId),
        eq(questionPapers.year, dto.year),
        eq(questionPapers.session, dto.session)
      )
    ).limit(1);
    
    if (duplicate.length > 0) {
      throw new ApiError(409, "DUPLICATE_PAPER", "Question paper already exists.");
    }
    
    const sanitized = this.sanitizeFilename(file.originalname);
    const fileName = `college/MMIT/subject/${dto.subjectId}/year/${dto.year}/${Date.now()}_${sanitized}`;
    const fileUrl = await uploadFile(file.buffer, fileName, file.mimetype);
    
    try {
      const result = await db.insert(questionPapers).values({
        ...dto,
        fileUrl,
        fileSize: file.size,
      }).returning();
      
      return result[0];
    } catch (error) {
      // Database insert failed, rollback the file upload
      try {
        await deleteFile(fileUrl);
        logger.info(`Successfully rolled back (deleted) orphaned file: ${fileUrl}`);
      } catch (cleanupError) {
        logger.error(`Failed to delete orphaned file ${fileUrl} after database insert failed: ${cleanupError}`);
      }
      throw error;
    }
  },
  
  async updatePaper(id: number, dto: Partial<CreatePaperDto>) {
    // Check for duplicates before updating
    const existing = await db.select().from(questionPapers).where(eq(questionPapers.id, id));
    
    if (!existing.length) {
      throw new ApiError(404, "NOT_FOUND", "Question paper not found.");
    }
    
    const paper = existing[0];
    const newSubjectId = dto.subjectId ?? paper.subjectId;
    const newExamTypeId = dto.examTypeId ?? paper.examTypeId;
    const newYear = dto.year ?? paper.year;
    const newSession = dto.session ?? paper.session;
    
    const duplicate = await db.select({ id: questionPapers.id }).from(questionPapers).where(
      and(
        eq(questionPapers.subjectId, newSubjectId),
        eq(questionPapers.examTypeId, newExamTypeId),
        eq(questionPapers.year, newYear),
        eq(questionPapers.session, newSession),
        ne(questionPapers.id, id)
      )
    ).limit(1);
    
    if (duplicate.length > 0) {
      throw new ApiError(409, "DUPLICATE_PAPER", "Question paper already exists.");
    }
    
    const result = await db.update(questionPapers).set(dto).where(eq(questionPapers.id, id)).returning();
    return result[0];
  },
  
  async updatePaperFile(id: number, file: Express.Multer.File) {
    const existing = await db.select().from(questionPapers).where(eq(questionPapers.id, id));
    
    if (!existing.length) {
      throw new ApiError(404, "NOT_FOUND", "Paper not found");
    }
    
    const { subjectId, year, fileUrl: oldFileUrl } = existing[0];
    const sanitized = this.sanitizeFilename(file.originalname);
    const fileName = `college/MMIT/subject/${subjectId}/year/${year}/${Date.now()}_${sanitized}`;
    const fileUrl = await uploadFile(file.buffer, fileName, file.mimetype);
    
    try {
      const result = await db.update(questionPapers)
        .set({ fileUrl, fileSize: file.size })
        .where(eq(questionPapers.id, id))
        .returning();
        
      // Success! Now we can delete the old file
      if (oldFileUrl) {
        try {
          await deleteFile(oldFileUrl);
        } catch (cleanupError) {
          logger.error(`Failed to delete old file ${oldFileUrl} after updating paper file: ${cleanupError}`);
        }
      }
      
      return result[0];
    } catch (error) {
      // Database update failed, rollback the new file upload
      try {
        await deleteFile(fileUrl);
        logger.info(`Successfully rolled back (deleted) orphaned file: ${fileUrl}`);
      } catch (cleanupError) {
        logger.error(`Failed to delete orphaned file ${fileUrl} after database update failed: ${cleanupError}`);
      }
      throw error;
    }
  },
  
  async softDeletePaper(id: number) {
    await db.update(questionPapers).set({ isDeleted: true }).where(eq(questionPapers.id, id));
  },
  
  async restorePaper(id: number) {
    await db.update(questionPapers).set({ isDeleted: false }).where(eq(questionPapers.id, id));
  },
  
  async hardDeletePaper(id: number) {
    const existing = await db.select().from(questionPapers).where(eq(questionPapers.id, id));
    
    if (!existing.length) {
      throw new ApiError(404, "NOT_FOUND", "Paper not found");
    }
    
    const paper = existing[0];
    
    // 1. Mark as pending deletion in the database first
    // This allows background jobs or retries to safely pick up failed deletions
    await db.update(questionPapers)
      .set({ pendingDeletion: true })
      .where(eq(questionPapers.id, id));
      
    // 2. Try to delete the file from storage
    if (paper.fileUrl) {
      try {
        await deleteFile(paper.fileUrl);
      } catch (cleanupError: any) {
        // If storage deletion fails, we log it and throw an error.
        // The record remains in the database with pendingDeletion = true, 
        // so it can be safely retried later by the admin or a background job.
        logger.error(`Failed to delete file ${paper.fileUrl} from storage during hard delete: ${cleanupError}`);
        throw new ApiError(500, "STORAGE_DELETE_FAILED", "Failed to delete file from storage. The paper is marked for deletion and can be retried.");
      }
    }
    
    // 3. Storage deletion succeeded (or no file existed), now permanently delete the database record
    try {
      await db.delete(questionPapers).where(eq(questionPapers.id, id));
    } catch (dbDeleteError) {
      // If DB deletion fails here, the file is already gone but the record is marked as pendingDeletion.
      // A retry will safely attempt to delete a non-existent file (idempotent) and then delete the DB record.
      logger.error(`Failed to hard delete database record ${id} after storage file was removed: ${dbDeleteError}`);
      throw new ApiError(500, "DB_DELETE_FAILED", "File was deleted, but database record removal failed. It can be safely retried.");
    }
  }
};
