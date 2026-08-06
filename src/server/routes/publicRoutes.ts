import { validate } from '../middlewares/validate.ts';
import { searchPapersSchema } from '../validations/paper.validation.ts';
import { idParamSchema, branchIdParamSchema, branchSemesterParamSchema, subjectIdParamSchema } from '../validations/admin.validation.ts';
import { Router } from "express";
import { db } from "../../db/index.ts";
import { colleges, branches, semesters, subjects, questionPapers } from "../../db/schema.ts";
import { eq, and } from "drizzle-orm";
import { QuestionPaperService } from "../services/questionPaperService.ts";
import { getFileUrl } from "../../lib/storage.ts";
import { requireAuth, AuthRequest } from "../../middleware/auth.ts";
import { Request, Response, NextFunction } from "express";

const router = Router();

/**
 * @openapi
 * /auth/me:
 *   get:
 *     summary: Get current authenticated user
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current user details
 *       401:
 *         description: Unauthorized
 */
router.get("/auth/me", requireAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    res.json({ user: req.dbUser });
  } catch (e) {
    next(e);
  }
});

/**
 * @openapi
 * /stats:
 *   get:
 *     summary: Get overall statistics
 *     tags: [Public]
 *     responses:
 *       200:
 *         description: Statistics data
 */
router.get("/stats", async (req, res, next) => {
  try {
    const stats = await QuestionPaperService.getStats();
    res.json(stats);
  } catch (e) { next(e); }
});

/**
 * @openapi
 * /colleges:
 *   get:
 *     summary: Get all colleges
 *     tags: [Public]
 *     responses:
 *       200:
 *         description: List of colleges
 */
router.get("/colleges", async (req, res, next) => {
  try {
    const data = await db.select().from(colleges);
    res.json(data);
  } catch (e) { next(e); }
});

/**
 * @openapi
 * /branches:
 *   get:
 *     summary: Get all branches
 *     tags: [Public]
 *     responses:
 *       200:
 *         description: List of branches
 */
router.get("/branches", async (req, res, next) => {
  try {
    const data = await db.select().from(branches);
    res.json(data);
  } catch (e) { next(e); }
});

/**
 * @openapi
 * /branches/{branchId}/semesters:
 *   get:
 *     summary: Get semesters for a branch
 *     tags: [Public]
 *     parameters:
 *       - in: path
 *         name: branchId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of semesters
 */
router.get("/branches/:branchId/semesters", validate(branchIdParamSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await db.select().from(semesters).where(eq(semesters.branchId, Number(req.params.branchId)));
    res.json(data);
  } catch (e) { next(e); }
});

/**
 * @openapi
 * /branches/{branchId}/semesters/{semesterId}/subjects:
 *   get:
 *     summary: Get subjects for a branch and semester
 *     tags: [Public]
 *     parameters:
 *       - in: path
 *         name: branchId
 *         required: true
 *         schema:
 *           type: integer
 *       - in: path
 *         name: semesterId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of subjects
 */
router.get("/branches/:branchId/semesters/:semesterId/subjects", validate(branchSemesterParamSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await db.select().from(subjects)
      .where(and(eq(subjects.branchId, Number(req.params.branchId)), eq(subjects.semesterId, Number(req.params.semesterId))));
    res.json(data);
  } catch (e) { next(e); }
});

/**
 * @openapi
 * /subjects/{subjectId}/question-papers:
 *   get:
 *     summary: Get question papers for a subject
 *     tags: [Public]
 *     parameters:
 *       - in: path
 *         name: subjectId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of question papers
 */
router.get("/subjects/:subjectId/question-papers", validate(subjectIdParamSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await QuestionPaperService.getPapersBySubject(Number(req.params.subjectId));
    res.json(data);
  } catch (e) { next(e); }
});

/**
 * @openapi
 * /search:
 *   get:
 *     summary: Search question papers
 *     tags: [Public]
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Search results
 */
router.get("/search", validate(searchPapersSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const q = req.query.q ? String(req.query.q) : '';
    if (!q) return res.json([]);
    const page = req.query.page as unknown as number;
    const limit = req.query.limit as unknown as number;
    const data = await QuestionPaperService.searchPapers(q, { page, limit });
    res.json(data);
  } catch (e) { next(e); }
});

/**
 * @openapi
 * /question-papers/{id}:
 *   get:
 *     summary: Get a question paper by ID
 *     tags: [Public]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Question paper details
 *       404:
 *         description: Not found
 */
router.get("/question-papers/:id", validate(idParamSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await QuestionPaperService.getPaperById(Number(req.params.id));
    console.log("FETCHED PAPER DATA:", data);
    if (!data) return res.status(404).json({ error: "Not found" });
    res.json(data);
  } catch (e) { next(e); }
});

/**
 * @openapi
 * /question-papers/{id}/download:
 *   get:
 *     summary: Get download URL for a question paper
 *     tags: [Public]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: URL to download the file
 *       404:
 *         description: Not found
 */
router.get("/question-papers/:id/download", validate(idParamSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await db.select().from(questionPapers).where(eq(questionPapers.id, Number(req.params.id)));
    if (!data.length) return res.status(404).json({ error: "Not found" });
    
    await QuestionPaperService.logDownload(data[0].id);
    const url = await getFileUrl(data[0].fileUrl);
    res.json({ url });
  } catch (e) { next(e); }
});

export default router;
