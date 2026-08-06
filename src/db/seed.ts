import { db } from './index.ts';
import { colleges, branches, academicYears, semesters, subjects, examTypes } from './schema.ts';

async function seed() {
  console.log('Seeding data...');
  
  // Seed colleges
  const c = await db.insert(colleges).values({ name: 'MMIT College', code: 'MMIT' }).returning();
  const collegeId = c[0].id;
  
  // Seed branches
  const b1 = await db.insert(branches).values({ collegeId, name: 'Computer Engineering', code: 'COMP' }).returning();
  const branchId = b1[0].id;
  
  // Seed academic years & semesters
  const ay1 = await db.insert(academicYears).values({ name: 'Second Year', level: 2 }).returning();
  const sem3 = await db.insert(semesters).values({ branchId, academicYearId: ay1[0].id, name: 'Semester 3', number: 3 }).returning();
  const sem4 = await db.insert(semesters).values({ branchId, academicYearId: ay1[0].id, name: 'Semester 4', number: 4 }).returning();
  
  // Seed subjects
  await db.insert(subjects).values([
    { branchId, semesterId: sem3[0].id, name: 'Data Structures and Algorithms', code: 'DSA-301' },
    { branchId, semesterId: sem3[0].id, name: 'Computer Networks', code: 'CN-302' },
    { branchId, semesterId: sem4[0].id, name: 'Operating Systems', code: 'OS-401' },
  ]);
  
  // Seed exam types
  await db.insert(examTypes).values([
    { name: 'In-Semester' },
    { name: 'End-Semester' },
    { name: 'Unit Test' },
  ]);
  
  console.log('Data seeded successfully!');
  process.exit(0);
}

seed().catch(console.error);
