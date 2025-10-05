# Recruitment 2.0

Monorepo for the recruitment team portal. The structure is split into the frontend (React + Vite) and the backend (Express + TypeScript) with future extraction of shared logic into independent packages in mind.

## Structure

- `frontend/` — Single Page Application with modern UI, left-side navigation, and screens for cases, candidates, evaluations, and account management.
- `backend/` — Express API layer with modular domain organization.
- `docs/` — architectural documentation and planning notes.

## Quick start

### Frontend

```bash
cd frontend
npm install
npm run dev
```

### Backend

```bash
cd backend
npm install
npm run dev
```

### Database setup

The backend uses PostgreSQL. Both a single `DATABASE_URL` connection string and individual parameters (`PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, `PGDATABASE`) are supported.

1. Create a `.env` file inside `backend/` and provide your Railway (or other provider) environment variables. Example:
   ```dotenv
   DATABASE_URL=postgresql://user:password@host:port/database
   # or alternatively
   # PGHOST=...
   # PGPORT=...
   # PGUSER=...
   # PGPASSWORD=...
   # PGDATABASE=...
   SUPER_ADMIN_EMAIL=super.admin@company.com
   ```
2. Run `npm install` — the `pg` driver will be installed alongside other packages and a local `package-lock.json` will be generated.
3. On the first `npm run dev` or `npm run start`, the tables and the super admin account will be created automatically.

> ⚙️ For Railway deployments the repo ships with `.nixpacks.toml`: it explicitly runs `npm install` inside `backend/`, so new dependencies will be installed even if `package-lock.json` was not committed in advance.

## Current functionality

- Case management: create folders, rename them, upload files via drag & drop, and prevent version conflicts.
- Candidate database with resume uploads, AI-assisted field auto-fill, and profile versioning.
- Evaluation setup: select candidates and cases, automatically generate interview statuses.
- Account management: invitations, activation, deletion, and issuing one-time login codes.
- Authentication through temporary codes and a stub mailer service.

## Next steps

- Connect a production-grade database (for example, PostgreSQL) and move data access into repositories.
- Integrate an industrial mail provider and persistent storage for codes/sessions.
- Integrate a full AI API for resume analysis and interviewer feedback.
- Add real-time synchronization (WebSocket) and database-level locks.
