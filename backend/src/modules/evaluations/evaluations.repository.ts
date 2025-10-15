import { randomUUID } from 'crypto';
import { postgresPool } from '../../shared/database/postgres.client.js';
import {
  EvaluationRecord,
  EvaluationWriteModel,
  InterviewSlotModel,
  InterviewStatusModel,
  InterviewAssignmentModel,
  InterviewAssignmentRecord,
  EvaluationCriterionScore,
  EvaluationRoundSnapshot
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
  process_status: string | null;
  process_started_at: Date | null;
  round_history: unknown;
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

const mapCriterionScore = (value: unknown): EvaluationCriterionScore | null => {
  if (!value || typeof value !== 'object') {
    return null;
  }
  const payload = value as Record<string, unknown>;
  const criterionId = typeof payload.criterionId === 'string' ? payload.criterionId.trim() : '';
  if (!criterionId) {
    return null;
  }
  const rawScore = payload.score;
  let score: number | undefined;
  if (typeof rawScore === 'number' && Number.isFinite(rawScore)) {
    score = rawScore;
  } else if (typeof rawScore === 'string' && rawScore.trim()) {
    const parsed = Number(rawScore);
    if (Number.isFinite(parsed)) {
      score = parsed;
    }
  }
  return { criterionId, score };
};

const mapCriteriaList = (value: unknown): EvaluationCriterionScore[] => {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((entry) => mapCriterionScore(entry))
    .filter((item): item is EvaluationCriterionScore => Boolean(item));
};

const readOfferRecommendation = (value: unknown): InterviewStatusModel['offerRecommendation'] | undefined => {
  if (value === 'yes_priority' || value === 'yes_strong' || value === 'yes_keep_warm' || value === 'no_offer') {
    return value;
  }
  return undefined;
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
    const fitScore = typeof item.fitScore === 'number' ? item.fitScore : undefined;
    const caseScore = typeof item.caseScore === 'number' ? item.caseScore : undefined;
    const fitNotes = typeof item.fitNotes === 'string' ? item.fitNotes : undefined;
    const caseNotes = typeof item.caseNotes === 'string' ? item.caseNotes : undefined;
    forms.push({
      slotId,
      interviewerName,
      submitted,
      submittedAt,
      notes,
      fitScore,
      caseScore,
      fitNotes,
      caseNotes,
      fitCriteria: mapCriteriaList(item.fitCriteria),
      caseCriteria: mapCriteriaList(item.caseCriteria),
      interestNotes: typeof item.interestNotes === 'string' ? item.interestNotes : undefined,
      issuesToTest: typeof item.issuesToTest === 'string' ? item.issuesToTest : undefined,
      offerRecommendation: readOfferRecommendation(item.offerRecommendation)
    });
  }
  return forms;
};

const mapRoundHistory = (value: unknown): EvaluationRoundSnapshot[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  const history: EvaluationRoundSnapshot[] = [];
  for (const entry of value) {
    if (!entry || typeof entry !== 'object') {
      continue;
    }
    const item = entry as Record<string, unknown>;
    const rawRoundNumber = item.roundNumber;
    const roundNumber =
      typeof rawRoundNumber === 'number' && Number.isInteger(rawRoundNumber) && rawRoundNumber > 0
        ? rawRoundNumber
        : undefined;
    if (!roundNumber) {
      continue;
    }
    const interviews = mapSlots(item.interviews);
    const forms = mapForms(item.forms);
    const interviewCount =
      typeof item.interviewCount === 'number' && Number.isFinite(item.interviewCount)
        ? item.interviewCount
        : interviews.length;
    const fitQuestionId =
      typeof item.fitQuestionId === 'string' ? item.fitQuestionId.trim() || undefined : undefined;
    const processStatus =
      item.processStatus === 'completed' || item.processStatus === 'in-progress'
        ? item.processStatus
        : 'draft';
    const processStartedAt =
      typeof item.processStartedAt === 'string' && item.processStartedAt.trim()
        ? new Date(item.processStartedAt).toISOString()
        : undefined;
    const completedAt =
      typeof item.completedAt === 'string' && item.completedAt.trim()
        ? new Date(item.completedAt).toISOString()
        : undefined;
    const createdAt =
      typeof item.createdAt === 'string' && item.createdAt.trim()
        ? new Date(item.createdAt).toISOString()
        : new Date().toISOString();

    history.push({
      roundNumber,
      interviewCount,
      interviews,
      forms,
      fitQuestionId,
      processStatus,
      processStartedAt,
      completedAt,
      createdAt
    });
  }

  return history;
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
    forms,
    processStatus: (row.process_status as EvaluationRecord['processStatus']) ?? 'draft',
    processStartedAt: row.process_started_at ? row.process_started_at.toISOString() : undefined,
    roundHistory: mapRoundHistory(row.round_history),
    invitationState: { hasInvitations: false, hasPendingChanges: false }
  } satisfies EvaluationRecord;
};

