import { randomUUID } from 'crypto';
import { EvaluationsRepository } from './evaluations.repository.js';
import {
  EvaluationFormRecord,
  EvaluationInterviewRecord,
  EvaluationRecord,
  EvaluationWriteModel
} from './evaluations.types.js';

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

const readIsoString = (value: unknown): string | undefined => {
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

const sanitizeInterviews = (value: unknown): EvaluationInterviewRecord[] => {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((item) => {
      if (!item || typeof item !== 'object') {
        return null;
      }
      const payload = item as Record<string, unknown>;
      const idRaw = readOptionalString(payload.id);
      const interviewerName = readOptionalString(payload.interviewerName) ?? '';
      const interviewerEmail = readOptionalString(payload.interviewerEmail) ?? '';
      const caseFolderId = readOptionalString(payload.caseFolderId);
      const fitQuestionId = readOptionalString(payload.fitQuestionId);
      const id = idRaw || randomUUID();
      return {
        id,
        interviewerName,
        interviewerEmail,
        caseFolderId,
        fitQuestionId
      } satisfies EvaluationInterviewRecord;
    })
    .filter((slot): slot is EvaluationInterviewRecord => Boolean(slot));
};

const sanitizeForms = (
  value: unknown,
  interviews: EvaluationInterviewRecord[]
): EvaluationFormRecord[] => {
  const map = new Map<string, EvaluationFormRecord>();
  if (Array.isArray(value)) {
    value.forEach((item) => {
      if (!item || typeof item !== 'object') {
        return;
      }
      const payload = item as Record<string, unknown>;
      const slotId = readOptionalString(payload.slotId);
      if (!slotId) {
        return;
      }
      const interviewerName = readOptionalString(payload.interviewerName) ?? '';
      const submitted = payload.submitted === true;
      const submittedAt = readIsoString(payload.submittedAt);
      const notes = readOptionalString(payload.notes);
      map.set(slotId, {
        slotId,
        interviewerName,
        submitted,
        submittedAt,
        notes
      });
    });
  }

  return interviews.map((slot) => {
    const baseName = slot.interviewerName || 'Interviewer';
    const existing = map.get(slot.id);
    if (!existing) {
      return {
        slotId: slot.id,
        interviewerName: baseName,
        submitted: false
      } satisfies EvaluationFormRecord;
    }
    return {
      slotId: slot.id,
      interviewerName: existing.interviewerName || baseName,
      submitted: existing.submitted,
      submittedAt: existing.submittedAt,
      notes: existing.notes
    } satisfies EvaluationFormRecord;
  });
};

const buildWriteModel = (payload: unknown): EvaluationWriteModel => {
  if (!payload || typeof payload !== 'object') {
    throw new Error('INVALID_INPUT');
  }
  const source = payload as Record<string, unknown>;
  const idRaw = readOptionalString(source.id);
  const candidateId = readOptionalString(source.candidateId);
  const roundNumber = readOptionalPositiveInteger(source.roundNumber);
  const interviews = sanitizeInterviews(source.interviews);
  if (interviews.length === 0) {
    throw new Error('INVALID_INPUT');
  }
  const forms = sanitizeForms(source.forms, interviews);
  const fitQuestionId = readOptionalString(source.fitQuestionId);

  return {
    id: idRaw || randomUUID(),
    candidateId: candidateId ?? undefined,
    roundNumber,
    interviewCount: interviews.length,
    interviews,
    fitQuestionId: fitQuestionId ?? undefined,
    forms
  };
};

const ensurePositiveInteger = (value: unknown): number | null => {
  if (typeof value !== 'number' || !Number.isInteger(value) || value <= 0) {
    return null;
  }
  return value;
};

export class EvaluationsService {
  constructor(private readonly repository: EvaluationsRepository) {}

  async listEvaluations(): Promise<EvaluationRecord[]> {
    return this.repository.listEvaluations();
  }

  async getEvaluation(id: string): Promise<EvaluationRecord> {
    const trimmed = id.trim();
    if (!trimmed) {
      throw new Error('INVALID_INPUT');
    }
    const evaluation = await this.repository.findEvaluation(trimmed);
    if (!evaluation) {
      throw new Error('NOT_FOUND');
    }
    return evaluation;
  }

  async createEvaluation(payload: unknown): Promise<EvaluationRecord> {
    const model = buildWriteModel(payload);
    if (!model.candidateId) {
      throw new Error('INVALID_INPUT');
    }
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
    if (!model.candidateId) {
      throw new Error('INVALID_INPUT');
    }
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
