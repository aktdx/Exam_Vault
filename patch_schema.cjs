const fs = require('fs');
let code = fs.readFileSync('src/db/schema.ts', 'utf8');

if (!code.includes("import { relations, sql } from 'drizzle-orm';")) {
  code = code.replace("import { relations } from 'drizzle-orm';", "import { relations, sql } from 'drizzle-orm';");
}

if (!code.includes("unique, check")) {
  code = code.replace("import { integer, pgTable, serial, text, timestamp, boolean, index } from 'drizzle-orm/pg-core';", "import { integer, pgTable, serial, text, timestamp, boolean, index, unique, check } from 'drizzle-orm/pg-core';");
}

// Update Colleges
code = code.replace(
  "});\n\nexport const branches",
  `}, (table) => {
  return {
    codeUnique: unique('college_code_unique').on(table.code),
  };
});\n\nexport const branches`
);

// Update Branches
code = code.replace(
  "});\n\nexport const academicYears",
  `}, (table) => {
  return {
    branchCodeUnique: unique('branch_code_unique').on(table.collegeId, table.code),
  };
});\n\nexport const academicYears`
);

// Update AcademicYears
code = code.replace(
  "});\n\nexport const semesters",
  `}, (table) => {
  return {
    levelUnique: unique('academic_year_level_unique').on(table.level),
  };
});\n\nexport const semesters`
);

// Update Semesters
code = code.replace(
  "});\n\nexport const subjects",
  `}, (table) => {
  return {
    semesterNumberUnique: unique('semester_number_unique').on(table.branchId, table.number),
    numberCheck: check('semester_number_check', sql\`number > 0\`),
  };
});\n\nexport const subjects`
);

// Update Subjects
code = code.replace(
  "});\n\nexport const examTypes",
  `}, (table) => {
  return {
    subjectCodeUnique: unique('subject_code_unique').on(table.branchId, table.code),
  };
});\n\nexport const examTypes`
);

// Update ExamTypes
code = code.replace(
  "});\n\nexport const questionPapers",
  `}, (table) => {
  return {
    examTypeNameUnique: unique('exam_type_name_unique').on(table.name),
  };
});\n\nexport const questionPapers`
);

// Update QuestionPapers
const qpTarget = `}, (table) => {
  return {
    subjectIdx: index('subject_idx').on(table.subjectId),
    yearIdx: index('year_idx').on(table.year),
    sessionIdx: index('session_idx').on(table.session),
    isDeletedIdx: index('is_deleted_idx').on(table.isDeleted),
  };
});`;

const qpReplacement = `}, (table) => {
  return {
    subjectIdx: index('subject_idx').on(table.subjectId),
    yearIdx: index('year_idx').on(table.year),
    sessionIdx: index('session_idx').on(table.session),
    isDeletedIdx: index('is_deleted_idx').on(table.isDeleted),
    paperUnique: unique('question_paper_unique').on(table.subjectId, table.examTypeId, table.year, table.session),
    yearCheck: check('question_paper_year_check', sql\`year >= 2000 AND year <= \${new Date().getFullYear()}\`),
    fileSizeCheck: check('question_paper_file_size_check', sql\`file_size > 0\`),
  };
});`;

code = code.replace(qpTarget, qpReplacement);

fs.writeFileSync('src/db/schema.ts', code);
