import { db } from './src/db/index.ts';
import { questionPapers, subjects, examTypes, semesters, branches, colleges } from './src/db/schema.ts';

async function run() {
  try {
    const [college] = await db.insert(colleges).values({ name: 'Test College', code: 'TC' }).returning();
    const [branch] = await db.insert(branches).values({ name: 'CS', code: 'CS', collegeId: college.id }).returning();
    const [semester] = await db.insert(semesters).values({ name: 'Sem 1', number: 1 }).returning();
    const [subject] = await db.insert(subjects).values({ name: 'Math', code: 'M1', branchId: branch.id, semesterId: semester.id }).returning();
    const [examType] = await db.insert(examTypes).values({ name: 'Midterm' }).returning();
    
    const [paper] = await db.insert(questionPapers).values({
      subjectId: subject.id,
      examTypeId: examType.id,
      year: 2023,
      session: 'Winter',
      fileUrl: '/uploads/test.pdf',
      fileSize: 1024
    }).returning();
    
    console.log("Created paper with id:", paper.id);
  } catch (err) {
    console.error(err);
  }
  process.exit();
}
run();