interface AssignmentRow extends Record<string, unknown> {
  id: string;
  evaluation_id: string;
  slot_id: string;
  interviewer_email: string;
  interviewer_name: string;
  case_folder_id: string;
  fit_question_id: string;
  round_number: number;
  invitation_sent_at: Date;
  created_at: Date;
}

interface ExistingAssignmentRow extends Record<string, unknown> {
  id: string;
  slot_id: string;
  invitation_sent_at: Date;
  created_at: Date;
}

const mapRowToAssignment = (row: AssignmentRow): InterviewAssignmentRecord => ({
  id: row.id,
  evaluationId: row.evaluation_id,
  slotId: row.slot_id,
  interviewerEmail: row.interviewer_email,
  interviewerName: row.interviewer_name,
  caseFolderId: row.case_folder_id,
  fitQuestionId: row.fit_question_id,
  roundNumber: Number(row.round_number ?? 1) || 1,
  invitationSentAt: row.invitation_sent_at.toISOString(),
  createdAt: row.created_at.toISOString()
});

export class EvaluationsRepository {
  async listEvaluations(): Promise<EvaluationRecord[]> {
    const result = await postgresPool.query<EvaluationRow>(
      `SELECT id,
              candidate_id,
              round_number,
              interview_count,
              interviews,
              fit_question_id,
              version,
              created_at,
              updated_at,
              forms,
              process_status,
              process_started_at,
              round_history
         FROM evaluations
        ORDER BY updated_at DESC, created_at DESC;`
    );
    return result.rows.map((row) => mapRowToRecord(row));
  }

  async findEvaluation(id: string): Promise<EvaluationRecord | null> {
    const result = await postgresPool.query<EvaluationRow>(
      `SELECT id,
              candidate_id,
              round_number,
              interview_count,
              interviews,
              fit_question_id,
              version,
              created_at,
              updated_at,
              forms,
              process_status,
              process_started_at,
              round_history
         FROM evaluations
        WHERE id = $1
        LIMIT 1;`,
      [id]
    );
    if (result.rows.length === 0) {
      return null;
    }
    return mapRowToRecord(result.rows[0]);
  }

