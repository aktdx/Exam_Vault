import { relations } from 'drizzle-orm';
import { integer, pgTable, serial, text, timestamp, boolean } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(),
  email: text('email').notNull(),
  isAdmin: boolean('is_admin').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const colleges = pgTable('colleges', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  code: text('code').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const branches = pgTable('branches', {
  id: serial('id').primaryKey(),
  collegeId: integer('college_id').references(() => colleges.id, { onDelete: 'cascade' }).notNull(),
  name: text('name').notNull(),
  code: text('code').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const academicYears = pgTable('academic_years', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(), // e.g., 'First Year', 'Second Year'
  level: integer('level').notNull(), // 1, 2, 3, 4
  createdAt: timestamp('created_at').defaultNow(),
});

export const semesters = pgTable('semesters', {
  id: serial('id').primaryKey(),
  branchId: integer('branch_id').references(() => branches.id, { onDelete: 'cascade' }).notNull(),
  academicYearId: integer('academic_year_id').references(() => academicYears.id, { onDelete: 'cascade' }), // Made optional for now, or just leave it
  name: text('name').notNull(), // e.g., 'Semester 1', 'Semester 2'
  number: integer('number').notNull(), // 1, 2, 3, 4, 5, 6, 7, 8
  createdAt: timestamp('created_at').defaultNow(),
});

export const subjects = pgTable('subjects', {
  id: serial('id').primaryKey(),
  branchId: integer('branch_id').references(() => branches.id, { onDelete: 'cascade' }).notNull(),
  semesterId: integer('semester_id').references(() => semesters.id, { onDelete: 'cascade' }).notNull(),
  name: text('name').notNull(),
  code: text('code').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const examTypes = pgTable('exam_types', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(), // e.g., 'In-Semester', 'End-Semester', 'Unit Test'
  createdAt: timestamp('created_at').defaultNow(),
});

export const questionPapers = pgTable('question_papers', {
  id: serial('id').primaryKey(),
  subjectId: integer('subject_id').references(() => subjects.id, { onDelete: 'cascade' }).notNull(),
  examTypeId: integer('exam_type_id').references(() => examTypes.id, { onDelete: 'cascade' }).notNull(),
  year: integer('year').notNull(), // e.g., 2023
  session: text('session').notNull(), // e.g., 'Winter', 'Summer'
  fileUrl: text('file_url').notNull(),
  fileSize: integer('file_size'),
  isDeleted: boolean('is_deleted').default(false).notNull(),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
  uploadedById: integer('uploaded_by_id').references(() => users.id, { onDelete: 'set null' }),
});

export const downloads = pgTable('downloads', {
  id: serial('id').primaryKey(),
  questionPaperId: integer('question_paper_id').references(() => questionPapers.id, { onDelete: 'cascade' }).notNull(),
  downloadedAt: timestamp('downloaded_at').defaultNow(),
});

// Relations
export const branchRelations = relations(branches, ({ one, many }) => ({
  college: one(colleges, {
    fields: [branches.collegeId],
    references: [colleges.id],
  }),
  subjects: many(subjects),
}));

export const semesterRelations = relations(semesters, ({ one, many }) => ({
  branch: one(branches, {
    fields: [semesters.branchId],
    references: [branches.id],
  }),
  academicYear: one(academicYears, {
    fields: [semesters.academicYearId],
    references: [academicYears.id],
  }),
  subjects: many(subjects),
}));

export const subjectRelations = relations(subjects, ({ one, many }) => ({
  branch: one(branches, {
    fields: [subjects.branchId],
    references: [branches.id],
  }),
  semester: one(semesters, {
    fields: [subjects.semesterId],
    references: [semesters.id],
  }),
  questionPapers: many(questionPapers),
}));

export const questionPaperRelations = relations(questionPapers, ({ one, many }) => ({
  subject: one(subjects, {
    fields: [questionPapers.subjectId],
    references: [subjects.id],
  }),
  examType: one(examTypes, {
    fields: [questionPapers.examTypeId],
    references: [examTypes.id],
  }),
  uploadedBy: one(users, {
    fields: [questionPapers.uploadedById],
    references: [users.id],
  }),
  downloads: many(downloads),
}));
