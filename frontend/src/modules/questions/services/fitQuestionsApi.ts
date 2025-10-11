import { apiRequest } from '../../../shared/api/httpClient';
import {
  FitQuestion,
  FitQuestionCriterion,
  FitQuestionRatingKey,
  FitQuestionRatings
} from '../../../shared/types/fitQuestion';

const SCORE_KEYS: FitQuestionRatingKey[] = ['1', '2', '3', '4', '5'];

const normalizeString = (value: unknown): string | null => {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed || null;
  }
  return null;
};

const normalizeIso = (value: unknown): string | null => {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }
    const parsed = new Date(trimmed);
    return Number.isNaN(parsed.getTime()) ? trimmed : parsed.toISOString();
  }
  return null;
};

const normalizeNumber = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  return null;
};

const normalizeRatings = (value: unknown): FitQuestionRatings => {
  if (!value || typeof value !== 'object') {
    return {};
  }
  const payload = value as Record<string, unknown>;
  const ratings: FitQuestionRatings = {};
  for (const score of SCORE_KEYS) {
    const description = normalizeString(payload[score]);
    if (description) {
      ratings[score] = description;
    }
  }
  return ratings;
};

const normalizeCriterion = (value: unknown): FitQuestionCriterion | null => {
  if (!value || typeof value !== 'object') {
    return null;
  }
  const payload = value as Record<string, unknown>;
  const id = normalizeString(payload.id);
  const title = normalizeString(payload.title);
  if (!id || !title) {
    return null;
  }
  return {
    id,
    title,
    ratings: normalizeRatings(payload.ratings)
  };
};

const normalizeQuestion = (value: unknown): FitQuestion | null => {
  if (!value || typeof value !== 'object') {
    return null;
  }
  const payload = value as Record<string, unknown>;
  const id = normalizeString(payload.id);
  const shortTitle = normalizeString(payload.shortTitle);
  const content = normalizeString(payload.content);
  const version = normalizeNumber(payload.version);
  const createdAt = normalizeIso(payload.createdAt);
  const updatedAt = normalizeIso(payload.updatedAt);
  if (!id || !shortTitle || !content || version === null || !createdAt || !updatedAt) {
    return null;
  }
  const rawCriteria = Array.isArray(payload.criteria) ? payload.criteria : [];
  const criteria = rawCriteria
    .map((item) => normalizeCriterion(item))
    .filter((item): item is FitQuestionCriterion => Boolean(item));
  return {
    id,
    shortTitle,
    content,
    version,
    createdAt,
    updatedAt,
    criteria
  };
};

const ensureQuestion = (value: unknown): FitQuestion => {
  const question = normalizeQuestion(value);
  if (!question) {
    throw new Error('Failed to parse the fit question payload.');
  }
  return question;
};

const ensureQuestionList = (value: unknown): FitQuestion[] => {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((item) => normalizeQuestion(item))
    .filter((question): question is FitQuestion => Boolean(question));
};

const serializeRatings = (ratings: FitQuestionRatings) => {
  const serialized: Record<string, string> = {};
  for (const score of SCORE_KEYS) {
    const description = ratings[score];
    if (description && description.trim()) {
      serialized[score] = description.trim();
    }
  }
  return serialized;
};

const serializeCriterion = (criterion: FitQuestionCriterion) => ({
  id: criterion.id,
  title: criterion.title.trim(),
  ratings: serializeRatings(criterion.ratings)
});

const serializeQuestion = (question: FitQuestion) => ({
  ...question,
  shortTitle: question.shortTitle.trim(),
  content: question.content.trim(),
  criteria: question.criteria.map((item) => serializeCriterion(item))
});

export const fitQuestionsApi = {
  list: async () => ensureQuestionList(await apiRequest<unknown>('/questions')),
  create: async (question: FitQuestion) =>
    ensureQuestion(
      await apiRequest<unknown>('/questions', {
        method: 'POST',
        body: { question: serializeQuestion(question) }
      })
    ),
  update: async (id: string, question: FitQuestion, expectedVersion: number) =>
    ensureQuestion(
      await apiRequest<unknown>(`/questions/${id}`, {
        method: 'PUT',
        body: { question: serializeQuestion(question), expectedVersion }
      })
    ),
  remove: async (id: string) =>
    apiRequest<{ id?: unknown }>(`/questions/${id}`, {
      method: 'DELETE'
    }).then((result) => (typeof result.id === 'string' ? result.id : id))
};
