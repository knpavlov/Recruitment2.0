import { randomUUID } from 'crypto';
import { MailerService } from '../../shared/mailer.service';

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
}

export class AccountsService {
  private storage: AccountRecord[] = [];
  private mailer = new MailerService();

  constructor() {
    const superAdmin: AccountRecord = {
      id: randomUUID(),
      email: 'super.admin@company.com',
      role: 'super-admin',
      status: 'active',
      invitationToken: 'seed',
      createdAt: new Date(),
      activatedAt: new Date()
    };
    this.storage.push(superAdmin);
  }

  async listAccounts() {
    return this.storage;
  }

  async findByEmail(email: string) {
    return this.storage.find((account) => account.email === email.toLowerCase()) ?? null;
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
    this.storage.push(record);
    await this.mailer.sendInvitation(normalized, invitationToken);
    return record;
  }

  async activateAccount(id: string) {
    const account = this.storage.find((item) => item.id === id);
    if (!account) {
      throw new Error('NOT_FOUND');
    }
    account.status = 'active';
    account.activatedAt = new Date();
    return account;
  }

  async removeAccount(id: string) {
    const account = this.storage.find((item) => item.id === id);
    if (!account) {
      throw new Error('NOT_FOUND');
    }
    if (account.role === 'super-admin') {
      throw new Error('FORBIDDEN');
    }
    this.storage = this.storage.filter((item) => item.id !== id);
    return account;
  }
}
