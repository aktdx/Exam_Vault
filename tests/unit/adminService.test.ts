import { AdminService } from '../../src/server/services/adminService.ts';
import { setupFullHierarchy } from '../helpers/fixtures.ts';
import { db } from '../../src/db/index.ts';
import { questionPapers, examTypes } from '../../src/db/schema.ts';
import { eq } from 'drizzle-orm';
import { jest } from '@jest/globals';
import { ApiError } from '../../src/server/errors/ApiError.ts';
import { uploadFile, deleteFile } from '../../src/lib/storage.ts';

describe('AdminService Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('addPaper', () => {
    it('creates a question paper successfully', async () => {
      const data = await setupFullHierarchy();
      
      const file = {
        path: '/tmp/test.pdf',
        size: 1024,
        mimetype: 'application/pdf',
        originalname: 'test.pdf',
        buffer: Buffer.from('test')
      } as Express.Multer.File;

      const paperData = {
        subjectId: data.subject.id,
        examTypeId: data.examType.id,
        year: 2024,
        session: 'Summer',
        notes: 'Test notes',
        uploadedById: data.admin.id
      };

      const paper = await AdminService.addPaper(paperData, file);
      
      expect(paper).toBeDefined();
      expect(paper.subjectId).toBe(data.subject.id);
      expect(paper.year).toBe(2024);
      expect(paper.session).toBe('Summer');
      expect(paper.uploadedById).toBe(data.admin.id);
    });

    it('rolls back and deletes file on duplicate constraint error', async () => {
      const data = await setupFullHierarchy();
      
      const file = {
        path: '/tmp/test.pdf',
        size: 1024,
        mimetype: 'application/pdf',
        originalname: 'test.pdf',
        buffer: Buffer.from('test')
      } as Express.Multer.File;

      const paperData = {
        subjectId: data.subject.id,
        examTypeId: data.examType.id,
        year: 2023, // Duplicate year! setupFullHierarchy uses 2023
        session: 'Winter', // Duplicate session!
        uploadedById: data.admin.id
      };

      await expect(AdminService.addPaper(paperData, file)).rejects.toThrow(ApiError);
    });
  });

  describe('updatePaper', () => {
    it('updates paper details', async () => {
      const data = await setupFullHierarchy();
      const updated = await AdminService.updatePaper(data.paper.id, {
        notes: 'Updated notes'
      });
      expect(updated.notes).toBe('Updated notes');
    });

    it('throws 404 for non-existent paper', async () => {
      await expect(AdminService.updatePaper(9999, {})).rejects.toThrow(ApiError);
    });

    it('throws 409 on duplicate constraint', async () => {
      const data = await setupFullHierarchy();
      
      // Create another paper
      const examType2 = await db.insert(examTypes).values({ name: 'Test' }).returning();
      const paper2 = await db.insert(questionPapers).values({
        subjectId: data.subject.id,
        examTypeId: examType2[0].id,
        year: 2024,
        session: 'Summer',
        fileUrl: '/uploads/test2.pdf',
        fileSize: 1024,
        uploadedById: data.admin.id
      }).returning();
      
      // Try to update paper2 to match data.paper exactly
      await expect(AdminService.updatePaper(paper2[0].id, {
        examTypeId: data.examType.id,
        year: 2023,
        session: 'Winter'
      })).rejects.toThrow(ApiError);
    });
  });

  describe('updatePaperFile', () => {
    it('updates file and deletes old file', async () => {
      const data = await setupFullHierarchy();
      
      const newFile = {
        path: '/tmp/new.pdf',
        size: 2048,
        mimetype: 'application/pdf',
        originalname: 'new.pdf',
        buffer: Buffer.from('new test')
      } as Express.Multer.File;

      const updated = await AdminService.updatePaperFile(data.paper.id, newFile);
      
      expect(updated.fileSize).toBe(2048);
      expect(uploadFile).toHaveBeenCalled();
      expect(deleteFile).toHaveBeenCalled(); // Should have deleted old file
    });
    
    it('throws 404 for non-existent paper', async () => {
      const newFile = { originalname: 'new.pdf', buffer: Buffer.from('new test'), mimetype: 'application/pdf', size: 2048 } as Express.Multer.File;
      await expect(AdminService.updatePaperFile(9999, newFile)).rejects.toThrow(ApiError);
    });
  });

  describe('softDeletePaper', () => {
    it('marks paper for deletion', async () => {
      const data = await setupFullHierarchy();
      await AdminService.softDeletePaper(data.paper.id);
      
      const paper = await db.query.questionPapers.findFirst({
        where: eq(questionPapers.id, data.paper.id)
      });
      
      expect(paper?.isDeleted).toBe(true);
    });
  });

  describe('restorePaper', () => {
    it('restores soft deleted paper', async () => {
      const data = await setupFullHierarchy();
      await AdminService.softDeletePaper(data.paper.id);
      await AdminService.restorePaper(data.paper.id);
      
      const paper = await db.query.questionPapers.findFirst({
        where: eq(questionPapers.id, data.paper.id)
      });
      
      expect(paper?.isDeleted).toBe(false);
    });
  });

  describe('hardDeletePaper', () => {
    it('permanently deletes paper and storage file', async () => {
      const data = await setupFullHierarchy();
      await AdminService.hardDeletePaper(data.paper.id);
      
      const paper = await db.query.questionPapers.findFirst({
        where: eq(questionPapers.id, data.paper.id)
      });
      
      expect(paper).toBeUndefined();
      expect(deleteFile).toHaveBeenCalled();
    });

    it('fails when paper not found', async () => {
      await expect(AdminService.hardDeletePaper(99999)).rejects.toThrow(ApiError);
    });
  });
});
