import { randomUUID } from 'crypto';
import { postgresPool } from '../../shared/database/postgres.client.js';
import { CaseEvaluationCriterion, CaseFileRecord, CaseFileUpload, CaseFolder } from './cases.types.js';

interface CaseJoinedRow extends Record<string, unknown> {
  folder_id: string;
  folder_name: string;
  folder_version: number;
  folder_created_at: Date;
  folder_updated_at: Date;
  folder_evaluation_criteria: unknown;
  file_id: string | null;
  file_name: string | null;
  file_mime_type: string | null;
  file_size: number | null;
  file_data_url: string | null;
  file_uploaded_at: Date | null;
}

const mapCriteria = (value: unknown): CaseEvaluationCriterion[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  const result: CaseEvaluationCriterion[] = [];

  for (const entry of value) {
    if (!entry || typeof entry !== 'object') {
      continue;
    }
    const payload = entry as Record<string, unknown>;
    const idRaw = typeof payload.id === 'string' ? payload.id.trim() : '';
    const titleRaw = typeof payload.title === 'string' ? payload.title.trim() : '';
    if (!idRaw || !titleRaw) {
      continue;
    }

    const ratings: CaseEvaluationCriterion['ratings'] = {};
    const ratingsSource = payload.ratings && typeof payload.ratings === 'object' ? (payload.ratings as Record<string, unknown>) : {};
    for (const score of [1, 2, 3, 4, 5] as const) {
      const valueRaw = ratingsSource[String(score)];
      if (typeof valueRaw === 'string') {
        const trimmed = valueRaw.trim();
        if (trimmed) {
          ratings[score] = trimmed;
        }
      }
    }

    result.push({ id: idRaw, title: titleRaw, ratings });
  }

  return result;
};

const mapRowsToFolder = (rows: CaseJoinedRow[]): CaseFolder | null => {
  if (rows.length === 0) {
    return null;
  }

  const first = rows[0];
  const files: CaseFileRecord[] = [];

  for (const row of rows) {
    if (!row.file_id) {
      continue;
    }
    files.push({
      id: row.file_id,
      fileName: row.file_name ?? 'File',
      mimeType: row.file_mime_type ?? 'application/octet-stream',
      size: Number(row.file_size ?? 0),
      uploadedAt: row.file_uploaded_at ? new Date(row.file_uploaded_at).toISOString() : new Date().toISOString(),
      dataUrl: row.file_data_url ?? ''
    });
  }

  return {
    id: first.folder_id,
    name: first.folder_name,
    version: Number(first.folder_version),
    createdAt: new Date(first.folder_created_at).toISOString(),
    updatedAt: new Date(first.folder_updated_at).toISOString(),
    files,
    evaluationCriteria: mapCriteria(first.folder_evaluation_criteria)
  };
};

const fetchFolderRows = async (client: any, folderId: string) => {
  const result = await client.query(
    `SELECT f.id AS folder_id,
            f.name AS folder_name,
            f.version AS folder_version,
            f.created_at AS folder_created_at,
            f.updated_at AS folder_updated_at,
            f.evaluation_criteria AS folder_evaluation_criteria,
            cf.id AS file_id,
            cf.file_name,
            cf.mime_type AS file_mime_type,
            cf.file_size,
            cf.data_url AS file_data_url,
            cf.uploaded_at AS file_uploaded_at
       FROM case_folders f
  LEFT JOIN case_files cf ON cf.folder_id = f.id
      WHERE f.id = $1
      ORDER BY cf.uploaded_at ASC, cf.created_at ASC;`,
    [folderId]
  );

  return result.rows as CaseJoinedRow[];
};

const mapListRowsToFolders = (rows: CaseJoinedRow[]): CaseFolder[] => {
  const grouped = new Map<string, CaseJoinedRow[]>();
  for (const row of rows) {
    const existing = grouped.get(row.folder_id);
    if (existing) {
      existing.push(row);
    } else {
      grouped.set(row.folder_id, [row]);
    }
  }
  return Array.from(grouped.values())
    .map((group) => mapRowsToFolder(group))
    .filter((folder): folder is CaseFolder => Boolean(folder));
};

const connectClient = async () =>
  (postgresPool as unknown as { connect: () => Promise<any> }).connect();

interface CaseFolderRow {
  id: string;
  name: string;
  version: number;
  created_at: Date;
  updated_at: Date;
  evaluation_criteria: unknown;
}

export class CasesRepository {
  async listFolders(): Promise<CaseFolder[]> {
    const result = await postgresPool.query<CaseJoinedRow>(
      `SELECT f.id AS folder_id,
              f.name AS folder_name,
              f.version AS folder_version,
              f.created_at AS folder_created_at,
              f.updated_at AS folder_updated_at,
              cf.id AS file_id,
              cf.file_name,
              cf.mime_type AS file_mime_type,
              cf.file_size,
              cf.data_url AS file_data_url,
              cf.uploaded_at AS file_uploaded_at
         FROM case_folders f
    LEFT JOIN case_files cf ON cf.folder_id = f.id
     ORDER BY f.created_at DESC, cf.uploaded_at ASC, cf.created_at ASC;`
    );

    return mapListRowsToFolders(result.rows);
  }

