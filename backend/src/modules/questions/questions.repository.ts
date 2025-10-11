import { postgresPool } from '../../shared/database/postgres.client.js';
import {
  FitQuestionCriterionRecord,
  FitQuestionRatings,
  FitQuestionRecord,
  FitQuestionWriteModel
} from './questions.types.js';

type QuestionRow = {
  id: string;
  title: string;
  content: string;
  criteria: unknown;
  version: number;
  created_at: string;
  updated_at: string;
};

const SCORE_KEYS: Array<keyof FitQuestionRatings> = ['1', '2', '3', '4', '5'];

const mapRatings = (value: unknown): FitQuestionRatings => {
  if (!value || typeof value !== 'object') {
    return {};
  }
  const payload = value as Record<string, unknown>;
  const ratings: FitQuestionRatings = {};
  for (const key of SCORE_KEYS) {
    const raw = payload[key];
    if (typeof raw === 'string') {
      const trimmed = raw.trim();
      if (trimmed) {
        ratings[key] = trimmed;
      }
    }
  }
  return ratings;
};

const mapCriteria = (value: unknown): FitQuestionCriterionRecord[] => {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((item) => {
      if (!item || typeof item !== 'object') {
        return null;
      }
      const payload = item as Record<string, unknown>;
      const id = typeof payload.id === 'string' ? payload.id.trim() : '';
      const title = typeof payload.title === 'string' ? payload.title.trim() : '';
      if (!id || !title) {
        return null;
      }
      return {
        id,
        title,
        ratings: mapRatings(payload.ratings)
      };
    })
    .filter((item): item is FitQuestionCriterionRecord => Boolean(item));
};

const mapRowToRecord = (row: QuestionRow): FitQuestionRecord => ({
  id: row.id,
  shortTitle: row.title,
  content: row.content,
  criteria: mapCriteria(row.criteria),
  version: row.version,
  createdAt: row.created_at,
  updatedAt: row.updated_at
});

export class QuestionsRepository {
  async listQuestions(): Promise<FitQuestionRecord[]> {
    const result = await postgresPool.query<QuestionRow>(
      `SELECT id, title, content, criteria, version, created_at, updated_at
         FROM questions
        ORDER BY updated_at DESC, created_at DESC;`
    );
    return result.rows.map(mapRowToRecord);
  }

  async createQuestion(model: FitQuestionWriteModel): Promise<FitQuestionRecord> {
    const result = await postgresPool.query<QuestionRow>(
      `INSERT INTO questions (id, title, content, criteria, version, created_at, updated_at)
       VALUES ($1, $2, $3, $4::jsonb, 1, NOW(), NOW())
       RETURNING id, title, content, criteria, version, created_at, updated_at;`,
      [model.id, model.shortTitle, model.content, JSON.stringify(model.criteria)]
    );
    return mapRowToRecord(result.rows[0]!);
  }

  async updateQuestion(
    model: FitQuestionWriteModel,
    expectedVersion: number
  ): Promise<FitQuestionRecord | 'version-conflict' | null> {
    const client = await postgresPool.connect();
    try {
      await client.query('BEGIN');
      const snapshot = await client.query<{ version: number }>(
        'SELECT version FROM questions WHERE id = $1 FOR UPDATE;',
        [model.id]
      );
      if (snapshot.rowCount === 0) {
        await client.query('ROLLBACK');
        return null;
      }
      const currentVersion = snapshot.rows[0]!.version;
      if (currentVersion !== expectedVersion) {
        await client.query('ROLLBACK');
        return 'version-conflict';
      }
      const nextVersion = currentVersion + 1;
      const updated = await client.query<QuestionRow>(
        `UPDATE questions
            SET title = $2,
                content = $3,
                criteria = $4::jsonb,
                version = $5,
                updated_at = NOW()
          WHERE id = $1
        RETURNING id, title, content, criteria, version, created_at, updated_at;`,
        [model.id, model.shortTitle, model.content, JSON.stringify(model.criteria), nextVersion]
      );
      await client.query('COMMIT');
      return mapRowToRecord(updated.rows[0]!);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async deleteQuestion(id: string): Promise<boolean> {
    const result = await postgresPool.query('DELETE FROM questions WHERE id = $1;', [id]);
    return result.rowCount > 0;
  }
}
