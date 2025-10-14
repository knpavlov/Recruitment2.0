import { AccountRole } from '../types/account';

// Возвращает человекочитаемое название роли аккаунта
export const getAccountRoleLabel = (role: AccountRole): string => {
  switch (role) {
    case 'super-admin':
      return 'Super admin';
    case 'admin':
      return 'Admin';
    case 'user':
    default:
      return 'User';
  }
};
