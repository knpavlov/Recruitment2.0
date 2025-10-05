import { randomUUID } from 'crypto';
import { connect as createNetConnection, type Socket } from 'net';
import { connect as createTlsConnection, type TLSSocket } from 'tls';

type SmtpSocket = Socket | TLSSocket;

interface MailerConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  password: string;
  from: string;
}

const resolveConfig = (): MailerConfig | null => {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const password = process.env.SMTP_PASSWORD;
  const from = process.env.SMTP_FROM ?? user;
  const port = Number(process.env.SMTP_PORT ?? (process.env.SMTP_SECURE === 'true' ? 465 : 587));

  if (!host || !user || !password || !from) {
    return null;
  }

  return {
    host,
    port,
    secure: process.env.SMTP_SECURE === 'true',
    user,
    password,
    from
  };
};

const createResponseReader = (socket: SmtpSocket) => {
  let buffer = '';
  let resolver: ((response: string) => void) | null = null;
  let rejecter: ((error: Error) => void) | null = null;

  const extractResponse = () => {
    if (!buffer.includes('\n')) {
      return null;
    }
    const lines: string[] = [];
    while (true) {
      const newlineIndex = buffer.indexOf('\n');
      if (newlineIndex === -1) {
        break;
      }
      const line = buffer.slice(0, newlineIndex + 1);
      buffer = buffer.slice(newlineIndex + 1);
      lines.push(line.trimEnd());
      if (line.length >= 4 && line[3] === ' ') {
        return lines.join('\n');
      }
      if (!buffer.includes('\n')) {
        break;
      }
    }
    return null;
  };

  const tryResolve = () => {
    if (!resolver) {
      return;
    }
    const response = extractResponse();
    if (!response) {
      return;
    }
    const resolve = resolver;
    resolver = null;
    rejecter = null;
    resolve(response);
  };

  const handleData = (chunk: Buffer | string) => {
    buffer += chunk.toString();
    tryResolve();
  };

  const handleError = (error: Error) => {
    if (rejecter) {
      const reject = rejecter;
      resolver = null;
      rejecter = null;
      reject(error);
    }
  };

  socket.on('data', handleData);
  socket.on('error', handleError);

  return () =>
    new Promise<string>((resolve, reject) => {
      if (resolver) {
        reject(new Error('Awaiting previous SMTP response.'));
        return;
      }
      resolver = resolve;
      rejecter = reject;
      tryResolve();
    });
};

const createSocket = async (config: MailerConfig): Promise<{ socket: SmtpSocket; wait: () => Promise<string> }> => {
  const socket: SmtpSocket = config.secure
    ? createTlsConnection({ host: config.host, port: config.port })
    : createNetConnection({ host: config.host, port: config.port });

  socket.setEncoding('utf-8');

  await new Promise<void>((resolve, reject) => {
    const handleError = (error: Error) => {
      socket.removeListener('connect', handleConnect);
      reject(error);
    };
    const handleConnect = () => {
      socket.removeListener('error', handleError);
      resolve();
    };
    socket.once('error', handleError);
    socket.once('connect', handleConnect);
  });

  const wait = createResponseReader(socket);
  await wait(); // server greeting (220)
  return { socket, wait };
};

const sendCommand = async (
  socket: SmtpSocket,
  wait: () => Promise<string>,
  command: string,
  expected: number | number[]
) => {
  const codes = Array.isArray(expected) ? expected : [expected];
  socket.write(`${command}\r\n`);
  const response = await wait();
  const code = Number(response.slice(0, 3));
  if (!codes.includes(code)) {
    throw new Error(`SMTP command "${command}" failed: ${response}`);
  }
  return response;
};

const formatBody = (text: string) =>
  text
    .replace(/\r?\n/g, '\r\n')
    .replace(/\r\n\./g, '\r\n..');

export class MailerService {
  private readonly config = resolveConfig();
  private warned = false;

  // If SMTP is not configured, record a notification in the logs
  private ensureConfig(): MailerConfig | null {
    if (!this.config) {
      if (!this.warned) {
        console.warn('SMTP is not configured. Emails will not be sent.');
        this.warned = true;
      }
      return null;
    }
    return this.config;
  }

  private async deliver(to: string, subject: string, text: string) {
    const config = this.ensureConfig();
    if (!config) {
      console.info(`[mailer] Email for ${to}: ${subject} — ${text}`);
      return;
    }

    const { socket, wait } = await createSocket(config);
    try {
      await sendCommand(socket, wait, `EHLO ${config.host}`, 250);
      await sendCommand(socket, wait, 'AUTH LOGIN', 334);
      await sendCommand(socket, wait, Buffer.from(config.user).toString('base64'), 334);
      await sendCommand(socket, wait, Buffer.from(config.password).toString('base64'), 235);
      await sendCommand(socket, wait, `MAIL FROM:<${config.from}>`, 250);
      await sendCommand(socket, wait, `RCPT TO:<${to}>`, [250, 251]);
      await sendCommand(socket, wait, 'DATA', 354);

      const messageId = `<${randomUUID()}@${config.host}>`;
      const now = new Date().toUTCString();
      const payload = [
        `Message-ID: ${messageId}`,
        `Date: ${now}`,
        `From: ${config.from}`,
        `To: ${to}`,
        `Subject: ${subject}`,
        'Content-Type: text/plain; charset=UTF-8',
        'Content-Transfer-Encoding: 8bit',
        '',
        formatBody(text),
        ''
      ].join('\r\n');

      socket.write(`${payload}\r\n.\r\n`);
      const dataResponse = await wait();
      if (!dataResponse.startsWith('250')) {
        throw new Error(`SMTP did not confirm message delivery: ${dataResponse}`);
      }
      await sendCommand(socket, wait, 'QUIT', 221);
    } finally {
      socket.end();
    }
  }

  async sendInvitation(email: string, token: string) {
    const subject = 'Invitation to the case management system';
    const inviteUrl = process.env.INVITE_URL?.trim();
    const separator = inviteUrl && inviteUrl.includes('?') ? '&' : '?';
    const activationLink = inviteUrl
      ? `${inviteUrl}${separator}email=${encodeURIComponent(email)}&invitation=${encodeURIComponent(token)}`
      : null;
    const bodyLines = [
      'You have been invited to the case management system.',
      activationLink
        ? `Open this link to activate your access: ${activationLink}`
        : inviteUrl
          ? `Open this link to activate your access: ${inviteUrl}`
          : null,
      `If the link is unavailable, use this invitation token: ${token}`,
      'Once activated, return to the login page and request a one-time access code.'
    ].filter((line): line is string => Boolean(line));
    await this.deliver(email, subject, bodyLines.join('\n\n'));
  }

  async sendAccessCode(email: string, code: string) {
    const subject = 'Your access code';
    const body = `One-time access code: ${code}. Enter it within 10 minutes.`;
    await this.deliver(email, subject, body);
  }
}
