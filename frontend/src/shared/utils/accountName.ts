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

export const resolveAccountName = (
  account: Pick<AccountRecord, 'email' | 'name' | 'firstName' | 'lastName'>
): string => {
  const firstName = account.firstName?.trim();
  const lastName = account.lastName?.trim();
  if (firstName && lastName) {
    return `${firstName} ${lastName}`;
  }
  const trimmed = account.name?.trim();
  if (trimmed) {
    return trimmed;
  }
  if (firstName) {
    return firstName;
  }
  if (lastName) {
    return lastName;
  }
  return deriveNameFromEmail(account.email) ?? account.email;
};

export const buildAccountDescriptor = (
  account: Pick<AccountRecord, 'email' | 'name' | 'firstName' | 'lastName'>
): { name: string; label: string } => {
  const name = resolveAccountName(account);
  const label = name === account.email ? account.email : `${name} — ${account.email}`;
  return { name, label };
};
