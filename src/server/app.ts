import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import cors from "cors";
import { securityHeaders, apiLimiter } from "./middlewares/security.ts";
import { errorHandler } from "./middlewares/errorHandler.ts";
import { logger } from "./utils/logger.ts";
import publicRoutes from "./routes/publicRoutes.ts";
import adminRoutes from "./routes/adminRoutes.ts";
import { setupSwagger } from "../config/swagger.ts";

export async function createApp() {
  const app = express();
  
  app.set("trust proxy", 1);
  // Middlewares
  app.use(cors());
  app.use(securityHeaders);
  app.use(express.json({ limit: '10kb' })); // Prevent large JSON payloads
  
  // Setup Swagger
  setupSwagger(app);

  
  // Rate limiting on API routes
  app.use("/api/", apiLimiter);

  // Static uploads
  const uploadDir = path.join(process.cwd(), 'uploads');
  app.use('/uploads', express.static(uploadDir));

  // Health checks
  app.get('/healthz', (_req, res) => {
    res.status(200).json({ status: 'ok', service: 'examvault-api' });
  });

  app.get('/api/v1/health', (_req, res) => {
    res.status(200).json({ status: 'ok', service: 'examvault-api' });
  });

  // Routes
  app.use("/api/v1", publicRoutes);
  app.use("/api/v1/admin", adminRoutes);

  // Catch-all API routes
  app.all("/api/*", (req, res) => {
    res.status(404).json({ error: "API endpoint not found" });
  });

  // Vite / static file serving
  if (process.env.NODE_ENV !== "production" && process.env.NODE_ENV !== "test") {
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

  app.use(errorHandler);

  return app;
}
