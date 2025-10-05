import { randomUUID } from 'crypto';
import { postgresPool } from './postgres.client.js';

const SUPER_ADMIN_EMAIL = process.env.SUPER_ADMIN_EMAIL ?? 'super.admin@company.com';

const createTables = async () => {
  await postgresPool.query(`
    CREATE TABLE IF NOT EXISTS accounts (
      id UUID PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      role TEXT NOT NULL,
      status TEXT NOT NULL,
      invitation_token TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      activated_at TIMESTAMPTZ
    );
  `);

  await postgresPool.query(`
    CREATE TABLE IF NOT EXISTS access_codes (
      email TEXT PRIMARY KEY,
      code TEXT NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await postgresPool.query(`
    CREATE TABLE IF NOT EXISTS case_folders (
      id UUID PRIMARY KEY,
      name TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await postgresPool.query(`
    CREATE TABLE IF NOT EXISTS case_files (
      id UUID PRIMARY KEY,
      folder_id UUID NOT NULL REFERENCES case_folders(id) ON DELETE CASCADE,
      file_name TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await postgresPool.query(`
    ALTER TABLE case_folders
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
  `);

  await postgresPool.query(`
    ALTER TABLE case_folders
      ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;
  `);

  await postgresPool.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS case_folders_name_unique
      ON case_folders (LOWER(name));
  `);

  await postgresPool.query(`
    ALTER TABLE case_files
      ADD COLUMN IF NOT EXISTS mime_type TEXT;
  `);

  await postgresPool.query(`
    ALTER TABLE case_files
      ADD COLUMN IF NOT EXISTS size BIGINT;
  `);

  await postgresPool.query(`
    ALTER TABLE case_files
      ADD COLUMN IF NOT EXISTS data_url TEXT;
  `);

  await postgresPool.query(`
    ALTER TABLE case_files
      ADD COLUMN IF NOT EXISTS uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
  `);

  await postgresPool.query(`
    CREATE TABLE IF NOT EXISTS candidates (
      id UUID PRIMARY KEY,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await postgresPool.query(`
    CREATE TABLE IF NOT EXISTS evaluations (
      id UUID PRIMARY KEY,
      candidate_id UUID REFERENCES candidates(id) ON DELETE SET NULL,
      round_number INTEGER,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await postgresPool.query(`
    CREATE TABLE IF NOT EXISTS questions (
      id UUID PRIMARY KEY,
      title TEXT NOT NULL,
      category TEXT,
      difficulty TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
};

const seedSuperAdmin = async () => {
  await postgresPool.query(
    `INSERT INTO accounts (id, email, role, status, invitation_token, created_at, activated_at)
     VALUES ($1, $2, 'super-admin', 'active', 'seed', NOW(), NOW())
     ON CONFLICT (email) DO NOTHING;`,
    [randomUUID(), SUPER_ADMIN_EMAIL]
  );
};

export const runMigrations = async () => {
  // В простом варианте выполняем миграции последовательно при старте сервера
  await createTables();
  await seedSuperAdmin();
};
