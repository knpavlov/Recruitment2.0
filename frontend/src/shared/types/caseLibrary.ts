export interface CaseFileRecord {
  id: string;
  fileName: string;
  mimeType: string;
  size: number;
  uploadedAt: string;
  dataUrl: string;
}

export interface CaseFolder {
  id: string;
  name: string;
  version: number;
  createdAt: string;
  updatedAt: string;
  files: CaseFileRecord[];
}
