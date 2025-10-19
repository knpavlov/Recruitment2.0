import { postgresPool } from '../../shared/database/postgres.client.js';

// Внутренние типы для выборок из базы
export interface CandidateSnapshotRow extends Record<string, unknown> {
  id: string;
  gender: string | null;
  created_at: Date;
}

export interface EvaluationSnapshotRow extends Record<string, unknown> {
  id: string;
  candidate_id: string | null;
  decision: string | null;
  offer_accepted: boolean | null;
  offer_accepted_at: Date | null;
  process_started_at: Date | null;
  created_at: Date;
  updated_at: Date;
  forms: unknown;
  candidate_gender: string | null;
  candidate_created_at: Date | null;
}

export interface AssignmentSnapshotRow extends Record<string, unknown> {
  id: string;
  evaluation_id: string;
  slot_id: string;
  interviewer_email: string | null;
  interviewer_name: string;
  round_number: number;
  invitation_sent_at: Date | null;
  created_at: Date;
}

export interface CandidateSnapshot {
  id: string;
  gender?: string;
  createdAt: string;
}

export type EvaluationDecisionSnapshot = 'offer' | 'reject' | 'progress' | null;

export interface EvaluationFormSnapshot {
  slotId: string;
  interviewerName: string;
  interviewerEmail?: string;
  submitted: boolean;
  submittedAt?: string;
  caseScore?: number;
  fitScore?: number;
  offerRecommendation?: string;
}

export interface EvaluationSnapshot {
  id: string;
  candidateId?: string;
  candidateGender?: string;
  candidateCreatedAt?: string;
  decision: EvaluationDecisionSnapshot;
  offerAccepted?: boolean;
  offerAcceptedAt?: string;
  processStartedAt?: string;
  createdAt: string;
  updatedAt: string;
  forms: EvaluationFormSnapshot[];
}

export interface AssignmentSnapshot {
  id: string;
  evaluationId: string;
  slotId: string;
  interviewerEmail?: string;
  interviewerName: string;
  roundNumber: number;
  invitationSentAt?: string;
  createdAt: string;
}

const normalizeString = (value: unknown): string | undefined => {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed || undefined;
  }
  return undefined;
};

const normalizeNumber = (value: unknown): number | undefined => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      return undefined;
    }
    const parsed = Number(trimmed);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return undefined;
};

const normalizeBoolean = (value: unknown): boolean | undefined => {
  if (value === true) {
    return true;
  }
  if (value === false) {
    return false;
  }
  return undefined;
};

const normalizeIso = (value: Date | string | null | undefined): string | undefined => {
  if (!value) {
    return undefined;
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      return undefined;
    }
    const parsed = new Date(trimmed);
    return Number.isNaN(parsed.getTime()) ? trimmed : parsed.toISOString();
  }
  return undefined;
};

const mapForms = (input: unknown): EvaluationFormSnapshot[] => {
  if (!Array.isArray(input)) {
    return [];
  }
  const list: EvaluationFormSnapshot[] = [];
  for (const entry of input) {
    if (!entry || typeof entry !== 'object') {
      continue;
    }
    const payload = entry as Record<string, unknown>;
    const slotId = normalizeString(payload.slotId);
    if (!slotId) {
      continue;
    }
    list.push({
      slotId,
      interviewerName: normalizeString(payload.interviewerName) ?? 'Interviewer',
      interviewerEmail: normalizeString(payload.interviewerEmail),
      submitted: payload.submitted === true,
      submittedAt: normalizeIso(payload.submittedAt as string | null | undefined),
      caseScore: normalizeNumber(payload.caseScore),
      fitScore: normalizeNumber(payload.fitScore),
      offerRecommendation: normalizeString(payload.offerRecommendation)
    });
  }
  return list;
};

export class AnalyticsRepository {
  // Загружаем кандидатов за период
  async fetchCandidates(start: Date, end: Date): Promise<CandidateSnapshot[]> {
    const result = await postgresPool.query<CandidateSnapshotRow>(
      `SELECT id, gender, created_at
         FROM candidates
        WHERE created_at BETWEEN $1 AND $2
        ORDER BY created_at ASC`,
      [start, end]
    );

    return result.rows.map((row) => ({
      id: row.id,
      gender: normalizeString(row.gender),
      createdAt: row.created_at.toISOString()
    }));
  }

