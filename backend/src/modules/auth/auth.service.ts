import { randomUUID } from 'crypto';
import type { AccountRecord, AccountsService } from '../accounts/accounts.service.js';
import { MailerService, MAILER_NOT_CONFIGURED } from '../../shared/mailer.service.js';
import { OtpService } from '../../shared/otp.service.js';
import { AccessCodesRepository } from './accessCodes.repository.js';
import { AUTH_EMAIL_LOGIN_DISABLED } from './auth.config.js';

export interface AuthSessionPayload {
  token: string;
  role: AccountRecord['role'];
  email: string;
}

export type RequestAccessCodeResult =
  | { mode: 'code'; email: string }
  | { mode: 'direct'; session: AuthSessionPayload };

export class AuthService {
  constructor(
    private readonly accountsService: AccountsService,
    private readonly codesRepository = new AccessCodesRepository(),
    private readonly mailer = new MailerService(),
    private readonly otp = new OtpService(),
    private readonly emailLoginDisabled = AUTH_EMAIL_LOGIN_DISABLED
  ) {}

  async requestAccessCode(email: string): Promise<RequestAccessCodeResult> {
    const account = await this.accountsService.findByEmail(email.trim().toLowerCase());
    if (!account) {
      throw new Error('ACCOUNT_NOT_FOUND');
    }
    if (account.role !== 'admin' && account.role !== 'super-admin') {
      throw new Error('ACCESS_DENIED');
    }
    if (this.emailLoginDisabled) {
      let activeAccount: AccountRecord = account;
      if (account.status === 'pending') {
        activeAccount = await this.accountsService.activateAccount(account.id);
      }
      await this.codesRepository.deleteCode(activeAccount.email);
      return {
        mode: 'direct',
        session: this.createSession(activeAccount)
      };
    }
    const code = this.otp.generateCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await this.codesRepository.saveCode({
      email: account.email,
      code,
      expiresAt
    });
    try {
      await this.mailer.sendAccessCode(account.email, code);
    } catch (error) {
      await this.codesRepository.deleteCode(account.email);
      if (error instanceof Error && error.message === MAILER_NOT_CONFIGURED) {
        throw new Error('MAILER_UNAVAILABLE');
      }
      throw error;
    }
    return { mode: 'code', email: account.email };
  }

  async verifyAccessCode(email: string, code: string) {
    if (this.emailLoginDisabled) {
      throw new Error('CODE_FLOW_DISABLED');
    }
    const normalized = email.trim().toLowerCase();
    const record = await this.codesRepository.findCode(normalized, code);
    if (!record) {
      throw new Error('CODE_INVALID');
    }
    if (record.expiresAt.getTime() < Date.now()) {
      await this.codesRepository.deleteCode(normalized);
      throw new Error('CODE_EXPIRED');
    }

    const account = await this.accountsService.findByEmail(normalized);
    if (!account) {
      await this.codesRepository.deleteCode(normalized);
      throw new Error('ACCOUNT_NOT_FOUND');
    }

    if (account.status === 'pending') {
      await this.accountsService.activateAccount(account.id);
    }

    await this.codesRepository.deleteCode(normalized);

    return {
      token: randomUUID(),
      role: account.role,
      email: account.email
    };
  }

  private createSession(account: AccountRecord): AuthSessionPayload {
    // Временная сборка токена без письма — когда включён режим bypass
    return {
      token: randomUUID(),
      role: account.role,
      email: account.email
    };
  }
}
