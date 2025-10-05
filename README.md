# Recruitment 2.0

Monorepo for the recruiting team portal. The structure is split into the frontend (React + Vite) and backend (Express + TypeScript) with future migration of business logic into independent packages in mind.

## Structure

- `frontend/` — SPA with a modern interface, left navigation menu, and screens for cases, candidates, evaluations, and account management.
- `backend/` — Express API layer with modular domains.
- `docs/` — documentation about architecture and next steps.

## Getting started

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

### Database configuration

The backend uses PostgreSQL. Both the connection string `DATABASE_URL` and individual parameters (`PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, `PGDATABASE`) are supported.

1. Create a `.env` file in the `backend/` directory and provide Railway (or another database) environment variables. Example:
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
2. Run `npm install` — the `pg` driver will be installed together with the rest of the packages, and a local `package-lock.json` will be generated.
3. On the first `npm run dev` or `npm run start`, tables and the super admin account will be created automatically.

> ⚙️ For Railway deployment the repository contains `.nixpacks.toml`. It explicitly runs `npm install` in `backend/`, so new dependencies are installed even without a pre-generated `package-lock.json`.

## Current functionality

- Case management: creation, renaming, drag & drop files, and version conflict detection.
- Candidate database with resume uploads, auto-filled fields, and card versioning.
- Evaluation setup: candidate and case selection, automatic interview status generation.
- Account management: invitations, activation, deletion, and one-time login code generation.
- Authentication through temporary codes and a stub email service.

## Next steps

- Connect a production database (for example, PostgreSQL) and move data access to repositories.
- Integrate an enterprise email provider and persistent storage for codes/sessions.
- Integrate a fully featured AI API for resume parsing and interviewer feedback.
- Add real-time synchronization (WebSocket) and database-level locking mechanisms.
