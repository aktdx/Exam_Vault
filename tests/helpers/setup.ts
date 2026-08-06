import { db, pool } from '../../src/db/index.ts';
import { sql } from 'drizzle-orm';
import { jest } from '@jest/globals';

const hasDatabase = Boolean(process.env.DATABASE_URL || process.env.SQL_HOST);

// Silence logger during tests
jest.mock('../../src/server/utils/logger.ts', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  }
}));

afterAll(async () => {
  if (hasDatabase) {
    await pool.end();
  }
});

afterEach(async () => {
  if (!hasDatabase) return;

  // Clean up database tables
  await db.execute(sql`
    DELETE FROM downloads;
    DELETE FROM question_papers;
    DELETE FROM subjects;
    DELETE FROM semesters;
    DELETE FROM academic_years;
    DELETE FROM branches;
    DELETE FROM exam_types;
    DELETE FROM colleges;
    DELETE FROM users;
  `);
});
