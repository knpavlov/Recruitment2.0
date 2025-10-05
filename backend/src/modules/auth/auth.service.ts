import { randomUUID } from 'crypto';
import { accountsService } from '../accounts/accounts.module';
import { MailerService } from '../../shared/mailer.service';
import { OtpService } from '../../shared/otp.service';

interface AccessCodeRecord {
  email: string;
  code: string;
  expiresAt: Date;
}

export class AuthService {
  private codes: AccessCodeRecord[] = [];
  private mailer = new MailerService();
  private otp = new OtpService();

  async requestAccessCode(email: string) {
    const account = await accountsService.findByEmail(email.trim().toLowerCase());
    if (!account) {
      throw new Error('ACCOUNT_NOT_FOUND');
    }
    const code = this.otp.generateCode();
    const record: AccessCodeRecord = {
      email: account.email,
      code,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000)
    };
    this.codes = this.codes.filter((item) => item.email !== account.email);
    this.codes.push(record);
    await this.mailer.sendAccessCode(account.email, code);
    return { email: account.email };
  }

  async verifyAccessCode(email: string, code: string) {
    const normalized = email.trim().toLowerCase();
    const record = this.codes.find((item) => item.email === normalized && item.code === code);
    if (!record) {
      throw new Error('CODE_INVALID');
    }
    if (record.expiresAt.getTime() < Date.now()) {
      this.codes = this.codes.filter((item) => item !== record);
      throw new Error('CODE_EXPIRED');
    }

    const account = await accountsService.findByEmail(normalized);
    if (!account) {
      throw new Error('ACCOUNT_NOT_FOUND');
    }

    if (account.status === 'pending') {
      await accountsService.activateAccount(account.id);
    }

    this.codes = this.codes.filter((item) => item !== record);

    return {
      token: randomUUID(),
      role: account.role,
      email: account.email
    };
  }
}
