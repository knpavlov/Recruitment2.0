import { CaseFolder } from '../../../shared/types/caseLibrary';
import { httpClient, HttpError } from '../../../shared/api/httpClient';

export interface CaseFileUploadDto {
  fileName: string;
  mimeType: string;
  size: number;
  dataUrl: string;
}

const mapError = (error: unknown): HttpError => {
  if (error instanceof Error) {
    return error as HttpError;
  }
  return new Error('REQUEST_FAILED') as HttpError;
};

export const casesApi = {
  async list(): Promise<CaseFolder[]> {
    try {
      return await httpClient.get<CaseFolder[]>('/cases');
    } catch (error) {
      throw mapError(error);
    }
  },
  async create(name: string): Promise<CaseFolder> {
    try {
      return await httpClient.post<CaseFolder>('/cases', { name });
    } catch (error) {
      throw mapError(error);
    }
  },
  async rename(id: string, name: string, expectedVersion: number): Promise<CaseFolder> {
    try {
      return await httpClient.patch<CaseFolder>(`/cases/${id}`, { name, expectedVersion });
    } catch (error) {
      throw mapError(error);
    }
  },
  async remove(id: string): Promise<void> {
    try {
      await httpClient.delete<void>(`/cases/${id}`);
    } catch (error) {
      throw mapError(error);
    }
  },
  async uploadFiles(
    id: string,
    files: CaseFileUploadDto[],
    expectedVersion: number
  ): Promise<CaseFolder> {
    try {
      return await httpClient.post<CaseFolder>(`/cases/${id}/files`, { files, expectedVersion });
    } catch (error) {
      throw mapError(error);
    }
  },
  async removeFile(
    id: string,
    fileId: string,
    expectedVersion: number
  ): Promise<CaseFolder> {
    try {
      return await httpClient.delete<CaseFolder>(`/cases/${id}/files/${fileId}`, {
        expectedVersion
      });
    } catch (error) {
      throw mapError(error);
    }
  }
};
