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

const isLocalHostname = (hostname: string) =>
  hostname === 'localhost' || hostname === '127.0.0.1';

const normalizeBaseUrl = (value: string) => value.replace(/\/$/, '');

// Railway разворачивает фронтенд и бэкенд на разных поддоменах.
// Чтобы не полагаться на ручную настройку переменных окружения, пробуем
// автоматически заменить "-frontend" на "-backend" в имени хоста.
const guessRailwayBackendHost = (location: Location) => {
  const match = location.hostname.toLowerCase().match(/^(.*?)-frontend(\..*)$/);
  if (!match) {
    return null;
  }

  const [, prefix, suffix] = match;
  return `${location.protocol}//${prefix}-backend${suffix}`;
};

const resolveBrowserApiBase = (location: Location) => {
  const railwayBackend = guessRailwayBackendHost(location);
  if (railwayBackend) {
    return railwayBackend;
  }

  if (isLocalHostname(location.hostname.toLowerCase())) {
    return 'http://localhost:4000';
  }

  return location.origin;
};

const resolveApiBase = () => {
  const explicitBase = import.meta.env.VITE_API_URL?.trim();
  if (explicitBase) {
    return normalizeBaseUrl(explicitBase);
  }

  if (typeof window === 'undefined') {
    return 'http://localhost:4000';
  }

  return normalizeBaseUrl(resolveBrowserApiBase(window.location));
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
  let payload: unknown = null;

  if (text) {
    try {
      payload = JSON.parse(text);
    } catch (error) {
      throw new ApiError(
        response.status,
        undefined,
        'Сервер вернул некорректный ответ. Обратитесь к администраторам.'
      );
    }
  }

  if (!response.ok) {
    const data = (payload ?? null) as Record<string, unknown> | null;
    const messageFromServer =
      typeof data?.message === 'string' ? data.message : undefined;
    const codeFromServer = typeof data?.code === 'string' ? data.code : undefined;
    const message = messageFromServer ?? 'Не удалось выполнить запрос.';
    const code = codeFromServer;
    throw new ApiError(response.status, code, message);
  }

  return payload as T;
};
