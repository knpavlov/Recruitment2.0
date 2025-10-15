import { postgresPool } from '../../shared/database/postgres.client.js';
import { CaseCriteriaSet, CaseCriterionRecord, CaseCriterionWriteModel } from './caseCriteria.types.js';

interface CaseCriterionRow extends Record<string, unknown> {
  id: string;
  title: string;
  rating_1: string | null;
  rating_2: string | null;
  rating_3: string | null;
  rating_4: string | null;
  rating_5: string | null;
  order_index: number | null;
  created_at: Date | null;
  updated_at: Date | null;
}

interface CaseCriteriaMetaRow extends Record<string, unknown> {
  version: number;
  updated_at: Date;
}

const mapRowToRecord = (row: CaseCriterionRow): CaseCriterionRecord => {
  const ratings: CaseCriterionRecord['ratings'] = {};
  const pairs: Array<[1 | 2 | 3 | 4 | 5, string | null]> = [
    [1, row.rating_1],
    [2, row.rating_2],
    [3, row.rating_3],
    [4, row.rating_4],
    [5, row.rating_5]
  ];

  for (const [score, value] of pairs) {
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed) {
        ratings[score] = trimmed;
      }
    }
  }

  return {
    id: row.id,
    title: typeof row.title === 'string' ? row.title : '',
    ratings,
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : new Date().toISOString()
  };
};

const connectClient = async () =>
  (postgresPool as unknown as { connect: () => Promise<any> }).connect();

export class CaseCriteriaRepository {
  async listCriteria(): Promise<CaseCriteriaSet> {
    await postgresPool.query(
      `INSERT INTO case_criteria_meta (id, version)
       VALUES ('default', 1)
       ON CONFLICT (id) DO NOTHING;`
    );

    const metaResult = await postgresPool.query<CaseCriteriaMetaRow>(
      `SELECT version, updated_at
         FROM case_criteria_meta
        WHERE id = 'default'
        LIMIT 1;`
    );

    const version = metaResult.rows.length > 0 ? Number(metaResult.rows[0].version) : 1;
    const updatedAt =
      metaResult.rows.length > 0
        ? new Date(metaResult.rows[0].updated_at).toISOString()
        : new Date().toISOString();

    const criteriaResult = await postgresPool.query<CaseCriterionRow>(
      `SELECT id,
              title,
              rating_1,
              rating_2,
              rating_3,
              rating_4,
              rating_5,
              order_index,
              created_at,
              updated_at
         FROM case_criteria
        ORDER BY order_index ASC, created_at ASC;`
    );

    const criteria = criteriaResult.rows.map((row) => mapRowToRecord(row));

    return { version, updatedAt, criteria };
  }

  async replaceCriteria(
    items: CaseCriterionWriteModel[],
    expectedVersion: number
  ): Promise<'version-conflict' | CaseCriteriaSet> {
    const client = await connectClient();
    try {
      await client.query('BEGIN');
      await client.query(
        `INSERT INTO case_criteria_meta (id, version)
         VALUES ('default', 1)
         ON CONFLICT (id) DO NOTHING;`
      );

      const metaResult = await client.query(
        `SELECT version, updated_at
           FROM case_criteria_meta
          WHERE id = 'default'
          FOR UPDATE;`
      );
      const metaRows = metaResult.rows as CaseCriteriaMetaRow[];
      const currentVersion = metaRows.length > 0 ? Number(metaRows[0].version) : 1;
      if (currentVersion !== expectedVersion) {
        await client.query('ROLLBACK');
        return 'version-conflict';
      }

      await client.query('DELETE FROM case_criteria;');

      const stored: CaseCriterionRecord[] = [];
      for (const item of items) {
        const result = await client.query(
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
           )
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
           RETURNING id,
                     title,
                     rating_1,
                     rating_2,
                     rating_3,
                     rating_4,
                     rating_5,
                     order_index,
                     created_at,
                     updated_at;`,
          [
            item.id,
            item.title,
            item.ratings[1] ?? null,
            item.ratings[2] ?? null,
            item.ratings[3] ?? null,
            item.ratings[4] ?? null,
            item.ratings[5] ?? null,
            item.order
          ]
        );
        const row = (result.rows as CaseCriterionRow[])[0];
        stored.push(mapRowToRecord(row));
      }

      const nextVersion = currentVersion + 1;
      const updateMeta = await client.query(
        `UPDATE case_criteria_meta
            SET version = $2,
                updated_at = NOW()
          WHERE id = $1
        RETURNING version, updated_at;`,
        ['default', nextVersion]
      );
      const updateMetaRows = updateMeta.rows as CaseCriteriaMetaRow[];

      await client.query('COMMIT');

      return {
        version: Number(updateMetaRows[0].version),
        updatedAt: new Date(updateMetaRows[0].updated_at).toISOString(),
        criteria: stored.sort((a, b) => {
          const orderA = items.find((entry) => entry.id === a.id)?.order ?? 0;
          const orderB = items.find((entry) => entry.id === b.id)?.order ?? 0;
          return orderA - orderB;
        })
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}
