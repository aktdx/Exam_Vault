import { db } from './src/db/index.ts';
import { users } from './src/db/schema.ts';
async function run() {
  const res = await db.select().from(users);
  console.log(res);
  process.exit();
}
run();
