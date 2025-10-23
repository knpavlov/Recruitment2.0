import { randomUUID } from 'crypto';
import { MailerService, MAILER_NOT_CONFIGURED } from '../../shared/mailer.service.js';
import { AccountsRepository } from './accounts.repository.js';

export type AccountRole = 'super-admin' | 'admin' | 'user';
export type InterviewerSeniority = 'MD' | 'SD' | 'D' | 'SM' | 'M' | 'SA' | 'A';
export type AccountStatus = 'pending' | 'active';

export interface AccountRecord {
  id: string;
  email: string;
  role: AccountRole;
  status: AccountStatus;
  name?: string;
  firstName?: string;
  lastName?: string;
  interviewerRole?: InterviewerSeniority | null;
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

  private static normalizeNamePart(value: string | undefined | null): string | undefined {
    if (typeof value !== 'string') {
      return undefined;
    }
    const trimmed = value.trim();
    return trimmed || undefined;
  }

  private static composeFullName(firstName?: string, lastName?: string): string | undefined {
    const parts = [firstName, lastName]
      .map((value) => (typeof value === 'string' ? value.trim() : ''))
      .filter((value) => Boolean(value));
    if (!parts.length) {
      return undefined;
    }
    return parts.join(' ');
  }

  private static splitFullName(name: string | undefined): { firstName?: string; lastName?: string } {
    if (!name) {
      return {};
    }
    const tokens = name
      .split(/\s+/)
      .map((token) => token.trim())
      .filter((token) => Boolean(token));
    if (!tokens.length) {
      return {};
    }
    const [first, ...rest] = tokens;
    const last = rest.join(' ').trim();
    return {
      firstName: first || undefined,
      lastName: last || undefined
    };
  }

  private static normalizeInterviewerRole(role: string | undefined): InterviewerSeniority | null {
    if (!role) {
      return null;
    }
    const normalized = role.trim().toUpperCase();
    const allowed: InterviewerSeniority[] = ['MD', 'SD', 'D', 'SM', 'M', 'SA', 'A'];
    if (!allowed.includes(normalized as InterviewerSeniority)) {
      throw new Error('INVALID_INTERVIEWER_ROLE');
    }
    return normalized as InterviewerSeniority;
  }

  async inviteAccount(
    email: string,
    role: AccountRole,
    firstName?: string,
    lastName?: string,
    interviewerRole?: string | null
  ) {
    const normalized = email.trim().toLowerCase();
    if (!normalized || role === 'super-admin') {
      throw new Error('INVALID_INVITE');
    }
    const normalizedFirstName = AccountsService.normalizeNamePart(firstName);
    const normalizedLastName = AccountsService.normalizeNamePart(lastName);
    if (!normalizedFirstName || !normalizedLastName) {
      throw new Error('INVALID_NAME');
    }
    const displayName = AccountsService.composeFullName(normalizedFirstName, normalizedLastName);
    const normalizedInterviewerRole = AccountsService.normalizeInterviewerRole(interviewerRole ?? undefined);
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
      name: displayName,
      firstName: normalizedFirstName,
      lastName: normalizedLastName,
      interviewerRole: normalizedInterviewerRole,
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
    const normalizedName =
      AccountsService.normalizeNamePart(name) ?? AccountsService.deriveNameFromEmail(normalized);
    const parts = AccountsService.splitFullName(normalizedName);
    const firstName = parts.firstName;
    const lastName = parts.lastName;
    const displayName = AccountsService.composeFullName(firstName, lastName) ?? normalizedName;
    const record: AccountRecord = {
      id: randomUUID(),
      email: normalized,
      role: 'user',
      status: 'pending',
      invitationToken: randomUUID(),
      createdAt: new Date(),
      name: displayName,
      firstName,
      lastName,
      interviewerRole: null
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
