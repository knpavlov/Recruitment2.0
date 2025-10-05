export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string | undefined,
    message: string
  ) {
    super(message);
  }
}

type RequestOptions = Omit<RequestInit, 'body'> & { body?: unknown };

const resolveBody = (body: unknown) => {
  if (body === undefined || body === null) {
    return undefined;
  }
  if (body instanceof FormData || typeof body === 'string') {
    return body;
  }
  return JSON.stringify(body);
};

const buildHeaders = (input?: HeadersInit, body?: unknown) => {
  const headers = new Headers(input);
  if (body !== undefined && !(body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  return headers;
};

const trimTrailingSlash = (value: string) => value.replace(/\/+$/, '');

const resolveDefaultBase = () => {
  // В девелопменте явно подключаемся к локальному API, чтобы не ломать DX.
  if (import.meta.env.DEV) {
    return 'http://localhost:4000';
  }

  // В продакшене стараемся бить в тот же origin, где открыт фронтенд.
  if (typeof window !== 'undefined' && window.location.origin) {
    return window.location.origin;
  }

  // Фолбэк нужен для SSR/тестов, где window недоступен.
  return 'http://localhost:4000';
};

const API_BASE = trimTrailingSlash((import.meta.env.VITE_API_URL as string | undefined)?.trim() ?? resolveDefaultBase());

export const apiRequest = async <T>(
  path: string,
  options: RequestOptions = {}
): Promise<T> => {
  const { body, headers, ...rest } = options;
  let response: Response;

  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...rest,
      headers: buildHeaders(headers, body),
      body: resolveBody(body)
    });
  } catch (error) {
    // Нормализуем сетевые ошибки до единого формата.
    throw new ApiError(0, 'network-error', (error as Error)?.message ?? 'Не удалось выполнить запрос.');
  }

  const text = await response.text();
  const payload = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const message = payload?.message ?? 'Не удалось выполнить запрос.';
    const code = payload?.code as string | undefined;
    throw new ApiError(response.status, code, message);
  }

  return payload as T;
};
