import { randomUUID } from 'crypto';
import { QuestionsRepository } from './questions.repository.js';
import {
  FitQuestionCriterionRecord,
  FitQuestionRatings,
  FitQuestionRecord,
  FitQuestionWriteModel
} from './questions.types.js';

const SCORE_KEYS: Array<keyof FitQuestionRatings> = ['1', '2', '3', '4', '5'];

const readTrimmedString = (value: unknown): string => {
  if (typeof value !== 'string') {
    return '';
  }
  return value.trim();
};

const sanitizeRatings = (value: unknown): FitQuestionRatings => {
  if (!value || typeof value !== 'object') {
    return {};
  }
  const source = value as Record<string, unknown>;
  const ratings: FitQuestionRatings = {};
  for (const score of SCORE_KEYS) {
    const raw = readTrimmedString(source[score]);
    if (raw) {
      ratings[score] = raw;
    }
  }
  return ratings;
};

const sanitizeCriterion = (value: unknown): FitQuestionCriterionRecord => {
  if (!value || typeof value !== 'object') {
    throw new Error('INVALID_INPUT');
  }
  const payload = value as Record<string, unknown>;
  const idRaw = readTrimmedString(payload.id);
  const titleRaw = readTrimmedString(payload.title);
  if (!titleRaw) {
    throw new Error('INVALID_INPUT');
  }
  const ratings = sanitizeRatings(payload.ratings);
  return {
    id: idRaw || randomUUID(),
    title: titleRaw,
    ratings
  };
};

const sanitizeCriteria = (value: unknown): FitQuestionCriterionRecord[] => {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.map((item) => sanitizeCriterion(item));
};

const ensurePositiveInteger = (value: unknown): number | null => {
  if (typeof value !== 'number' || !Number.isInteger(value) || value <= 0) {
    return null;
  }
  return value;
};

const buildWriteModel = (payload: unknown): FitQuestionWriteModel => {
  if (!payload || typeof payload !== 'object') {
    throw new Error('INVALID_INPUT');
  }
  const source = payload as Record<string, unknown>;
  const idRaw = readTrimmedString(source.id);
  const shortTitle = readTrimmedString(source.shortTitle);
  const content = readTrimmedString(source.content);
  if (!shortTitle || !content) {
    throw new Error('INVALID_INPUT');
  }
  const criteria = sanitizeCriteria(source.criteria);
  return {
    id: idRaw || randomUUID(),
    shortTitle,
    content,
    criteria
  };
};

export class QuestionsService {
  constructor(private readonly repository: QuestionsRepository) {}

  async listQuestions(): Promise<FitQuestionRecord[]> {
    return this.repository.listQuestions();
  }

  async createQuestion(payload: unknown): Promise<FitQuestionRecord> {
    const model = buildWriteModel(payload);
    return this.repository.createQuestion(model);
  }

  async updateQuestion(id: string, payload: unknown, expectedVersion: unknown): Promise<FitQuestionRecord> {
    const trimmedId = id.trim();
    if (!trimmedId) {
      throw new Error('INVALID_INPUT');
    }
    const version = ensurePositiveInteger(expectedVersion);
    if (version === null) {
      throw new Error('INVALID_INPUT');
    }
    const model = buildWriteModel(payload);
    model.id = trimmedId;
    const result = await this.repository.updateQuestion(model, version);
    if (result === 'version-conflict') {
      throw new Error('VERSION_CONFLICT');
    }
    if (!result) {
      throw new Error('NOT_FOUND');
    }
    return result;
  }

  async deleteQuestion(id: string): Promise<string> {
    const trimmedId = id.trim();
    if (!trimmedId) {
      throw new Error('INVALID_INPUT');
    }
    const deleted = await this.repository.deleteQuestion(trimmedId);
    if (!deleted) {
      throw new Error('NOT_FOUND');
    }
    return trimmedId;
  }
}
