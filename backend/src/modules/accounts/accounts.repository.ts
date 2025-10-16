import { AccountRecord } from './accounts.service.js';
import { postgresPool } from '../../shared/database/postgres.client.js';

const mapRowToAccount = (row: any): AccountRecord => ({
  id: row.id,
  email: row.email,
  role: row.role,
  status: row.status,
  firstName: typeof row.first_name === 'string' ? row.first_name : undefined,
  lastName: typeof row.last_name === 'string' ? row.last_name : undefined,
  invitationToken: row.invitation_token,
  createdAt: new Date(row.created_at),
  activatedAt: row.activated_at ? new Date(row.activated_at) : undefined
});

export class AccountsRepository {
  async listAccounts(): Promise<AccountRecord[]> {
    const result = await postgresPool.query('SELECT * FROM accounts ORDER BY created_at DESC;');
    return result.rows.map(mapRowToAccount);
  }

  async findByEmail(email: string): Promise<AccountRecord | null> {
    const result = await postgresPool.query('SELECT * FROM accounts WHERE email = $1 LIMIT 1;', [email]);
    const row = result.rows[0];
    return row ? mapRowToAccount(row) : null;
  }

  async findById(id: string): Promise<AccountRecord | null> {
    const result = await postgresPool.query('SELECT * FROM accounts WHERE id = $1 LIMIT 1;', [id]);
    const row = result.rows[0];
    return row ? mapRowToAccount(row) : null;
  }

  async insertAccount(record: AccountRecord): Promise<AccountRecord> {
    const result = await postgresPool.query(
      `INSERT INTO accounts (id, email, role, status, invitation_token, created_at, activated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *;`,
      [
        record.id,
        record.email,
        record.role,
        record.status,
        record.invitationToken,
        record.createdAt,
        record.activatedAt ?? null
      ]
    );
    return mapRowToAccount(result.rows[0]);
  }

  async updateActivation(id: string, activatedAt: Date): Promise<AccountRecord | null> {
    const result = await postgresPool.query(
      `UPDATE accounts
         SET status = 'active',
             activated_at = $2
       WHERE id = $1
       RETURNING *;`,
      [id, activatedAt]
    );
    const row = result.rows[0];
    return row ? mapRowToAccount(row) : null;
  }

  async removeAccount(id: string): Promise<AccountRecord | null> {
    const result = await postgresPool.query('DELETE FROM accounts WHERE id = $1 RETURNING *;', [id]);
    const row = result.rows[0];
    return row ? mapRowToAccount(row) : null;
  }
}
