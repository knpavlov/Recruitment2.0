import { apiRequest } from '../../../shared/api/httpClient';
import { CaseCriteriaSet, CaseCriterion } from '../../../shared/types/caseCriteria';

const normalizeString = (value: unknown): string | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
};

const normalizeCriterion = (value: unknown): CaseCriterion | null => {
  if (!value || typeof value !== 'object') {
    return null;
  }
  const payload = value as Partial<CaseCriterion> & { id?: unknown };
  const id = normalizeString(payload.id) ?? undefined;
  const title = normalizeString(payload.title) ?? undefined;
  if (!id || !title) {
    return null;
  }
  const ratings: CaseCriterion['ratings'] = {};
  const ratingsSource = (payload.ratings ?? {}) as Record<string, unknown>;
  for (const score of [1, 2, 3, 4, 5] as const) {
    const valueRaw = normalizeString(ratingsSource[String(score)]);
    if (valueRaw) {
      ratings[score] = valueRaw;
    }
  }
  return { id, title, ratings };
};

const normalizeCriteriaSet = (value: unknown): CaseCriteriaSet => {
  if (!value || typeof value !== 'object') {
    return { version: 1, updatedAt: new Date().toISOString(), criteria: [] };
  }
  const payload = value as Partial<CaseCriteriaSet> & { criteria?: unknown };
  const criteriaSource = Array.isArray(payload.criteria) ? payload.criteria : [];
  const criteria = criteriaSource
    .map((item) => normalizeCriterion(item))
    .filter((item): item is CaseCriterion => Boolean(item));
  const version = typeof payload.version === 'number' ? payload.version : 1;
  const updatedAt = normalizeString(payload.updatedAt) ?? new Date().toISOString();
  return { version, updatedAt, criteria };
};

export const caseCriteriaApi = {
  list: async (): Promise<CaseCriteriaSet> => {
    const response = await apiRequest('/case-criteria', { method: 'GET' });
    return normalizeCriteriaSet(response);
  },
  save: async (criteria: CaseCriterion[], expectedVersion: number): Promise<CaseCriteriaSet> => {
    const response = await apiRequest('/case-criteria', {
      method: 'PUT',
      body: JSON.stringify({
        criteria: criteria.map((criterion) => ({
          ...criterion,
          ratings: {
            1: criterion.ratings[1] ?? null,
            2: criterion.ratings[2] ?? null,
            3: criterion.ratings[3] ?? null,
            4: criterion.ratings[4] ?? null,
            5: criterion.ratings[5] ?? null
          }
        })),
        expectedVersion
      })
    });
    return normalizeCriteriaSet(response);
  }
};
