import { db } from './src/db/index.ts';
import { questionPapers } from './src/db/schema.ts';

async function run() {
  const papers = await db.select().from(questionPapers).limit(1);
  console.log("Existing paper:", papers[0]?.id);
  process.exit();
}
run();
