import { db } from './src/db/index.ts';
import { users } from './src/db/schema.ts';

async function main() {
  const allUsers = await db.select().from(users);
  console.log(allUsers);
  process.exit(0);
}
main();
