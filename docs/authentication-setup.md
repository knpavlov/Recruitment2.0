# Authentication and Email Delivery Setup

This guide describes the configuration required to make the invitation-based login flow work end to end.

## 1) Prerequisites

- PostgreSQL configured via `DATABASE_URL` (or individual `PG*` variables).
- Backend deployed and reachable over HTTPS.
- Frontend deployed and reachable over HTTPS (Railway subdomain or a custom domain such as `https://app.example.com`).
- A verified sender domain in Resend (for example, ownership of `example.com` with DNS records in place).

## 2) Backend environment variables

Set the following variables in the backend service (for example, Railway -> Environment or Azure Web App -> Configuration):

```dotenv
DATABASE_URL=postgres://<user>:<password>@<host>:<port>/<database>
SUPER_ADMIN_EMAIL=admin@example.com
RESEND_API_KEY=re_********************************
RESEND_FROM=Recruitment 2.0 <login@example.com>
INVITE_URL=https://app.example.com/login
```

Notes:

- `RESEND_API_KEY` is created in the Resend dashboard (`API Keys`).
- `RESEND_FROM` must be a sender address under a domain verified in Resend. You do not need a mailbox at the registrar - it is enough to verify the domain in Resend and use an address like `Recruitment 2.0 <login@example.com>`.
- `INVITE_URL` must point to the frontend login screen.
- `SUPER_ADMIN_EMAIL` defines the seed super admin account during migrations and defaults to `knpavlov@gmail.com` if not provided.

If you prefer SMTP instead of Resend, replace the `RESEND_*` variables with `SMTP_*` variables from the root `README.md`.

## 3) Frontend environment variables

Set the API base URL for the frontend build:

```dotenv
VITE_API_URL=https://api.example.com
```

If the frontend and backend are deployed on Railway using the default naming pattern:

- `https://<project>-frontend.up.railway.app`
- `https://<project>-backend.up.railway.app`

then `VITE_API_URL` can be omitted because the app will auto-derive the backend URL. If service names differ from the `frontend/backend` pattern or you use custom domains, set `VITE_API_URL` explicitly.

> Legacy note: `VITE_API_BASE_URL` is still supported for backward compatibility, but `VITE_API_URL` is preferred.

## 4) DNS and domain checklist

1. Point the frontend subdomain (for example, `app.example.com`) to the frontend hosting provider.
2. Point the backend subdomain (for example, `api.example.com`) to the backend hosting provider.
3. Add Resend verification records in DNS: DKIM (`resend._domainkey`), SPF (`send` TXT), and MX (`feedback-smtp.ap-northeast-1.amazonses.com`).
4. (Recommended) Add a DMARC TXT record such as `v=DMARC1; p=none; rua=mailto:postmaster@example.com`.

Wait for DNS propagation and confirm the domain status in the Resend dashboard. If you switch the frontend to a new domain, update `RESEND_FROM` and ensure Resend shows **Verified** for that domain, otherwise email delivery will be blocked.

## 5) End-to-end verification

1. Restart the backend after updating variables so the process picks up the new configuration.
2. Open **Account management** as the super admin and invite a test email.
3. Confirm an invitation email arrives from `Recruitment 2.0 <login@example.com>` and the link points to your login page with the email pre-filled.
4. On the login page, request a one-time access code and verify it arrives within a few seconds.
5. Enter the code, enable **Keep me signed in** if desired, and verify the dashboard loads with the correct navigation.
6. Use **Sign out** in the sidebar and confirm you return to the login screen.

If any step fails, check backend logs. When email delivery is misconfigured the API returns HTTP 503 with `mailer-unavailable`. If the sender domain is not verified in Resend you will see HTTP 424 with `mailer-domain`. Other provider-side failures are reported as HTTP 502.
