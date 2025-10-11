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
      console.error('Failed to parse Resend error payload', error);
    }

    const reason = details?.message ?? response.statusText;
    throw new Error(`Resend responded with ${response.status}: ${reason}`);
  }
};
