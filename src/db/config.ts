export interface DatabaseConfig {
  connectionString?: string;
  host?: string;
  user?: string;
  password?: string;
  database?: string;
  ssl: boolean;
}

export function getDatabaseConfig(env: NodeJS.ProcessEnv = process.env): DatabaseConfig {
  const connectionString = env.DATABASE_URL?.trim();

  if (connectionString) {
    return {
      connectionString,
      ssl: env.NODE_ENV === 'production' || connectionString.includes('neon.tech') || connectionString.includes('sslmode=require'),
    };
  }

  return {
    host: env.SQL_HOST?.trim(),
    user: env.SQL_USER?.trim(),
    password: env.SQL_PASSWORD?.trim(),
    database: env.SQL_DB_NAME?.trim(),
    ssl: false,
  };
}
