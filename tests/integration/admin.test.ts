import request from 'supertest';
import { getApp } from '../helpers/app.ts';
import { db } from '../../src/db/index.ts';
import { users } from '../../src/db/schema.ts';
import { 
  mockVerifyIdToken,
  mockGetUserByEmail
} from '../helpers/firebase-admin-mock.ts';
import { jest } from '@jest/globals';

describe('Admin Routes Integration', () => {
  let app: any;

  beforeAll(async () => {
    app = await getApp();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/v1/admin/users', () => {
    it('returns 401 when missing token', async () => {
      const res = await request(app).get('/api/v1/admin/users');
      expect(res.status).toBe(401);
    });

    it('returns 401 when token is invalid', async () => {
      mockVerifyIdToken.mockRejectedValueOnce(new Error('Invalid token'));
      const res = await request(app)
        .get('/api/v1/admin/users')
        .set('Authorization', 'Bearer invalid-token');
      expect(res.status).toBe(401);
    });

    it('returns 403 when authenticated but not superadmin', async () => {
      mockVerifyIdToken.mockResolvedValueOnce({
        uid: 'user123',
        email: 'normal@example.com',
      });
      
      const res = await request(app)
        .get('/api/v1/admin/users')
        .set('Authorization', 'Bearer valid-token');
        
      expect(res.status).toBe(403);
    });

    it('returns 200 and users when authenticated as superadmin', async () => {
      mockVerifyIdToken.mockResolvedValueOnce({
        uid: 'admin123',
        email: 'aaminkhansohel@gmail.com',
      });
      
      const res = await request(app)
        .get('/api/v1/admin/users')
        .set('Authorization', 'Bearer valid-admin-token');
        
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('POST /api/v1/admin/users/add-admin', () => {
    it('adds an admin via email if super admin', async () => {
      mockVerifyIdToken.mockResolvedValueOnce({
        uid: 'admin123',
        email: 'aaminkhansohel@gmail.com',
      });
      mockGetUserByEmail.mockResolvedValueOnce({
        uid: 'new-admin-uid',
        email: 'newadmin@example.com',
      });
      
      const res = await request(app)
        .post('/api/v1/admin/users/add-admin')
        .set('Authorization', 'Bearer valid-admin-token')
        .send({ email: 'newadmin@example.com' });
        
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.user.email).toBe('newadmin@example.com');
      expect(res.body.user.isAdmin).toBe(true);
    });
  });
});
