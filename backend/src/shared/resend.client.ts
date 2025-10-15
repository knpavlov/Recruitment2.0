interface ResendRequest {
  apiKey: string;
  from: string;
  to: string;
  subject: string;
  text: string;
}

interface ResendErrorResponse {
  name?: string;
  message?: string;
}

// Собственный класс ошибки помогает передавать статус и код Resend дальше по цепочке
export class ResendError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string
  ) {
    super(message);
    this.name = 'ResendError';
  }
}

// Минимальный HTTP-клиент для Resend, чтобы изолировать сетевую логику от остального приложения
export const sendWithResend = async ({ apiKey, from, to, subject, text }: ResendRequest) => {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from,
      to,
      subject,
      text
    })
  });

  if (!response.ok) {
    let details: ResendErrorResponse | undefined;
    try {
      details = (await response.json()) as ResendErrorResponse;
    } catch (error) {
      // Нам важно не потерять исходную ошибку, поэтому просто логируем сбой парсинга
      console.error('Не удалось разобрать ответ Resend', error);
    }

    const code = typeof details?.name === 'string' ? details.name : undefined;
    const message =
      typeof details?.message === 'string' && details.message.trim().length > 0
        ? details.message
        : response.statusText;

    throw new ResendError(message, response.status, code);
  }
};
