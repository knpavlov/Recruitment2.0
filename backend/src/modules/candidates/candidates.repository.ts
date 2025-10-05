import { postgresPool } from '../../shared/database/postgres.client.js';
import type { CandidateRecord } from './candidates.service.js';

interface CandidateRow extends Record<string, unknown> {
  id: string;
  first_name: string;
  last_name: string;
}

export class CandidatesRepository {
  async listCandidates(): Promise<CandidateRecord[]> {
    const result = await postgresPool.query<CandidateRow>(
      'SELECT id, first_name, last_name FROM candidates ORDER BY created_at DESC;'
    );
    return result.rows.map((row) => ({
      id: row.id,
      firstName: row.first_name,
      lastName: row.last_name
    }));
  }
}
