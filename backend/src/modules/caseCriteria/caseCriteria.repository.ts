import { postgresPool } from '../../shared/database/postgres.client.js';
import { CaseCriteriaSet, CaseCriterionRecord, CaseCriterionWriteModel } from './caseCriteria.types.js';

interface CaseCriterionRow extends Record<string, unknown> {
  id: string;
  title: string | null;
  rating_1: string | null;
  rating_2: string | null;
  rating_3: string | null;
  rating_4: string | null;
  rating_5: string | null;
  position: number | null;
  created_at: Date;
  updated_at: Date;
}

interface RegistryRow extends Record<string, unknown> {
  version: number | string;
}

const REGISTRY_KEY = 'global';

const connectClient = async () =>
  (postgresPool as unknown as { connect: () => Promise<any> }).connect();

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
    title: row.title?.trim() ?? 'Criterion',
    ratings,
    position: Number.isFinite(row.position) ? Number(row.position) : 0,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString()
  };
};

const fetchRegistryVersion = async (client: any): Promise<number> => {
  const result = (await client.query(
    `SELECT version FROM case_criteria_registry WHERE id = $1 LIMIT 1;`,
    [REGISTRY_KEY]
  )) as { rows?: RegistryRow[] };
  if (!result.rows || result.rows.length === 0) {
    const inserted = (await client.query(
      `INSERT INTO case_criteria_registry (id, version, updated_at) VALUES ($1, 1, NOW()) RETURNING version;`,
      [REGISTRY_KEY]
    )) as { rows?: RegistryRow[] };
    const raw = inserted.rows?.[0]?.version;
    return typeof raw === 'number' ? raw : Number(raw ?? 1) || 1;
  }
  const raw = result.rows[0]?.version;
  return typeof raw === 'number' ? raw : Number(raw ?? 1) || 1;
};

const toNullableString = (value: string | undefined) => {
  if (!value) {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

export class CaseCriteriaRepository {
  async listCriteria(): Promise<CaseCriteriaSet> {
    const [criteriaResult, registryResult] = await Promise.all([
      postgresPool.query<CaseCriterionRow>(
        `SELECT id, title, rating_1, rating_2, rating_3, rating_4, rating_5, position, created_at, updated_at
           FROM case_criteria
          ORDER BY position ASC, created_at ASC;`
      ),
      postgresPool.query<RegistryRow>(
        `SELECT version FROM case_criteria_registry WHERE id = $1 LIMIT 1;`,
        [REGISTRY_KEY]
      )
    ]);

    const versionRaw = registryResult.rows?.[0]?.version;
    const version = typeof versionRaw === 'number' ? versionRaw : Number(versionRaw ?? 1) || 1;

    return {
      version,
      items: (criteriaResult.rows ?? []).map((row) => mapRowToRecord(row))
    };
  }

  async replaceAll(
    models: CaseCriterionWriteModel[],
    expectedVersion: number | null
  ): Promise<'version-conflict' | CaseCriteriaSet> {
    const client = await connectClient();
    try {
      await client.query('BEGIN');

      const currentVersion = await fetchRegistryVersion(client);
      if (expectedVersion != null && expectedVersion !== currentVersion) {
        await client.query('ROLLBACK');
        return 'version-conflict';
      }

      if (models.length === 0) {
        await client.query('DELETE FROM case_criteria;');
      } else {
        const keepIds = models.map((item) => item.id);
        await client.query('DELETE FROM case_criteria WHERE NOT (id = ANY($1::uuid[]));', [keepIds]);

        for (const model of models) {
          await client.query(
            `INSERT INTO case_criteria (id, title, rating_1, rating_2, rating_3, rating_4, rating_5, position, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
             ON CONFLICT (id)
             DO UPDATE SET
               title = EXCLUDED.title,
               rating_1 = EXCLUDED.rating_1,
               rating_2 = EXCLUDED.rating_2,
               rating_3 = EXCLUDED.rating_3,
               rating_4 = EXCLUDED.rating_4,
               rating_5 = EXCLUDED.rating_5,
               position = EXCLUDED.position,
               updated_at = NOW();`,
            [
              model.id,
              model.title,
              toNullableString(model.ratings[1]),
              toNullableString(model.ratings[2]),
              toNullableString(model.ratings[3]),
              toNullableString(model.ratings[4]),
              toNullableString(model.ratings[5]),
              model.position
            ]
          );
        }
      }

      const registryUpdate = (await client.query(
        `UPDATE case_criteria_registry SET version = version + 1, updated_at = NOW() WHERE id = $1 RETURNING version;`,
        [REGISTRY_KEY]
      )) as { rows?: RegistryRow[] };

      const nextVersionRaw = registryUpdate.rows?.[0]?.version;
      const nextVersion =
        typeof nextVersionRaw === 'number' ? nextVersionRaw : Number(nextVersionRaw ?? currentVersion + 1) || currentVersion + 1;

      const rowsResult = (await client.query(
        `SELECT id, title, rating_1, rating_2, rating_3, rating_4, rating_5, position, created_at, updated_at
           FROM case_criteria
          ORDER BY position ASC, created_at ASC;`
      )) as { rows?: CaseCriterionRow[] };

      await client.query('COMMIT');

      return {
        version: nextVersion,
        items: (rowsResult.rows ?? []).map((row) => mapRowToRecord(row))
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}
