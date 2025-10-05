import { postgresPool } from '../../shared/database/postgres.client.js';
import {
  CaseDomainError,
  CaseFilesUploadPayload,
  CaseFolder,
  CaseFileRecord,
  generateFileId
} from './cases.types.js';

const pool = postgresPool as unknown as {
  query: (queryText: string, params?: unknown[]) => Promise<{ rows: any[]; rowCount?: number }>;
  connect: () => Promise<{
    query: (queryText: string, params?: unknown[]) => Promise<{ rows: any[]; rowCount?: number }>;
    release: () => void;
  }>;
};

interface FolderRow extends Record<string, unknown> {
  folder_id: string;
  folder_name: string;
  folder_version: number;
  folder_created_at: Date;
  folder_updated_at: Date;
  file_id: string | null;
  file_name: string | null;
  file_mime_type: string | null;
  file_size: number | null;
  file_data_url: string | null;
  file_uploaded_at: Date | null;
}

interface FolderMeta {
  id: string;
  name: string;
  version: number;
}

const mapRowsToFolder = (rows: FolderRow[]): CaseFolder | null => {
  if (!rows.length) {
    return null;
  }

  const first = rows[0];
  const files: CaseFileRecord[] = rows
    .filter((row) => row.file_id)
    .map((row) => {
      const uploadedAt = row.file_uploaded_at
        ? (row.file_uploaded_at as Date).toISOString()
        : new Date().toISOString();
      return {
        id: row.file_id as string,
        fileName: row.file_name as string,
        mimeType: (row.file_mime_type as string | null) ?? 'application/octet-stream',
        size: Number(row.file_size ?? 0),
        dataUrl: row.file_data_url as string,
        uploadedAt
      };
    });

  return {
    id: first.folder_id,
    name: first.folder_name,
    version: first.folder_version,
    createdAt: first.folder_created_at.toISOString(),
    updatedAt: first.folder_updated_at.toISOString(),
    files
  };
};

const folderSelection = `
  SELECT
    f.id AS folder_id,
    f.name AS folder_name,
    f.version AS folder_version,
    f.created_at AS folder_created_at,
    f.updated_at AS folder_updated_at,
    cf.id AS file_id,
    cf.file_name AS file_name,
    cf.mime_type AS file_mime_type,
    cf.size AS file_size,
    cf.data_url AS file_data_url,
    cf.uploaded_at AS file_uploaded_at
  FROM case_folders f
  LEFT JOIN case_files cf ON cf.folder_id = f.id
`;

export class CasesRepository {
  async listFolders(): Promise<CaseFolder[]> {
    const result = await pool.query(`${folderSelection} ORDER BY f.name ASC, cf.uploaded_at ASC NULLS LAST;`);
    const rows = result.rows as FolderRow[];

    const folders = new Map<string, FolderRow[]>();
    for (const row of rows) {
      const collection = folders.get(row.folder_id) ?? [];
      collection.push(row);
      folders.set(row.folder_id, collection);
    }

    return Array.from(folders.values())
      .map((rows) => mapRowsToFolder(rows))
      .filter((folder): folder is CaseFolder => Boolean(folder));
  }

  async findFolderMetaById(id: string): Promise<FolderMeta | null> {
    const result = await pool.query(`SELECT id, name, version FROM case_folders WHERE id = $1 LIMIT 1;`, [id]);
    const row = result.rows[0] as FolderMeta | undefined;
    return row ? { id: row.id, name: row.name, version: row.version } : null;
  }

  async findFolderByName(name: string): Promise<FolderMeta | null> {
    const result = await pool.query(
      `SELECT id, name, version
         FROM case_folders
        WHERE LOWER(name) = LOWER($1)
        LIMIT 1;`,
      [name]
    );
    const row = result.rows[0] as FolderMeta | undefined;
    return row ? { id: row.id, name: row.name, version: row.version } : null;
  }

