import { postgresPool } from '../../shared/database/postgres.client.js';
import { CaseCriterionRecord, CaseCriterionWriteModel, CaseCriteriaStateRecord } from './caseCriteria.types.js';

interface CaseCriterionRow extends Record<string, unknown> {
  id: string;
  title: string;
  rating_1: string | null;
  rating_2: string | null;
  rating_3: string | null;
  rating_4: string | null;
  rating_5: string | null;
  order_index: number | null;
  updated_at: Date | null;
}

const toNullableString = (value: string | undefined): string | null => {
  if (value === undefined) {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
};

const mapRowToRecord = (row: CaseCriterionRow): CaseCriterionRecord => {
  const ratings: CaseCriterionRecord['ratings'] = {};
  const ratingPairs: Array<[1 | 2 | 3 | 4 | 5, string | null]> = [
    [1, row.rating_1],
    [2, row.rating_2],
    [3, row.rating_3],
    [4, row.rating_4],
    [5, row.rating_5]
  ];

  for (const [score, value] of ratingPairs) {
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed) {
        ratings[score] = trimmed;
      }
    }
  }

  return {
    id: row.id,
    title: row.title,
    ratings,
    orderIndex: Number.isFinite(row.order_index) ? Number(row.order_index) : 0,
    updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : new Date().toISOString()
  };
};

const connectClient = async () =>
  (postgresPool as unknown as { connect: () => Promise<any> }).connect();

export class CaseCriteriaRepository {
  async listAll(): Promise<CaseCriterionRecord[]> {
    const result = await postgresPool.query<CaseCriterionRow>(
      `SELECT id,
              title,
              rating_1,
              rating_2,
              rating_3,
              rating_4,
              rating_5,
              order_index,
              updated_at
         FROM case_criteria
        ORDER BY order_index ASC, created_at ASC;`
    );

    return result.rows.map((row) => mapRowToRecord(row));
  }

  async getState(): Promise<CaseCriteriaStateRecord> {
    const result = await postgresPool.query<{ version: number; updated_at: Date }>(
      `SELECT version, updated_at FROM case_criteria_state WHERE id = 'default' LIMIT 1;`
    );
    if (!result.rows.length) {
      return { version: 1, updatedAt: new Date().toISOString() };
    }
    const row = result.rows[0];
    return { version: Number(row.version ?? 1), updatedAt: row.updated_at.toISOString() };
  }

  async replaceAll(
    items: CaseCriterionWriteModel[],
    expectedVersion: number
  ): Promise<'version-conflict' | CaseCriterionRecord[]> {
    const client = await connectClient();
    try {
      await client.query('BEGIN');

      const stateResult = (await client.query(
        `SELECT version FROM case_criteria_state WHERE id = 'default' FOR UPDATE;`
      )) as { rows: Array<{ version: number }> };

      let currentVersion = 1;
      if (stateResult.rows.length > 0) {
        currentVersion = Number(stateResult.rows[0].version ?? 1);
      } else {
        await client.query(
          `INSERT INTO case_criteria_state (id, version, updated_at) VALUES ('default', 1, NOW()) ON CONFLICT (id) DO NOTHING;`
        );
        currentVersion = 1;
      }

      if (expectedVersion !== currentVersion) {
        await client.query('ROLLBACK');
        return 'version-conflict';
      }

      const keepIds: string[] = [];

      for (const item of items) {
        keepIds.push(item.id);
        await client.query(
          `INSERT INTO case_criteria (
             id,
             title,
             rating_1,
             rating_2,
             rating_3,
             rating_4,
             rating_5,
             order_index,
             created_at,
             updated_at
           ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
           ON CONFLICT (id)
           DO UPDATE SET
             title = EXCLUDED.title,
             rating_1 = EXCLUDED.rating_1,
             rating_2 = EXCLUDED.rating_2,
             rating_3 = EXCLUDED.rating_3,
             rating_4 = EXCLUDED.rating_4,
             rating_5 = EXCLUDED.rating_5,
             order_index = EXCLUDED.order_index,
             updated_at = NOW();`,
          [
            item.id,
            item.title,
            toNullableString(item.ratings[1]),
            toNullableString(item.ratings[2]),
            toNullableString(item.ratings[3]),
            toNullableString(item.ratings[4]),
            toNullableString(item.ratings[5]),
            item.orderIndex
          ]
        );
      }

      if (keepIds.length > 0) {
        await client.query('DELETE FROM case_criteria WHERE NOT (id = ANY($1::uuid[]));', [keepIds]);
      } else {
        await client.query('DELETE FROM case_criteria;');
      }

      await client.query(
        `UPDATE case_criteria_state SET version = version + 1, updated_at = NOW() WHERE id = 'default';`
      );

      await client.query('COMMIT');

      return this.listAll();
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}
