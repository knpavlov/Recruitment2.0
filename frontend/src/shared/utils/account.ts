import { AccountRecord } from '../types/account';

const deriveNameFromEmail = (email: string): string | undefined => {
  const [localPart] = email.split('@');
  if (!localPart) {
    return undefined;
  }
  const normalized = localPart.replace(/[._-]+/g, ' ').replace(/\s+/g, ' ').trim();
  if (!normalized) {
    return undefined;
  }
  return normalized
    .split(' ')
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
};

export const getAccountDisplayName = (account: AccountRecord): string => {
  const directName = account.name?.trim();
  if (directName) {
    return directName;
  }
  const structuredName = [account.lastName?.trim(), account.firstName?.trim()]
    .filter((part): part is string => Boolean(part && part.length > 0))
    .join(' ')
    .trim();
  if (structuredName) {
    return structuredName;
  }
  return deriveNameFromEmail(account.email) ?? account.email;
};

export const suggestAccountName = (email: string): string | undefined => deriveNameFromEmail(email);