  async isNameTaken(name: string, excludeId?: string): Promise<boolean> {
    const result = await postgresPool.query(
      `SELECT 1 FROM case_folders WHERE lower(name) = lower($1) AND ($2::uuid IS NULL OR id <> $2) LIMIT 1;`,
      [name, excludeId ?? null]
    );
    return result.rows.length > 0;
  }

  async createFolder(name: string): Promise<CaseFolder> {
  const result = await postgresPool.query(
    `INSERT INTO case_folders (id, name)
     VALUES ($1, $2)
     RETURNING id, name, version, created_at, updated_at, evaluation_criteria;`,
    [randomUUID(), name]
  );

  const row = result.rows[0] as unknown as CaseFolderRow;
  return {
    id: row.id,
    name: row.name,
    version: Number(row.version),
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
    files: [],
    evaluationCriteria: mapCriteria(row.evaluation_criteria)
  };
}

  async renameFolder(
    id: string,
    name: string,
    expectedVersion: number
  ): Promise<'version-conflict' | CaseFolder | null> {
    const client = await connectClient();
    try {
      await client.query('BEGIN');
      const updateResult = await client.query(
        `UPDATE case_folders
            SET name = $1,
                version = version + 1,
                updated_at = NOW()
          WHERE id = $2 AND version = $3
          RETURNING id;`,
        [name, id, expectedVersion]
      );

      if (updateResult.rowCount === 0) {
        await client.query('ROLLBACK');
        const existsResult = await client.query('SELECT id FROM case_folders WHERE id = $1 LIMIT 1;', [id]);
        if (existsResult.rowCount === 0) {
          return null;
        }
        return 'version-conflict';
      }

      const rows = await fetchFolderRows(client, id);
      await client.query('COMMIT');
      return mapRowsToFolder(rows);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async deleteFolder(id: string): Promise<boolean> {
    const result = await postgresPool.query('DELETE FROM case_folders WHERE id = $1 RETURNING id;', [id]);
    return result.rows.length > 0;
  }

  async addFiles(
    folderId: string,
    files: CaseFileUpload[],
    expectedVersion: number
  ): Promise<'version-conflict' | CaseFolder | null> {
    const client = await connectClient();
    try {
      await client.query('BEGIN');
      const versionResult = await client.query(
        `SELECT version FROM case_folders WHERE id = $1 FOR UPDATE;`,
        [folderId]
      );
      if (versionResult.rowCount === 0) {
        await client.query('ROLLBACK');
        return null;
      }
      const currentVersion = Number((versionResult.rows[0] as { version: number }).version);
      if (currentVersion !== expectedVersion) {
        await client.query('ROLLBACK');
        return 'version-conflict';
      }

      for (const file of files) {
        await client.query(
          `INSERT INTO case_files (id, folder_id, file_name, mime_type, file_size, data_url, uploaded_at)
           VALUES ($1, $2, $3, $4, $5, $6, NOW());`,
          [randomUUID(), folderId, file.fileName, file.mimeType, file.size, file.dataUrl]
        );
      }

      await client.query(`UPDATE case_folders SET version = version + 1, updated_at = NOW() WHERE id = $1;`, [folderId]);
      const rows = await fetchFolderRows(client, folderId);
      await client.query('COMMIT');
      return mapRowsToFolder(rows);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async removeFile(
    folderId: string,
    fileId: string,
    expectedVersion: number
  ): Promise<'version-conflict' | CaseFolder | null> {
    const client = await connectClient();
    try {
      await client.query('BEGIN');
      const versionResult = await client.query(
        `SELECT version FROM case_folders WHERE id = $1 FOR UPDATE;`,
        [folderId]
      );
      if (versionResult.rowCount === 0) {
        await client.query('ROLLBACK');
        return null;
      }
      const currentVersion = Number((versionResult.rows[0] as { version: number }).version);
      if (currentVersion !== expectedVersion) {
        await client.query('ROLLBACK');
        return 'version-conflict';
      }

      const deleteResult = await client.query(
        `DELETE FROM case_files WHERE id = $1 AND folder_id = $2;`,
        [fileId, folderId]
      );

      if (deleteResult.rowCount === 0) {
        await client.query('ROLLBACK');
        return null;
      }

      await client.query(`UPDATE case_folders SET version = version + 1, updated_at = NOW() WHERE id = $1;`, [folderId]);
      const rows = await fetchFolderRows(client, folderId);
      await client.query('COMMIT');
      return mapRowsToFolder(rows);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async findFolderById(id: string): Promise<CaseFolder | null> {
    const client = await connectClient();
    try {
      const rows = await fetchFolderRows(client, id);
      return mapRowsToFolder(rows);
    } finally {
      client.release();
    }
  }
}