  async insertFolder(id: string, name: string): Promise<CaseFolder> {
    await pool.query(
      `INSERT INTO case_folders (id, name)
       VALUES ($1, $2);`,
      [id, name]
    );
    return this.getFolderById(id);
  }

  async getFolderById(id: string): Promise<CaseFolder> {
    const result = await pool.query(`${folderSelection} WHERE f.id = $1 ORDER BY cf.uploaded_at ASC NULLS LAST;`, [id]);
    const folder = mapRowsToFolder(result.rows as FolderRow[]);
    if (!folder) {
      throw new CaseDomainError('not-found');
    }
    return folder;
  }

  async renameFolder(id: string, name: string, expectedVersion: number): Promise<CaseFolder> {
    const result = await pool.query(
      `UPDATE case_folders
          SET name = $2,
              version = version + 1,
              updated_at = NOW()
        WHERE id = $1 AND version = $3
        RETURNING id;`,
      [id, name, expectedVersion]
    );

    if ((result.rowCount ?? 0) === 0) {
      const exists = await this.findFolderMetaById(id);
      if (!exists) {
        throw new CaseDomainError('not-found');
      }
      throw new CaseDomainError('version-conflict');
    }

    return this.getFolderById(id);
  }

  async deleteFolder(id: string): Promise<boolean> {
    const result = await pool.query(`DELETE FROM case_folders WHERE id = $1;`, [id]);
    return (result.rowCount ?? 0) > 0;
  }

  async addFiles(
    folderId: string,
    files: CaseFilesUploadPayload[],
    expectedVersion: number
  ): Promise<CaseFolder> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const versionResult = await client.query(`SELECT version FROM case_folders WHERE id = $1 FOR UPDATE;`, [folderId]);
      const row = versionResult.rows[0] as { version: number } | undefined;
      if (!row) {
        throw new CaseDomainError('not-found');
      }
      if (row.version !== expectedVersion) {
        throw new CaseDomainError('version-conflict');
      }

      for (const file of files) {
        const fileId = generateFileId();
        await client.query(
          `INSERT INTO case_files (id, folder_id, file_name, mime_type, size, data_url, uploaded_at)
           VALUES ($1, $2, $3, $4, $5, $6, NOW());`,
          [fileId, folderId, file.fileName, file.mimeType, file.size, file.dataUrl]
        );
      }

      await client.query(
        `UPDATE case_folders
            SET version = $2,
                updated_at = NOW()
          WHERE id = $1;`,
        [folderId, row.version + 1]
      );

      await client.query('COMMIT');
      const folder = await this.getFolderById(folderId);
      return folder;
    } catch (error) {
      await client.query('ROLLBACK');
      if (error instanceof CaseDomainError) {
        throw error;
      }
      throw error;
    } finally {
      client.release();
    }
  }

  async removeFile(
    folderId: string,
    fileId: string,
    expectedVersion: number
  ): Promise<CaseFolder> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const versionResult = await client.query(`SELECT version FROM case_folders WHERE id = $1 FOR UPDATE;`, [folderId]);
      const row = versionResult.rows[0] as { version: number } | undefined;
      if (!row) {
        throw new CaseDomainError('not-found');
      }
      if (row.version !== expectedVersion) {
        throw new CaseDomainError('version-conflict');
      }

      const deleteResult = await client.query(`DELETE FROM case_files WHERE id = $1 AND folder_id = $2;`, [fileId, folderId]);

      if ((deleteResult.rowCount ?? 0) === 0) {
        throw new CaseDomainError('not-found');
      }

      await client.query(
        `UPDATE case_folders
            SET version = $2,
                updated_at = NOW()
          WHERE id = $1;`,
        [folderId, row.version + 1]
      );

      await client.query('COMMIT');
      const folder = await this.getFolderById(folderId);
      return folder;
    } catch (error) {
      await client.query('ROLLBACK');
      if (error instanceof CaseDomainError) {
        throw error;
      }
      throw error;
    } finally {
      client.release();
    }
  }
}
