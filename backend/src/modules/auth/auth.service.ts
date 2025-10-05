import { randomUUID } from 'crypto';
import type { AccountsService } from '../accounts/accounts.service.js';
import { MailerService } from '../../shared/mailer.service.js';
import { OtpService } from '../../shared/otp.service.js';
import { AccessCodesRepository } from './accessCodes.repository.js';

export class AuthService {
  constructor(
    private readonly accountsService: AccountsService,
    private readonly codesRepository = new AccessCodesRepository(),
    private readonly mailer = new MailerService(),
    private readonly otp = new OtpService()
  ) {}

  async requestAccessCode(email: string) {
    const account = await this.accountsService.findByEmail(email.trim().toLowerCase());
    if (!account) {
      throw new Error('ACCOUNT_NOT_FOUND');
    }
    const code = this.otp.generateCode();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    await this.codesRepository.saveCode({
      email: account.email,
      code,
      expiresAt
    });
    await this.mailer.sendAccessCode(account.email, code);
    return { email: account.email };
  }

  async verifyAccessCode(email: string, code: string) {
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
}
