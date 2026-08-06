const fs = require('fs');
let code = fs.readFileSync('src/server/services/adminService.ts', 'utf8');

if (!code.includes("import { logger } from '../utils/logger.ts';")) {
  code = code.replace(
    'import path from "path";',
    'import path from "path";\nimport { logger } from "../utils/logger.ts";'
  );
}

const addPaperTarget = `    const fileUrl = await uploadFile(file.buffer, fileName, file.mimetype);
    
    const result = await db.insert(questionPapers).values({
      ...dto,
      fileUrl,
      fileSize: file.size,
    }).returning();
    
    return result[0];
  },`;

const addPaperReplacement = `    const fileUrl = await uploadFile(file.buffer, fileName, file.mimetype);
    
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
        logger.info(\`Successfully rolled back (deleted) orphaned file: \${fileUrl}\`);
      } catch (cleanupError) {
        logger.error(\`Failed to delete orphaned file \${fileUrl} after database insert failed: \${cleanupError}\`);
      }
      throw error;
    }
  },`;

code = code.replace(addPaperTarget, addPaperReplacement);


const updatePaperFileTarget = `  async updatePaperFile(id: number, file: Express.Multer.File) {
    const existing = await db.select().from(questionPapers).where(eq(questionPapers.id, id));
    
    if (!existing.length) {
      throw new ApiError(404, "NOT_FOUND", "Paper not found");
    }
    
    const { subjectId, year } = existing[0];
    const sanitized = this.sanitizeFilename(file.originalname);
    const fileName = \`college/MMIT/subject/\${subjectId}/year/\${year}/\${Date.now()}_\${sanitized}\`;
    const fileUrl = await uploadFile(file.buffer, fileName, file.mimetype);
    
    const result = await db.update(questionPapers).set({ fileUrl, fileSize: file.size }).where(eq(questionPapers.id, id)).returning();
    return result[0];
  },`;

const updatePaperFileReplacement = `  async updatePaperFile(id: number, file: Express.Multer.File) {
    const existing = await db.select().from(questionPapers).where(eq(questionPapers.id, id));
    
    if (!existing.length) {
      throw new ApiError(404, "NOT_FOUND", "Paper not found");
    }
    
    const { subjectId, year, fileUrl: oldFileUrl } = existing[0];
    const sanitized = this.sanitizeFilename(file.originalname);
    const fileName = \`college/MMIT/subject/\${subjectId}/year/\${year}/\${Date.now()}_\${sanitized}\`;
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
          logger.error(\`Failed to delete old file \${oldFileUrl} after updating paper file: \${cleanupError}\`);
        }
      }
      
      return result[0];
    } catch (error) {
      // Database update failed, rollback the new file upload
      try {
        await deleteFile(fileUrl);
        logger.info(\`Successfully rolled back (deleted) orphaned file: \${fileUrl}\`);
      } catch (cleanupError) {
        logger.error(\`Failed to delete orphaned file \${fileUrl} after database update failed: \${cleanupError}\`);
      }
      throw error;
    }
  },`;

code = code.replace(updatePaperFileTarget, updatePaperFileReplacement);


const hardDeleteTarget = `  async hardDeletePaper(id: number) {
    const existing = await db.select().from(questionPapers).where(eq(questionPapers.id, id));
    
    if (existing.length > 0 && existing[0].fileUrl) {
      try { await deleteFile(existing[0].fileUrl); } catch (e) {}
    }
    
    await db.delete(questionPapers).where(eq(questionPapers.id, id));
  }`;

const hardDeleteReplacement = `  async hardDeletePaper(id: number) {
    const existing = await db.select().from(questionPapers).where(eq(questionPapers.id, id));
    
    if (!existing.length) return;
    
    // 1. Delete from database first to prevent broken references
    await db.delete(questionPapers).where(eq(questionPapers.id, id));
    
    // 2. Cleanup storage
    if (existing[0].fileUrl) {
      try {
        await deleteFile(existing[0].fileUrl);
      } catch (cleanupError) {
        logger.error(\`Failed to delete file \${existing[0].fileUrl} after hard deleting paper \${id}: \${cleanupError}\`);
      }
    }
  }`;

code = code.replace(hardDeleteTarget, hardDeleteReplacement);

fs.writeFileSync('src/server/services/adminService.ts', code);
