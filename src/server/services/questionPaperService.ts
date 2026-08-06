import { db } from "../../db/index.ts";
import { questionPapers, subjects, examTypes, semesters, branches, downloads } from "../../db/schema.ts";
import { eq, and, ilike, or, sql, desc } from "drizzle-orm";
import { uploadFile, getFileUrl, deleteFile } from "../../lib/storage.ts";
import fs from "fs";
import crypto from "crypto";

export interface PaginationParams {
  page?: number;
  limit?: number;
  search?: string;
}

export const QuestionPaperService = {
  async getStats() {
    const papers = await db.select().from(questionPapers).where(eq(questionPapers.isDeleted, false));
    const allDownloads = await db.select({ count: sql<number>`CAST(COUNT(*) AS INTEGER)` }).from(downloads);
    return { 
      totalPapers: papers.length,
      totalDownloads: allDownloads[0]?.count || 0
    };
  },

  async getPapersBySubject(subjectId: number) {
    return await db.select({
      id: questionPapers.id,
      year: questionPapers.year,
      session: questionPapers.session,
      fileUrl: questionPapers.fileUrl,
      fileSize: questionPapers.fileSize,
      notes: questionPapers.notes,
      subject: { id: subjects.id, name: subjects.name, code: subjects.code },
      examType: { id: examTypes.id, name: examTypes.name },
      semester: { id: semesters.id, name: semesters.name },
      branch: { id: branches.id, name: branches.name, code: branches.code },
      downloadsCount: sql<number>`CAST(COUNT(${downloads.id}) AS INTEGER)`
    })
    .from(questionPapers)
    .innerJoin(subjects, eq(questionPapers.subjectId, subjects.id))
    .innerJoin(examTypes, eq(questionPapers.examTypeId, examTypes.id))
    .innerJoin(semesters, eq(subjects.semesterId, semesters.id))
    .innerJoin(branches, eq(subjects.branchId, branches.id))
    .leftJoin(downloads, eq(questionPapers.id, downloads.questionPaperId))
    .where(and(eq(questionPapers.subjectId, subjectId), eq(questionPapers.isDeleted, false)))
    .groupBy(questionPapers.id, subjects.id, examTypes.id, semesters.id, branches.id);
  },

  async searchPapers(q: string, params: PaginationParams) {
    const page = params.page || 1;
    const limit = params.limit || 20;
    const offset = (page - 1) * limit;

    const baseQuery = db.select({
      id: questionPapers.id,
      year: questionPapers.year,
      session: questionPapers.session,
      fileUrl: questionPapers.fileUrl,
      fileSize: questionPapers.fileSize,
      notes: questionPapers.notes,
      subject: { id: subjects.id, name: subjects.name, code: subjects.code },
      examType: { id: examTypes.id, name: examTypes.name },
      semester: { id: semesters.id, name: semesters.name },
      branch: { id: branches.id, name: branches.name, code: branches.code },
      downloadsCount: sql<number>`CAST(COUNT(${downloads.id}) AS INTEGER)`
    })
    .from(questionPapers)
    .innerJoin(subjects, eq(questionPapers.subjectId, subjects.id))
    .innerJoin(examTypes, eq(questionPapers.examTypeId, examTypes.id))
    .innerJoin(semesters, eq(subjects.semesterId, semesters.id))
    .innerJoin(branches, eq(subjects.branchId, branches.id))
    .leftJoin(downloads, eq(questionPapers.id, downloads.questionPaperId))
    .where(
      and(
        eq(questionPapers.isDeleted, false),
        or(
          ilike(subjects.name, `%${q}%`), 
          ilike(subjects.code, `%${q}%`),
          ilike(branches.name, `%${q}%`),
          ilike(branches.code, `%${q}%`),
          ilike(semesters.name, `%${q}%`),
          ilike(examTypes.name, `%${q}%`),
          sql`CAST(${questionPapers.year} AS TEXT) ILIKE ${`%${q}%`}`
        )
      )
    )
    .groupBy(questionPapers.id, subjects.id, examTypes.id, semesters.id, branches.id).limit(limit).offset(offset);
    
    return await baseQuery;
  },

  async getPaperById(id: number) {
    const data = await db.select({
      id: questionPapers.id,
      year: questionPapers.year,
      session: questionPapers.session,
      fileUrl: questionPapers.fileUrl,
      fileSize: questionPapers.fileSize,
      notes: questionPapers.notes,
      createdAt: questionPapers.createdAt,
      subject: { id: subjects.id, name: subjects.name, code: subjects.code },
      examType: { id: examTypes.id, name: examTypes.name },
      semester: { id: semesters.id, name: semesters.name, number: semesters.number },
      branch: { id: branches.id, name: branches.name, code: branches.code },
      downloadsCount: sql<number>`CAST(COUNT(${downloads.id}) AS INTEGER)`
    })
    .from(questionPapers)
    .innerJoin(subjects, eq(questionPapers.subjectId, subjects.id))
    .innerJoin(examTypes, eq(questionPapers.examTypeId, examTypes.id))
    .innerJoin(semesters, eq(subjects.semesterId, semesters.id))
    .innerJoin(branches, eq(subjects.branchId, branches.id))
    .leftJoin(downloads, eq(questionPapers.id, downloads.questionPaperId))
    .where(eq(questionPapers.id, id))
    .groupBy(
      questionPapers.id,
      subjects.id,
      examTypes.id,
      semesters.id,
      branches.id
    );
    
    return data[0];
  },

  async logDownload(paperId: number) {
    await db.insert(downloads).values({ questionPaperId: paperId });
  }
};
