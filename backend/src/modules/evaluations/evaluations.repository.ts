import { postgresPool } from '../../shared/database/postgres.client.js';
import {
  EvaluationRecord,
  EvaluationWriteModel,
  InterviewSlotModel,
  InterviewStatusModel
} from './evaluations.types.js';

interface EvaluationRow extends Record<string, unknown> {
  id: string;
  candidate_id: string | null;
  round_number: number | null;
  interview_count: number | null;
  interviews: unknown;
  fit_question_id: string | null;
  version: number;
  created_at: Date;
  updated_at: Date;
  forms: unknown;
}

const mapSlots = (value: unknown): InterviewSlotModel[] => {
  if (!Array.isArray(value)) {
    return [];
  }
  const slots: InterviewSlotModel[] = [];
  for (const entry of value) {
    if (!entry || typeof entry !== 'object') {
      continue;
    }
    const item = entry as Record<string, unknown>;
    const id = typeof item.id === 'string' ? item.id.trim() : '';
    const interviewerName = typeof item.interviewerName === 'string' ? item.interviewerName : '';
    const interviewerEmail = typeof item.interviewerEmail === 'string' ? item.interviewerEmail : '';
    if (!id || !interviewerName) {
      continue;
    }
    const caseFolderId = typeof item.caseFolderId === 'string' ? item.caseFolderId.trim() || undefined : undefined;
    const fitQuestionId = typeof item.fitQuestionId === 'string' ? item.fitQuestionId.trim() || undefined : undefined;
    slots.push({ id, interviewerName, interviewerEmail, caseFolderId, fitQuestionId });
  }
  return slots;
};

const mapForms = (value: unknown): InterviewStatusModel[] => {
  if (!Array.isArray(value)) {
    return [];
  }
  const forms: InterviewStatusModel[] = [];
  for (const entry of value) {
    if (!entry || typeof entry !== 'object') {
      continue;
    }
    const item = entry as Record<string, unknown>;
    const slotId = typeof item.slotId === 'string' ? item.slotId.trim() : '';
    if (!slotId) {
      continue;
    }
    const interviewerName = typeof item.interviewerName === 'string' ? item.interviewerName : 'Interviewer';
    const submitted = typeof item.submitted === 'boolean' ? item.submitted : false;
    const submittedAt =
      typeof item.submittedAt === 'string' && item.submittedAt.trim()
        ? new Date(item.submittedAt).toISOString()
        : undefined;
    const notes = typeof item.notes === 'string' ? item.notes : undefined;
    forms.push({ slotId, interviewerName, submitted, submittedAt, notes });
  }
  return forms;
};

const mapRowToRecord = (row: EvaluationRow): EvaluationRecord => {
  const interviews = mapSlots(row.interviews);
  const forms = mapForms(row.forms);
  const interviewCount =
    typeof row.interview_count === 'number' && Number.isFinite(row.interview_count)
      ? row.interview_count
      : interviews.length;

  return {
    id: row.id,
    candidateId: row.candidate_id ?? undefined,
    roundNumber: row.round_number ?? undefined,
    interviewCount,
    interviews,
    fitQuestionId: row.fit_question_id ?? undefined,
    version: Number(row.version ?? 1),
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
    forms
  } satisfies EvaluationRecord;
};

export class EvaluationsRepository {
  async listEvaluations(): Promise<EvaluationRecord[]> {
    const result = await postgresPool.query<EvaluationRow>(
      `SELECT id, candidate_id, round_number, interview_count, interviews, fit_question_id, version, created_at, updated_at, forms
         FROM evaluations
        ORDER BY updated_at DESC, created_at DESC;`
    );
    return result.rows.map((row) => mapRowToRecord(row));
  }

  async createEvaluation(model: EvaluationWriteModel): Promise<EvaluationRecord> {
    const interviewsJson = JSON.stringify(model.interviews);
    const formsJson = JSON.stringify(model.forms);

    const result = await postgresPool.query<EvaluationRow>(
      `INSERT INTO evaluations (id, candidate_id, round_number, interview_count, interviews, fit_question_id, version, created_at, updated_at, forms)
         VALUES ($1, $2, $3, $4, $5::jsonb, $6, 1, NOW(), NOW(), $7::jsonb)
      RETURNING id, candidate_id, round_number, interview_count, interviews, fit_question_id, version, created_at, updated_at, forms;`,
      [
        model.id,
        model.candidateId ?? null,
        model.roundNumber ?? null,
        model.interviewCount,
        interviewsJson,
        model.fitQuestionId ?? null,
        formsJson
      ]
    );

    return mapRowToRecord(result.rows[0]);
  }

  async updateEvaluation(
    model: EvaluationWriteModel,
    expectedVersion: number
  ): Promise<'version-conflict' | EvaluationRecord | null> {
    const interviewsJson = JSON.stringify(model.interviews);
    const formsJson = JSON.stringify(model.forms);

    const result = await postgresPool.query<EvaluationRow>(
      `UPDATE evaluations
          SET candidate_id = $1,
              round_number = $2,
              interview_count = $3,
              interviews = $4::jsonb,
              fit_question_id = $5,
              forms = $6::jsonb,
              version = version + 1,
              updated_at = NOW()
        WHERE id = $7 AND version = $8
      RETURNING id, candidate_id, round_number, interview_count, interviews, fit_question_id, version, created_at, updated_at, forms;`,
      [
        model.candidateId ?? null,
        model.roundNumber ?? null,
        model.interviewCount,
        interviewsJson,
        model.fitQuestionId ?? null,
        formsJson,
        model.id,
        expectedVersion
      ]
    );

    if (result.rows.length === 0) {
      const exists = await postgresPool.query('SELECT id FROM evaluations WHERE id = $1 LIMIT 1;', [model.id]);
      if (exists.rows.length === 0) {
        return null;
      }
      return 'version-conflict';
    }

    return mapRowToRecord(result.rows[0]);
  }

  async deleteEvaluation(id: string): Promise<boolean> {
    const result = await postgresPool.query('DELETE FROM evaluations WHERE id = $1 RETURNING id;', [id]);
    return result.rows.length > 0;
  }
}
