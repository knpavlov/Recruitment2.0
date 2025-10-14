import { randomUUID } from 'crypto';
import { CaseCriteriaRepository } from './caseCriteria.repository.js';
import { CaseCriterionRecord } from './caseCriteria.types.js';

interface CaseCriterionInput {
  id?: string;
  title?: unknown;
  ratings?: unknown;
}

const normalizeRatings = (
  source: unknown
): CaseCriterionRecord['ratings'] => {
  const ratings: CaseCriterionRecord['ratings'] = {};
  if (!source || typeof source !== 'object') {
    return ratings;
  }
  const entries = source as Record<string, unknown>;
  for (const score of [1, 2, 3, 4, 5] as const) {
    const value = entries[String(score)];
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed) {
        ratings[score] = trimmed;
      }
    }
  }
  return ratings;
};

export class CaseCriteriaService {
  constructor(private readonly repository: CaseCriteriaRepository) {}

  async listAll(): Promise<{ version: number; items: CaseCriterionRecord[] }> {
    const [state, items] = await Promise.all([
      this.repository.getState(),
      this.repository.listAll()
    ]);
    return { version: state.version, items };
  }

  async saveAll(
    payload: CaseCriterionInput[],
    expectedVersion: number
  ): Promise<{ version: number; items: CaseCriterionRecord[] }> {
    if (!Array.isArray(payload)) {
      throw new Error('INVALID_INPUT');
    }
    if (!Number.isFinite(expectedVersion)) {
      throw new Error('INVALID_INPUT');
    }

    const normalized = payload.map((item, index) => {
      const rawTitle = typeof item.title === 'string' ? item.title.trim() : '';
      if (!rawTitle) {
        throw new Error('INVALID_INPUT');
      }
      const existingId = typeof item.id === 'string' && item.id.trim() ? item.id.trim() : null;
      return {
        id: existingId ?? randomUUID(),
        title: rawTitle,
        ratings: normalizeRatings(item.ratings),
        orderIndex: index
      };
    });

    const result = await this.repository.replaceAll(normalized, expectedVersion);
    if (result === 'version-conflict') {
      throw new Error('VERSION_CONFLICT');
    }

    const state = await this.repository.getState();
    return { version: state.version, items: result };
  }
}
