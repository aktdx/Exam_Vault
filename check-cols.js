import { db } from './src/db/index.ts';
import { sql } from 'drizzle-orm';
async function run() {
  try {
    const res = await db.execute(sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'downloads'
    `);
    console.log(res.rows);
  } catch (err) {
    console.error(err);
  }
  process.exit();
}
run();
