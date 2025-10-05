interface CaseFolder {
  id: string;
  name: string;
  files: string[];
}

export class CasesService {
  private folders: CaseFolder[] = [];

  async listFolders() {
    return this.folders;
  }
}
