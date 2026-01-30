# Recruitment 2.0 - Migration to a Corporate Azure Environment

This repository is a monorepo with a frontend (React + Vite) and a backend (Express + TypeScript). Below are concrete steps to migrate from Railway and the `nboard` domain to a corporate Microsoft Azure environment, plus clear options for handing off the code.

---

## 0) Quick Structure Overview

- `frontend/` - SPA (Vite + React).
- `backend/` - Express API connected to PostgreSQL.
- `docs/` - legacy notes (including Railway). Keep for history if needed; not applicable to Azure.

---

## 1) How to Hand Off the Code to Corporate GitHub

### Share a ZIP archive
1. Send a ZIP or a folder snapshot.
2. Corporate side initializes a new repo:
   ```bash
   git init
   git add .
   git commit -m "Initial import"
   git remote add origin <corporate_repo_url>
   git push -u origin main
   ```

> Important: ensure **no** `.env` files or secrets are committed. All secrets must live in Azure App Settings.

---

## 2) What Must Be Configured (Railway -> Azure)

There are no hard Railway dependencies in code, but the following **must** be configured for corporate domains and infrastructure:

1. **Frontend API base URL**
   - Set `VITE_API_URL` (or `VITE_API_BASE_URL`) to the corporate API URL.
   - This is **required**; otherwise the frontend tries to derive the backend host using the old Railway naming pattern.

2. **Backend URLs used in emails**
   - `INVITE_URL` - login page link.
   - `INTERVIEW_PORTAL_URL` - base URL of the interviewer portal (usually the same frontend).

3. **Super admin account**
   - `SUPER_ADMIN_EMAIL` must be set to a corporate email.

4. **Email delivery**
   - Replace Railway/Resend with corporate SMTP (or keep Resend if allowed).

5. **(Optional) CORS**
   - CORS is currently open. If you must restrict it, edit `backend/src/app/server.ts`.

---

## 3) Environment Variables

### Backend (Azure Web App -> Configuration -> Application settings)
Minimum required:

```dotenv
# PostgreSQL
DATABASE_URL=postgresql://user:password@host:port/database
# or individual variables:
# PGHOST=...
# PGPORT=5432
# PGUSER=...
# PGPASSWORD=...
# PGDATABASE=...

# SSL (Azure usually requires TLS)
# PGSSL=false  # only if TLS is disabled (not recommended)

# Super admin
SUPER_ADMIN_EMAIL=admin@company.com

# Email links
INVITE_URL=https://app.company.com/login
INTERVIEW_PORTAL_URL=https://app.company.com

# Email provider (option 1 - SMTP)
SMTP_HOST=smtp.company.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=notifications@company.com
SMTP_PASSWORD=super-secret
SMTP_FROM=Recruitment 2.0 <notifications@company.com>

# Email provider (option 2 - Resend)
# RESEND_API_KEY=...
# RESEND_FROM=Recruitment 2.0 <login@company.com>
```

If **neither SMTP nor Resend** is configured, the API returns 503 for invitations and login codes.

### Frontend (Azure Static Web App)
Vite variables are injected at build time:

```dotenv
VITE_API_URL=https://api.company.com
```

> If frontend and backend hostnames do not follow the `frontend <-> backend` pattern, `VITE_API_URL` is mandatory.

Optional (runtime without rebuild):
- Add one of these to `frontend/index.html`:
  ```html
  <meta name="recruitment:api-base" content="https://api.company.com" />
  ```
  or
  ```html
  <script>
    window.__RECRUITMENT_CONFIG__ = { apiBaseUrl: 'https://api.company.com' };
  </script>
  ```

---

## 4) Azure Database for PostgreSQL Flexible Server

1. Create a PostgreSQL Flexible Server.
2. Create a database and a user.
3. Configure network access:
   - If public network is used - allow the Web App outbound IP in firewall rules.
   - If VNet is used - ensure the Web App has network access.
4. Keep TLS enabled (Azure expects SSL by default).
5. Build and set `DATABASE_URL` in Web App settings.

On first backend start, tables and the super admin account are created automatically.

---

## 5) Azure Web App (Linux, Node 20 LTS) - Backend

Important: deploy **the `backend/` folder as a separate app**, otherwise Azure will not find `package.json`.

Recommended process:
1. Use a pipeline (GitHub Actions / Azure DevOps) that:
   - runs `npm install` and `npm run build` inside `backend/`;
   - publishes only `backend/`.
2. Start command: `npm run start` (from the `backend` folder).
3. Set environment variables (see section 3).
4. Verify health: `GET https://api.company.com/health`.

> The backend listens on `process.env.PORT`, which Azure sets automatically.

---

## 6) Azure Static Web App - Frontend

1. Connect the repo.
2. Set build paths:
   - `app_location: "frontend"`
   - `output_location: "dist"`
3. Provide `VITE_API_URL` at build time (section 3).
4. After deploy, the frontend should call the corporate API.

---

## 7) Demo Data (optional)

To seed test data:
```bash
cd backend
npm install
npm run seed:demo
```
The script creates test cases, candidates, interviews, etc. Re-running is safe.

---

## 8) Where `nboard` Appears

`nboard` appears only in legacy documentation. If you want a full cleanup:
- Update files under `docs/` and this `README.md` with corporate domains.
- Code changes are not required if env vars are configured correctly.

---

## 9) Corporate Checklist

- [ ] Repo transferred or imported into corporate GitHub.
- [ ] PostgreSQL Flexible Server created and connection string ready.
- [ ] Web App (Linux, Node 20 LTS) deployed with env vars set.
- [ ] Static Web App deployed with correct build paths and `VITE_API_URL`.
- [ ] `SUPER_ADMIN_EMAIL` set to corporate email.
- [ ] Email delivery works via SMTP/Resend.
- [ ] `GET /health` and login via emailed link verified.

---

If the corporate team needs extra requirements (SSO, private SMTP, VNet-only, Key Vault, etc.), handle that as a separate integration step.
