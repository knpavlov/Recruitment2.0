import { AccountRecord, AccountRole } from '../../../shared/types/account';
import { httpClient, HttpError } from '../../../shared/api/httpClient';

const mapError = (error: unknown): HttpError => {
  if (error instanceof Error) {
    return error as HttpError;
  }
  return new Error('REQUEST_FAILED') as HttpError;
};

export const accountsApi = {
  async list(): Promise<AccountRecord[]> {
    try {
      return await httpClient.get<AccountRecord[]>('/accounts');
    } catch (error) {
      throw mapError(error);
    }
  },
  async invite(email: string, role: AccountRole): Promise<AccountRecord> {
    try {
      return await httpClient.post<AccountRecord>('/accounts/invite', { email, role });
    } catch (error) {
      throw mapError(error);
    }
  },
  async activate(id: string): Promise<AccountRecord> {
    try {
      return await httpClient.post<AccountRecord>(`/accounts/${id}/activate`);
    } catch (error) {
      throw mapError(error);
    }
  },
  async remove(id: string): Promise<void> {
    try {
      await httpClient.delete<void>(`/accounts/${id}`);
    } catch (error) {
      throw mapError(error);
    }
  }
};
