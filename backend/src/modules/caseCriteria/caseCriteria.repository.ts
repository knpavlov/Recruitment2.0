import { postgresPool } from '../../shared/database/postgres.client.js';
import { CaseCriterionRecord, CaseCriterionWriteModel } from './caseCriteria.types.js';

interface CaseCriterionRow extends Record<string, unknown> {
  id: string;
  title: string;
  rating_1: string | null;
  rating_2: string | null;
  rating_3: string | null;
  rating_4: string | null;
  rating_5: string | null;
  version: number;
  created_at: Date;
  updated_at: Date;
}

const toNullableString = (value: string | undefined): string | null => {
  if (value === undefined) {
    return null;
  }
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
};

const mapRow = (row: CaseCriterionRow): CaseCriterionRecord => ({
  id: row.id,
  title: row.title,
  ratings: {
    ...(row.rating_1 ? { 1: row.rating_1.trim() } : {}),
    ...(row.rating_2 ? { 2: row.rating_2.trim() } : {}),
    ...(row.rating_3 ? { 3: row.rating_3.trim() } : {}),
    ...(row.rating_4 ? { 4: row.rating_4.trim() } : {}),
    ...(row.rating_5 ? { 5: row.rating_5.trim() } : {})
  },
  version: Number(row.version ?? 1),
  createdAt: (row.created_at instanceof Date ? row.created_at : new Date()).toISOString(),
  updatedAt: (row.updated_at instanceof Date ? row.updated_at : new Date()).toISOString()
});

export class CaseCriteriaRepository {
  async list(): Promise<CaseCriterionRecord[]> {
    const result = await postgresPool.query<CaseCriterionRow>(
      `SELECT id, title, rating_1, rating_2, rating_3, rating_4, rating_5, version, created_at, updated_at
         FROM case_criteria
        ORDER BY updated_at DESC, created_at DESC;`
    );
    return (result.rows ?? []).map((row) => mapRow(row));
  }

  async find(id: string): Promise<CaseCriterionRecord | null> {
    const result = await postgresPool.query<CaseCriterionRow>(
      `SELECT id, title, rating_1, rating_2, rating_3, rating_4, rating_5, version, created_at, updated_at
         FROM case_criteria
        WHERE id = $1
        LIMIT 1;`,
      [id]
    );
    if (!result.rows || result.rows.length === 0) {
      return null;
    }
    return mapRow(result.rows[0]);
  }

  async create(model: CaseCriterionWriteModel): Promise<CaseCriterionRecord> {
    const result = await postgresPool.query<CaseCriterionRow>(
      `INSERT INTO case_criteria (id, title, rating_1, rating_2, rating_3, rating_4, rating_5, version, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 1, NOW(), NOW())
       RETURNING id, title, rating_1, rating_2, rating_3, rating_4, rating_5, version, created_at, updated_at;`,
      [
        model.id,
        model.title,
        toNullableString(model.ratings[1]),
        toNullableString(model.ratings[2]),
        toNullableString(model.ratings[3]),
        toNullableString(model.ratings[4]),
        toNullableString(model.ratings[5])
      ]
    );
    if (!result.rows || result.rows.length === 0) {
      throw new Error('FAILED_TO_CREATE_CASE_CRITERION');
    }
    return mapRow(result.rows[0]);
  }

  async update(
    model: CaseCriterionWriteModel,
    expectedVersion: number
  ): Promise<'version-conflict' | CaseCriterionRecord | null> {
    const result = await postgresPool.query<CaseCriterionRow>(
      `UPDATE case_criteria
          SET title = $2,
              rating_1 = $3,
              rating_2 = $4,
              rating_3 = $5,
              rating_4 = $6,
              rating_5 = $7,
              version = version + 1,
              updated_at = NOW()
        WHERE id = $1 AND version = $8
        RETURNING id, title, rating_1, rating_2, rating_3, rating_4, rating_5, version, created_at, updated_at;`,
      [
        model.id,
        model.title,
        toNullableString(model.ratings[1]),
        toNullableString(model.ratings[2]),
        toNullableString(model.ratings[3]),
        toNullableString(model.ratings[4]),
        toNullableString(model.ratings[5]),
        expectedVersion
      ]
    );

    if (!result.rows || result.rows.length === 0) {
      const exists = await postgresPool.query('SELECT id FROM case_criteria WHERE id = $1 LIMIT 1;', [model.id]);
      if (!exists.rows || exists.rows.length === 0) {
        return null;
      }
      return 'version-conflict';
    }

    return mapRow(result.rows[0]);
  }

  async delete(id: string): Promise<boolean> {
    const result = await postgresPool.query('DELETE FROM case_criteria WHERE id = $1;', [id]);
    const info = result as { rowCount?: number };
    return typeof info.rowCount === 'number' ? info.rowCount > 0 : false;
  }
}
