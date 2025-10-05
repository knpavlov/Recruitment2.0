import { postgresPool } from '../../shared/database/postgres.client.js';
import type { EvaluationRecord } from './evaluations.service.js';

interface EvaluationRow extends Record<string, unknown> {
  id: string;
  candidate_id: string | null;
  round_number: number | null;
}

export class EvaluationsRepository {
  async listEvaluations(): Promise<EvaluationRecord[]> {
    const result = await postgresPool.query<EvaluationRow>(
      'SELECT id, candidate_id, round_number FROM evaluations ORDER BY created_at DESC;'
    );
    return result.rows.map((row) => ({
      id: row.id,
      candidateId: row.candidate_id ?? undefined,
      roundNumber: row.round_number ?? undefined
    }));
  }
}
