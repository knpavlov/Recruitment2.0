# Recruitment 2.0 Architecture

This document describes the initial modular structure of the project and the key development principles.

## Guiding principles

- Strict separation of layers: UI, state management, services, and infrastructure.
- Ability to extract business logic into independent packages for a future migration to Unity.
- TypeScript as the shared language for both the frontend and the backend.

## Frontend

- `src/app` — base application layout and navigation.
- `src/components` — reusable visual components without business logic.
- `src/modules` — screen-level modules with their own state.
- `src/shared` — types, utilities, and UI placeholders.
- Styles live in `src/styles` and are loaded via CSS modules.

## Backend

- `src/app` — Express entry point and route registration.
- `src/modules` — domain-specific modules (accounts, cases, candidates, evaluations, questions, authentication).
- `src/shared` — common infrastructure pieces (for example, the health check).
- Services rely on repository classes that encapsulate PostgreSQL access through a connection pool.
- During server startup lightweight migrations create tables and seed the super admin account.
- Deployment uses the `.nixpacks.toml` configuration, which installs dependencies via `npm install` and runs the build before the server starts.

## Next steps

1. Move migrations to a dedicated tool (for example, `node-pg-migrate` or Prisma) and add schema version control.
2. Connect an email queue and integrate with a mailing provider.
3. Store one-time codes and sessions in persistent storage with scalability in mind.
4. Integrate a production AI API for resume parsing and skill matching.
5. Add optimistic locking and WebSocket-based synchronization to notify about updates.
