import { randomUUID } from 'crypto';
import { postgresPool } from './postgres.client.js';

const SUPER_ADMIN_EMAIL = process.env.SUPER_ADMIN_EMAIL ?? 'knpavlov@gmail.com';

const connectClient = async () =>
  (postgresPool as unknown as { connect: () => Promise<any> }).connect();

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
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      version INTEGER NOT NULL DEFAULT 1
    );
  `);

  await postgresPool.query(`
    CREATE TABLE IF NOT EXISTS case_files (
      id UUID PRIMARY KEY,
      folder_id UUID NOT NULL REFERENCES case_folders(id) ON DELETE CASCADE,
      file_name TEXT NOT NULL,
      mime_type TEXT,
      file_size INTEGER,
      data_url TEXT,
      uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await postgresPool.query(`
    CREATE TABLE IF NOT EXISTS case_evaluation_criteria (
      id UUID PRIMARY KEY,
      folder_id UUID NOT NULL REFERENCES case_folders(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      rating_1 TEXT,
      rating_2 TEXT,
      rating_3 TEXT,
      rating_4 TEXT,
      rating_5 TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await postgresPool.query(`
    CREATE TABLE IF NOT EXISTS case_criteria (
      id UUID PRIMARY KEY,
      title TEXT NOT NULL,
      rating_1 TEXT,
      rating_2 TEXT,
      rating_3 TEXT,
      rating_4 TEXT,
      rating_5 TEXT,
      version INTEGER NOT NULL DEFAULT 1,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await postgresPool.query(`
    ALTER TABLE case_folders
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;
  `);

  await postgresPool.query(`
    ALTER TABLE case_files
      ADD COLUMN IF NOT EXISTS mime_type TEXT,
      ADD COLUMN IF NOT EXISTS file_size INTEGER,
      ADD COLUMN IF NOT EXISTS data_url TEXT,
      ADD COLUMN IF NOT EXISTS uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
  `);

  await postgresPool.query(`
    CREATE TABLE IF NOT EXISTS candidates (
      id UUID PRIMARY KEY,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      gender TEXT,
      age INTEGER,
      city TEXT,
      desired_position TEXT,
      target_practice TEXT,
      target_office TEXT,
      phone TEXT,
      email TEXT,
      experience_summary TEXT,
      total_experience_years INTEGER,
      consulting_experience_years INTEGER,
      consulting_companies TEXT,
      last_company TEXT,
      last_position TEXT,
      last_duration TEXT,
      version INTEGER NOT NULL DEFAULT 1,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await postgresPool.query(`
    ALTER TABLE candidates
      ADD COLUMN IF NOT EXISTS gender TEXT,
      ADD COLUMN IF NOT EXISTS age INTEGER,
      ADD COLUMN IF NOT EXISTS city TEXT,
      ADD COLUMN IF NOT EXISTS desired_position TEXT,
      ADD COLUMN IF NOT EXISTS target_practice TEXT,
      ADD COLUMN IF NOT EXISTS target_office TEXT,
      ADD COLUMN IF NOT EXISTS phone TEXT,
      ADD COLUMN IF NOT EXISTS email TEXT,
      ADD COLUMN IF NOT EXISTS experience_summary TEXT,
      ADD COLUMN IF NOT EXISTS total_experience_years INTEGER,
      ADD COLUMN IF NOT EXISTS consulting_experience_years INTEGER,
      ADD COLUMN IF NOT EXISTS consulting_companies TEXT,
      ADD COLUMN IF NOT EXISTS last_company TEXT,
      ADD COLUMN IF NOT EXISTS last_position TEXT,
      ADD COLUMN IF NOT EXISTS last_duration TEXT,
      ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1,
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
  `);

  await postgresPool.query(`
    CREATE TABLE IF NOT EXISTS candidate_resumes (
      id UUID PRIMARY KEY,
      candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
      file_name TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      file_size INTEGER NOT NULL,
      data_url TEXT NOT NULL,
      text_content TEXT,
      uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await postgresPool.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS candidate_resumes_candidate_id_idx
      ON candidate_resumes(candidate_id);
  `);

  await postgresPool.query(`
    CREATE TABLE IF NOT EXISTS evaluations (
      id UUID PRIMARY KEY,
      candidate_id UUID REFERENCES candidates(id) ON DELETE SET NULL,
      round_number INTEGER,
      interview_count INTEGER NOT NULL DEFAULT 0,
      interviews JSONB NOT NULL DEFAULT '[]'::JSONB,
      fit_question_id UUID,
      version INTEGER NOT NULL DEFAULT 1,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      forms JSONB NOT NULL DEFAULT '[]'::JSONB,
      process_status TEXT NOT NULL DEFAULT 'draft',
      process_started_at TIMESTAMPTZ,
      round_history JSONB NOT NULL DEFAULT '[]'::JSONB
    );
  `);

  await postgresPool.query(`
    ALTER TABLE evaluations
      ADD COLUMN IF NOT EXISTS interview_count INTEGER NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS interviews JSONB NOT NULL DEFAULT '[]'::JSONB,
      ADD COLUMN IF NOT EXISTS fit_question_id UUID,
      ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1,
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      ADD COLUMN IF NOT EXISTS forms JSONB NOT NULL DEFAULT '[]'::JSONB,
      ADD COLUMN IF NOT EXISTS process_status TEXT NOT NULL DEFAULT 'draft',
      ADD COLUMN IF NOT EXISTS process_started_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS round_history JSONB NOT NULL DEFAULT '[]'::JSONB;
  `);

  await postgresPool.query(`
    CREATE TABLE IF NOT EXISTS evaluation_assignments (
      id UUID PRIMARY KEY,
      evaluation_id UUID NOT NULL REFERENCES evaluations(id) ON DELETE CASCADE,
      slot_id TEXT NOT NULL,
      interviewer_email TEXT NOT NULL,
      interviewer_name TEXT NOT NULL,
      case_folder_id UUID NOT NULL,
      fit_question_id UUID NOT NULL,
      invitation_sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (evaluation_id, slot_id)
    );
  `);

  await postgresPool.query(`
    ALTER TABLE evaluation_assignments
      ADD COLUMN IF NOT EXISTS round_number INTEGER NOT NULL DEFAULT 1;
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

  await postgresPool.query(`
    CREATE TABLE IF NOT EXISTS fit_questions (
      id UUID PRIMARY KEY,
      short_title TEXT NOT NULL,
      content TEXT NOT NULL,
      version INTEGER NOT NULL DEFAULT 1,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await postgresPool.query(`
    CREATE TABLE IF NOT EXISTS fit_question_criteria (
      id UUID PRIMARY KEY,
      question_id UUID NOT NULL REFERENCES fit_questions(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      rating_1 TEXT,
      rating_2 TEXT,
      rating_3 TEXT,
      rating_4 TEXT,
      rating_5 TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await postgresPool.query(`
    ALTER TABLE fit_questions
      ADD COLUMN IF NOT EXISTS short_title TEXT NOT NULL DEFAULT 'Untitled question',
      ADD COLUMN IF NOT EXISTS content TEXT NOT NULL DEFAULT '',
      ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1,
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
  `);

  await postgresPool.query(`
    ALTER TABLE fit_questions
      ALTER COLUMN short_title DROP DEFAULT,
      ALTER COLUMN content DROP DEFAULT;
  `);

  await postgresPool.query(`
    ALTER TABLE fit_question_criteria
      ADD COLUMN IF NOT EXISTS rating_1 TEXT,
      ADD COLUMN IF NOT EXISTS rating_2 TEXT,
      ADD COLUMN IF NOT EXISTS rating_3 TEXT,
      ADD COLUMN IF NOT EXISTS rating_4 TEXT,
      ADD COLUMN IF NOT EXISTS rating_5 TEXT;
  `);
};

const syncSuperAdmin = async () => {
  const client = await connectClient();
  try {
    await client.query('BEGIN');
    const existing = await client.query(
      `SELECT id, email FROM accounts WHERE role = 'super-admin' ORDER BY created_at ASC LIMIT 1;`
    );

    if (existing.rowCount === 0) {
      await client.query(
        `INSERT INTO accounts (id, email, role, status, invitation_token, created_at, activated_at)
         VALUES ($1, $2, 'super-admin', 'active', 'seed', NOW(), NOW());`,
        [randomUUID(), SUPER_ADMIN_EMAIL]
      );
      await client.query('COMMIT');
      return;
    }

    const current = existing.rows[0] as { id: string; email: string };
    if (current.email === SUPER_ADMIN_EMAIL) {
      await client.query(
        `UPDATE accounts
            SET status = 'active',
                invitation_token = 'seed',
                activated_at = COALESCE(activated_at, NOW())
          WHERE id = $1;`,
        [current.id]
      );
      await client.query('COMMIT');
      return;
    }

    const conflict = await client.query(
      `SELECT 1 FROM accounts WHERE email = $1 AND role <> 'super-admin' LIMIT 1;`,
      [SUPER_ADMIN_EMAIL]
    );

    if (conflict.rowCount > 0) {
      console.warn(
        `Cannot update the super admin email: address ${SUPER_ADMIN_EMAIL} is already used by another account.`
      );
      await client.query('ROLLBACK');
      return;
    }

    await client.query(
      `UPDATE accounts
          SET email = $1,
              status = 'active',
              invitation_token = 'seed',
              activated_at = COALESCE(activated_at, NOW())
        WHERE id = $2;`,
      [SUPER_ADMIN_EMAIL, current.id]
    );
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export const runMigrations = async () => {
  // In this lightweight version we run migrations sequentially during server startup
  await createTables();
  await syncSuperAdmin();
};
