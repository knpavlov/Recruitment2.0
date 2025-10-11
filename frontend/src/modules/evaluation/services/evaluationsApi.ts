import { apiRequest } from '../../../shared/api/httpClient';
import { EvaluationConfig, InterviewSlot, InterviewStatusRecord } from '../../../shared/types/evaluation';

const normalizeString = (value: unknown): string | undefined => {
  if (typeof value === 'string') {
    return value;
  }
  return undefined;
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

const normalizeBoolean = (value: unknown): boolean => value === true;

const normalizeIsoString = (value: unknown): string | undefined => {
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

const normalizeInterview = (value: unknown): InterviewSlot | null => {
  if (!value || typeof value !== 'object') {
    return null;
  }
  const payload = value as Record<string, unknown>;
  const id = normalizeString(payload.id)?.trim();
  if (!id) {
    return null;
  }
  const interviewerName = normalizeString(payload.interviewerName) ?? '';
  const interviewerEmail = normalizeString(payload.interviewerEmail) ?? '';
  const caseFolderId = normalizeString(payload.caseFolderId)?.trim();
  const fitQuestionId = normalizeString(payload.fitQuestionId)?.trim();
  return {
    id,
    interviewerName,
    interviewerEmail,
    caseFolderId: caseFolderId || undefined,
    fitQuestionId: fitQuestionId || undefined
  };
};

const normalizeForm = (value: unknown): InterviewStatusRecord | null => {
  if (!value || typeof value !== 'object') {
    return null;
  }
  const payload = value as Record<string, unknown>;
  const slotId = normalizeString(payload.slotId)?.trim();
  if (!slotId) {
    return null;
  }
  const interviewerName = normalizeString(payload.interviewerName) ?? '';
  const submitted = normalizeBoolean(payload.submitted);
  const submittedAt = normalizeIsoString(payload.submittedAt);
  const notes = normalizeString(payload.notes)?.trim();
  return {
    slotId,
    interviewerName,
    submitted,
    submittedAt: submittedAt ?? undefined,
    notes: notes || undefined
  };
};

const alignForms = (
  forms: InterviewStatusRecord[],
  interviews: InterviewSlot[]
): InterviewStatusRecord[] => {
  const map = new Map(forms.map((form) => [form.slotId, form] as const));
  return interviews.map((slot) => {
    const baseName = slot.interviewerName || 'Interviewer';
    const existing = map.get(slot.id);
    if (!existing) {
      return { slotId: slot.id, interviewerName: baseName, submitted: false };
    }
    return {
      slotId: slot.id,
      interviewerName: existing.interviewerName || baseName,
      submitted: existing.submitted,
      submittedAt: existing.submittedAt,
      notes: existing.notes
    };
  });
};

const normalizeEvaluation = (value: unknown): EvaluationConfig | null => {
  if (!value || typeof value !== 'object') {
    return null;
  }
  const payload = value as Record<string, unknown>;

  const id = normalizeString(payload.id)?.trim();
  const version = normalizeNumber(payload.version);
  const createdAt = normalizeIsoString(payload.createdAt);
  const updatedAt = normalizeIsoString(payload.updatedAt);
  if (!id || version === undefined || !createdAt || !updatedAt) {
    return null;
  }

  const interviewsRaw = Array.isArray(payload.interviews) ? payload.interviews : [];
  const interviews = interviewsRaw
    .map((item) => normalizeInterview(item))
    .filter((slot): slot is InterviewSlot => Boolean(slot));
  if (interviews.length === 0) {
    return null;
  }

  const formsRaw = Array.isArray(payload.forms) ? payload.forms : [];
  const forms = formsRaw
    .map((item) => normalizeForm(item))
    .filter((form): form is InterviewStatusRecord => Boolean(form));

  return {
    id,
    candidateId: normalizeString(payload.candidateId) ?? undefined,
    roundNumber: normalizeNumber(payload.roundNumber),
    interviewCount: interviews.length,
    interviews,
    fitQuestionId: normalizeString(payload.fitQuestionId) ?? undefined,
    version,
    createdAt,
    updatedAt,
    forms: alignForms(forms, interviews)
  };
};

const ensureEvaluation = (value: unknown): EvaluationConfig => {
  const evaluation = normalizeEvaluation(value);
  if (!evaluation) {
    throw new Error('Failed to parse the evaluation payload.');
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

const serializeInterview = (slot: InterviewSlot) => ({
  ...slot,
  caseFolderId: slot.caseFolderId ?? null,
  fitQuestionId: slot.fitQuestionId ?? null
});

const serializeForm = (form: InterviewStatusRecord) => ({
  ...form,
  submittedAt: form.submittedAt ?? null,
  notes: form.notes ?? null
});

const serializeEvaluation = (config: EvaluationConfig) => ({
  ...config,
  candidateId: config.candidateId ?? null,
  roundNumber: config.roundNumber ?? null,
  interviewCount: config.interviews.length,
  interviews: config.interviews.map(serializeInterview),
  fitQuestionId: config.fitQuestionId ?? null,
  forms: alignForms(config.forms, config.interviews).map(serializeForm)
});

export const evaluationsApi = {
  list: async () => ensureEvaluationList(await apiRequest<unknown>('/evaluations')),
  create: async (config: EvaluationConfig) =>
    ensureEvaluation(
      await apiRequest<unknown>('/evaluations', {
        method: 'POST',
        body: { evaluation: serializeEvaluation(config) }
      })
    ),
  update: async (id: string, config: EvaluationConfig, expectedVersion: number) =>
    ensureEvaluation(
      await apiRequest<unknown>(`/evaluations/${id}`, {
        method: 'PUT',
        body: { evaluation: serializeEvaluation(config), expectedVersion }
      })
    ),
  remove: async (id: string) =>
    apiRequest<{ id?: unknown }>(`/evaluations/${id}`, { method: 'DELETE' }).then((result) => {
      const identifier = typeof result.id === 'string' ? result.id : id;
      return identifier;
    })
};
