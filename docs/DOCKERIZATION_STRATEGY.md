# Dockerization Strategy

## 1. Audit
- **Frontend**: React + Vite (integrated into Express via Vite middleware mode in development, and built as static files in production).
- **Backend**: Express + TypeScript.
- **Build Commands**: `npm run build` (compiles Vite frontend to `dist/` and bundles `server.ts` into `dist/server.cjs` using `esbuild`).
- **Startup Commands**: `node dist/server.cjs` in production, `tsx server.ts` in development.
- **Environment Variables**: Managed via `.env` (Database, Firebase, S3).
- **Ports**: Hardcoded to `3000` in `server.ts`.
- **Database**: PostgreSQL (via `pg` and `drizzle-orm`).
- **Storage**: Local uploads directory or S3 depending on `USE_S3`.

## 2. Dockerfile Strategy
- **Multi-stage build**:
  - `builder`: Uses `node:20-alpine`. Installs all dependencies (`npm ci`), runs `npm run build` to generate `dist/`.
  - `runner`: Uses `node:20-alpine`. Installs only production dependencies (`npm ci --omit=dev`). Copies `dist/` from `builder`.
- **Security**: Sets `NODE_ENV=production` and switches to the non-root `node` user.
- **Optimization**: We leverage Docker layer caching by copying `package*.json` first.

## 3. Docker Compose Strategy (Local Development)
- **Services**:
  - `backend`: Runs the full-stack integrated Express + Vite app using `npm run dev` (which executes `tsx server.ts`). Volumes are mounted for hot-reloading.
  - `postgres`: Official `postgres:15` image with a healthcheck and a persistent volume.
- **Networking**: `backend` connects to `postgres` via Docker's internal DNS (`postgres:5432`).
- **Frontend/Backend Integration**: Since Vite is mounted as a middleware inside Express (as seen in `src/server/app.ts`), the `backend` service automatically handles the frontend development server and hot-reloading over port 3000.

## 4. GitHub Actions
- Extend `.github/workflows/ci.yml` to include a `docker build` step to verify the image builds successfully.

## 5. Persistence
- Postgres data stored in `pgdata` volume.
- Uploads data stored in `uploads_data` volume (so local uploads survive container restarts).
