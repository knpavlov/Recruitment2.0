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
  name?: string;
  firstName?: string;
  lastName?: string;
  invitationToken: string;
  createdAt: Date;
  activatedAt?: Date;
}

export class AccountsService {
  constructor(private readonly repository: AccountsRepository, private readonly mailer = new MailerService()) {}

  private normalizeWhitespace(value: string): string {
    return value.replace(/\s+/g, ' ').trim();
  }

  private deriveNameFromEmail(email: string): string | undefined {
    const localPart = email.split('@')[0] ?? '';
    const normalized = localPart.replace(/[._-]+/g, ' ').replace(/\s+/g, ' ').trim();
    if (!normalized) {
      return undefined;
    }
    return normalized
      .split(' ')
      .filter(Boolean)
      .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
      .join(' ');
  }

  private resolveAccountName(email: string, rawName?: string): string | undefined {
    if (rawName) {
      const prepared = this.normalizeWhitespace(rawName);
      if (prepared) {
        return prepared;
      }
    }
    return this.deriveNameFromEmail(email);
  }

  async listAccounts() {
    return this.repository.listAccounts();
  }

  async findByEmail(email: string) {
    return this.repository.findByEmail(email);
  }

  async inviteAccount(email: string, role: AccountRole, name: string) {
    const normalized = email.trim().toLowerCase();
    const normalizedName = typeof name === 'string' ? name.trim() : '';
    if (!normalized || role === 'super-admin' || !normalizedName) {
      throw new Error('INVALID_INVITE');
    }
    const preparedName = this.resolveAccountName(normalized, normalizedName);
    if (!preparedName) {
      throw new Error('INVALID_INVITE');
    }
    const exists = await this.findByEmail(normalized);
    if (exists) {
      throw new Error('ALREADY_EXISTS');
    }
    const invitationToken = randomUUID();
    const record: AccountRecord = {
      id: randomUUID(),
      email: normalized,
      role,
      status: 'pending',
      invitationToken,
      createdAt: new Date(),
      name: preparedName
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

  async ensureUserAccount(email: string) {
    const normalized = email.trim().toLowerCase();
    if (!normalized) {
      throw new Error('INVALID_INVITE');
    }
    const existing = await this.findByEmail(normalized);
    if (existing) {
      return existing;
    }
    const record: AccountRecord = {
      id: randomUUID(),
      email: normalized,
      role: 'user',
      status: 'pending',
      invitationToken: randomUUID(),
      createdAt: new Date(),
      name: this.resolveAccountName(normalized)
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
