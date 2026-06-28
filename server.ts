import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import multer from "multer";
import { requireAuth, requireAdmin } from "./src/middleware/auth.ts";
import { db } from "./src/db/index.ts";
import { 
  colleges, branches, academicYears, semesters, subjects, 
  examTypes, questionPapers, downloads 
} from "./src/db/schema.ts";
import { eq, and, ilike, or } from "drizzle-orm";
import { uploadFile, getFileUrl } from "./src/lib/storage.ts";
import fs from "fs";

const upload = multer({ storage: multer.memoryStorage() });

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());
  
  // Serve local uploads if S3 is not used
  const uploadDir = path.join(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
  app.use('/uploads', express.static(uploadDir));

  // --- Public Endpoints ---
  app.get("/api/v1/stats", async (req, res) => {
    try {
      const papers = await db.select().from(questionPapers).where(eq(questionPapers.isDeleted, false));
      res.json({ totalPapers: papers.length });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  app.get("/api/v1/colleges", async (req, res) => {
    try {
      const data = await db.select().from(colleges);
      res.json(data);
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  app.get("/api/v1/branches", async (req, res) => {
    try {
      const data = await db.select().from(branches);
      res.json(data);
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  app.get("/api/v1/branches/:branchId/semesters", async (req, res) => {
    try {
      const data = await db.select().from(semesters).where(eq(semesters.branchId, Number(req.params.branchId)));
      res.json(data);
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  app.get("/api/v1/branches/:branchId/semesters/:semesterId/subjects", async (req, res) => {
    try {
      const data = await db.select().from(subjects)
        .where(
          and(
            eq(subjects.branchId, Number(req.params.branchId)),
            eq(subjects.semesterId, Number(req.params.semesterId))
          )
        );
      res.json(data);
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  app.get("/api/v1/subjects/:subjectId/question-papers", async (req, res) => {
    try {
      const data = await db.select({
        id: questionPapers.id,
        year: questionPapers.year,
        session: questionPapers.session,
        fileUrl: questionPapers.fileUrl,
        fileSize: questionPapers.fileSize,
        notes: questionPapers.notes,
        subject: {
          id: subjects.id,
          name: subjects.name,
          code: subjects.code,
        },
        examType: {
          id: examTypes.id,
          name: examTypes.name,
        },
        semester: {
          id: semesters.id,
          name: semesters.name,
        },
        branch: {
          id: branches.id,
          name: branches.name,
          code: branches.code,
        }
      })
      .from(questionPapers)
      .innerJoin(subjects, eq(questionPapers.subjectId, subjects.id))
      .innerJoin(examTypes, eq(questionPapers.examTypeId, examTypes.id))
      .innerJoin(semesters, eq(subjects.semesterId, semesters.id))
      .innerJoin(branches, eq(subjects.branchId, branches.id))
      .where(
        and(
          eq(questionPapers.subjectId, Number(req.params.subjectId)),
          eq(questionPapers.isDeleted, false)
        )
      );
      res.json(data);
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  app.get("/api/v1/search", async (req, res) => {
    try {
      const q = req.query.q ? String(req.query.q) : '';
      if (!q) {
        res.json([]);
        return;
      }
      
      const papers = await db.select({
        id: questionPapers.id,
        year: questionPapers.year,
        session: questionPapers.session,
        fileUrl: questionPapers.fileUrl,
        fileSize: questionPapers.fileSize,
        notes: questionPapers.notes,
        subject: {
          id: subjects.id,
          name: subjects.name,
          code: subjects.code,
        },
        examType: {
          id: examTypes.id,
          name: examTypes.name,
        },
        semester: {
          id: semesters.id,
          name: semesters.name,
        },
        branch: {
          id: branches.id,
          name: branches.name,
          code: branches.code,
        }
      })
      .from(questionPapers)
      .innerJoin(subjects, eq(questionPapers.subjectId, subjects.id))
      .innerJoin(examTypes, eq(questionPapers.examTypeId, examTypes.id))
      .innerJoin(semesters, eq(subjects.semesterId, semesters.id))
      .innerJoin(branches, eq(subjects.branchId, branches.id))
      .where(
        and(
          eq(questionPapers.isDeleted, false),
          or(ilike(subjects.name, `%${q}%`), ilike(subjects.code, `%${q}%`))
        )
      );
      
      res.json(papers);
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  app.get("/api/v1/question-papers/:id", async (req, res) => {
    try {
      const data = await db.select({
        id: questionPapers.id,
        year: questionPapers.year,
        session: questionPapers.session,
        fileUrl: questionPapers.fileUrl,
        fileSize: questionPapers.fileSize,
        notes: questionPapers.notes,
        createdAt: questionPapers.createdAt,
        subject: {
          id: subjects.id,
          name: subjects.name,
          code: subjects.code,
        },
        examType: {
          id: examTypes.id,
          name: examTypes.name,
        },
        semester: {
          id: semesters.id,
          name: semesters.name,
          number: semesters.number,
        },
        branch: {
          id: branches.id,
          name: branches.name,
          code: branches.code,
        }
      })
      .from(questionPapers)
      .innerJoin(subjects, eq(questionPapers.subjectId, subjects.id))
      .innerJoin(examTypes, eq(questionPapers.examTypeId, examTypes.id))
      .innerJoin(semesters, eq(subjects.semesterId, semesters.id))
      .innerJoin(branches, eq(subjects.branchId, branches.id))
      .where(eq(questionPapers.id, Number(req.params.id)));
      
      if (data.length === 0) return res.status(404).json({ error: "Not found" });
      res.json(data[0]);
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  app.get("/api/v1/question-papers/:id/download", async (req, res) => {
    try {
      const data = await db.select().from(questionPapers).where(eq(questionPapers.id, Number(req.params.id)));
      if (data.length === 0) return res.status(404).json({ error: "Not found" });
      
      const paper = data[0];
      
      // Log download
      await db.insert(downloads).values({ questionPaperId: paper.id });
      
      const url = await getFileUrl(paper.fileUrl);
      res.redirect(url);
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  // --- Admin Endpoints ---
  app.post("/api/v1/admin/question-papers", requireAuth, requireAdmin, upload.single('file'), async (req, res) => {
    try {
      const { subjectId, examTypeId, year, session, notes } = req.body;
      const file = req.file;
      
      if (!file) return res.status(400).json({ error: "PDF file is required" });
      if (file.mimetype !== 'application/pdf') return res.status(400).json({ error: "Only PDFs are allowed" });
      
      const fileName = `college/MMIT/subject/${subjectId}/year/${year}/${Date.now()}_${file.originalname}`;
      const fileUrl = await uploadFile(file.buffer, fileName, file.mimetype);
      
      const result = await db.insert(questionPapers).values({
        subjectId: Number(subjectId),
        examTypeId: Number(examTypeId),
        year: Number(year),
        session,
        notes,
        fileUrl,
        fileSize: file.size,
        uploadedById: (req as any).dbUser.id
      }).returning();
      
      res.json(result[0]);
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  app.put("/api/v1/admin/question-papers/:id", requireAuth, requireAdmin, async (req, res) => {
    try {
      const { subjectId, examTypeId, year, session, notes } = req.body;
      const result = await db.update(questionPapers).set({
        subjectId: subjectId ? Number(subjectId) : undefined,
        examTypeId: examTypeId ? Number(examTypeId) : undefined,
        year: year ? Number(year) : undefined,
        session,
        notes,
      }).where(eq(questionPapers.id, Number(req.params.id))).returning();
      res.json(result[0]);
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  app.put("/api/v1/admin/question-papers/:id/file", requireAuth, requireAdmin, upload.single('file'), async (req, res) => {
    try {
      const file = req.file;
      const id = Number(req.params.id);
      
      if (!file) return res.status(400).json({ error: "PDF file is required" });
      if (file.mimetype !== 'application/pdf') return res.status(400).json({ error: "Only PDFs are allowed" });

      const existingPaper = await db.select().from(questionPapers).where(eq(questionPapers.id, id));
      if (existingPaper.length === 0) return res.status(404).json({ error: "Paper not found" });
      
      const subjectId = existingPaper[0].subjectId;
      const year = existingPaper[0].year;
      
      const fileName = `college/MMIT/subject/${subjectId}/year/${year}/${Date.now()}_${file.originalname}`;
      const fileUrl = await uploadFile(file.buffer, fileName, file.mimetype);
      
      const result = await db.update(questionPapers).set({
        fileUrl,
        fileSize: file.size
      }).where(eq(questionPapers.id, id)).returning();
      
      res.json(result[0]);
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  // Helper for generic CRUD
  const createCrudRoutes = (path: string, table: any) => {
    app.get(`/api/v1/admin/${path}`, requireAuth, requireAdmin, async (req, res) => {
      try {
        const data = await db.select().from(table);
        res.json(data);
      } catch (err: any) { res.status(500).json({ error: err.message }); }
    });
    
    app.post(`/api/v1/admin/${path}`, requireAuth, requireAdmin, async (req, res) => {
      try {
        const result = await db.insert(table).values(req.body).returning();
        res.json(result[0]);
      } catch (err: any) { res.status(500).json({ error: err.message }); }
    });

    app.delete(`/api/v1/admin/${path}/:id`, requireAuth, requireAdmin, async (req, res) => {
      try {
        await db.delete(table).where(eq(table.id, Number(req.params.id)));
        res.json({ success: true });
      } catch (err: any) { res.status(500).json({ error: err.message }); }
    });
  };

  createCrudRoutes("branches", branches);
  createCrudRoutes("academic-years", academicYears);
  createCrudRoutes("semesters", semesters);
  createCrudRoutes("subjects", subjects);
  createCrudRoutes("exam-types", examTypes);

  app.get("/api/v1/admin/question-papers", requireAuth, requireAdmin, async (req, res) => {
    try {
      const papers = await db.select({
        id: questionPapers.id,
        year: questionPapers.year,
        session: questionPapers.session,
        subject: {
          name: subjects.name,
          code: subjects.code,
        },
        examType: {
          name: examTypes.name,
        },
        semester: {
          name: semesters.name,
        },
        branch: {
          name: branches.name,
        }
      })
      .from(questionPapers)
      .innerJoin(subjects, eq(questionPapers.subjectId, subjects.id))
      .innerJoin(examTypes, eq(questionPapers.examTypeId, examTypes.id))
      .innerJoin(semesters, eq(subjects.semesterId, semesters.id))
      .innerJoin(branches, eq(subjects.branchId, branches.id))
      .where(eq(questionPapers.isDeleted, false))
      .orderBy(questionPapers.id);
      res.json(papers);
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  app.delete("/api/v1/admin/question-papers/:id", requireAuth, requireAdmin, async (req, res) => {
    try {
      await db.update(questionPapers).set({ isDeleted: true }).where(eq(questionPapers.id, Number(req.params.id)));
      res.json({ success: true });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
