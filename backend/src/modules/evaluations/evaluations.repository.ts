import { postgresPool } from '../../shared/database/postgres.client.js';
import {
  EvaluationFormRecord,
  EvaluationInterviewRecord,
  EvaluationRecord,
  EvaluationWriteModel
} from './evaluations.types.js';

interface EvaluationRow extends Record<string, unknown> {
  id: string;
  candidate_id: string | null;
  round_number: number | null;
  interview_count: number | null;
  interviews: unknown;
  fit_question_id: string | null;
  forms: unknown;
  version: number;
  created_at: Date;
  updated_at: Date;
}

const selectEvaluationBase = `
  SELECT id,
         candidate_id,
         round_number,
         interview_count,
         interviews,
         fit_question_id,
         forms,
         version,
         created_at,
         updated_at
    FROM evaluations
`;

const toOptionalString = (value: unknown): string | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
};

const toOptionalIsoString = (value: unknown): string | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }
  const date = new Date(trimmed);
  if (Number.isNaN(date.getTime())) {
    return undefined;
  }
  return date.toISOString();
};

const parseInterviews = (value: unknown): EvaluationInterviewRecord[] => {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((item) => {
      if (!item || typeof item !== 'object') {
        return null;
      }
      const payload = item as Record<string, unknown>;
      const idRaw = toOptionalString(payload.id);
      if (!idRaw) {
        return null;
      }
      const interviewerName = toOptionalString(payload.interviewerName) ?? '';
      const interviewerEmail = toOptionalString(payload.interviewerEmail) ?? '';
      const caseFolderId = toOptionalString(payload.caseFolderId);
      const fitQuestionId = toOptionalString(payload.fitQuestionId);
      return {
        id: idRaw,
        interviewerName,
        interviewerEmail,
        caseFolderId,
        fitQuestionId
      } satisfies EvaluationInterviewRecord;
    })
    .filter((slot): slot is EvaluationInterviewRecord => Boolean(slot));
};

const parseForms = (
  value: unknown,
  interviews: EvaluationInterviewRecord[]
): EvaluationFormRecord[] => {
  const formMap = new Map<string, EvaluationFormRecord>();
  if (Array.isArray(value)) {
    value.forEach((item) => {
      if (!item || typeof item !== 'object') {
        return;
      }
      const payload = item as Record<string, unknown>;
      const slotId = toOptionalString(payload.slotId);
      if (!slotId) {
        return;
      }
      const interviewerName = toOptionalString(payload.interviewerName) ?? '';
      const submitted = payload.submitted === true;
      const submittedAt = toOptionalIsoString(payload.submittedAt);
      const notes = toOptionalString(payload.notes);
      formMap.set(slotId, {
        slotId,
        interviewerName,
        submitted,
        submittedAt,
        notes
      });
    });
  }

  return interviews.map((slot) => {
    const existing = formMap.get(slot.id);
    if (!existing) {
      return {
        slotId: slot.id,
        interviewerName: slot.interviewerName || 'Interviewer',
        submitted: false
      } satisfies EvaluationFormRecord;
    }
    return {
      slotId: slot.id,
      interviewerName: existing.interviewerName || slot.interviewerName || 'Interviewer',
      submitted: existing.submitted,
      submittedAt: existing.submittedAt,
      notes: existing.notes
    } satisfies EvaluationFormRecord;
  });
};

const mapRowToEvaluation = (row: EvaluationRow): EvaluationRecord => {
  const interviews = parseInterviews(row.interviews);
  const forms = parseForms(row.forms, interviews);
  const interviewCount = Number.isFinite(Number(row.interview_count))
    ? Number(row.interview_count)
    : interviews.length;

  return {
    id: row.id,
    candidateId: toOptionalString(row.candidate_id ?? undefined),
    roundNumber: typeof row.round_number === 'number' ? row.round_number : undefined,
    interviewCount,
    interviews,
    fitQuestionId: toOptionalString(row.fit_question_id ?? undefined),
    version: Number(row.version ?? 1),
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
    forms
  };
};

export class EvaluationsRepository {
  async listEvaluations(): Promise<EvaluationRecord[]> {
    const result = await postgresPool.query<EvaluationRow>(
      `${selectEvaluationBase} ORDER BY updated_at DESC, created_at DESC;`
    );
    return result.rows.map((row) => mapRowToEvaluation(row));
  }

  async findEvaluation(id: string): Promise<EvaluationRecord | null> {
    const result = await postgresPool.query<EvaluationRow>(
      `${selectEvaluationBase} WHERE id = $1 LIMIT 1;`,
      [id]
    );
    if (result.rows.length === 0) {
      return null;
    }
    return mapRowToEvaluation(result.rows[0]);
  }

  async createEvaluation(model: EvaluationWriteModel): Promise<EvaluationRecord> {
    const result = await postgresPool.query<EvaluationRow>(
      `INSERT INTO evaluations (
         id,
         candidate_id,
         round_number,
         interview_count,
         interviews,
         fit_question_id,
         forms,
         version,
         created_at,
         updated_at
       )
       VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7::jsonb, 1, NOW(), NOW())
       RETURNING id, candidate_id, round_number, interview_count, interviews, fit_question_id, forms, version, created_at, updated_at;`,
      [
        model.id,
        model.candidateId ?? null,
        model.roundNumber ?? null,
        model.interviewCount,
        JSON.stringify(model.interviews),
        model.fitQuestionId ?? null,
        JSON.stringify(model.forms)
      ]
    );
    return mapRowToEvaluation(result.rows[0]);
  }

  async updateEvaluation(
    model: EvaluationWriteModel,
    expectedVersion: number
  ): Promise<'version-conflict' | EvaluationRecord | null> {
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
        RETURNING id, candidate_id, round_number, interview_count, interviews, fit_question_id, forms, version, created_at, updated_at;`,
      [
        model.candidateId ?? null,
        model.roundNumber ?? null,
        model.interviewCount,
        JSON.stringify(model.interviews),
        model.fitQuestionId ?? null,
        JSON.stringify(model.forms),
        model.id,
        expectedVersion
      ]
    );

    if (result.rowCount === 0) {
      const exists = await postgresPool.query('SELECT id FROM evaluations WHERE id = $1 LIMIT 1;', [
        model.id
      ]);
      if (exists.rows.length === 0) {
        return null;
      }
      return 'version-conflict';
    }

    return mapRowToEvaluation(result.rows[0]);
  }

  async deleteEvaluation(id: string): Promise<boolean> {
    const result = await postgresPool.query('DELETE FROM evaluations WHERE id = $1 RETURNING id;', [id]);
    return result.rowCount > 0;
  }
}
