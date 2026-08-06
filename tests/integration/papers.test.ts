import request from 'supertest';
import { getApp } from '../helpers/app.ts';
import { setupFullHierarchy } from '../helpers/fixtures.ts';
import { db } from '../../src/db/index.ts';
import { downloads } from '../../src/db/schema.ts';
import { getFileUrl } from '../helpers/storage-mock.ts';
import { jest } from '@jest/globals';

describe('Public Paper Routes Integration', () => {
  let app: any;

  beforeAll(async () => {
    app = await getApp();
  });
  
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/v1/stats', () => {
    it('returns stats', async () => {
      await setupFullHierarchy();
      const res = await request(app).get('/api/v1/stats');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('totalPapers');
      expect(res.body).toHaveProperty('totalDownloads');
    });
  });

  describe('GET /api/v1/search', () => {
    it('returns empty array if no query', async () => {
      const res = await request(app).get('/api/v1/search');
      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    it('returns matched papers', async () => {
      const data = await setupFullHierarchy();
      const res = await request(app).get('/api/v1/search?q=Data');
      expect(res.status).toBe(200);
      expect(res.body.length).toBeGreaterThan(0);
      expect(res.body[0].subject.name).toBe('Data Structures');
    });
  });

  describe('GET /api/v1/subjects/:id/question-papers', () => {
    it('returns papers for subject', async () => {
      const data = await setupFullHierarchy();
      const res = await request(app).get(`/api/v1/subjects/${data.subject.id}/question-papers`);
      expect(res.status).toBe(200);
      expect(res.body.length).toBeGreaterThan(0);
      expect(res.body[0].id).toBe(data.paper.id);
    });

    it('validates subjectId param', async () => {
      const res = await request(app).get(`/api/v1/subjects/invalid/question-papers`);
      expect(res.status).toBe(400); // Because of param validation
    });
  });

  describe('GET /api/v1/question-papers/:id/download', () => {
    it('logs download and returns json with file URL', async () => {
      const data = await setupFullHierarchy();
      const res = await request(app).get(`/api/v1/question-papers/${data.paper.id}/download`);
      
      expect(res.status).toBe(200);
      expect(res.body.url).toContain('mock/uploads');
      
      const downloadLogs = await db.select().from(downloads);
      expect(downloadLogs.length).toBe(1);
    });

    it('returns 404 for non-existent paper', async () => {
      const res = await request(app).get(`/api/v1/question-papers/9999/download`);
      expect(res.status).toBe(404);
    });
  });
});
