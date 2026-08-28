import { db } from './src/db/index.ts';
import { users } from './src/db/schema.ts';
async function run() {
  try {
    const res = await db.insert(users)
      .values({
        uid: 'testuid123',
        email: 'test@example.com',
        isAdmin: true,
      })
      .onConflictDoUpdate({
        target: users.uid,
        set: { email: 'test@example.com', isAdmin: true }
      })
      .returning();
    console.log(res);
  } catch (e) {
    console.error(e);
  }
  process.exit();
}
run();
