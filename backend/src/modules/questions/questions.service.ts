import { randomUUID } from 'crypto';
import { QuestionsRepository } from './questions.repository.js';
import { QuestionRecord, QuestionWriteModel } from './questions.types.js';

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

const readPositiveInteger = (value: unknown, fallback: number): number => {
  if (typeof value === 'number' && Number.isInteger(value) && value >= 0) {
    return value;
  }
  return fallback;
};

const buildQuestionModel = (payload: unknown): QuestionWriteModel => {
  if (!payload || typeof payload !== 'object') {
    throw new Error('INVALID_INPUT');
  }

  const source = payload as Record<string, unknown>;
  const idRaw = typeof source.id === 'string' ? source.id.trim() : '';
  const shortTitleSource = source.shortTitle ?? source.title;
  const shortTitle = readRequiredString(shortTitleSource);
  const content = readRequiredString(source.content);

  const questionId = idRaw || randomUUID();
  const criteriaSource = Array.isArray(source.criteria) ? source.criteria : [];
  const criteria = criteriaSource.map((item, index) => {
    if (!item || typeof item !== 'object') {
      throw new Error('INVALID_INPUT');
    }
    const entry = item as Record<string, unknown>;
    const criterionIdRaw = typeof entry.id === 'string' ? entry.id.trim() : '';
    const name = readRequiredString(entry.name);
    const position = readPositiveInteger(entry.position, index);
    return {
      id: criterionIdRaw || randomUUID(),
      questionId,
      name,
      position,
      score1: readOptionalString(entry.score1),
      score2: readOptionalString(entry.score2),
      score3: readOptionalString(entry.score3),
      score4: readOptionalString(entry.score4),
      score5: readOptionalString(entry.score5)
    };
  });

  return {
    id: questionId,
    shortTitle,
    content,
    criteria
  };
};

const ensurePositiveInteger = (value: unknown): number => {
  if (typeof value !== 'number' || !Number.isInteger(value) || value <= 0) {
    throw new Error('INVALID_INPUT');
  }
  return value;
};

export class QuestionsService {
  constructor(private readonly repository: QuestionsRepository) {}

  async listQuestions(): Promise<QuestionRecord[]> {
    return this.repository.listQuestions();
  }

  async createQuestion(payload: unknown): Promise<QuestionRecord> {
    const model = buildQuestionModel(payload);
    return this.repository.createQuestion(model);
  }

  async updateQuestion(id: string, payload: unknown, expectedVersion: unknown): Promise<QuestionRecord> {
    const trimmedId = typeof id === 'string' ? id.trim() : '';
    if (!trimmedId) {
      throw new Error('INVALID_INPUT');
    }
    const version = ensurePositiveInteger(expectedVersion);
    if (!payload || typeof payload !== 'object') {
      throw new Error('INVALID_INPUT');
    }
    const model = buildQuestionModel({ ...(payload as Record<string, unknown>), id: trimmedId });
    const result = await this.repository.updateQuestion(model, version);
    if (result === 'not-found') {
      throw new Error('NOT_FOUND');
    }
    if (result === 'version-conflict') {
      throw new Error('VERSION_CONFLICT');
    }
    return result;
  }

  async deleteQuestion(id: string): Promise<string> {
    const trimmedId = typeof id === 'string' ? id.trim() : '';
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
