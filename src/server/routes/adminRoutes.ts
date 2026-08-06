import { validate } from '../middlewares/validate.ts';
import { createPaperSchema, updatePaperSchema } from '../validations/paper.validation.ts';
import { addAdminSchema, toggleAdminSchema, idParamSchema, createBranchSchema, createAcademicYearSchema, createSemesterSchema, createSubjectSchema, createExamTypeSchema } from '../validations/admin.validation.ts';
import { Router } from "express";
import { db } from "../../db/index.ts";
import { branches, academicYears, semesters, subjects, examTypes, questionPapers, users, downloads } from "../../db/schema.ts";
import { eq, sql } from "drizzle-orm";
import { requireAuth, requireAdmin, AuthRequest } from "../../middleware/auth.ts";
import { upload, validatePdfHeader } from "../middlewares/upload.ts";
import { AdminService } from "../services/adminService.ts";
import { adminAuth } from "../../lib/firebase-admin.ts";

const router = Router();

router.use(requireAuth);

/**
 * @openapi
 * /users:
 *   get:
 *     summary: Get all users (Super Admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of users
 *       403:
 *         description: Forbidden
 */
router.get("/users", requireAdmin, async (req: AuthRequest, res, next) => {
  if (req.dbUser.email !== 'aaminkhansohel@gmail.com') return res.status(403).json({ error: 'Forbidden' });
  try { res.json(await db.select().from(users)); } catch (e) { next(e); }
});

/**
 * @openapi
 * /users/{uid}/toggle-admin:
 *   put:
 *     summary: Toggle admin status for a user (Super Admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: uid
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               isAdmin:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Success
 */
router.put("/users/:uid/toggle-admin", requireAdmin, validate(toggleAdminSchema), async (req: AuthRequest, res, next) => {
  if (req.dbUser.email !== 'aaminkhansohel@gmail.com') return res.status(403).json({ error: 'Forbidden' });
  try {
    const target = await db.select().from(users).where(eq(users.uid, req.params.uid));
    if (!target.length) return res.status(404).json({ error: 'Not found' });
    if (target[0].email === 'aaminkhansohel@gmail.com') return res.status(400).json({ error: 'Cannot modify super admin' });
    await db.update(users).set({ isAdmin: req.body.isAdmin }).where(eq(users.uid, req.params.uid));
    res.json({ success: true });
  } catch (e) { next(e); }
});

/**
 * @openapi
 * /users/add-admin:
 *   post:
 *     summary: Add an admin by email (Super Admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *     responses:
 *       200:
 *         description: Success
 */
router.post("/users/add-admin", requireAdmin, validate(addAdminSchema), async (req: AuthRequest, res, next) => {
  if (req.dbUser.email !== 'aaminkhansohel@gmail.com') return res.status(403).json({ error: 'Forbidden' });
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email required' });
    const existingDbUser = await db.select().from(users).where(eq(users.email, email.toLowerCase()));
    if (existingDbUser.length > 0) {
      await db.update(users).set({ isAdmin: true }).where(eq(users.uid, existingDbUser[0].uid));
      return res.json({ success: true, user: existingDbUser[0] });
    }
    try {
      const firebaseUser = await adminAuth.getUserByEmail(email.toLowerCase());
      const newUser = await db.insert(users).values({
        uid: firebaseUser.uid,
        email: firebaseUser.email || email.toLowerCase(),
        isAdmin: true
      }).returning();
      return res.json({ success: true, user: newUser[0] });
    } catch (fbError: any) {
      if (fbError.code === 'auth/user-not-found') return res.status(404).json({ error: 'User has never logged in' });
      throw fbError;
    }
  } catch (e) { next(e); }
});

const createCrud = (path: string, table: any, createSchema?: any) => {
  /**
   * @openapi
   * /{path}:
   *   get:
   *     summary: Get all items
   *     tags: [Admin]
   *     security:
   *       - bearerAuth: []
   *   post:
   *     summary: Create an item
   *     tags: [Admin]
   *     security:
   *       - bearerAuth: []
   * /{path}/{id}:
   *   delete:
   *     summary: Delete an item
   *     tags: [Admin]
   *     security:
   *       - bearerAuth: []
   */
  router.get(`/${path}`, requireAdmin, async (req, res, next) => {
    try { res.json(await db.select().from(table)); } catch (e) { next(e); }
  });
  const postMiddleware = createSchema ? [requireAdmin, validate(createSchema)] : [requireAdmin];
  router.post(`/${path}`, ...postMiddleware, async (req: AuthRequest, res: any, next: any) => {
    try { res.json((await db.insert(table).values(req.body).returning())[0]); } catch (e) { next(e); }
  });
  router.delete(`/${path}/:id`, requireAdmin, validate(idParamSchema), async (req: AuthRequest, res: any, next: any) => {
    try { await db.delete(table).where(eq(table.id, Number(req.params.id))); res.json({ success: true }); } catch (e) { next(e); }
  });
};

createCrud("branches", branches, createBranchSchema);
createCrud("academic-years", academicYears, createAcademicYearSchema);
createCrud("semesters", semesters, createSemesterSchema);
createCrud("subjects", subjects, createSubjectSchema);
createCrud("exam-types", examTypes, createExamTypeSchema);

/**
 * @openapi
 * /question-papers:
 *   get:
 *     summary: Get all question papers (not deleted)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of question papers
 *   post:
 *     summary: Upload a new question paper
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *               subjectId:
 *                 type: integer
 *               examTypeId:
 *                 type: integer
 *               year:
 *                 type: integer
 *               session:
 *                 type: string
 *     responses:
 *       200:
 *         description: Success
 */
