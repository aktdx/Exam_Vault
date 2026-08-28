# ExamVault

A previous-year question paper repository for colleges. Students browse by branch → semester → subject to find and download past exam papers; admins manage the catalog and upload new PDFs through a protected dashboard.

## Features

- Public browsing hierarchy: College → Branch → Semester → Subject → Question Papers
- Search across subject, branch, semester, exam type, and year
- Per-paper download tracking and aggregate stats
- Admin dashboard for managing colleges, branches, academic years, semesters, subjects, and exam types
- PDF upload with file-signature validation (checks the actual bytes, not just the MIME type), 20 MB limit
- Soft-delete → trash → restore workflow for question papers, plus a separate permanent-delete step
- Firebase-authenticated admin login, with a super-admin role that can promote/demote other admins
- Auto-generated OpenAPI/Swagger docs for the whole API

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, React Router 7, Tailwind CSS 4, Vite 6 |
| Backend | Express 4, served through the same process as Vite in dev; bundled with esbuild for production |
| Database | PostgreSQL + Drizzle ORM |
| Auth | Firebase Authentication (client SDK) + Firebase Admin SDK (server-side token verification) |
| File storage | AWS S3 with presigned URLs, falling back to local disk automatically if no S3 credentials are set |
| Validation | Zod |
| API docs | swagger-jsdoc + swagger-ui-express |
| Testing | Jest, Supertest, ts-jest |
| Logging | Winston |

## Prerequisites

- Node.js >= 22
- A PostgreSQL database (local, Docker, or hosted — e.g. Neon)
- A Firebase project with Authentication enabled
- (Optional) An AWS S3 bucket — without one, uploaded files are stored on local disk instead

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Copy `.env.example` to `.env` and fill in the values below.

**Server**

| Variable | Description |
|---|---|
| `NODE_ENV` | `development`, `production`, or `test` |
| `PORT` | Port the server listens on (default `3000`) |

**Database** — set `DATABASE_URL` for a hosted Postgres instance, or the four `SQL_*` variables for a local one. `DATABASE_URL` takes priority if both are set.

| Variable | Description |
|---|---|
| `DATABASE_URL` | Full connection string, e.g. a Neon database (`?sslmode=require`) |
| `SQL_HOST`, `SQL_USER`, `SQL_PASSWORD`, `SQL_DB_NAME` | Individual connection pieces, used when `DATABASE_URL` is not set |

**Firebase — client (exposed to the browser via Vite)**

| Variable | Description |
|---|---|
| `VITE_FIREBASE_API_KEY` | From Firebase Console → Project settings → Web app |
| `VITE_FIREBASE_AUTH_DOMAIN` | Same web app |
| `VITE_FIREBASE_PROJECT_ID` | Same web app |
| `VITE_FIREBASE_STORAGE_BUCKET` | Same web app |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Same web app |
| `VITE_FIREBASE_APP_ID` | Same web app |
| `VITE_API_URL` | Base URL the frontend uses to call the API |

> All six `VITE_FIREBASE_*` values must come from the **same** Firebase web app. Mixing fields from two different apps causes `auth/unauthorized-domain` at sign-in.

**Firebase — admin (server-side, keep secret)**

| Variable | Description |
|---|---|
| `FIREBASE_PROJECT_ID` | Service account project ID |
| `FIREBASE_CLIENT_EMAIL` | Service account client email |
| `FIREBASE_PRIVATE_KEY` | Service account private key |

**Admin access**

| Variable | Description |
|---|---|
| `SUPERADMIN_EMAILS` | Comma-separated emails automatically granted super-admin on first login |

**File storage** (optional — omit entirely to use local disk instead of S3)

| Variable | Description |
|---|---|
| `AWS_ACCESS_KEY_ID` | Also acts as the flag that enables S3 — if unset, files are written to `/uploads` locally |
| `AWS_SECRET_ACCESS_KEY` | |
| `AWS_REGION` | Defaults to `us-east-1` |
| `AWS_S3_BUCKET_NAME` | Defaults to `examvault-bucket` |
| `AWS_S3_ENDPOINT` | Only needed for S3-compatible providers other than AWS |

### 3. Set up the database

```bash
npm run db:push      # push the Drizzle schema directly — fast, good for local dev
# or
npm run db:migrate   # run versioned migrations from src/db/migrations
```

Optionally seed a starter college, branch, and a few subjects:

```bash
npx tsx src/db/seed.ts
```

### 4. Run the app

```bash
npm run dev
```

Express and Vite share the same process, so both the API and the frontend (with HMR) are available at `http://localhost:3000`.

## Available Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Start the dev server (Express + Vite, hot reload) |
| `npm run build` | Build the frontend and bundle the server into `dist/` |
| `npm start` | Run the production build (`dist/server.cjs`) |
| `npm test` | Run the Jest test suite |
| `npm run lint` | Type-check the project with `tsc --noEmit` |
| `npm run db:push` | Push the Drizzle schema to the database |
| `npm run db:migrate` | Run Drizzle migrations |
| `npm run health-check` | Hit `/healthz` and exit 0/1 — useful for container or orchestrator health checks |
| `npm run clean` | Remove build output |

## Project Structure

```
src/
├── pages/           # Route-level React components (Home, Branches, Papers, AdminDashboard, ...)
├── components/ui/   # Shared UI primitives
├── lib/              # Firebase client, API helper, S3 storage helper
├── middleware/        # requireAuth / requireAdmin (Firebase token verification)
├── config/            # Swagger setup, super-admin email config
├── db/
│   ├── schema.ts      # Drizzle schema: colleges → branches → semesters → subjects → papers
│   ├── migrations/     # Generated SQL migrations
│   └── seed.ts          # Starter data
└── server/
    ├── app.ts            # Express app setup
    ├── routes/            # publicRoutes.ts, adminRoutes.ts
    ├── services/           # Business logic (AdminService, QuestionPaperService)
    ├── middlewares/         # Security headers, upload handling, request validation, error handling
    └── validations/         # Zod schemas

tests/
├── unit/             # Service and validation tests
└── integration/       # Route-level tests (Supertest)
```

## API Documentation

With the server running, interactive Swagger docs are available at:

```
http://localhost:3000/api-docs
```

Routes are split into `/api/v1` (public) and `/api/v1/admin` (requires a Firebase-authenticated admin).

## Testing

```bash
npm test
```

Tests run with `NODE_ENV=test` and expect a reachable Postgres database. See `.github/workflows/ci.yml` for the exact environment variables CI uses against a disposable database.

## Docker

For local development with Postgres already wired up:

```bash
docker compose up
```

This builds to the `builder` stage and runs `npm run dev` with hot reload, alongside a `postgres:15-alpine` container.

For a production image:

```bash
docker build -t examvault .
docker run -p 3000:3000 --env-file .env examvault
```

## Deployment

- **Render** — `render.yaml` deploys the app as a single Node web service.
- **Vercel** — `vercel.json` is included for SPA routing rewrites.
- **Docker** — the multi-stage `Dockerfile` produces a production image that runs as a non-root user.

## License

Not yet specified.

---

Built by Aamin Khan.
