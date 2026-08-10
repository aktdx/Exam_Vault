import { drizzle } from 'drizzle-orm/node-postgres';
import * as pgModule from 'pg';
import pg from 'pg';
import * as schema from './schema.ts';
import { getDatabaseConfig } from './config.ts';

const Pool = pg?.Pool || (pg as any)?.default?.Pool || pgModule?.Pool || (pgModule as any)?.default?.Pool;

export const createPool = () => {
  const config = getDatabaseConfig();

  if (config.connectionString) {
    return new Pool({
      connectionString: config.connectionString,
      ssl: config.ssl ? { rejectUnauthorized: false } : false,
      connectionTimeoutMillis: 15000,
    });
  }

  return new Pool({
    host: config.host,
    user: config.user,
    password: config.password,
    database: config.database,
    ssl: config.ssl ? { rejectUnauthorized: false } : false,
    connectionTimeoutMillis: 15000,
  });
};

export const pool = createPool();

pool.on('error', (err) => {
  console.error('Unexpected error on idle SQL pool client:', err);
});

export const db = drizzle(pool, { schema });
