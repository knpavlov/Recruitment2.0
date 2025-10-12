import { EvaluationsRepository } from './evaluations.repository.js';
import { EvaluationRecord, EvaluationWriteModel } from './evaluations.types.js';

const readOptionalString = (value: unknown): string | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
};

const readOptionalPositiveInteger = (value: unknown): number | undefined => {
  if (typeof value === 'number' && Number.isInteger(value) && value > 0) {
    return value;
  }
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    if (Number.isInteger(parsed) && parsed > 0) {
      return parsed;
    }
  }
  return undefined;
};

const readOptionalScore = (value: unknown): number | undefined => {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return Number(value.toFixed(2));
  }
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed > 0) {
      return Number(parsed.toFixed(2));
    }
  }
  return undefined;
};

const readCriteriaList = (value: unknown) => {
  if (!Array.isArray(value)) {
    return [];
  }
  const list: EvaluationWriteModel['forms'][number]['fitCriteria'] = [];
  for (const entry of value) {
    if (!entry || typeof entry !== 'object') {
      continue;
    }
    const payload = entry as Record<string, unknown>;
    const criterionId = readOptionalString(payload.criterionId);
    if (!criterionId) {
      continue;
    }
    const score = readOptionalScore(payload.score);
    const notes = readOptionalString(payload.notes);
    list.push({ criterionId, score, notes });
  }
  return list;
};

const readOptionalIsoDate = (value: unknown): string | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }
  const date = new Date(trimmed);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
};

const sanitizeSlots = (value: unknown): EvaluationWriteModel['interviews'] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((entry) => {
    if (!entry || typeof entry !== 'object') {
      throw new Error('INVALID_INPUT');
    }
    const payload = entry as Record<string, unknown>;
    const id = readOptionalString(payload.id);
    if (!id) {
      throw new Error('INVALID_INPUT');
    }
    const interviewerName = readOptionalString(payload.interviewerName) ?? 'Interviewer';
    const interviewerEmail = readOptionalString(payload.interviewerEmail) ?? '';
    const caseFolderId = readOptionalString(payload.caseFolderId);
    const fitQuestionId = readOptionalString(payload.fitQuestionId);

    return {
      id,
      interviewerName,
      interviewerEmail,
      caseFolderId,
      fitQuestionId
    };
  });
};

const sanitizeForms = (
  value: unknown,
  allowedSlotIds: Set<string>
): EvaluationWriteModel['forms'] => {
  if (!Array.isArray(value)) {
    return [];
  }

  const forms: EvaluationWriteModel['forms'] = [];
  for (const entry of value) {
    if (!entry || typeof entry !== 'object') {
      continue;
    }
    const payload = entry as Record<string, unknown>;
    const slotId = readOptionalString(payload.slotId);
    if (!slotId || !allowedSlotIds.has(slotId)) {
      continue;
    }
    const interviewerName = readOptionalString(payload.interviewerName) ?? 'Interviewer';
    const submitted = typeof payload.submitted === 'boolean' ? payload.submitted : false;
    const submittedAt = readOptionalIsoDate(payload.submittedAt);
    const notes = readOptionalString(payload.notes);
    const fitScore = readOptionalScore(payload.fitScore);
    const caseScore = readOptionalScore(payload.caseScore);
    const fitNotes = readOptionalString(payload.fitNotes);
    const caseNotes = readOptionalString(payload.caseNotes);
    const fitCriteria = readCriteriaList(payload.fitCriteria);
    const caseCriteria = readCriteriaList(payload.caseCriteria);
    const interestLevel = readOptionalString(payload.interestLevel);
    const issuesToTest = readOptionalString(payload.issuesToTest);
    const overallImpression =
      payload.overallImpression === 'top-choice' ||
      payload.overallImpression === 'strong' ||
      payload.overallImpression === 'mixed' ||
      payload.overallImpression === 'concerns'
        ? payload.overallImpression
        : undefined;
    const offerRecommendation =
      payload.offerRecommendation === 'yes-priority' ||
      payload.offerRecommendation === 'yes' ||
      payload.offerRecommendation === 'hold' ||
      payload.offerRecommendation === 'no'
        ? payload.offerRecommendation
        : undefined;
    const followUpPlan = readOptionalString(payload.followUpPlan);

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
      fitCriteria,
      caseCriteria,
      interestLevel,
      issuesToTest,
      overallImpression,
      offerRecommendation,
      followUpPlan
    });
  }
  return forms;
};

const readProcessStatus = (value: unknown): EvaluationRecord['processStatus'] => {
  if (value === 'in-progress' || value === 'completed' || value === 'draft') {
    return value;
  }
  return 'draft';
};

const ensurePositiveInteger = (value: unknown): number | null => {
  if (typeof value !== 'number' || !Number.isInteger(value) || value <= 0) {
    return null;
  }
  return value;
};

const buildWriteModel = (payload: unknown): EvaluationWriteModel => {
  if (!payload || typeof payload !== 'object') {
    throw new Error('INVALID_INPUT');
  }

  const source = payload as Record<string, unknown>;
  const id = readOptionalString(source.id);
  if (!id) {
    throw new Error('INVALID_INPUT');
  }

  const interviews = sanitizeSlots(source.interviews);
  if (interviews.length === 0) {
    throw new Error('INVALID_INPUT');
  }

  const slotIds = new Set(interviews.map((slot) => slot.id));
  const forms = sanitizeForms(source.forms, slotIds);

  return {
    id,
    candidateId: readOptionalString(source.candidateId),
    roundNumber: readOptionalPositiveInteger(source.roundNumber),
    interviewCount: interviews.length,
    interviews,
    fitQuestionId: readOptionalString(source.fitQuestionId),
    forms,
    processStatus: readProcessStatus(source.processStatus)
  };
};

export class EvaluationsService {
  constructor(private readonly repository: EvaluationsRepository) {}

  async listEvaluations(): Promise<EvaluationRecord[]> {
    return this.repository.listEvaluations();
  }

  async createEvaluation(payload: unknown): Promise<EvaluationRecord> {
    const model = buildWriteModel(payload);
    return this.repository.createEvaluation(model);
  }

  async updateEvaluation(
    id: string,
    payload: unknown,
    expectedVersion: number
  ): Promise<EvaluationRecord> {
    const trimmed = id.trim();
    if (!trimmed) {
      throw new Error('INVALID_INPUT');
    }

    const version = ensurePositiveInteger(expectedVersion);
    if (version === null) {
      throw new Error('INVALID_INPUT');
    }

    const model = buildWriteModel(payload);
    model.id = trimmed;

    const result = await this.repository.updateEvaluation(model, version);
    if (result === 'version-conflict') {
      throw new Error('VERSION_CONFLICT');
    }
    if (!result) {
      throw new Error('NOT_FOUND');
    }
    return result;
  }

  async deleteEvaluation(id: string): Promise<string> {
    const trimmed = id.trim();
    if (!trimmed) {
      throw new Error('INVALID_INPUT');
    }
    const deleted = await this.repository.deleteEvaluation(trimmed);
    if (!deleted) {
      throw new Error('NOT_FOUND');
    }
    return trimmed;
  }
}
