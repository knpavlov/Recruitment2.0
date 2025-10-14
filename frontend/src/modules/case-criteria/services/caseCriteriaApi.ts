import { apiRequest } from '../../../shared/api/httpClient';
import { CaseCriterion, CaseCriteriaResponse } from '../../../shared/types/caseCriteria';

const normalizeString = (value: unknown): string | null => {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
};

const normalizeRatings = (source: unknown): CaseCriterion['ratings'] => {
  const ratings: CaseCriterion['ratings'] = {};
  if (!source || typeof source !== 'object') {
    return ratings;
  }
  const raw = source as Record<string, unknown>;
  for (const score of [1, 2, 3, 4, 5] as const) {
    const value = normalizeString(raw[String(score)]);
    if (value) {
      ratings[score] = value;
    }
  }
  return ratings;
};

const normalizeCriterion = (value: unknown): CaseCriterion | null => {
  if (!value || typeof value !== 'object') {
    return null;
  }
  const payload = value as Partial<CaseCriterion> & { id?: unknown; title?: unknown; ratings?: unknown };
  const id = normalizeString(payload.id);
  const title = normalizeString(payload.title);
  if (!id || !title) {
    return null;
  }
  return { id, title, ratings: normalizeRatings(payload.ratings) };
};

const ensureResponse = (value: unknown): CaseCriteriaResponse => {
  if (!value || typeof value !== 'object') {
    throw new Error('Failed to parse case criteria payload.');
  }
  const payload = value as Partial<CaseCriteriaResponse> & { version?: unknown; items?: unknown };
  const version = typeof payload.version === 'number' && Number.isFinite(payload.version) ? payload.version : 1;
  const itemsSource = Array.isArray(payload.items) ? payload.items : [];
  const items = itemsSource
    .map((entry) => normalizeCriterion(entry))
    .filter((item): item is CaseCriterion => Boolean(item));
  return { version, items };
};

const serializeCriterion = (criterion: CaseCriterion) => {
  const ratings: Record<string, string> = {};
  for (const score of [1, 2, 3, 4, 5] as const) {
    const value = criterion.ratings[score];
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed) {
        ratings[String(score)] = trimmed;
      }
    }
  }
  return {
    id: criterion.id,
    title: criterion.title.trim(),
    ratings
  };
};

export const caseCriteriaApi = {
  list: async (): Promise<CaseCriteriaResponse> =>
    ensureResponse(await apiRequest<unknown>('/case-criteria')),
  saveAll: async (items: CaseCriterion[], expectedVersion: number): Promise<CaseCriteriaResponse> =>
    ensureResponse(
      await apiRequest<unknown>('/case-criteria', {
        method: 'PUT',
        body: {
          items: items.map((item) => serializeCriterion(item)),
          expectedVersion
        }
      })
    )
};
