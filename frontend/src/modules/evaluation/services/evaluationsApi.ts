import { apiRequest } from '../../../shared/api/httpClient';
import {
  EvaluationConfig,
  EvaluationStatus,
  InterviewerAssignment,
  InterviewSlot,
  InterviewStatusRecord
} from '../../../shared/types/evaluation';

const normalizeString = (value: unknown): string | undefined => {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed || undefined;
  }
  return undefined;
};

const normalizeIsoString = (value: unknown): string | undefined => {
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

const normalizeNumber = (value: unknown): number | undefined => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    if (!Number.isNaN(parsed)) {
      return parsed;
    }
  }
  return undefined;
};

const normalizeBoolean = (value: unknown): boolean | undefined => {
  if (typeof value === 'boolean') {
    return value;
  }
  return undefined;
};

const normalizeStatus = (value: unknown): EvaluationStatus | undefined => {
  if (value === 'draft' || value === 'in-progress' || value === 'completed') {
    return value;
  }
  return undefined;
};

const normalizeSlot = (value: unknown): InterviewSlot | null => {
  if (!value || typeof value !== 'object') {
    return null;
  }
  const payload = value as Partial<InterviewSlot> & {
    id?: unknown;
    interviewerName?: unknown;
    interviewerEmail?: unknown;
    caseFolderId?: unknown;
    fitQuestionId?: unknown;
  };

  const id = normalizeString(payload.id);
  if (!id) {
    return null;
  }

  return {
    id,
    interviewerName: normalizeString(payload.interviewerName) ?? 'Interviewer',
    interviewerEmail: normalizeString(payload.interviewerEmail) ?? '',
    caseFolderId: normalizeString(payload.caseFolderId),
    fitQuestionId: normalizeString(payload.fitQuestionId)
  };
};

const normalizeForm = (value: unknown): InterviewStatusRecord | null => {
  if (!value || typeof value !== 'object') {
    return null;
  }
  const payload = value as Partial<InterviewStatusRecord> & {
    slotId?: unknown;
    interviewerName?: unknown;
    interviewerEmail?: unknown;
    submitted?: unknown;
    submittedAt?: unknown;
    fitScore?: unknown;
    caseScore?: unknown;
    notes?: unknown;
  };

  const slotId = normalizeString(payload.slotId);
  if (!slotId) {
    return null;
  }

  return {
    slotId,
    interviewerName: normalizeString(payload.interviewerName) ?? 'Interviewer',
    interviewerEmail: normalizeString(payload.interviewerEmail) ?? '',
    submitted: normalizeBoolean(payload.submitted) ?? false,
    submittedAt: normalizeIsoString(payload.submittedAt),
    fitScore: normalizeNumber(payload.fitScore),
    caseScore: normalizeNumber(payload.caseScore),
    notes: normalizeString(payload.notes)
  };
};

const normalizeEvaluation = (value: unknown): EvaluationConfig | null => {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const payload = value as Partial<EvaluationConfig> & {
    id?: unknown;
    candidateId?: unknown;
    roundNumber?: unknown;
    interviewCount?: unknown;
    interviews?: unknown;
    fitQuestionId?: unknown;
    status?: unknown;
    processStartedAt?: unknown;
    version?: unknown;
    createdAt?: unknown;
    updatedAt?: unknown;
    forms?: unknown;
  };

  const id = normalizeString(payload.id);
  const version = normalizeNumber(payload.version);
  const createdAt = normalizeIsoString(payload.createdAt);
  const updatedAt = normalizeIsoString(payload.updatedAt);

  if (!id || version === undefined || !createdAt || !updatedAt) {
    return null;
  }

  const interviews = Array.isArray(payload.interviews)
    ? payload.interviews
        .map((item) => normalizeSlot(item))
        .filter((slot): slot is InterviewSlot => Boolean(slot))
    : [];

  const forms = Array.isArray(payload.forms)
    ? payload.forms
        .map((item) => normalizeForm(item))
        .filter((form): form is InterviewStatusRecord => Boolean(form))
    : [];

  return {
    id,
    candidateId: normalizeString(payload.candidateId),
    roundNumber: normalizeNumber(payload.roundNumber),
    interviewCount: normalizeNumber(payload.interviewCount) ?? interviews.length,
    interviews,
    fitQuestionId: normalizeString(payload.fitQuestionId),
    status: normalizeStatus(payload.status) ?? 'draft',
    processStartedAt: normalizeIsoString(payload.processStartedAt),
    version,
    createdAt,
    updatedAt,
    forms
  };
};

const ensureEvaluation = (value: unknown): EvaluationConfig => {
  const evaluation = normalizeEvaluation(value);
  if (!evaluation) {
    throw new Error('Failed to parse evaluation payload.');
  }
  return evaluation;
};

