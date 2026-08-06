
## Deployment Overview

ExamVault is now prepared for a production deployment split:
- Backend: Render
- Frontend: Vercel
- Database: Neon Postgres
- Containerization: Docker

### Environment Variables

Set these in your deployment providers:
- `DATABASE_URL` for Neon or a managed PostgreSQL instance
- `NODE_ENV=production`
- `PORT=10000` on Render
- `VITE_API_URL=https://your-render-backend-url.com`
- `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`
- optional S3-compatible upload variables

### Local Development

```bash
cp .env.example .env
npm install
npm run dev
```

### Docker

```bash
docker compose up --build
```

### Render Backend

Use the included [render.yaml](render.yaml) configuration with:
- Build command: `npm ci && npm run build`
- Start command: `npm start`

### Vercel Frontend

Use the included [vercel.json](vercel.json) configuration and set `VITE_API_URL` to your Render backend URL.

## Docker & Containerization

ExamVault is fully containerized using Docker for reproducible builds and deployment.

### Local Development with Docker Compose

To start the full-stack development environment (backend + Vite frontend + PostgreSQL database):

1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```
2. Set your environment variables in `.env`.
3. Start the stack:
   ```bash
   docker compose up --build
   ```

The application will be accessible at `http://localhost:3000`. The Vite development server runs inside the Express middleware and supports Hot Module Replacement (HMR).

**Useful Commands:**
- Stop the stack: `docker compose down`
- View logs: `docker compose logs -f`
- Run tests in the container: `docker compose exec backend npm test`

### Production Build

To build the optimized production image:

```bash
docker build -t examvault .
```

To run the production image (make sure PostgreSQL is running externally or in another container):

```bash
docker run -p 3000:3000 --env-file .env examvault
```

**Production Architecture Highlights:**
- **Multi-stage build:** Reduces final image size by discarding build tooling.
- **Security:** Runs as a non-root `node` user and omits development dependencies.
- **Port:** Exposes `3000`.
- **Environment Driven:** Fully configurable via environment variables (see `.env.example`).
