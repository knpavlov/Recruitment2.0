import { randomUUID } from 'crypto';
import { CasesRepository } from './cases.repository.js';
import { CaseEvaluationCriterion, CaseFileUpload, CaseFolder } from './cases.types.js';

export class CasesService {
  constructor(private readonly repository: CasesRepository) {}

  private normalizeRatings(source: Partial<Record<1 | 2 | 3 | 4 | 5, string>>): CaseEvaluationCriterion['ratings'] {
    const ratings: CaseEvaluationCriterion['ratings'] = {};
    for (const score of [1, 2, 3, 4, 5] as const) {
      const value = source[score];
      if (typeof value === 'string') {
        const trimmed = value.trim();
        if (trimmed) {
          ratings[score] = trimmed;
        }
      }
    }
    return ratings;
  }

  listFolders(): Promise<CaseFolder[]> {
    return this.repository.listFolders();
  }

  async getFolder(id: string): Promise<CaseFolder> {
    const trimmed = id.trim();
    if (!trimmed) {
      throw new Error('INVALID_INPUT');
    }
    const folder = await this.repository.findFolderById(trimmed);
    if (!folder) {
      throw new Error('NOT_FOUND');
    }
    return folder;
  }

  async createFolder(name: string): Promise<CaseFolder> {
    const trimmed = name.trim();
    if (!trimmed) {
      throw new Error('INVALID_NAME');
    }
    const isTaken = await this.repository.isNameTaken(trimmed);
    if (isTaken) {
      throw new Error('DUPLICATE_NAME');
    }
    return this.repository.createFolder(trimmed);
  }

  async renameFolder(id: string, name: string, expectedVersion: number): Promise<CaseFolder> {
    const trimmed = name.trim();
    if (!trimmed) {
      throw new Error('INVALID_NAME');
    }
    const isTaken = await this.repository.isNameTaken(trimmed, id);
    if (isTaken) {
      throw new Error('DUPLICATE_NAME');
    }
    const updated = await this.repository.renameFolder(id, trimmed, expectedVersion);
    if (updated === 'version-conflict') {
      throw new Error('VERSION_CONFLICT');
    }
    if (!updated) {
      throw new Error('NOT_FOUND');
    }
    return updated;
  }

  async deleteFolder(id: string): Promise<string> {
    const deleted = await this.repository.deleteFolder(id);
    if (!deleted) {
      throw new Error('NOT_FOUND');
    }
    return id;
  }

  async registerFiles(
    folderId: string,
    files: CaseFileUpload[],
    expectedVersion: number
  ): Promise<CaseFolder> {
    if (!files.length) {
      throw new Error('INVALID_INPUT');
    }
    const updated = await this.repository.addFiles(folderId, files, expectedVersion);
    if (updated === 'version-conflict') {
      throw new Error('VERSION_CONFLICT');
    }
    if (!updated) {
      throw new Error('NOT_FOUND');
    }
    return updated;
  }

  async removeFile(folderId: string, fileId: string, expectedVersion: number): Promise<CaseFolder> {
    const updated = await this.repository.removeFile(folderId, fileId, expectedVersion);
    if (updated === 'version-conflict') {
      throw new Error('VERSION_CONFLICT');
    }
    if (!updated) {
      throw new Error('NOT_FOUND');
    }
    return updated;
  }

  async createCriterion(
    folderId: string,
    payload: { id?: string; title: string; ratings: Partial<Record<1 | 2 | 3 | 4 | 5, string>> }
  ): Promise<CaseEvaluationCriterion> {
    const trimmedFolder = folderId.trim();
    if (!trimmedFolder) {
      throw new Error('INVALID_INPUT');
    }
    const title = (payload.title ?? '').trim();
    if (!title) {
      throw new Error('INVALID_INPUT');
    }
    const idCandidate = typeof payload.id === 'string' ? payload.id.trim() : '';
    const id = idCandidate || randomUUID();
    const ratings = this.normalizeRatings(payload.ratings ?? {});
    const record = await this.repository.createCriterion(trimmedFolder, { id, title, ratings });
    if (!record) {
      throw new Error('NOT_FOUND');
    }
    return record;
  }

  async updateCriterion(
    folderId: string,
    criterionId: string,
    payload: { title: string; ratings: Partial<Record<1 | 2 | 3 | 4 | 5, string>> }
  ): Promise<CaseEvaluationCriterion> {
    const trimmedFolder = folderId.trim();
    const trimmedCriterion = criterionId.trim();
    if (!trimmedFolder || !trimmedCriterion) {
      throw new Error('INVALID_INPUT');
    }
    const title = (payload.title ?? '').trim();
    if (!title) {
      throw new Error('INVALID_INPUT');
    }
    const ratings = this.normalizeRatings(payload.ratings ?? {});
    const updated = await this.repository.updateCriterion(trimmedFolder, { id: trimmedCriterion, title, ratings });
    if (!updated) {
      throw new Error('NOT_FOUND');
    }
    return updated;
  }

  async deleteCriterion(folderId: string, criterionId: string): Promise<string> {
    const trimmedFolder = folderId.trim();
    const trimmedCriterion = criterionId.trim();
    if (!trimmedFolder || !trimmedCriterion) {
      throw new Error('INVALID_INPUT');
    }
    const deleted = await this.repository.deleteCriterion(trimmedFolder, trimmedCriterion);
    if (!deleted) {
      throw new Error('NOT_FOUND');
    }
    return trimmedCriterion;
  }
}
