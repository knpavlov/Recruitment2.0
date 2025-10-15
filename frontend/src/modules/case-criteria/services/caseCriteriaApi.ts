import { apiRequest } from '../../../shared/api/httpClient';
import { CaseCriterion, CaseCriterionDraft, CaseCriteriaSet } from '../../../shared/types/caseCriteria';

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

const normalizeString = (value: unknown): string | null => {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
};

const normalizeRatings = (
  source: unknown
): CaseCriterion['ratings'] => {
  const ratings: CaseCriterion['ratings'] = {};
  if (!source || typeof source !== 'object') {
    return ratings;
  }
  const payload = source as Record<string, unknown>;
  for (const score of [1, 2, 3, 4, 5] as const) {
    const value = normalizeString(payload[String(score)]);
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
  const payload = value as {
    id?: unknown;
    title?: unknown;
    ratings?: unknown;
    position?: unknown;
    createdAt?: unknown;
    updatedAt?: unknown;
  };

  const id = normalizeString(payload.id);
  const title = normalizeString(payload.title);
  const createdAt = normalizeIso(payload.createdAt);
  const updatedAt = normalizeIso(payload.updatedAt);
  const positionRaw = typeof payload.position === 'number' ? payload.position : Number(payload.position);
  if (!id || !title || !createdAt || !updatedAt || !Number.isFinite(positionRaw)) {
    return null;
  }

  return {
    id,
    title,
    ratings: normalizeRatings(payload.ratings),
    position: Number(positionRaw),
    createdAt,
    updatedAt
  };
};

const ensureCaseCriteriaSet = (value: unknown): CaseCriteriaSet => {
  if (!value || typeof value !== 'object') {
    throw new Error('Некорректный ответ сервера для набора критериев.');
  }
  const payload = value as { version?: unknown; items?: unknown };
  const version = typeof payload.version === 'number' ? payload.version : Number(payload.version);
  if (!Number.isInteger(version) || version <= 0) {
    throw new Error('Некорректный номер версии набора критериев.');
  }
  const itemsSource = Array.isArray(payload.items) ? payload.items : [];
  const items = itemsSource
    .map((entry) => normalizeCriterion(entry))
    .filter((entry): entry is CaseCriterion => Boolean(entry));
  return { version, items };
};

const serializeDrafts = (drafts: CaseCriterionDraft[]) =>
  drafts.map((draft) => ({
    id: draft.id ?? null,
    title: draft.title,
    ratings: {
      1: draft.ratings[1] ?? null,
      2: draft.ratings[2] ?? null,
      3: draft.ratings[3] ?? null,
      4: draft.ratings[4] ?? null,
      5: draft.ratings[5] ?? null
    }
  }));

export const caseCriteriaApi = {
  list: async () => ensureCaseCriteriaSet(await apiRequest<unknown>('/case-criteria')),
  save: async (drafts: CaseCriterionDraft[], expectedVersion: number | null) =>
    ensureCaseCriteriaSet(
      await apiRequest<unknown>('/case-criteria', {
        method: 'PUT',
        body: { items: serializeDrafts(drafts), expectedVersion }
      })
    )
};