  async createEvaluation(model: EvaluationWriteModel): Promise<EvaluationRecord> {
    const interviewsJson = JSON.stringify(model.interviews);
    const formsJson = JSON.stringify(model.forms);
    const historyJson = JSON.stringify(model.roundHistory ?? []);

    const result = await postgresPool.query<EvaluationRow>(
      `INSERT INTO evaluations (id, candidate_id, round_number, interview_count, interviews, fit_question_id, version, created_at, updated_at, forms, round_history, process_status, process_started_at)
         VALUES ($1, $2, $3, $4, $5::jsonb, $6, 1, NOW(), NOW(), $7::jsonb, $8::jsonb, $9, $10)
      RETURNING id,
                candidate_id,
                round_number,
                interview_count,
                interviews,
                fit_question_id,
                version,
                created_at,
                updated_at,
                forms,
                process_status,
                process_started_at,
                round_history;`,
      [
        model.id,
        model.candidateId ?? null,
        model.roundNumber ?? null,
        model.interviewCount,
        interviewsJson,
        model.fitQuestionId ?? null,
        formsJson,
        historyJson,
        model.processStatus ?? 'draft',
        model.processStartedAt ?? null
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
    const historyJson = JSON.stringify(model.roundHistory ?? []);

    const result = await postgresPool.query<EvaluationRow>(
      `UPDATE evaluations
          SET candidate_id = $1,
              round_number = $2,
              interview_count = $3,
              interviews = $4::jsonb,
              fit_question_id = $5,
              forms = $6::jsonb,
              round_history = $7::jsonb,
              process_status = $8,
              process_started_at = $9,
              version = version + 1,
              updated_at = NOW()
        WHERE id = $10 AND version = $11
      RETURNING id,
                candidate_id,
                round_number,
                interview_count,
                interviews,
                fit_question_id,
                version,
                created_at,
                updated_at,
                forms,
                process_status,
                process_started_at,
                round_history;`,
      [
        model.candidateId ?? null,
        model.roundNumber ?? null,
        model.interviewCount,
        interviewsJson,
        model.fitQuestionId ?? null,
        formsJson,
        historyJson,
        model.processStatus ?? 'draft',
        model.processStartedAt ?? null,
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

  async storeAssignments(
    evaluationId: string,
    assignments: InterviewAssignmentModel[],
    options: {
      status: EvaluationRecord['processStatus'];
      refreshSlotIds: string[];
      updateStartedAt: boolean;
      roundNumber: number;
    }
  ): Promise<void> {
    // Нормализуем список назначений, чтобы исключить дубли слотов и пустые значения.
    const normalizedAssignmentsMap = new Map<string, InterviewAssignmentModel>();
    for (const entry of assignments) {
      if (!entry || typeof entry.slotId !== 'string') {
        continue;
      }
      const slotId = entry.slotId.trim();
      if (!slotId) {
        continue;
      }
      const interviewerEmail = typeof entry.interviewerEmail === 'string' ? entry.interviewerEmail.trim() : '';
      const interviewerName =
        typeof entry.interviewerName === 'string' && entry.interviewerName.trim()
          ? entry.interviewerName.trim()
          : 'Interviewer';
      const caseFolderId = typeof entry.caseFolderId === 'string' ? entry.caseFolderId.trim() : '';
      const fitQuestionId = typeof entry.fitQuestionId === 'string' ? entry.fitQuestionId.trim() : '';
      if (!interviewerEmail || !caseFolderId || !fitQuestionId) {
        continue;
      }
      normalizedAssignmentsMap.set(slotId, {
        slotId,
        interviewerEmail,
        interviewerName,
        caseFolderId,
        fitQuestionId
      });
    }

    const normalizedAssignments = Array.from(normalizedAssignmentsMap.values());

    const client = await (postgresPool as unknown as { connect: () => Promise<any> }).connect();
    try {
      await client.query('BEGIN');

      const statusResult = await client.query(
        'SELECT process_status FROM evaluations WHERE id = $1 FOR UPDATE;',
        [evaluationId]
      );

      if (statusResult.rows.length === 0) {
        await client.query('ROLLBACK');
        throw new Error('NOT_FOUND');
      }

      const normalizedRound = Number.isFinite(options.roundNumber)
        ? Math.max(1, Math.trunc(options.roundNumber))
        : 1;

      const existingAssignmentsResult = await client.query(
        `SELECT id, slot_id, invitation_sent_at, created_at
           FROM evaluation_assignments
          WHERE evaluation_id = $1 AND round_number = $2;`,
        [evaluationId, normalizedRound]
      );

      const existingBySlot = new Map(
        (existingAssignmentsResult.rows as ExistingAssignmentRow[]).map((row) => [
          row.slot_id,
          {
            id: row.id,
            invitationSentAt: row.invitation_sent_at,
            createdAt: row.created_at
          }
        ])
      );

      const newSlotIdSet = new Set(normalizedAssignments.map((assignment) => assignment.slotId));
      const removedSlotIds = (existingAssignmentsResult.rows as ExistingAssignmentRow[])
        .map((row) => row.slot_id)
        .filter((slotId) => !newSlotIdSet.has(slotId));

      if (removedSlotIds.length > 0) {
        await client.query(
          `DELETE FROM evaluation_assignments
            WHERE evaluation_id = $1
              AND round_number = $2
              AND slot_id = ANY($3::text[]);`,
          [evaluationId, normalizedRound, removedSlotIds]
        );
      }

      const refreshIdSet = new Set(
        (options.refreshSlotIds ?? [])
          .filter((id): id is string => typeof id === 'string')
          .map((id) => id.trim())
          .filter((id) => id.length > 0 && normalizedAssignmentsMap.has(id))
      );

      for (const assignment of normalizedAssignments) {
        const existing = existingBySlot.get(assignment.slotId);
        const assignmentId = existing?.id ?? randomUUID();
        const shouldRefresh = refreshIdSet.has(assignment.slotId) || !existing;
        const previousInvitation = existing?.invitationSentAt ?? null;
        const previousCreatedAt = existing?.createdAt ?? null;
        await client.query(
          `INSERT INTO evaluation_assignments (
             id,
             evaluation_id,
             slot_id,
             interviewer_email,
             interviewer_name,
             case_folder_id,
             fit_question_id,
             round_number,
             invitation_sent_at,
             created_at
           ) VALUES (
             $1,
             $2,
             $3,
             $4,
             $5,
             $6,
             $7,
             $8,
             CASE
               WHEN $9::boolean THEN NOW()
               ELSE COALESCE($10::timestamptz, NOW())
             END,
             COALESCE($11::timestamptz, NOW())
           )
           ON CONFLICT (evaluation_id, slot_id)
           DO UPDATE
             SET id = EXCLUDED.id,
                 interviewer_email = EXCLUDED.interviewer_email,
                 interviewer_name = EXCLUDED.interviewer_name,
                 case_folder_id = EXCLUDED.case_folder_id,
                 fit_question_id = EXCLUDED.fit_question_id,
                 round_number = EXCLUDED.round_number,
                 invitation_sent_at = CASE
                   WHEN $9::boolean THEN NOW()
                   ELSE COALESCE(evaluation_assignments.invitation_sent_at, $10::timestamptz, NOW())
                 END,
                 created_at = COALESCE(evaluation_assignments.created_at, $11::timestamptz, NOW());`,
          [
            assignmentId,
            evaluationId,
            assignment.slotId,
            assignment.interviewerEmail,
            assignment.interviewerName,
            assignment.caseFolderId,
            assignment.fitQuestionId,
            normalizedRound,
            shouldRefresh,
            previousInvitation,
            previousCreatedAt
          ]
        );
      }

      await client.query(
        `UPDATE evaluations
            SET process_status = $2,
                process_started_at = CASE
                  WHEN $3::boolean IS TRUE THEN COALESCE(process_started_at, NOW())
                  ELSE process_started_at
                END,
                updated_at = NOW()
          WHERE id = $1;`,
        [evaluationId, options.status, options.updateStartedAt]
      );

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async listAssignmentsByEmail(email: string): Promise<InterviewAssignmentRecord[]> {
    const result = await postgresPool.query<AssignmentRow>(
      `SELECT id,
              evaluation_id,
              slot_id,
              interviewer_email,
              interviewer_name,
              case_folder_id,
              fit_question_id,
              round_number,
              invitation_sent_at,
              created_at
         FROM evaluation_assignments
        WHERE lower(interviewer_email) = lower($1)
        ORDER BY invitation_sent_at DESC, created_at DESC;`,
      [email]
    );
    return result.rows.map((row) => mapRowToAssignment(row));
  }

  async listAssignmentsForEvaluation(evaluationId: string): Promise<InterviewAssignmentRecord[]> {
    const result = await postgresPool.query<AssignmentRow>(
      `SELECT id,
              evaluation_id,
              slot_id,
              interviewer_email,
              interviewer_name,
              case_folder_id,
              fit_question_id,
              round_number,
              invitation_sent_at,
              created_at
         FROM evaluation_assignments
        WHERE evaluation_id = $1
        ORDER BY invitation_sent_at DESC, created_at DESC;`,
      [evaluationId]
    );
    return result.rows.map((row) => mapRowToAssignment(row));
  }

  async findAssignment(
    evaluationId: string,
    slotId: string
  ): Promise<InterviewAssignmentRecord | null> {
    const result = await postgresPool.query<AssignmentRow>(
      `SELECT id,
              evaluation_id,
              slot_id,
              interviewer_email,
              interviewer_name,
              case_folder_id,
              fit_question_id,
              round_number,
              invitation_sent_at,
              created_at
         FROM evaluation_assignments
        WHERE evaluation_id = $1 AND slot_id = $2
        LIMIT 1;`,
      [evaluationId, slotId]
    );
    if (result.rows.length === 0) {
      return null;
    }
    return mapRowToAssignment(result.rows[0]);
  }
}
