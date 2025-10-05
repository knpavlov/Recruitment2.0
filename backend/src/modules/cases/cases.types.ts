import { randomUUID } from 'crypto';

export type CaseDomainErrorCode = 'not-found' | 'version-conflict' | 'duplicate' | 'invalid-input';

export class CaseDomainError extends Error {
  constructor(public readonly code: CaseDomainErrorCode, message?: string) {
    super(message ?? code);
  }
}

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

export interface CaseFilesUploadPayload {
  fileName: string;
  mimeType: string;
  size: number;
  dataUrl: string;
}

export const generateFolderId = () => randomUUID();
export const generateFileId = () => randomUUID();
