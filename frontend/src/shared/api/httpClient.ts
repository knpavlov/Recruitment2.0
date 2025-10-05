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
  const { body, headers, ...rest } = options;
  const response = await fetch(buildUrl(path), {
    ...rest,
    headers: buildHeaders(headers, body),
    body: resolveBody(body)
  });

  const text = await response.text();
  const payload = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const message = payload?.message ?? 'Не удалось выполнить запрос.';
    const code = payload?.code as string | undefined;
    throw new ApiError(response.status, code, message);
  }

  return payload as T;
};
