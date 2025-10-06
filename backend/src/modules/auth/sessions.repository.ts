import { postgresPool } from '../../shared/database/postgres.client.js';

interface SessionRow extends Record<string, unknown> {
  token: string;
  account_id: string;
  expires_at: string;
  remember_me: boolean;
  created_at: string;
  account_email: string;
  account_role: string;
  account_status: string;
}

export interface SessionRecord {
  token: string;
  accountId: string;
  email: string;
  role: string;
  expiresAt: Date;
  rememberMe: boolean;
}

export class SessionsRepository {
  // Удаляем просроченные сессии перед выполнением операций
  async purgeExpiredSessions() {
    await postgresPool.query('DELETE FROM sessions WHERE expires_at < NOW();');
  }

  async createSession(record: { token: string; accountId: string; expiresAt: Date; rememberMe: boolean }) {
    await this.purgeExpiredSessions();
    await postgresPool.query(
      `INSERT INTO sessions (token, account_id, expires_at, remember_me, created_at)
       VALUES ($1, $2, $3, $4, NOW())`,
      [record.token, record.accountId, record.expiresAt, record.rememberMe]
    );
  }

  async deleteByToken(token: string) {
    await postgresPool.query('DELETE FROM sessions WHERE token = $1;', [token]);
  }

  async findActiveSession(token: string): Promise<SessionRecord | null> {
    await this.purgeExpiredSessions();
    const result = await postgresPool.query<SessionRow>(
      `SELECT s.token,
              s.account_id,
              s.expires_at,
              s.remember_me,
              s.created_at,
              a.email AS account_email,
              a.role AS account_role,
              a.status AS account_status
         FROM sessions s
         JOIN accounts a ON a.id = s.account_id
        WHERE s.token = $1
        LIMIT 1;`,
      [token]
    );
    const row = result.rows[0];
    if (!row) {
      return null;
    }
    if (row.account_status !== 'active') {
      await this.deleteByToken(token);
      return null;
    }
    return {
      token: row.token,
      accountId: row.account_id,
      email: row.account_email,
      role: row.account_role,
      expiresAt: new Date(row.expires_at),
      rememberMe: row.remember_me
    };
  }
}
