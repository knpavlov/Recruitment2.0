# Connect a Custom Domain in Railway

This checklist describes how to attach a custom domain to the frontend on Railway.

## Prerequisites

1. Access to the Railway project and DNS records for the domain (via registrar or DNS provider such as Cloudflare or Route53).
2. Frontend already deployed and reachable at a Railway URL like `https://recruitment20-frontend-production.up.railway.app`.
3. HTTPS is enabled in Railway (automatically enabled after domain binding).

## Step 1. Add the subdomain in Railway

1. Open the `Recruitment 2.0` project in Railway and select the frontend service (`Recruitment2.0-frontend`).
2. Go to **Settings -> Domains** and click **Add domain**.
3. Enter `recruitment.nboard.au` (or your desired subdomain). Railway will show the DNS record you must create.

> Railway cannot issue a certificate until DNS points to it. Do not proceed until you have created the DNS record shown by Railway.

## Step 2. Configure DNS at your registrar

1. **If you use a subdomain (recommended):**
   - Create a CNAME record for `recruitment`.
   - Point it to the target Railway hostname shown in the UI (for example, `recruitment20-frontend-production.up.railway.app`).
   - Keep the TTL standard (300-600 seconds).
   - Leave any `CNAME _domainconnect` records (used by some registrars) unchanged.
2. **If you must attach the root domain (for example, `nboard.au`):**
   - Use ALIAS/ANAME/Flattened CNAME (name depends on DNS provider) and point it to Railway.
   - If ALIAS is not available, delegate the domain to a provider that supports it (Cloudflare, DNSimple).
3. Save changes and wait until Railway shows the domain as **Pending verification** (typically 1-5 minutes).

> Ensure there are no old A/AAAA records for the same name, as they conflict with CNAME.

## Step 3. Wait for certificate issuance

1. In **Settings -> Domains**, the status should become **Ready**. Railway automatically issues a Let's Encrypt certificate.
2. While status is **Pending**, do not edit DNS - changing TTL or deleting records will reset verification.
3. After it becomes **Ready**, optionally click **Refresh certificate** to confirm the chain is healthy.

## Step 4. Allow the domain for Vite preview

Railway runs the frontend using `npm run preview`. Vite only allows a predefined host list, so opening `https://recruitment2.0.nboard.au` may show:

`Blocked request. This host is not allowed. To allow this host, add it to preview.allowedHosts in vite.config.js.`

To allow your domain, set `VITE_PREVIEW_ALLOWED_HOSTS` in Railway:

1. Open the frontend service in Railway.
2. Go to **Variables -> New Variable**.
3. Set **Key** to `VITE_PREVIEW_ALLOWED_HOSTS` and **Value** to `recruitment2.0.nboard.au`.
4. Restart the deployment (**Deployments -> Restart latest**).

> You can list multiple domains separated by commas, for example:
> `recruitment2.0.nboard.au,recruitment.nboard.au,www.recruitment.nboard.au`.

After restart, Vite will read the variable and add it to `preview.allowedHosts` automatically.

## Step 5. Update frontend environment variables

1. Open the frontend service in Railway -> **Variables**.
2. Ensure `VITE_API_URL` points to the current backend domain, for example `https://recruitment.nboard.au`.
3. If you previously used `VITE_API_BASE_URL`, rename it to `VITE_API_URL` (the client still accepts the old key, but the docs and Vite build use `VITE_API_URL`).
4. Restart the deployment so the frontend rebuilds with the new API URL.

> If frontend and backend still use Railway domains with the `frontend/backend` pattern, `VITE_API_URL` can be omitted. For custom domains, set it explicitly to avoid mismatches.

## Step 6. Verify the site

1. Open `https://recruitment2.0.nboard.au` (frontend) and `https://recruitment.nboard.au` (backend, if configured) in a clean browser session.
2. Optionally validate the certificate using CLI (see `railway-ssl-troubleshooting.md`). Confirm the issuer is Let's Encrypt and the subject matches the domain.
3. If you use a CDN or corporate proxy, update allowlists to include the new domains.

## Step 7. Verify email delivery with Resend

1. If `RESEND_FROM` uses an address on the new domain (for example, `login@recruitment2.0.nboard.au`), confirm that Resend shows the domain as **Verified**.
2. Update `RESEND_FROM` in the backend service and restart the deploy to pick up the new sender.
3. If the domain is not verified, Resend returns HTTP 403 and the backend returns HTTP 424 with `mailer-domain`. Once verified, resend the invitation.

## Do you need to change code?

- **Frontend:** no code changes are required. Railway proxies the custom domain to the same deployment. Ensure environment variables that build URLs (such as `VITE_API_URL`) are correct.
- **Backend:** you can keep `*.railway.app` or attach a custom domain; if you attach a custom domain, add it to the backend service and create a separate DNS record.
- **Invitations and emails:** update any environment variables that embed the frontend URL (for example, `INVITE_URL=https://recruitment.nboard.au/login`). This is done in Railway variables without code changes.

## FAQ

- **Do I need to buy an SSL certificate?** No, Railway issues Let's Encrypt certificates for free.
- **Railway cannot see the CNAME.** Wait 10-15 minutes and check DNS with `nslookup`. Ensure the record is saved and does not conflict with A/AAAA records.
- **Can I use `www.recruitment.nboard.au`?** Yes. Add a second subdomain in Railway and create a separate CNAME `www` -> `recruitment20-frontend-production.up.railway.app`, or redirect `www` to the main domain.
- **Do I need the root domain `nboard.au`?** Not if you only use `recruitment2.0.nboard.au` and `recruitment.nboard.au`. The root domain is only required for `https://nboard.au`.
- **What about the GoDaddy `_domainconnect` CNAME?** It is a system record used by DomainConnect and does not conflict with Railway.

Following this checklist, the site should open at `https://recruitment.nboard.au`, and Railway will handle HTTPS renewal automatically.
