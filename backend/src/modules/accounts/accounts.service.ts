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
  invitationToken: string;
  createdAt: Date;
  activatedAt?: Date;
  firstName?: string;
  lastName?: string;
}

const splitDisplayName = (displayName: string | undefined): { firstName?: string; lastName?: string } => {
  if (!displayName) {
    return {};
  }
  const trimmed = displayName.trim();
  if (!trimmed) {
    return {};
  }
  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return {};
  }
  if (parts.length === 1) {
    return { firstName: parts[0] };
  }
  const lastName = parts[parts.length - 1];
  const firstName = parts.slice(0, -1).join(' ');
  return {
    firstName: firstName || undefined,
    lastName: lastName || undefined
  };
};

export class AccountsService {
  constructor(private readonly repository: AccountsRepository, private readonly mailer = new MailerService()) {}

  async listAccounts() {
    return this.repository.listAccounts();
  }

  async findByEmail(email: string) {
    return this.repository.findByEmail(email);
  }

  async inviteAccount(email: string, role: AccountRole) {
    const normalized = email.trim().toLowerCase();
    if (!normalized || role === 'super-admin') {
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

  async ensureUserAccount(email: string, displayName?: string) {
    const normalized = email.trim().toLowerCase();
    if (!normalized) {
      throw new Error('INVALID_INVITE');
    }
    const existing = await this.findByEmail(normalized);
    if (existing) {
      if (displayName) {
        const { firstName, lastName } = splitDisplayName(displayName);
        const missingFirst = !existing.firstName && firstName;
        const missingLast = !existing.lastName && lastName;
        if (missingFirst || missingLast) {
          const updated = await this.repository.updateNames(existing.id, {
            firstName: missingFirst ? firstName : existing.firstName,
            lastName: missingLast ? lastName : existing.lastName
          });
          if (updated) {
            return updated;
          }
        }
      }
      return existing;
    }
    const record: AccountRecord = {
      id: randomUUID(),
      email: normalized,
      role: 'user',
      status: 'pending',
      invitationToken: randomUUID(),
      createdAt: new Date()
    };
    const { firstName, lastName } = splitDisplayName(displayName);
    if (firstName) {
      record.firstName = firstName;
    }
    if (lastName) {
      record.lastName = lastName;
    }
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
