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

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

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

const resolveApiBase = () => {
  const explicitBase = import.meta.env.VITE_API_URL?.trim();
  if (explicitBase) {
    return explicitBase.replace(/\/$/, '');
  }

  if (typeof window === 'undefined') {
    return 'http://localhost:4000';
  }

  const hostname = window.location.hostname.toLowerCase();

  // В продакшене используем тот же домен, чтобы не зависеть от локальных адресов.
  if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
    return window.location.origin;
  }

  // Для локальной разработки оставляем привычный порт API.
  return 'http://localhost:4000';
};

const API_BASE = resolveApiBase();

const buildUrl = (path: string) => {
  const normalizedBase = API_BASE.endsWith('/') ? API_BASE : `${API_BASE}/`;
  return new URL(path.replace(/^\//, ''), normalizedBase).toString();
};

export const apiRequest = async <T>(
  path: string,
  options: RequestOptions = {}
): Promise<T> => {
  const { body, headers, credentials, ...rest } = options;

  const response = await fetch(buildUrl(path), {
    ...rest,
    // По умолчанию отправляем куки, чтобы сервер видел текущую сессию.
    credentials: credentials ?? 'include',
    headers: buildHeaders(headers, body),
    body: resolveBody(body)
  });

  const text = await response.text();
  let payload: unknown = null;

  if (text) {
    try {
      payload = JSON.parse(text);
    } catch (error) {
      console.error('Сервер вернул неожиданный формат ответа:', {
        status: response.status,
        preview: text.slice(0, 120)
      });

      throw new ApiError(
        response.status || 0,
        undefined,
        'Сервер вернул данные в неизвестном формате.'
      );
    }
  }

  if (!response.ok) {
    const message =
      isRecord(payload) && typeof payload.message === 'string'
        ? payload.message
        : 'Не удалось выполнить запрос.';

    const code =
      isRecord(payload) && typeof payload.code === 'string'
        ? payload.code
        : undefined;

    throw new ApiError(response.status, code, message);
  }

  return payload as T;
};
