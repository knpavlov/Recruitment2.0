import { postgresPool } from '../../shared/database/postgres.client.js';
import type { QuestionRecord } from './questions.service.js';

interface QuestionRow extends Record<string, unknown> {
  id: string;
  title: string;
  category: string | null;
  difficulty: string | null;
}

export class QuestionsRepository {
  async listQuestions(): Promise<QuestionRecord[]> {
    const result = await postgresPool.query<QuestionRow>(
      'SELECT id, title, category, difficulty FROM questions ORDER BY created_at DESC;'
    );
    return result.rows.map((row) => ({
      id: row.id,
      title: row.title,
      category: row.category ?? undefined,
      difficulty: row.difficulty ?? undefined
    }));
  }
}
