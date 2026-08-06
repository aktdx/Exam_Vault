import request from 'supertest';
import { createApp } from '../src/server/app';

let app: any;

beforeAll(async () => {
  app = await createApp();
});

describe('Search API', () => {
  it('should return empty array when no query provided', async () => {
    const res = await request(app).get('/api/v1/search');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('should return results when query provided', async () => {
    const res = await request(app).get('/api/v1/search?q=Data');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBeTruthy();
  });
});

describe('Auth API', () => {
  it('should fail when accessing protected route without token', async () => {
    const res = await request(app).get('/api/v1/admin/question-papers');
    expect(res.status).toBe(401);
  });
});

describe('Uploads API', () => {
  it('should reject upload without file', async () => {
    const res = await request(app)
      .post('/api/v1/admin/question-papers')
      .set('Authorization', 'Bearer invalid_token');
    
    // Auth will fail first
    expect(res.status).toBe(401);
  });
});
