import { apiRequest } from '../../../shared/api/httpClient';
import {
  EvaluationConfig,
  EvaluationProcessStatus,
  InterviewSlot,
  InterviewStatusRecord
} from '../../../shared/types/evaluation';

const normalizeString = (value: unknown): string | undefined => {
  if (typeof value === 'string') {
    return value;
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

const normalizeScore = (value: unknown): number | undefined => {
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

const normalizeCriteriaMap = (value: unknown): Record<string, number> | undefined => {
  if (!value || typeof value !== 'object') {
    return undefined;
  }
  const ratings: Record<string, number> = {};
  for (const [rawKey, rawValue] of Object.entries(value as Record<string, unknown>)) {
    if (typeof rawKey !== 'string') {
      continue;
    }
    const key = rawKey.trim();
    if (!key) {
      continue;
    }
    const numeric = normalizeNumber(rawValue);
    if (typeof numeric === 'number') {
      ratings[key] = numeric;
    }
  }
  return Object.keys(ratings).length ? ratings : undefined;
};

const OFFER_OPTIONS: InterviewStatusRecord['offerRecommendation'][] = [
  'yes-priority',
  'yes-strong',
  'yes-keep-warm',
  'no'
];

const normalizeOfferRecommendation = (
  value: unknown
): InterviewStatusRecord['offerRecommendation'] | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }
  const trimmed = value.trim() as InterviewStatusRecord['offerRecommendation'];
  return OFFER_OPTIONS.includes(trimmed) ? trimmed : undefined;
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

  const id = normalizeString(payload.id)?.trim();
  if (!id) {
    return null;
  }

  return {
    id,
    interviewerName: normalizeString(payload.interviewerName) ?? 'Interviewer',
    interviewerEmail: normalizeString(payload.interviewerEmail) ?? '',
    caseFolderId: normalizeString(payload.caseFolderId)?.trim() || undefined,
    fitQuestionId: normalizeString(payload.fitQuestionId)?.trim() || undefined
  };
};

const normalizeForm = (value: unknown): InterviewStatusRecord | null => {
  if (!value || typeof value !== 'object') {
    return null;
  }
  const payload = value as Partial<InterviewStatusRecord> & {
    slotId?: unknown;
    interviewerName?: unknown;
    submitted?: unknown;
    submittedAt?: unknown;
    notes?: unknown;
  };

  const slotId = normalizeString(payload.slotId)?.trim();
  if (!slotId) {
    return null;
  }

  return {
    slotId,
    interviewerName: normalizeString(payload.interviewerName) ?? 'Interviewer',
    submitted: normalizeBoolean(payload.submitted) ?? false,
    submittedAt: normalizeIsoString(payload.submittedAt),
    notes: normalizeString(payload.notes) ?? undefined,
    fitScore: normalizeScore(payload.fitScore),
    caseScore: normalizeScore(payload.caseScore),
    fitNotes: normalizeString(payload.fitNotes) ?? undefined,
    caseNotes: normalizeString(payload.caseNotes) ?? undefined,
    fitCriteria: normalizeCriteriaMap(payload.fitCriteria),
    caseCriteria: normalizeCriteriaMap(payload.caseCriteria),
    interestLevel: normalizeString(payload.interestLevel)?.trim() || undefined,
    issuesToTest: normalizeString(payload.issuesToTest)?.trim() || undefined,
    summary: normalizeString(payload.summary)?.trim() || undefined,
    offerRecommendation: normalizeOfferRecommendation(payload.offerRecommendation),
    offerRecommendationNotes: normalizeString(payload.offerRecommendationNotes)?.trim() || undefined
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
    version?: unknown;
    createdAt?: unknown;
    updatedAt?: unknown;
    forms?: unknown;
    processStatus?: unknown;
    processStartedAt?: unknown;
  };

  const id = normalizeString(payload.id)?.trim();
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
    candidateId: normalizeString(payload.candidateId)?.trim() || undefined,
    roundNumber: normalizeNumber(payload.roundNumber),
    interviewCount: normalizeNumber(payload.interviewCount) ?? interviews.length,
    interviews,
    fitQuestionId: normalizeString(payload.fitQuestionId)?.trim() || undefined,
    version,
    createdAt,
    updatedAt,
    forms,
    processStatus: (normalizeString(payload.processStatus) as EvaluationProcessStatus | undefined) ?? 'draft',
    processStartedAt: normalizeIsoString(payload.processStartedAt)
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
  interviews: config.interviews.map((slot) => ({
    ...slot,
    caseFolderId: slot.caseFolderId ?? null,
    fitQuestionId: slot.fitQuestionId ?? null
  })),
  forms: config.forms.map((form) => ({
    ...form,
    submittedAt: form.submittedAt ?? null,
    notes: form.notes ?? null
  }))
});

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
  start: async (id: string) =>
    apiRequest<{ id: string }>(`/evaluations/${id}/start`, {
      method: 'POST'
    }),
  remove: async (id: string) =>
    apiRequest<{ id?: unknown }>(`/evaluations/${id}`, {
      method: 'DELETE'
    }).then((result) => (typeof result.id === 'string' ? result.id : id))
};
