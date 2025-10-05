import { randomUUID } from 'crypto';
import type { AccountsService } from '../accounts/accounts.service.js';
import { MailerService } from '../../shared/mailer.service.js';
import { OtpService } from '../../shared/otp.service.js';
import { AccessCodesRepository } from './accessCodes.repository.js';
import { SessionsRepository } from './sessions.repository.js';

export const CODE_TTL_MS = 10 * 60 * 1000;
export const SESSION_TTL_MS = 12 * 60 * 60 * 1000;
export const EXTENDED_SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export class AuthService {
  constructor(
    private readonly accountsService: AccountsService,
    private readonly codesRepository = new AccessCodesRepository(),
    private readonly sessionsRepository = new SessionsRepository(),
    private readonly mailer = new MailerService(),
    private readonly otp = new OtpService()
  ) {}

  async requestAccessCode(email: string) {
    const account = await this.accountsService.findByEmail(email.trim().toLowerCase());
    if (!account || (account.role !== 'admin' && account.role !== 'super-admin')) {
      throw new Error('ACCOUNT_NOT_FOUND');
    }
    const code = this.otp.generateCode();
    const expiresAt = new Date(Date.now() + CODE_TTL_MS);
    await this.codesRepository.saveCode({
      email: account.email,
      code,
      expiresAt
    });
    await this.mailer.sendAccessCode(account.email, code);
    return { email: account.email };
  }

  async verifyAccessCode(email: string, code: string, rememberMe: boolean) {
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
    if (!account || (account.role !== 'admin' && account.role !== 'super-admin')) {
      await this.codesRepository.deleteCode(normalized);
      throw new Error('ACCOUNT_NOT_FOUND');
    }

    if (account.status === 'pending') {
      await this.accountsService.activateAccount(account.id);
    }

    await this.codesRepository.deleteCode(normalized);

    const sessionExpiresAt = new Date(
      Date.now() + (rememberMe ? EXTENDED_SESSION_TTL_MS : SESSION_TTL_MS)
    );
    const token = randomUUID();

    await this.sessionsRepository.createSession({
      token,
      accountId: account.id,
      expiresAt: sessionExpiresAt,
      rememberMe
    });

    return {
      token,
      role: account.role,
      email: account.email,
      expiresAt: sessionExpiresAt.toISOString(),
      rememberMe
    };
  }

  async getSession(token: string) {
    return this.sessionsRepository.findActiveSession(token);
  }

  async logout(token: string) {
    await this.sessionsRepository.deleteByToken(token);
  }
}
