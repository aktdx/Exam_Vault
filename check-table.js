import { db } from './src/db/index.ts';
import { sql } from 'drizzle-orm';
async function run() {
  try {
    const res = await db.execute(sql`SELECT tablename FROM pg_tables WHERE schemaname = 'public'`);
    console.log(res.rows);
  } catch (err) {
    console.error(err);
  }
  process.exit();
}
run();
