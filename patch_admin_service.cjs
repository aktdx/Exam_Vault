const fs = require('fs');
let code = fs.readFileSync('src/server/services/adminService.ts', 'utf8');

const target1 = `  async addPaper(dto: CreatePaperDto, file: Express.Multer.File) {
    // Check for duplicates
    const duplicate = await db.select().from(questionPapers).where(
      eq(questionPapers.subjectId, dto.subjectId)
    );
    const isDuplicate = duplicate.some(p => p.year === dto.year && p.session === dto.session && p.examTypeId === dto.examTypeId);
    if (isDuplicate) throw new Error("A paper for this subject, year, session, and exam type already exists");`;

const replacement1 = `  async addPaper(dto: CreatePaperDto, file: Express.Multer.File) {
    // Check for duplicates before inserting
    const duplicate = await db.select().from(questionPapers).where(
      eq(questionPapers.subjectId, dto.subjectId)
    );
    const isDuplicate = duplicate.some(p => p.year === dto.year && p.session === dto.session && p.examTypeId === dto.examTypeId);
    if (isDuplicate) {
      const err = new Error("Question paper already exists.");
      (err as any).status = 409;
      (err as any).errorCode = "DUPLICATE_PAPER";
      throw err;
    }`;

code = code.replace(target1, replacement1);

const target2 = `  async updatePaper(id: number, dto: Partial<CreatePaperDto>) {
    const result = await db.update(questionPapers).set(dto).where(eq(questionPapers.id, id)).returning();
    return result[0];
  },`;

const replacement2 = `  async updatePaper(id: number, dto: Partial<CreatePaperDto>) {
    // Check for duplicates before updating
    const existing = await db.select().from(questionPapers).where(eq(questionPapers.id, id));
    if (!existing.length) {
      const err = new Error("Question paper not found.");
      (err as any).status = 404;
      throw err;
    }
    
    const paper = existing[0];
    const newSubjectId = dto.subjectId ?? paper.subjectId;
    const newExamTypeId = dto.examTypeId ?? paper.examTypeId;
    const newYear = dto.year ?? paper.year;
    const newSession = dto.session ?? paper.session;
    
    const duplicate = await db.select().from(questionPapers).where(
      eq(questionPapers.subjectId, newSubjectId)
    );
    
    const isDuplicate = duplicate.some(p => 
      p.id !== id && 
      p.year === newYear && 
      p.session === newSession && 
      p.examTypeId === newExamTypeId
    );
    
    if (isDuplicate) {
      const err = new Error("Question paper already exists.");
      (err as any).status = 409;
      (err as any).errorCode = "DUPLICATE_PAPER";
      throw err;
    }
    
    const result = await db.update(questionPapers).set(dto).where(eq(questionPapers.id, id)).returning();
    return result[0];
  },`;

code = code.replace(target2, replacement2);

fs.writeFileSync('src/server/services/adminService.ts', code);
