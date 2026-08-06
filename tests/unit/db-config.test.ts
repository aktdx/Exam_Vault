import { describe, expect, it } from '@jest/globals';
import { getDatabaseConfig } from '../../src/db/config.ts';

describe('getDatabaseConfig', () => {
  it('uses the connection string for Neon-style deployments', () => {
    const config = getDatabaseConfig({
      DATABASE_URL: 'postgres://user:pass@ep-example.us-east-2.aws.neon.tech/neondb?sslmode=require',
      NODE_ENV: 'production',
    });

    expect(config.connectionString).toBe('postgres://user:pass@ep-example.us-east-2.aws.neon.tech/neondb?sslmode=require');
    expect(config.ssl).toBe(true);
  });

  it('falls back to SQL_* values for local development', () => {
    const config = getDatabaseConfig({
      SQL_HOST: 'localhost',
      SQL_USER: 'examvault',
      SQL_PASSWORD: 'examvault_pass',
      SQL_DB_NAME: 'examvault_db',
      NODE_ENV: 'development',
    });

    expect(config.host).toBe('localhost');
    expect(config.user).toBe('examvault');
    expect(config.database).toBe('examvault_db');
    expect(config.ssl).toBe(false);
  });
});
