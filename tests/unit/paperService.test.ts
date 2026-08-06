import { QuestionPaperService } from '../../src/server/services/questionPaperService.ts';
import { setupFullHierarchy } from '../helpers/fixtures.ts';
import { db } from '../../src/db/index.ts';
import { downloads } from '../../src/db/schema.ts';
import { jest } from '@jest/globals';

describe('QuestionPaperService Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getStats', () => {
    it('returns paper and download counts', async () => {
      const data = await setupFullHierarchy();
      
      const stats = await QuestionPaperService.getStats();
      expect(stats.totalPapers).toBeGreaterThanOrEqual(1);
      expect(stats.totalDownloads).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getPapersBySubject', () => {
    it('returns papers for a specific subject', async () => {
      const data = await setupFullHierarchy();
      
      const papers = await QuestionPaperService.getPapersBySubject(data.subject.id);
      expect(papers.length).toBeGreaterThan(0);
      expect(papers[0].id).toBe(data.paper.id);
      expect(papers[0].subject.id).toBe(data.subject.id);
      expect(papers[0].examType.id).toBe(data.examType.id);
    });
  });

  describe('searchPapers', () => {
    it('searches papers by subject name', async () => {
      const data = await setupFullHierarchy();
      
      const results = await QuestionPaperService.searchPapers('Data Structures', { limit: 10, page: 1 });
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].subject.name).toBe('Data Structures');
    });

    it('returns empty when no match', async () => {
      const data = await setupFullHierarchy();
      
      const results = await QuestionPaperService.searchPapers('NonExistentSubject', { limit: 10, page: 1 });
      expect(results.length).toBe(0);
    });
  });

  describe('getPaperById', () => {
    it('returns paper details by ID', async () => {
      const data = await setupFullHierarchy();
      
      const paper = await QuestionPaperService.getPaperById(data.paper.id);
      expect(paper).toBeDefined();
      expect(paper.id).toBe(data.paper.id);
      expect(paper.subject.id).toBe(data.subject.id);
    });
  });

  describe('logDownload', () => {
    it('logs a download for a paper', async () => {
      const data = await setupFullHierarchy();
      
      await QuestionPaperService.logDownload(data.paper.id);
      
      const downloadLogs = await db.select().from(downloads);
      expect(downloadLogs.length).toBe(1);
      expect(downloadLogs[0].questionPaperId).toBe(data.paper.id);
    });
  });
});
