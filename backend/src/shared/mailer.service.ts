export class MailerService {
  // Заглушка: вместо интеграции с внешним SMTP выводим сообщение в консоль
  async sendInvitation(email: string, token: string) {
    console.log(`[mailer] Отправка приглашения на ${email} с токеном ${token}`);
  }

  async sendAccessCode(email: string, code: string) {
    console.log(`[mailer] Отправка одноразового кода ${code} на ${email}`);
  }
}
