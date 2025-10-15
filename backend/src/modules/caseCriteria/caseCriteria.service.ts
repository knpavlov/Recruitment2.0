import { randomUUID } from 'crypto';
import { CaseCriteriaRepository } from './caseCriteria.repository.js';
import { CaseCriterionRecord, CaseCriterionWriteModel } from './caseCriteria.types.js';

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

const sanitizeRatings = (
  source: unknown
): CaseCriterionWriteModel['ratings'] => {
  if (!source || typeof source !== 'object') {
    return {};
  }
  const payload = source as Record<string, unknown>;
  const ratings: CaseCriterionWriteModel['ratings'] = {};
  for (const score of [1, 2, 3, 4, 5] as const) {
    const raw = payload[String(score)];
    if (typeof raw === 'string') {
      const trimmed = raw.trim();
      if (trimmed) {
        ratings[score] = trimmed;
      }
    }
  }
  return ratings;
};

const buildWriteModel = (value: unknown): CaseCriterionWriteModel => {
  if (!value || typeof value !== 'object') {
    throw new Error('INVALID_INPUT');
  }
  const payload = value as Record<string, unknown>;
  const idRaw = typeof payload.id === 'string' ? payload.id.trim() : '';
  const title = readRequiredString(payload.title);
  const ratings = sanitizeRatings(payload.ratings);
  return { id: idRaw || randomUUID(), title, ratings };
};

export class CaseCriteriaService {
  constructor(private readonly repository: CaseCriteriaRepository) {}

  async listCriteria(): Promise<CaseCriterionRecord[]> {
    return this.repository.list();
  }

  async getCriterion(id: string): Promise<CaseCriterionRecord> {
    const trimmed = id.trim();
    if (!trimmed) {
      throw new Error('INVALID_INPUT');
    }
    const record = await this.repository.find(trimmed);
    if (!record) {
      throw new Error('NOT_FOUND');
    }
    return record;
  }

  async createCriterion(payload: unknown): Promise<CaseCriterionRecord> {
    const model = buildWriteModel(payload);
    return this.repository.create(model);
  }

  async updateCriterion(id: string, payload: unknown, expectedVersion: number): Promise<CaseCriterionRecord> {
    const trimmed = id.trim();
    if (!trimmed) {
      throw new Error('INVALID_INPUT');
    }
    if (typeof expectedVersion !== 'number' || !Number.isInteger(expectedVersion) || expectedVersion <= 0) {
      throw new Error('INVALID_INPUT');
    }
    const model = buildWriteModel(payload);
    model.id = trimmed;
    const result = await this.repository.update(model, expectedVersion);
    if (result === 'version-conflict') {
      throw new Error('VERSION_CONFLICT');
    }
    if (!result) {
      throw new Error('NOT_FOUND');
    }
    return result;
  }

  async deleteCriterion(id: string): Promise<string> {
    const trimmed = id.trim();
    if (!trimmed) {
      throw new Error('INVALID_INPUT');
    }
    const removed = await this.repository.delete(trimmed);
    if (!removed) {
      throw new Error('NOT_FOUND');
    }
    return trimmed;
  }
}
