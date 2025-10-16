import { AccountRecord } from '../types/account';

const toTitleCase = (value: string): string =>
  value.replace(/\b\w+/g, (segment) => segment.charAt(0).toUpperCase() + segment.slice(1).toLowerCase());

export const deriveNameFromEmail = (email: string): string | undefined => {
  const localPart = email.split('@')[0] ?? '';
  const normalized = localPart.replace(/[._-]+/g, ' ').trim();
  if (!normalized) {
    return undefined;
  }
  return toTitleCase(normalized);
};

export const resolveAccountName = (account: Pick<AccountRecord, 'email' | 'name'>): string => {
  const trimmed = account.name?.trim();
  if (trimmed) {
    return trimmed;
  }
  return deriveNameFromEmail(account.email) ?? account.email;
};

export const buildAccountDescriptor = (
  account: Pick<AccountRecord, 'email' | 'name'>
): { name: string; label: string } => {
  const name = resolveAccountName(account);
  const label = name === account.email ? account.email : `${name} — ${account.email}`;
  return { name, label };
};
