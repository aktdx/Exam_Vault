import { db } from './src/db/index.ts';
import { questionPapers, subjects, examTypes, semesters, branches, colleges, academicYears } from './src/db/schema.ts';

async function run() {
  try {
    const [college] = await db.insert(colleges).values({ name: 'Test College', code: 'TC2' }).returning();
    const [year] = await db.insert(academicYears).values({ name: '2023-2024', level: 1 }).returning();
    const [branch] = await db.insert(branches).values({ name: 'CS2', code: 'CS2', collegeId: college.id }).returning();
    const [semester] = await db.insert(semesters).values({ name: 'Sem 1', number: 1, branchId: branch.id, academicYearId: year.id }).returning();
    const [subject] = await db.insert(subjects).values({ name: 'Math2', code: 'M2', branchId: branch.id, semesterId: semester.id }).returning();
    const [examType] = await db.insert(examTypes).values({ name: 'Midterm2' }).returning();
    
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
