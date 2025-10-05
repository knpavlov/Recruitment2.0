import { apiRequest } from '../../../shared/api/httpClient';
import { AccountRecord, AccountRole } from '../../../shared/types/account';

interface AccountApiModel {
  id: string;
  email: string;
  role: AccountRole;
  status: 'pending' | 'active';
  createdAt: string;
  activatedAt?: string;
  invitationToken: string;
}

const mapAccount = (record: AccountApiModel): AccountRecord => ({
  id: record.id,
  email: record.email,
  role: record.role,
  status: record.status,
  invitedAt: record.createdAt,
  activatedAt: record.activatedAt,
  invitationToken: record.invitationToken
});

export const accountsApi = {
  list: async () => {
    const records = await apiRequest<AccountApiModel[]>('/accounts');
    return records.map(mapAccount);
  },
  invite: async (email: string, role: AccountRole) => {
    const record = await apiRequest<AccountApiModel>('/accounts/invite', {
      method: 'POST',
      body: { email, role }
    });
    return mapAccount(record);
  },
  activate: async (id: string) => {
    const record = await apiRequest<AccountApiModel>(`/accounts/${id}/activate`, {
      method: 'POST'
    });
    return mapAccount(record);
  },
  remove: async (id: string) => {
    const record = await apiRequest<AccountApiModel>(`/accounts/${id}`, {
      method: 'DELETE'
    });
    return mapAccount(record);
  }
};
