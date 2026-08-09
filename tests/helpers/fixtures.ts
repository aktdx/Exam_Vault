import { db } from '../../src/db/index.ts';
import { users, colleges, branches, academicYears, semesters, subjects, examTypes, questionPapers } from '../../src/db/schema.ts';
import { mockDb } from './db-mock.ts';

const hasDatabase = Boolean(process.env.DATABASE_URL || process.env.SQL_HOST);
const activeDb = hasDatabase ? db : (mockDb as unknown as typeof db);

export async function createUser(overrides: Partial<typeof users.$inferInsert> = {}) {
  const result = await activeDb.insert(users).values({
    uid: `test-uid-${Date.now()}-${Math.random()}`,
    email: `test-${Date.now()}@example.com`,
    isAdmin: false,
    ...overrides
  }).returning();
  return result[0];
}

export async function createCollege(overrides: Partial<typeof colleges.$inferInsert> = {}) {
  const result = await activeDb.insert(colleges).values({
    name: 'Test College',
    code: `TC-${Date.now()}-${Math.random()}`,
    ...overrides
  }).returning();
  return result[0];
}

export async function createBranch(collegeId: number, overrides: Partial<typeof branches.$inferInsert> = {}) {
  const result = await activeDb.insert(branches).values({
    collegeId,
    name: 'Computer Engineering',
    code: `CE-${Date.now()}-${Math.random()}`,
    ...overrides
  }).returning();
  return result[0];
}

export async function createAcademicYear(overrides: Partial<typeof academicYears.$inferInsert> = {}) {
  const result = await activeDb.insert(academicYears).values({
    name: 'First Year',
    level: Math.floor(Math.random() * 1000) + 1, // random level
    ...overrides
  }).returning();
  return result[0];
}

export async function createSemester(branchId: number, overrides: Partial<typeof semesters.$inferInsert> = {}) {
  const result = await activeDb.insert(semesters).values({
    branchId,
    name: 'Semester 1',
    number: Math.floor(Math.random() * 100) + 1, // random number to avoid conflict
    ...overrides
  }).returning();
  return result[0];
}

export async function createSubject(branchId: number, semesterId: number, overrides: Partial<typeof subjects.$inferInsert> = {}) {
  const result = await activeDb.insert(subjects).values({
    branchId,
    semesterId,
    name: 'Data Structures',
    code: `DS-${Date.now()}-${Math.random()}`,
    ...overrides
  }).returning();
  return result[0];
}

export async function createExamType(overrides: Partial<typeof examTypes.$inferInsert> = {}) {
  const result = await activeDb.insert(examTypes).values({
    name: `In-Semester-${Date.now()}-${Math.random()}`,
    ...overrides
  }).returning();
  return result[0];
}

export async function createQuestionPaper(
  subjectId: number, 
  examTypeId: number, 
  overrides: Partial<typeof questionPapers.$inferInsert> = {}
) {
  const result = await activeDb.insert(questionPapers).values({
    subjectId,
    examTypeId,
    year: 2023,
    session: 'Winter',
    fileUrl: '/uploads/test.pdf',
    fileSize: 1024,
    ...overrides
  }).returning();
  return result[0];
}

export async function setupFullHierarchy() {
  const admin = await createUser({ isAdmin: true });
  const college = await createCollege();
  const branch = await createBranch(college.id);
  const acYear = await createAcademicYear();
  const semester = await createSemester(branch.id, { academicYearId: acYear.id });
  const subject = await createSubject(branch.id, semester.id);
  const examType = await createExamType();
  const paper = await createQuestionPaper(subject.id, examType.id, { uploadedById: admin.id });
  
  return { admin, college, branch, acYear, semester, subject, examType, paper };
}
