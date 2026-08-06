import { db } from './src/db/index.ts';
import { downloads } from './src/db/schema.ts';
async function run() {
  try {
    const res = await db.select().from(downloads).limit(1);
    console.log(res);
  } catch (err) {
    console.error(err);
  }
  process.exit();
}
run();
