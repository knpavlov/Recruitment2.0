# Recruitment 2.0

Monorepo for the recruiting team portal. The structure is split into the frontend (React + Vite) and backend (Express + TypeScript) with future migration of business logic into independent packages in mind.

## Structure

- `frontend/` — SPA with a modern interface, left navigation menu, and screens for cases, candidates, evaluations, and account management.
- `backend/` — Express API layer with modular domains.
- `docs/` — documentation about architecture and next steps. See [`docs/authentication-setup.md`](docs/authentication-setup.md) for the email + login checklist.

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
   SUPER_ADMIN_EMAIL=knpavlov@gmail.com
   ```
2. Run `npm install` — the `pg` driver will be installed together with the rest of the packages, and a local `package-lock.json` will be generated.
3. On the first `npm run dev` or `npm run start`, tables and the super admin account will be created automatically.

> ⚙️ For Railway deployment the repository contains `.nixpacks.toml`. It explicitly runs `npm install` in `backend/`, so new dependencies are installed even without a pre-generated `package-lock.json`.

### Email delivery configuration

You can use either Resend (recommended for Railway) or a custom SMTP server. The backend automatically prefers Resend when the related variables are present and falls back to SMTP otherwise. If neither provider is configured the API returns HTTP 503 and logs messages to the console instead of sending emails.

#### Option A — Resend via Railway

1. In Railway open your project → `Resend Starter` plugin and copy the `RESEND_API_KEY` from the "Variables" tab.
2. Open the backend service in Railway (`Recruitment2.0-backend`), add the following variables and redeploy:
   ```dotenv
   RESEND_API_KEY=your-resend-token
   RESEND_FROM=Recruitment 2.0 <login@your-domain.com>
   INVITE_URL=https://your-frontend-domain/login
   ```
   *`RESEND_FROM` must be a verified sender/domain inside Resend.*
3. Trigger any invitation or access-code flow — letters will be delivered through the Resend API.

##### Как недорого подтвердить домен для Resend

- **Выберите дешёвый регистратор.** Для минимальных затрат подойдут регистраторы с оплатой «по себестоимости» (например, Cloudflare Registrar) или поставщики с акциями на новые домены (`.click`, `.link`, `.shop` и т. п.). Первое приобретение обычно стоит 1–3 USD в год, а продление зависит от выбранной зоны.
- **Перенесите DNS в сервис с бесплатным тарифом.** Даже если регистратор не даёт гибких настроек, можно делегировать домен на Cloudflare или другой бесплатный DNS-сервис и там добавить TXT и CNAME, которые покажет Resend.
- **Подтвердите домен в Resend.** На вкладке *Domains* создайте запись, введите домен, а затем внесите предложенные DNS-записи. После подтверждения используйте адрес вида `Recruitment 2.0 <login@your-domain.com>` в переменной `RESEND_FROM`.
- **Платные почтовые ящики от регистратора не обязательны.** Resend берёт на себя отправку писем, поэтому достаточно владеть доменом и управлять его DNS. Дополнительные услуги вроде «Microsoft 365 Email» на GoDaddy можно пропустить, если не нужен отдельный почтовый ящик для чтения входящих сообщений на этом домене.
  - **Railway не подходит в роли почтового домена.** Бесплатные поддомены Railway (`*.up.railway.app`) управляются самим сервисом: вы не можете добавить собственные DNS-записи, поэтому их нельзя подтвердить в Resend. Для отправки писем нужен домен, которым вы управляете полностью.

##### Пошагово: что делать, когда Resend показал DNS-записи

1. **Откройте панель управления DNS у регистратора или в выбранном DNS-сервисе.** Внесите три записи из блока *DKIM and SPF*:
   - MX с приоритетом `10`, указывающий на `feedback-smtp.ap-northeast-1.amazonses.com`.
   - TXT-запись `send` со значением `v=spf1 include:amazonses.com ~all`.
   - TXT-запись `resend._domainkey` с длинным ключом, который вы видите в интерфейсе Resend.
2. **Добавьте запись DMARC (опционально, но желательно).** Создайте TXT `_dmarc` со значением `v=DMARC1; p=none;` или более строгой политикой, если уже готовы блокировать подделки.
3. **Сохраните изменения и дождитесь распространения DNS.** Обычно это занимает от пары минут до часа. В Resend кнопка «I've added the records» станет активной — нажмите её и дождитесь, пока статус домена сменится на *Verified*.
4. **Проверьте, что `RESEND_FROM` использует новый домен.** Например, `Recruitment 2.0 <login@nboard.au>`. После верификации Resend начнёт отправлять письма с этого адреса.
5. **(Опционально) Настройте переадресацию входящих писем.** Если хотите получать ответы, добавьте на стороне регистратора или почтового сервиса правило пересылки входящих с `login@nboard.au` на ваш основной ящик. Это не влияет на отправку писем через Resend.

#### Option B — Custom SMTP

1. Provide credentials in `backend/.env`:
   ```dotenv
   SMTP_HOST=smtp.mailprovider.com
   SMTP_PORT=587
   SMTP_SECURE=false
   SMTP_USER=notifications@company.com
   SMTP_PASSWORD=super-secret
   SMTP_FROM=Recruitment 2.0 <notifications@company.com>
   ```
2. Restart the backend — the service uses authenticated SMTP (LOGIN mechanism). All outgoing emails are sent from `SMTP_FROM` (or `SMTP_USER` if the first value is omitted).

> ℹ️ When neither Resend nor SMTP variables are set, the backend refuses to send invitations and access codes, keeping the database clean and avoiding misleading success messages.

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
