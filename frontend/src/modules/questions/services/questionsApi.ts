import { apiRequest } from '../../../shared/api/httpClient';
import { FitQuestion, FitQuestionCriterion } from '../../../shared/types/fitQuestion';

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

const normalizeCriterion = (value: unknown, fallbackQuestionId: string): FitQuestionCriterion | null => {
  if (!value || typeof value !== 'object') {
    return null;
  }
  const payload = value as Partial<FitQuestionCriterion> & {
    id?: unknown;
    questionId?: unknown;
    name?: unknown;
    position?: unknown;
    score1?: unknown;
    score2?: unknown;
    score3?: unknown;
    score4?: unknown;
    score5?: unknown;
  };

  const id = normalizeString(payload.id)?.trim();
  const questionId = normalizeString(payload.questionId)?.trim() ?? fallbackQuestionId;
  const name = normalizeString(payload.name)?.trim();
  const position = normalizeNumber(payload.position);

  if (!id || !name || position === undefined) {
    return null;
  }

  return {
    id,
    questionId,
    name,
    position,
    score1: normalizeString(payload.score1)?.trim() || undefined,
    score2: normalizeString(payload.score2)?.trim() || undefined,
    score3: normalizeString(payload.score3)?.trim() || undefined,
    score4: normalizeString(payload.score4)?.trim() || undefined,
    score5: normalizeString(payload.score5)?.trim() || undefined
  };
};

const normalizeQuestion = (value: unknown): FitQuestion | null => {
  if (!value || typeof value !== 'object') {
    return null;
  }
  const payload = value as Partial<FitQuestion> & {
    id?: unknown;
    version?: unknown;
    shortTitle?: unknown;
    content?: unknown;
    createdAt?: unknown;
    updatedAt?: unknown;
    criteria?: unknown;
  };

  const id = normalizeString(payload.id)?.trim();
  const version = normalizeNumber(payload.version);
  const shortTitle = normalizeString(payload.shortTitle)?.trim();
  const content = normalizeString(payload.content)?.trim();
  const createdAt = normalizeString(payload.createdAt)?.trim();
  const updatedAt = normalizeString(payload.updatedAt)?.trim();

  if (!id || version === undefined || !shortTitle || !content || !createdAt || !updatedAt) {
    return null;
  }

  const criteriaSource = Array.isArray(payload.criteria) ? payload.criteria : [];
  const criteria = criteriaSource
    .map((item) => normalizeCriterion(item, id) ?? null)
    .filter((item): item is FitQuestionCriterion => item !== null)
    .sort((a, b) => {
      if (a.position === b.position) {
        return a.id.localeCompare(b.id);
      }
      return a.position - b.position;
    });

  return {
    id,
    version,
    shortTitle,
    content,
    criteria,
    createdAt,
    updatedAt
  };
};

const ensureQuestion = (value: unknown): FitQuestion => {
  const question = normalizeQuestion(value);
  if (!question) {
    throw new Error('Не удалось разобрать вопрос.');
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

const serializeCriterion = (criterion: FitQuestionCriterion, index: number) => ({
  id: criterion.id,
  questionId: criterion.questionId,
  name: criterion.name,
  position: index,
  score1: criterion.score1 ?? null,
  score2: criterion.score2 ?? null,
  score3: criterion.score3 ?? null,
  score4: criterion.score4 ?? null,
  score5: criterion.score5 ?? null
});

const serializeQuestion = (question: FitQuestion) => ({
  id: question.id,
  shortTitle: question.shortTitle,
  content: question.content,
  criteria: question.criteria.map(serializeCriterion)
});

export const questionsApi = {
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
