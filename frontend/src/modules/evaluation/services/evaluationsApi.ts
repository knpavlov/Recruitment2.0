import { apiRequest } from '../../../shared/api/httpClient';
import {
  EvaluationConfig,
  EvaluationProcessStatus,
  InterviewCriterionScore,
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

const normalizeCriteria = (value: unknown): InterviewCriterionScore[] => {
  if (!Array.isArray(value)) {
    return [];
  }
  const list: InterviewCriterionScore[] = [];
  for (const entry of value) {
    if (!entry || typeof entry !== 'object') {
      continue;
    }
    const payload = entry as Partial<InterviewCriterionScore> & { criterionId?: unknown };
    const criterionId = normalizeString(payload.criterionId)?.trim();
    if (!criterionId) {
      continue;
    }
    const score = normalizeScore((payload as Record<string, unknown>).score);
    const notes = normalizeString((payload as Record<string, unknown>).notes) ?? undefined;
    list.push({ criterionId, score, notes });
  }
  return list;
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
    fitCriteria: normalizeCriteria((payload as Record<string, unknown>).fitCriteria),
    caseCriteria: normalizeCriteria((payload as Record<string, unknown>).caseCriteria),
    interestLevel: normalizeString((payload as Record<string, unknown>).interestLevel) ?? undefined,
    issuesToTest: normalizeString((payload as Record<string, unknown>).issuesToTest) ?? undefined,
    overallImpression: (() => {
      const value = normalizeString((payload as Record<string, unknown>).overallImpression);
      return value === 'top-choice' || value === 'strong' || value === 'mixed' || value === 'concerns'
        ? value
        : undefined;
    })(),
    offerRecommendation: (() => {
      const value = normalizeString((payload as Record<string, unknown>).offerRecommendation);
      return value === 'yes-priority' || value === 'yes' || value === 'hold' || value === 'no' ? value : undefined;
    })(),
    followUpPlan: normalizeString((payload as Record<string, unknown>).followUpPlan) ?? undefined
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
    notes: form.notes ?? null,
    fitScore: form.fitScore ?? null,
    caseScore: form.caseScore ?? null,
    fitNotes: form.fitNotes ?? null,
    caseNotes: form.caseNotes ?? null,
    interestLevel: form.interestLevel ?? null,
    issuesToTest: form.issuesToTest ?? null,
    overallImpression: form.overallImpression ?? null,
    offerRecommendation: form.offerRecommendation ?? null,
    followUpPlan: form.followUpPlan ?? null,
    fitCriteria: form.fitCriteria.map((criterion) => ({
      ...criterion,
      score: criterion.score ?? null,
      notes: criterion.notes ?? null
    })),
    caseCriteria: form.caseCriteria.map((criterion) => ({
      ...criterion,
      score: criterion.score ?? null,
      notes: criterion.notes ?? null
    }))
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
