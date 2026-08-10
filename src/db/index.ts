import { drizzle } from 'drizzle-orm/node-postgres';
import * as pgModule from 'pg';
import pg from 'pg';
import * as schema from './schema.ts';
import { getDatabaseConfig } from './config.ts';

const Pool = pg?.Pool || (pg as any)?.default?.Pool || pgModule?.Pool || (pgModule as any)?.default?.Pool;

// Reports which credential source won and what it resolved to, never the
// password. getDatabaseConfig() falls back from DATABASE_URL to SQL_* silently,
// so without this a misconfigured variable only shows up later as a query
// failure with no hint of where the credentials came from.
function logResolvedTarget(config: ReturnType<typeof getDatabaseConfig>) {
  if (config.connectionString) {
    try {
      const url = new URL(config.connectionString);
      console.log(`[db] source=DATABASE_URL user=${url.username} host=${url.hostname} db=${url.pathname.slice(1)} ssl=${config.ssl}`);
    } catch {
      console.log('[db] source=DATABASE_URL (value is not a parseable URL)');
    }
    return;
  }

  console.log(`[db] source=SQL_* (DATABASE_URL empty or unset) user=${config.user} host=${config.host} db=${config.database} ssl=${config.ssl}`);
}

export const createPool = () => {
  const config = getDatabaseConfig();
  logResolvedTarget(config);

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

export const createDb = (poolInstance = pool) => {
  return drizzle(poolInstance, { schema });
};

export const db = createDb();