const ensureEvaluationList = (value: unknown): EvaluationConfig[] => {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((item) => normalizeEvaluation(item))
    .filter((evaluation): evaluation is EvaluationConfig => Boolean(evaluation));
};

const serializeEvaluation = (config: EvaluationConfig) => ({
  ...config,
  candidateId: config.candidateId ?? null,
  roundNumber: config.roundNumber ?? null,
  fitQuestionId: config.fitQuestionId ?? null,
  processStartedAt: config.processStartedAt ?? null,
  interviews: config.interviews.map((slot) => ({
    ...slot,
    caseFolderId: slot.caseFolderId ?? null,
    fitQuestionId: slot.fitQuestionId ?? null
  })),
  forms: config.forms.map((form) => ({
    ...form,
    submittedAt: form.submittedAt ?? null,
    fitScore: form.fitScore ?? null,
    caseScore: form.caseScore ?? null,
    notes: form.notes ?? null
  }))
});

const normalizeAssignment = (value: unknown): InterviewerAssignment | null => {
  if (!value || typeof value !== 'object') {
    return null;
  }
  const payload = value as Partial<InterviewerAssignment> & {
    evaluationId?: unknown;
    slotId?: unknown;
    interviewerName?: unknown;
    interviewerEmail?: unknown;
    evaluationStatus?: unknown;
    evaluationVersion?: unknown;
    roundNumber?: unknown;
    processStartedAt?: unknown;
    candidate?: unknown;
    caseFolder?: unknown;
    fitQuestion?: unknown;
    form?: unknown;
  };

  const evaluationId = normalizeString(payload.evaluationId);
  const slotId = normalizeString(payload.slotId);
  const evaluationStatus = normalizeStatus(payload.evaluationStatus);
  const evaluationVersion = normalizeNumber(payload.evaluationVersion);
  if (!evaluationId || !slotId || !evaluationStatus || evaluationVersion === undefined) {
    return null;
  }

  const form = normalizeForm(payload.form);
  if (!form) {
    return null;
  }

  return {
    evaluationId,
    slotId,
    interviewerName: normalizeString(payload.interviewerName) ?? 'Interviewer',
    interviewerEmail: normalizeString(payload.interviewerEmail) ?? '',
    evaluationStatus,
    evaluationVersion,
    roundNumber: normalizeNumber(payload.roundNumber),
    processStartedAt: normalizeIsoString(payload.processStartedAt),
    candidate: payload.candidate as InterviewerAssignment['candidate'],
    caseFolder: payload.caseFolder as InterviewerAssignment['caseFolder'],
    fitQuestion: payload.fitQuestion as InterviewerAssignment['fitQuestion'],
    form
  };
};

const ensureAssignments = (value: unknown): InterviewerAssignment[] => {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((item) => normalizeAssignment(item))
    .filter((assignment): assignment is InterviewerAssignment => Boolean(assignment));
};

export const evaluationsApi = {
  list: async () => ensureEvaluationList(await apiRequest<unknown>('/evaluations')),
  create: async (config: EvaluationConfig) =>
    ensureEvaluation(
      await apiRequest<unknown>('/evaluations', {
        method: 'POST',
        body: { config: serializeEvaluation(config) }
      })
    ),
  update: async (id: string, config: EvaluationConfig, expectedVersion: number) =>
    ensureEvaluation(
      await apiRequest<unknown>(`/evaluations/${id}`, {
        method: 'PUT',
        body: { config: serializeEvaluation(config), expectedVersion }
      })
    ),
  remove: async (id: string) =>
    apiRequest<{ id?: unknown }>(`/evaluations/${id}`, {
      method: 'DELETE'
    }).then((result) => (typeof result.id === 'string' ? result.id : id)),
  startProcess: async (id: string, expectedVersion: number) =>
    ensureEvaluation(
      await apiRequest<unknown>(`/evaluations/${id}/start`, {
        method: 'POST',
        body: { expectedVersion }
      })
    ),
  listAssignments: async (email: string) => {
    if (!email.trim()) {
      return [] as InterviewerAssignment[];
    }
    const query = `/evaluations/interviewer/assignments?email=${encodeURIComponent(email.trim())}`;
    return ensureAssignments(await apiRequest<unknown>(query));
  },
  submitForm: async (
    evaluationId: string,
    slotId: string,
    email: string,
    payload: { fitScore?: number; caseScore?: number; notes?: string; submitted?: boolean },
    expectedVersion: number
  ) =>
    ensureEvaluation(
      await apiRequest<unknown>(`/evaluations/${evaluationId}/forms/${slotId}`, {
        method: 'POST',
        body: { email, expectedVersion, ...payload }
      })
    )
};
