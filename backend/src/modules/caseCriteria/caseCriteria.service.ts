import { randomUUID } from 'crypto';
import { CaseCriteriaRepository } from './caseCriteria.repository.js';
import { CaseCriteriaSet, CaseCriterionWriteModel } from './caseCriteria.types.js';

const readRequiredString = (value: unknown): string => {
  if (typeof value !== 'string') {
    throw new Error('INVALID_INPUT');
  }
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error('INVALID_INPUT');
  }
  return trimmed;
};

const readOptionalString = (value: unknown): string | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
};

const ensureNonNegativeInteger = (value: unknown): number => {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) {
    throw new Error('INVALID_INPUT');
  }
  return value;
};

const buildCriterion = (value: unknown, order: number): CaseCriterionWriteModel => {
  if (!value || typeof value !== 'object') {
    throw new Error('INVALID_INPUT');
  }
  const payload = value as Record<string, unknown>;
  const idRaw = typeof payload.id === 'string' ? payload.id.trim() : '';
  const title = readRequiredString(payload.title);
  const ratingsSource =
    payload.ratings && typeof payload.ratings === 'object'
      ? (payload.ratings as Record<string, unknown>)
      : {};

  const ratings: CaseCriterionWriteModel['ratings'] = {};
  for (const score of [1, 2, 3, 4, 5] as const) {
    const valueRaw = readOptionalString(ratingsSource[String(score)]);
    if (valueRaw) {
      ratings[score] = valueRaw;
    }
  }

  return {
    id: idRaw || randomUUID(),
    title,
    ratings,
    order
  };
};

export class CaseCriteriaService {
  constructor(private readonly repository: CaseCriteriaRepository) {}

  listCriteria(): Promise<CaseCriteriaSet> {
    return this.repository.listCriteria();
  }

  async replaceCriteria(criteria: unknown, expectedVersion: unknown): Promise<CaseCriteriaSet> {
    const version = ensureNonNegativeInteger(expectedVersion);
    const list = Array.isArray(criteria) ? criteria : [];
    const models = list.map((item, index) => buildCriterion(item, index));
    const result = await this.repository.replaceCriteria(models, version);
    if (result === 'version-conflict') {
      throw new Error('VERSION_CONFLICT');
    }
    return result;
  }
}