  // Загружаем оценки (evaluation) с формами и базовыми атрибутами
  async fetchEvaluations(start: Date, end: Date): Promise<EvaluationSnapshot[]> {
    const result = await postgresPool.query<EvaluationSnapshotRow>(
      `SELECT
         e.id,
         e.candidate_id,
         e.decision,
         e.offer_accepted,
         e.offer_accepted_at,
         e.process_started_at,
         e.created_at,
         e.updated_at,
         e.forms,
         c.gender AS candidate_gender,
         c.created_at AS candidate_created_at
        FROM evaluations e
        LEFT JOIN candidates c ON c.id = e.candidate_id
       WHERE (
          COALESCE(e.process_started_at, e.created_at) BETWEEN $1 AND $2
          OR e.updated_at BETWEEN $1 AND $2
          OR (e.offer_accepted_at IS NOT NULL AND e.offer_accepted_at BETWEEN $1 AND $2)
        )
       ORDER BY e.created_at ASC`,
      [start, end]
    );

    return result.rows.map((row) => {
      let decision: EvaluationDecisionSnapshot = null;
      if (row.decision === 'offer' || row.decision === 'reject' || row.decision === 'progress') {
        decision = row.decision;
      } else if (row.decision === null) {
        decision = null;
      }

      return {
        id: row.id,
        candidateId: normalizeString(row.candidate_id),
        candidateGender: normalizeString(row.candidate_gender),
        candidateCreatedAt: normalizeIso(row.candidate_created_at),
        decision,
        offerAccepted: normalizeBoolean(row.offer_accepted),
        offerAcceptedAt: normalizeIso(row.offer_accepted_at),
        processStartedAt: normalizeIso(row.process_started_at),
        createdAt: row.created_at.toISOString(),
        updatedAt: row.updated_at.toISOString(),
        forms: mapForms(row.forms)
      } satisfies EvaluationSnapshot;
    });
  }

  // Загружаем назначения интервьюеров для анализа статистики
  async fetchAssignments(start: Date, end: Date): Promise<AssignmentSnapshot[]> {
    const result = await postgresPool.query<AssignmentSnapshotRow>(
      `SELECT
         id,
         evaluation_id,
         slot_id,
         interviewer_email,
         interviewer_name,
         round_number,
         invitation_sent_at,
         created_at
        FROM evaluation_assignments
       WHERE COALESCE(invitation_sent_at, created_at) BETWEEN $1 AND $2
       ORDER BY created_at ASC`,
      [start, end]
    );

    return result.rows.map((row) => ({
      id: row.id,
      evaluationId: row.evaluation_id,
      slotId: row.slot_id,
      interviewerEmail: normalizeString(row.interviewer_email),
      interviewerName: normalizeString(row.interviewer_name) ?? 'Interviewer',
      roundNumber: Number.isFinite(row.round_number) ? Number(row.round_number) : 1,
      invitationSentAt: normalizeIso(row.invitation_sent_at),
      createdAt: row.created_at.toISOString()
    }));
  }

  // Загружаем назначения для конкретного списка оценок
  async fetchAssignmentsByEvaluationIds(evaluationIds: string[]): Promise<AssignmentSnapshot[]> {
    if (!evaluationIds.length) {
      return [];
    }

    const result = await postgresPool.query<AssignmentSnapshotRow>(
      `SELECT
         id,
         evaluation_id,
         slot_id,
         interviewer_email,
         interviewer_name,
         round_number,
         invitation_sent_at,
         created_at
        FROM evaluation_assignments
       WHERE evaluation_id = ANY($1::uuid[])
       ORDER BY created_at ASC`,
      [evaluationIds]
    );

    return result.rows.map((row) => ({
      id: row.id,
      evaluationId: row.evaluation_id,
      slotId: row.slot_id,
      interviewerEmail: normalizeString(row.interviewer_email),
      interviewerName: normalizeString(row.interviewer_name) ?? 'Interviewer',
      roundNumber: Number.isFinite(row.round_number) ? Number(row.round_number) : 1,
      invitationSentAt: normalizeIso(row.invitation_sent_at),
      createdAt: row.created_at.toISOString()
    }));
  }
}
