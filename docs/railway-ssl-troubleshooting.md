# SSL/TLS Troubleshooting for Railway Domains

This guide helps diagnose SSL/TLS warnings on Railway-managed domains.

## Symptoms

- When opening `https://recruitment20-frontend-production.up.railway.app`, the browser shows a warning such as "Your connection is not private" / `NET::ERR_CERT_AUTHORITY_INVALID`.
- In the browser's **Advanced** details, the certificate is issued by an unknown CA or the domain name does not match.

## Why it happens

Railway issues free TLS certificates for `*.up.railway.app` through its proxy layer. If a service was recently recreated, moved between environments, or switched domains, the certificate may be in one of these states:

1. **Certificate not issued yet.** Railway requests a Let's Encrypt certificate only after the service responds to HTTP. Until then, a temporary Railway Proxy CA certificate may be served and is not trusted by browsers.
2. **Certificate issued, but browser cache is stale.** After a migration, the old certificate can remain in the browser HSTS cache and trigger warnings.
3. **Local network replaces the certificate.** Corporate filters (Cisco Umbrella, Zscaler, etc.) may intercept TLS and issue an intermediate certificate not trusted by the browser.
4. **Certificate is broken or detached.** This can happen after manual domain removal or a failed environment migration.

## How to diagnose

1. **Check the certificate via CLI.**
   - If the issuer is `Let's Encrypt`, the certificate is valid and the issue is likely a browser cache problem.
   - If the issuer is `Railway Proxy CA` or another unknown name, Railway has not issued the trusted certificate yet.
   - If the issuer shows a corporate proxy (for example, `Cisco Umbrella Secondary SubCA`), the network is intercepting TLS. Install the corporate root certificate or test from another network/VPN.
2. **Ensure the service responds over HTTP.** In Railway, open **Deployments** and confirm the latest deploy finished and **Metrics** shows successful requests.
3. **Check `Networking -> Certificates` in Railway.** It lists all domains and their SSL status.
4. **Compare from different networks.** Open the domain on mobile data or a VPN. If the warning disappears, the issue is local network filtering.

## How to fix

1. **Force certificate re-issuance.**
   - Open the `Recruitment2.0-frontend` service in Railway.
   - Go to `Settings -> Domains` and click `Refresh certificate` (or remove and re-add the domain `recruitment20-frontend-production.up.railway.app`).
   - Wait for **Ready** (usually 1-3 minutes).
2. **Restart the service after re-issuance.** Trigger a new deploy or restart so the proxy picks up the new certificate.
3. **Clear browser cache/HSTS.**
   - In Chrome, open `chrome://net-internals/#hsts`, delete the domain under **Delete domain security policies**, or use an incognito window.
4. **If the certificate is replaced by a corporate network.**
   - Install the corporate root certificate (typically provided by IT).
   - Or temporarily switch to a network without TLS inspection (mobile hotspot, home Wi-Fi, VPN).
   - If you cannot disable inspection, ask admins to allowlist `recruitment20-frontend-production.up.railway.app`.
5. **Check local time.** If the device date/time is wrong, TLS checks can fail even with a valid certificate.

## How to avoid repeat issues

- After infrastructure changes (environment migration, service renaming), verify `Networking -> Certificates` in Railway.
- Add a checklist item to verify the domain in `https://www.ssllabs.com/ssltest/`.
- Avoid using temporary `railway.app` domains for public access. Attach a custom domain so Railway issues and renews a Let's Encrypt certificate automatically.
