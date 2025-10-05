import { postgresPool } from '../../shared/database/postgres.client.js';
import type { CaseFolder } from './cases.service.js';

interface CaseRow extends Record<string, unknown> {
  folder_id: string;
  folder_name: string;
  file_name: string | null;
}

export class CasesRepository {
  async listFolders(): Promise<CaseFolder[]> {
    const result = await postgresPool.query<CaseRow>(
      `SELECT f.id AS folder_id, f.name AS folder_name, cf.file_name
       FROM case_folders f
       LEFT JOIN case_files cf ON cf.folder_id = f.id
       ORDER BY f.created_at DESC, cf.created_at ASC;`
    );

    const folders = new Map<string, CaseFolder>();
    for (const row of result.rows) {
      const existing = folders.get(row.folder_id);
      if (!existing) {
        folders.set(row.folder_id, {
          id: row.folder_id,
          name: row.folder_name,
          files: row.file_name ? [row.file_name] : []
        });
      } else if (row.file_name) {
        existing.files.push(row.file_name);
      }
    }

    return Array.from(folders.values());
  }
}
