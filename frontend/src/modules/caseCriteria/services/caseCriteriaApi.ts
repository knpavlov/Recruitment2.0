import { apiRequest } from '../../../shared/api/httpClient';
import { CaseCriterion } from '../../../shared/types/caseCriteria';

const normalizeString = (value: unknown): string | null => {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
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
  if (value instanceof Date) {
    return value.toISOString();
  }
  return null;
};

const normalizeRatings = (value: unknown): CaseCriterion['ratings'] => {
  if (!value || typeof value !== 'object') {
    return {};
  }
  const source = value as Record<string, unknown>;
  const ratings: CaseCriterion['ratings'] = {};
  for (const score of [1, 2, 3, 4, 5] as const) {
    const ratingValue = normalizeString(source[String(score)]);
    if (ratingValue) {
      ratings[score] = ratingValue;
    }
  }
  return ratings;
};

const normalizeCriterion = (value: unknown): CaseCriterion | null => {
  if (!value || typeof value !== 'object') {
    return null;
  }
  const payload = value as Record<string, unknown>;
  const id = normalizeString(payload.id);
  const title = normalizeString(payload.title);
  const versionRaw = payload.version;
  const version = typeof versionRaw === 'number' ? versionRaw : Number(versionRaw);
  const createdAt = normalizeIso(payload.createdAt);
  const updatedAt = normalizeIso(payload.updatedAt);

  if (!id || !title || !Number.isInteger(version) || !createdAt || !updatedAt) {
    return null;
  }

  return {
    id,
    title,
    ratings: normalizeRatings(payload.ratings),
    version: Number(version),
    createdAt,
    updatedAt
  };
};

const ensureCriterion = (value: unknown): CaseCriterion => {
  const criterion = normalizeCriterion(value);
  if (!criterion) {
    throw new Error('Не удалось разобрать данные критерия.');
  }
  return criterion;
};

const ensureCriterionList = (value: unknown): CaseCriterion[] => {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((item) => normalizeCriterion(item))
    .filter((item): item is CaseCriterion => Boolean(item));
};

const serializeCriterion = (criterion: CaseCriterion) => ({
  ...criterion,
  ratings: {
    1: criterion.ratings[1] ?? null,
    2: criterion.ratings[2] ?? null,
    3: criterion.ratings[3] ?? null,
    4: criterion.ratings[4] ?? null,
    5: criterion.ratings[5] ?? null
  }
});

export const caseCriteriaApi = {
  list: async () => ensureCriterionList(await apiRequest<unknown>('/case-criteria')),
  create: async (criterion: CaseCriterion) =>
    ensureCriterion(
      await apiRequest<unknown>('/case-criteria', {
        method: 'POST',
        body: { criterion: serializeCriterion(criterion) }
      })
    ),
  update: async (id: string, criterion: CaseCriterion, expectedVersion: number) =>
    ensureCriterion(
      await apiRequest<unknown>(`/case-criteria/${id}`, {
        method: 'PUT',
        body: { criterion: serializeCriterion(criterion), expectedVersion }
      })
    ),
  remove: async (id: string) =>
    apiRequest<{ id?: unknown }>(`/case-criteria/${id}`, { method: 'DELETE' }).then((result) => {
      const identifier = typeof result.id === 'string' ? result.id : id;
      return identifier;
    })
};
