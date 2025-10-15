import { randomUUID } from 'crypto';
import { CaseCriteriaRepository } from './caseCriteria.repository.js';
import { CaseCriteriaSet, CaseCriterionWriteModel } from './caseCriteria.types.js';

interface CaseCriterionDraft {
  id?: unknown;
  title?: unknown;
  ratings?: unknown;
}

const normalizeString = (value: unknown): string | null => {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
};

const normalizeRatings = (
  source: unknown
): CaseCriterionWriteModel['ratings'] => {
  const ratings: CaseCriterionWriteModel['ratings'] = {};
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

const normalizeUuid = (value: string): string | null => {
  try {
    const lowered = value.toLowerCase();
    return /^[0-9a-f-]{36}$/.test(lowered) ? lowered : null;
  } catch {
    return null;
  }
};

export class CaseCriteriaService {
  constructor(private readonly repository: CaseCriteriaRepository) {}

  listCriteria(): Promise<CaseCriteriaSet> {
    return this.repository.listCriteria();
  }

  async saveCriteriaSet(
    drafts: CaseCriterionDraft[] | unknown,
    expectedVersion: number | null
  ): Promise<CaseCriteriaSet> {
    if (!Array.isArray(drafts)) {
      throw new Error('INVALID_INPUT');
    }

    if (drafts.length > 50) {
      throw new Error('INVALID_INPUT');
    }

    const models: CaseCriterionWriteModel[] = drafts.map((draft, index) => {
      const payload = draft as CaseCriterionDraft;
      const title = normalizeString(payload.title);
      if (!title) {
        throw new Error('INVALID_INPUT');
      }
      const idRaw = typeof payload.id === 'string' ? payload.id.trim() : '';
      const id = normalizeUuid(idRaw) ?? randomUUID();
      return {
        id,
        title,
        ratings: normalizeRatings(payload.ratings),
        position: index
      };
    });

    const result = await this.repository.replaceAll(models, expectedVersion);
    if (result === 'version-conflict') {
      throw new Error('VERSION_CONFLICT');
    }
    return result;
  }
}
