import { postgresPool } from '../../shared/database/postgres.client.js';
import { shouldUseInMemoryDatabase } from '../../shared/database/environment.js';
import { inMemoryStore } from '../../shared/database/inMemoryStore.js';

interface AccessCodeRow extends Record<string, unknown> {
  email: string;
  code: string;
  expires_at: string;
}

export interface AccessCodeRecord {
  email: string;
  code: string;
  expiresAt: Date;
}

const mapRow = (row: AccessCodeRow): AccessCodeRecord => ({
  email: row.email,
  code: row.code,
  expiresAt: new Date(row.expires_at)
});

export class AccessCodesRepository {
  async saveCode(record: AccessCodeRecord): Promise<void> {
    if (shouldUseInMemoryDatabase) {
      await inMemoryStore.accessCodes.save(record);
      return;
    }
    await postgresPool.query(
      `INSERT INTO access_codes (email, code, expires_at, created_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (email) DO UPDATE SET code = EXCLUDED.code, expires_at = EXCLUDED.expires_at, created_at = NOW();`,
      [record.email, record.code, record.expiresAt]
    );
  }

  async findCode(email: string, code: string): Promise<AccessCodeRecord | null> {
    if (shouldUseInMemoryDatabase) {
      return inMemoryStore.accessCodes.find(email, code);
    }
    const result = await postgresPool.query<AccessCodeRow>(
      'SELECT email, code, expires_at FROM access_codes WHERE email = $1 AND code = $2 LIMIT 1;',
      [email, code]
    );
    const row = result.rows[0];
    return row ? mapRow(row) : null;
  }

  async deleteCode(email: string): Promise<void> {
    if (shouldUseInMemoryDatabase) {
      await inMemoryStore.accessCodes.delete(email);
      return;
    }
    await postgresPool.query('DELETE FROM access_codes WHERE email = $1;', [email]);
  }
}