router.get("/question-papers", requireAdmin, async (req, res, next) => {
  try {
    const papers = await db.select({
      id: questionPapers.id, year: questionPapers.year, session: questionPapers.session,
      subject: { name: subjects.name, code: subjects.code },
      examType: { name: examTypes.name }, semester: { name: semesters.name }, branch: { name: branches.name },
      downloadsCount: sql<number>`CAST(COUNT(${downloads.id}) AS INTEGER)`
    })
    .from(questionPapers)
    .innerJoin(subjects, eq(questionPapers.subjectId, subjects.id))
    .innerJoin(examTypes, eq(questionPapers.examTypeId, examTypes.id))
    .innerJoin(semesters, eq(subjects.semesterId, semesters.id))
    .innerJoin(branches, eq(subjects.branchId, branches.id))
    .leftJoin(downloads, eq(questionPapers.id, downloads.questionPaperId))
    .where(eq(questionPapers.isDeleted, false))
    .groupBy(questionPapers.id, subjects.name, subjects.code, examTypes.name, semesters.name, branches.name)
    .orderBy(questionPapers.id);
    res.json(papers);
  } catch (e) { next(e); }
});

router.post("/question-papers", requireAdmin, upload.single('file'), validatePdfHeader, validate(createPaperSchema), async (req: AuthRequest, res, next) => {
  try {
    const result = await AdminService.addPaper({
      subjectId: req.body.subjectId,
      examTypeId: req.body.examTypeId,
      year: req.body.year,
      session: req.body.session,
      notes: req.body.notes,
      uploadedById: req.dbUser.id
    }, req.file!);
    res.json({ success: true, message: 'Operation successful', data: result });
  } catch (e) { next(e); }
});

/**
 * @openapi
 * /question-papers/{id}:
 *   put:
 *     summary: Update question paper details
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Success
 *   delete:
 *     summary: Soft delete a question paper
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Success
 */
router.put("/question-papers/:id", requireAdmin, validate(updatePaperSchema), async (req: AuthRequest, res, next) => {
  try {
    const result = await AdminService.updatePaper(Number(req.params.id), {
      subjectId: req.body.subjectId,
      examTypeId: req.body.examTypeId,
      year: req.body.year,
      session: req.body.session,
      notes: req.body.notes
    });
    res.json({ success: true, message: 'Operation successful', data: result });
  } catch (e) { next(e); }
});

/**
 * @openapi
 * /question-papers/{id}/file:
 *   put:
 *     summary: Update question paper file
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Success
 */
router.put("/question-papers/:id/file", requireAdmin, upload.single('file'), validatePdfHeader, validate(idParamSchema), async (req: AuthRequest, res, next) => {
  try {
    const result = await AdminService.updatePaperFile(Number(req.params.id), req.file!);
    res.json({ success: true, message: 'Operation successful', data: result });
  } catch (e) { next(e); }
});

router.delete("/question-papers/:id", requireAdmin, validate(idParamSchema), async (req: AuthRequest, res, next) => {
  try { await AdminService.softDeletePaper(Number(req.params.id)); res.json({ success: true }); } catch (e) { next(e); }
});

/**
 * @openapi
 * /question-papers/trash:
 *   get:
 *     summary: Get soft deleted question papers
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of soft deleted papers
 */
router.get("/question-papers/trash", requireAdmin, async (req, res, next) => {
  // Similar to question papers but where isDeleted = true
  try {
    const papers = await db.select({
      id: questionPapers.id, year: questionPapers.year, session: questionPapers.session, fileUrl: questionPapers.fileUrl, fileSize: questionPapers.fileSize,
      subject: { name: subjects.name, code: subjects.code },
      examType: { name: examTypes.name }, branch: { name: branches.name },
      downloadsCount: sql<number>`CAST(COUNT(${downloads.id}) AS INTEGER)`
    })
    .from(questionPapers)
    .innerJoin(subjects, eq(questionPapers.subjectId, subjects.id))
    .innerJoin(examTypes, eq(questionPapers.examTypeId, examTypes.id))
    .innerJoin(semesters, eq(subjects.semesterId, semesters.id))
    .innerJoin(branches, eq(subjects.branchId, branches.id))
    .leftJoin(downloads, eq(questionPapers.id, downloads.questionPaperId))
    .where(eq(questionPapers.isDeleted, true))
    .groupBy(questionPapers.id, questionPapers.year, questionPapers.session, questionPapers.fileUrl, questionPapers.fileSize, subjects.name, subjects.code, examTypes.name, branches.name)
    .orderBy(questionPapers.id);
    res.json(papers);
  } catch (e) { next(e); }
});

/**
 * @openapi
 * /question-papers/{id}/restore:
 *   put:
 *     summary: Restore a soft deleted question paper
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Success
 */
router.put("/question-papers/:id/restore", requireAdmin, validate(idParamSchema), async (req: AuthRequest, res, next) => {
  try { await AdminService.restorePaper(Number(req.params.id)); res.json({ success: true }); } catch (e) { next(e); }
});

/**
 * @openapi
 * /question-papers/{id}/hard:
 *   delete:
 *     summary: Permanently delete a question paper
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Success
 */
router.delete("/question-papers/:id/hard", requireAdmin, validate(idParamSchema), async (req: AuthRequest, res, next) => {
  try { await AdminService.hardDeletePaper(Number(req.params.id)); res.json({ success: true }); } catch (e) { next(e); }
});

export default router;
