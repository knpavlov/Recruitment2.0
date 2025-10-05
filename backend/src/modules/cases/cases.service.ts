import { CasesRepository } from './cases.repository.js';

export interface CaseFolder {
  id: string;
  name: string;
  files: string[];
}

export class CasesService {
  constructor(private readonly repository: CasesRepository) {}

  async listFolders() {
    return this.repository.listFolders();
  }
}
