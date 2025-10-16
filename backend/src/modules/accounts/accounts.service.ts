import { randomUUID } from 'crypto';
import { MailerService, MAILER_NOT_CONFIGURED } from '../../shared/mailer.service.js';
import { AccountsRepository } from './accounts.repository.js';

export type AccountRole = 'super-admin' | 'admin' | 'user';
export type AccountStatus = 'pending' | 'active';

export interface AccountRecord {
  id: string;
  email: string;
  role: AccountRole;
  status: AccountStatus;
  firstName?: string;
  lastName?: string;
  name?: string;
  invitationToken: string;
  createdAt: Date;
  activatedAt?: Date;
}

export class AccountsService {
  constructor(private readonly repository: AccountsRepository, private readonly mailer = new MailerService()) {}

  async listAccounts() {
    return this.repository.listAccounts();
  }

  async findByEmail(email: string) {
    return this.repository.findByEmail(email);
  }

  private static deriveNameFromEmail(email: string): string | undefined {
    const localPart = email.split('@')[0] ?? '';
    const normalized = localPart.replace(/[._-]+/g, ' ').trim();
    if (!normalized) {
      return undefined;
    }
    return normalized.replace(/\b\w+/g, (segment) => segment.charAt(0).toUpperCase() + segment.slice(1).toLowerCase());
  }

  private static normalizeName(value: string | undefined | null): string | undefined {
    if (typeof value !== 'string') {
      return undefined;
    }
    const trimmed = value.replace(/\s+/g, ' ').trim();
    return trimmed || undefined;
  }

  private static normalizeNamePart(value: string | undefined | null): string | undefined {
    if (typeof value !== 'string') {
      return undefined;
    }
    const trimmed = value.replace(/\s+/g, ' ').trim();
    return trimmed || undefined;
  }

  private static extractNameParts(
    fullName: string | undefined
  ): { firstName?: string; lastName?: string; fullName?: string } {
    const normalized = AccountsService.normalizeName(fullName);
    if (!normalized) {
      return {};
    }
    const segments = normalized.split(' ');
    if (segments.length === 0) {
      return {};
    }
    const firstName = segments[0];
    const lastName = segments.length > 1 ? segments[segments.length - 1] : undefined;
    return { firstName, lastName, fullName: normalized };
  }

  async inviteAccount(email: string, role: AccountRole, firstName?: string, lastName?: string) {
    const normalized = email.trim().toLowerCase();
    if (!normalized || role === 'super-admin') {
      throw new Error('INVALID_INVITE');
    }
    const normalizedFirstName = AccountsService.normalizeNamePart(firstName);
    const normalizedLastName = AccountsService.normalizeNamePart(lastName);
    if (!normalizedFirstName || !normalizedLastName) {
      throw new Error('INVALID_NAME');
    }
    const exists = await this.findByEmail(normalized);
    if (exists) {
      throw new Error('ALREADY_EXISTS');
    }
    const invitationToken = randomUUID();
    const fullName = `${normalizedFirstName} ${normalizedLastName}`.trim();
    const record: AccountRecord = {
      id: randomUUID(),
      email: normalized,
      role,
      status: 'pending',
      firstName: normalizedFirstName,
      lastName: normalizedLastName,
      name: fullName,
      invitationToken,
      createdAt: new Date()
    };
    const saved = await this.repository.insertAccount(record);
    try {
      await this.mailer.sendInvitation(normalized, invitationToken);
    } catch (error) {
      await this.repository.removeAccount(record.id);
      if (error instanceof Error && error.message === MAILER_NOT_CONFIGURED) {
        throw new Error('MAILER_UNAVAILABLE');
      }
      throw error;
    }
    return saved;
  }

  async ensureUserAccount(email: string, name?: string) {
    const normalized = email.trim().toLowerCase();
    if (!normalized) {
      throw new Error('INVALID_INVITE');
    }
    const existing = await this.findByEmail(normalized);
    if (existing) {
      return existing;
    }
    const normalizedName = AccountsService.normalizeName(name);
    const derivedName = normalizedName ?? AccountsService.deriveNameFromEmail(normalized);
    const explicitParts = AccountsService.extractNameParts(normalizedName ?? undefined);
    const derivedParts = AccountsService.extractNameParts(derivedName);
    const firstName = explicitParts.firstName ?? derivedParts.firstName;
    const lastName = explicitParts.lastName ?? derivedParts.lastName;
    const fullName = explicitParts.fullName ?? derivedParts.fullName;
    const record: AccountRecord = {
      id: randomUUID(),
      email: normalized,
      role: 'user',
      status: 'pending',
      invitationToken: randomUUID(),
      createdAt: new Date(),
      firstName,
      lastName,
      name: fullName
    };
    return this.repository.insertAccount(record);
  }

  async activateAccount(id: string) {
    const activatedAt = new Date();
    const updated = await this.repository.updateActivation(id, activatedAt);
    if (!updated) {
      throw new Error('NOT_FOUND');
    }
    return updated;
  }

  async removeAccount(id: string) {
    const account = await this.repository.findById(id);
    if (!account) {
      throw new Error('NOT_FOUND');
    }
    if (account.role === 'super-admin') {
      throw new Error('FORBIDDEN');
    }
    const removed = await this.repository.removeAccount(id);
    if (!removed) {
      throw new Error('NOT_FOUND');
    }
    return removed;
  }
}
