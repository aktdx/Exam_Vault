const fs = require('fs');
let code = fs.readFileSync('src/server/services/questionPaperService.ts', 'utf8');

const searchTarget = `
    const baseQuery = db.select({
      id: questionPapers.id,
      year: questionPapers.year,
      session: questionPapers.session,
      fileUrl: questionPapers.fileUrl,
      fileSize: questionPapers.fileSize,
      notes: questionPapers.notes,
      subject: { id: subjects.id, name: subjects.name, code: subjects.code },
      examType: { id: examTypes.id, name: examTypes.name },
      semester: { id: semesters.id, name: semesters.name },
      branch: { id: branches.id, name: branches.name, code: branches.code }
    })
    .from(questionPapers)
    .innerJoin(subjects, eq(questionPapers.subjectId, subjects.id))
    .innerJoin(examTypes, eq(questionPapers.examTypeId, examTypes.id))
    .innerJoin(semesters, eq(subjects.semesterId, semesters.id))
    .innerJoin(branches, eq(subjects.branchId, branches.id))
`;

const searchReplacement = `
    const baseQuery = db.select({
      id: questionPapers.id,
      year: questionPapers.year,
      session: questionPapers.session,
      fileUrl: questionPapers.fileUrl,
      fileSize: questionPapers.fileSize,
      notes: questionPapers.notes,
      subject: { id: subjects.id, name: subjects.name, code: subjects.code },
      examType: { id: examTypes.id, name: examTypes.name },
      semester: { id: semesters.id, name: semesters.name },
      branch: { id: branches.id, name: branches.name, code: branches.code },
      downloadsCount: sql<number>\`CAST(COUNT(\${downloads.id}) AS INTEGER)\`
    })
    .from(questionPapers)
    .innerJoin(subjects, eq(questionPapers.subjectId, subjects.id))
    .innerJoin(examTypes, eq(questionPapers.examTypeId, examTypes.id))
    .innerJoin(semesters, eq(subjects.semesterId, semesters.id))
    .innerJoin(branches, eq(subjects.branchId, branches.id))
    .leftJoin(downloads, eq(questionPapers.id, downloads.questionPaperId))
`;

code = code.replace(searchTarget.trim(), searchReplacement.trim());
code = code.replace('.limit(limit).offset(offset);', '.groupBy(questionPapers.id, subjects.id, examTypes.id, semesters.id, branches.id).limit(limit).offset(offset);');

fs.writeFileSync('src/server/services/questionPaperService.ts', code);
