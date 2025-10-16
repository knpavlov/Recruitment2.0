import { AccountRecord } from './accounts.service.js';
import { postgresPool } from '../../shared/database/postgres.client.js';

const toTitleCase = (value: string): string =>
  value.replace(/\b\w+/g, (segment) => segment.charAt(0).toUpperCase() + segment.slice(1).toLowerCase());

const deriveNameFromEmail = (email: string): string | undefined => {
  const localPart = email.split('@')[0] ?? '';
  const normalized = localPart.replace(/[._-]+/g, ' ').trim();
  if (!normalized) {
    return undefined;
  }
  return toTitleCase(normalized);
};

const readLegacyName = (row: any): string | undefined => {
  const parts = [row.last_name, row.first_name]
    .map((value) => (typeof value === 'string' ? value.trim() : ''))
    .filter((value) => Boolean(value));
  if (parts.length === 0) {
    return undefined;
  }
  return parts.join(' ');
};

const mapRowToAccount = (row: any): AccountRecord => {
  const displayName = typeof row.display_name === 'string' ? row.display_name.trim() : '';
  const legacyName = readLegacyName(row);
  const fallbackName =
    displayName || legacyName || (typeof row.email === 'string' ? deriveNameFromEmail(row.email) ?? '' : '');

  return {
    id: row.id,
    email: row.email,
    role: row.role,
    status: row.status,
    name: fallbackName || undefined,
    invitationToken: row.invitation_token,
    createdAt: new Date(row.created_at),
    activatedAt: row.activated_at ? new Date(row.activated_at) : undefined
  };
};

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
      `INSERT INTO accounts (id, email, role, status, invitation_token, created_at, activated_at, display_name)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *;`,
      [
        record.id,
        record.email,
        record.role,
        record.status,
        record.invitationToken,
        record.createdAt,
        record.activatedAt ?? null,
        record.name ?? null
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
