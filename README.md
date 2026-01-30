# Recruitment 2.0 - Corporate Azure Deployment Guide

This guide is written for the corporate team deploying Recruitment 2.0 in Microsoft Azure. It covers how to receive the codebase, provision Azure resources, configure domains, and set environment variables so the app runs under your desired public URLs.

---

## 1) How to Receive the Code (ZIP Archive)

1. The project is delivered as a ZIP or folder snapshot.
2. Create a new repository in the corporate GitHub org.
3. Initialize and push the code:
   ```bash
   git init
   git add .
   git commit -m "Initial import"
   git remote add origin <corporate_repo_url>
   git push -u origin main
   ```

Important: do not commit `.env` files or secrets to the repo. Store secrets only in Azure App Settings.

---

## 2) Deployment Overview

The system is split into three Azure resources:

- Azure Database for PostgreSQL Flexible Server
- Azure Web App (Linux, Node 20 LTS) for the backend API
- Azure Static Web App for the frontend

---

## 3) Choose Your Public URLs (Replace the current nboard domain)

The app currently runs at `https://recruitment2.0.nboard.au/`. To move it to corporate domains, pick two new public URLs:

- Frontend URL, for example: `https://app.company.com`
- Backend (API) URL, for example: `https://api.company.com`

These two URLs are the basis of all configuration below.

---

## 4) Configure DNS and Custom Domains in Azure

1. In Azure, add the custom domain for the Static Web App (frontend).
2. Add the custom domain for the Web App (backend).
3. Create the DNS records Azure provides (usually CNAME or ALIAS).
4. Enable TLS certificates in Azure for both domains.

After this, the frontend should be reachable at the chosen frontend URL, and the backend should respond at the chosen API URL.

---

## 5) Azure Database for PostgreSQL Flexible Server

1. Create a PostgreSQL Flexible Server.
2. Create a database and user.
3. Configure network access:
   - If public network is used, allow the Web App outbound IP in firewall rules.
   - If VNet is used, ensure the Web App has network access.
4. Keep TLS enabled (Azure expects SSL by default).

---

## 6) Backend Deployment (Azure Web App)

Important: deploy the `backend/` folder as the Web App project, otherwise Azure will not find the correct `package.json`.

Recommended process:
1. Build in CI/CD using `backend/` only:
   - `npm install`
   - `npm run build`
2. Start command: `npm run start` (from `backend/`).
3. Verify health: `GET https://api.company.com/health`.

The backend listens on `process.env.PORT`, which Azure sets automatically.

---

## 7) Frontend Deployment (Azure Static Web App)

1. Connect the repo.
2. Set build paths:
   - `app_location: "frontend"`
   - `output_location: "dist"`
3. Provide `VITE_API_URL` at build time (see section 8).

---

## 8) Environment Variables (Exact Locations in Azure)

### Backend - Web App -> Configuration -> Application settings

Set these keys in the Azure Web App configuration:

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

# Email links (frontend URL)
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

### Frontend - Static Web App -> Configuration -> Application settings

Set the API base URL for the frontend build:

```dotenv
VITE_API_URL=https://api.company.com
```

This value is injected at build time and is required when frontend and backend are hosted on separate domains.

---

## 9) Email Delivery (What Code It Touches)

Email delivery is handled by `backend/src/shared/mailer.service.ts`.

- If `RESEND_API_KEY` is set, the backend uses Resend.
- Otherwise, it uses SMTP (`SMTP_*` variables).
- If neither is set, invitation and login flows return HTTP 503.

To move to corporate email:
- Set either SMTP or Resend variables in the Web App settings (section 8).
- Ensure the sender domain matches your corporate domain (for Resend, the domain must be verified in Resend).

No code changes are required unless you want a different email provider implementation.

---

## 10) CORS (What "CORS is open" Means)

The backend currently allows requests from any origin. This means any website can call the API.

If your security policy requires restrictions, update CORS in `backend/src/app/server.ts` to allow only your frontend domain, for example:

```ts
app.use(cors({ origin: ['https://app.company.com'] }));
```

---

## 11) What to Change When Moving off the nboard Domain

To run the app under new corporate URLs:

1. Configure Azure custom domains and DNS (section 4).
2. Update frontend build variable:
   - `VITE_API_URL=https://api.company.com`
3. Update backend email URLs:
   - `INVITE_URL=https://app.company.com/login`
   - `INTERVIEW_PORTAL_URL=https://app.company.com`
4. Update email sender (if applicable):
   - `RESEND_FROM` or `SMTP_FROM` should use your corporate domain.

Once these are set, the app will operate under the new corporate URLs.
