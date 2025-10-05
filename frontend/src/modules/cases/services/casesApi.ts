import { apiRequest } from '../../../shared/api/httpClient';
import { CaseFileUploadDto, CaseFolder } from '../../../shared/types/caseLibrary';

export const casesApi = {
  list: () => apiRequest<CaseFolder[]>('/cases'),
  create: (name: string) =>
    apiRequest<CaseFolder>('/cases', {
      method: 'POST',
      body: { name }
    }),
  rename: (id: string, name: string, expectedVersion: number) =>
    apiRequest<CaseFolder>(`/cases/${id}`, {
      method: 'PATCH',
      body: { name, expectedVersion }
    }),
  remove: (id: string) =>
    apiRequest<{ id: string }>(`/cases/${id}`, {
      method: 'DELETE'
    }),
  uploadFiles: (id: string, files: CaseFileUploadDto[], expectedVersion: number) =>
    apiRequest<CaseFolder>(`/cases/${id}/files`, {
      method: 'POST',
      body: { files, expectedVersion }
    }),
  removeFile: (folderId: string, fileId: string, expectedVersion: number) =>
    apiRequest<CaseFolder>(`/cases/${folderId}/files/${fileId}`, {
      method: 'DELETE',
      body: { expectedVersion }
    })
};
