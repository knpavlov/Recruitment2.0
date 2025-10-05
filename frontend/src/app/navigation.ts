import { AccountRole } from '../shared/types/account';

export type NavigationKey =
  | 'cases'
  | 'questions'
  | 'candidates'
  | 'evaluation'
  | 'stats'
  | 'accounts';

export interface NavigationItem {
  key: NavigationKey;
  label: string;
  roleAccess: AccountRole[];
}

export const navigationItems: NavigationItem[] = [
  { key: 'cases', label: 'База кейсов', roleAccess: ['super-admin', 'admin'] },
  { key: 'questions', label: 'База фит вопросов', roleAccess: ['super-admin', 'admin'] },
  { key: 'candidates', label: 'База кандидатов', roleAccess: ['super-admin', 'admin'] },
  { key: 'evaluation', label: 'Оценка', roleAccess: ['super-admin', 'admin', 'user'] },
  { key: 'stats', label: 'Статистика', roleAccess: ['super-admin', 'admin'] },
  { key: 'accounts', label: 'Управление аккаунтами', roleAccess: ['super-admin'] }
];
