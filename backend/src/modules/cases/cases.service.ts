import { CasesRepository } from './cases.repository.js';
import {
  CaseDomainError,
  CaseFilesUploadPayload,
  CaseFolder,
  generateFolderId
} from './cases.types.js';

export class CasesService {
  constructor(private readonly repository: CasesRepository) {}

  async listFolders(): Promise<CaseFolder[]> {
    return this.repository.listFolders();
  }

  async createFolder(name: string): Promise<CaseFolder> {
    const trimmed = name.trim();
    if (!trimmed) {
      throw new CaseDomainError('invalid-input');
    }

    const duplicate = await this.repository.findFolderByName(trimmed);
    if (duplicate) {
      throw new CaseDomainError('duplicate');
    }

    const id = generateFolderId();
    return this.repository.insertFolder(id, trimmed);
  }

  async renameFolder(id: string, name: string, expectedVersion: number): Promise<CaseFolder> {
    if (!Number.isInteger(expectedVersion)) {
      throw new CaseDomainError('invalid-input');
    }
    const trimmed = name.trim();
    if (!trimmed) {
      throw new CaseDomainError('invalid-input');
    }

    const duplicate = await this.repository.findFolderByName(trimmed);
    if (duplicate && duplicate.id !== id) {
      throw new CaseDomainError('duplicate');
    }

    return this.repository.renameFolder(id, trimmed, expectedVersion);
  }

  async deleteFolder(id: string): Promise<void> {
    const deleted = await this.repository.deleteFolder(id);
    if (!deleted) {
      throw new CaseDomainError('not-found');
    }
  }

  async addFiles(
    folderId: string,
    files: CaseFilesUploadPayload[],
    expectedVersion: number
  ): Promise<CaseFolder> {
    if (!Number.isInteger(expectedVersion)) {
      throw new CaseDomainError('invalid-input');
    }
    if (!files.length) {
      throw new CaseDomainError('invalid-input');
    }

    return this.repository.addFiles(folderId, files, expectedVersion);
  }

  async removeFile(folderId: string, fileId: string, expectedVersion: number): Promise<CaseFolder> {
    if (!Number.isInteger(expectedVersion)) {
      throw new CaseDomainError('invalid-input');
    }
    return this.repository.removeFile(folderId, fileId, expectedVersion);
  }
}
