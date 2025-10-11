import { postgresPool } from '../../shared/database/postgres.client.js';
import { QuestionCriterionRecord, QuestionRecord, QuestionWriteModel } from './questions.types.js';

interface QuestionJoinedRow extends Record<string, unknown> {
  question_id: string;
  question_title: string;
  question_content: string;
  question_version: number;
  question_created_at: Date;
  question_updated_at: Date;
  criterion_id: string | null;
  criterion_name: string | null;
  criterion_position: number | null;
  criterion_score_1: string | null;
  criterion_score_2: string | null;
  criterion_score_3: string | null;
  criterion_score_4: string | null;
  criterion_score_5: string | null;
}

const selectBase = `
  SELECT q.id AS question_id,
         q.title AS question_title,
         q.content AS question_content,
         q.version AS question_version,
         q.created_at AS question_created_at,
         q.updated_at AS question_updated_at,
         c.id AS criterion_id,
         c.name AS criterion_name,
         c.position AS criterion_position,
         c.score_1 AS criterion_score_1,
         c.score_2 AS criterion_score_2,
         c.score_3 AS criterion_score_3,
         c.score_4 AS criterion_score_4,
         c.score_5 AS criterion_score_5
    FROM questions q
    LEFT JOIN question_criteria c ON c.question_id = q.id
`;

const connectClient = async () =>
  (postgresPool as unknown as { connect: () => Promise<any> }).connect();

const mapRowsToQuestions = (rows: QuestionJoinedRow[]): QuestionRecord[] => {
  const map = new Map<string, QuestionRecord>();
  rows.forEach((row) => {
    const existing = map.get(row.question_id);
    if (!existing) {
      map.set(row.question_id, {
        id: row.question_id,
        shortTitle: row.question_title,
        content: row.question_content,
        version: Number(row.question_version ?? 1),
        createdAt: row.question_created_at.toISOString(),
        updatedAt: row.question_updated_at.toISOString(),
        criteria: []
      });
    }

    if (row.criterion_id) {
      const record = map.get(row.question_id);
      if (!record) {
        return;
      }
      const criterion: QuestionCriterionRecord = {
        id: row.criterion_id,
        questionId: row.question_id,
        name: row.criterion_name ?? '',
        position: Number(row.criterion_position ?? 0),
        score1: row.criterion_score_1 ?? undefined,
        score2: row.criterion_score_2 ?? undefined,
        score3: row.criterion_score_3 ?? undefined,
        score4: row.criterion_score_4 ?? undefined,
        score5: row.criterion_score_5 ?? undefined
      };
      record.criteria.push(criterion);
    }
  });

  return Array.from(map.values()).map((question) => ({
    ...question,
    criteria: [...question.criteria].sort((a, b) => {
      if (a.position === b.position) {
        return a.id.localeCompare(b.id);
      }
      return a.position - b.position;
    })
  }));
};

const insertCriteria = async (client: any, criteria: QuestionWriteModel['criteria']) => {
  if (!criteria.length) {
    return;
  }
  for (const item of criteria) {
    await client.query(
      `INSERT INTO question_criteria (id, question_id, name, position, score_1, score_2, score_3, score_4, score_5)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (id) DO UPDATE
         SET name = EXCLUDED.name,
             position = EXCLUDED.position,
             score_1 = EXCLUDED.score_1,
             score_2 = EXCLUDED.score_2,
             score_3 = EXCLUDED.score_3,
             score_4 = EXCLUDED.score_4,
             score_5 = EXCLUDED.score_5;`,
      [
        item.id,
        item.questionId,
        item.name,
        item.position,
        item.score1 ?? null,
        item.score2 ?? null,
        item.score3 ?? null,
        item.score4 ?? null,
        item.score5 ?? null
      ]
    );
  }
};

export class QuestionsRepository {
  async listQuestions(): Promise<QuestionRecord[]> {
    const result = await postgresPool.query<QuestionJoinedRow>(
      `${selectBase} ORDER BY q.updated_at DESC, q.created_at DESC, c.position ASC, c.created_at ASC;`
    );
    if (!result.rows.length) {
      return [];
    }
    return mapRowsToQuestions(result.rows);
  }

  async findQuestion(id: string): Promise<QuestionRecord | null> {
    const result = await postgresPool.query<QuestionJoinedRow>(
      `${selectBase} WHERE q.id = $1 ORDER BY c.position ASC, c.created_at ASC;`,
      [id]
    );
    if (!result.rows.length) {
      return null;
    }
    const [question] = mapRowsToQuestions(result.rows);
    return question ?? null;
  }

  async createQuestion(model: QuestionWriteModel): Promise<QuestionRecord> {
    const client = await connectClient();
    try {
      await client.query('BEGIN');
      await client.query(
        `INSERT INTO questions (id, title, content)
         VALUES ($1, $2, $3);`,
        [model.id, model.shortTitle, model.content]
      );

      await insertCriteria(client, model.criteria);

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

    const created = await this.findQuestion(model.id);
    if (!created) {
      throw new Error('QUESTION_NOT_FOUND_AFTER_CREATE');
    }
    return created;
  }

  async updateQuestion(
    model: QuestionWriteModel,
    expectedVersion: number
  ): Promise<QuestionRecord | 'not-found' | 'version-conflict'> {
    const client = await connectClient();
    try {
      await client.query('BEGIN');
      const updateResult = await client.query(
        `UPDATE questions
            SET title = $2,
                content = $3,
                updated_at = NOW(),
                version = version + 1
          WHERE id = $1 AND version = $4
          RETURNING id;`,
        [model.id, model.shortTitle, model.content, expectedVersion]
      );

      if (updateResult.rowCount === 0) {
        const exists = await client.query(`SELECT version FROM questions WHERE id = $1;`, [model.id]);
        await client.query('ROLLBACK');
        if (exists.rowCount === 0) {
          return 'not-found';
        }
        return 'version-conflict';
      }

      await client.query(`DELETE FROM question_criteria WHERE question_id = $1;`, [model.id]);
      await insertCriteria(client, model.criteria);

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

    const updated = await this.findQuestion(model.id);
    if (!updated) {
      return 'not-found';
    }
    return updated;
  }

  async deleteQuestion(id: string): Promise<boolean> {
    const result = await postgresPool.query<{ id: string }>(
      `DELETE FROM questions WHERE id = $1 RETURNING id;`,
      [id]
    );
    return result.rows.length > 0;
  }
}
