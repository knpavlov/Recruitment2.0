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

const ensureAbsoluteUrl = (value: string, fallbackOrigin: string) => {
  // Поддерживаем относительные пути из переменных окружения, чтобы конфигурация деплоя
  // оставалась гибкой и независимой от конкретного домена.
  if (/^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(value)) {
    return value;
  }

  const normalizedPath = value.startsWith('/') ? value : `/${value}`;
  return new URL(normalizedPath, fallbackOrigin).toString();
};

// Пытаемся вычислить адрес API на основе домена фронтенда, сохраняя
// возможность лёгкой замены инфраструктуры при миграциях.
const deriveBackendBaseFromHostname = (hostname: string, protocol: string) => {
  const normalizedProtocol = protocol === 'http:' ? 'http' : 'https';
  const lowerCaseHost = hostname.toLowerCase();

  const replacements: Array<[string, string]> = [
    ['-frontend-', '-backend-'],
    ['.frontend.', '.backend.'],
    ['-frontend', '-backend'],
    ['frontend.', 'backend.']
  ];

  for (const [pattern, replacement] of replacements) {
    if (lowerCaseHost.includes(pattern)) {
      const candidateHost = lowerCaseHost.replace(pattern, replacement);
      return `${normalizedProtocol}://${candidateHost}`;
    }
  }

  return null;
};

const resolveApiBase = () => {
  const fallbackOrigin = typeof window === 'undefined' ? 'http://localhost:4000' : window.location.origin;
  const explicitBase = import.meta.env.VITE_API_URL?.trim();

  if (explicitBase) {
    return trimTrailingSlash(ensureAbsoluteUrl(explicitBase, fallbackOrigin));
  }

  if (typeof window === 'undefined') {
    return 'http://localhost:4000';
  }

  const { hostname, protocol } = window.location;
  const normalizedHost = hostname.toLowerCase();

  if (normalizedHost === 'localhost' || normalizedHost === '127.0.0.1') {
    return 'http://localhost:4000';
  }

  const derivedBase = deriveBackendBaseFromHostname(normalizedHost, protocol);
  if (derivedBase) {
    return trimTrailingSlash(derivedBase);
  }

  // Если не удалось определить по шаблону, пробуем обращаться к текущему источнику как к API.
  return trimTrailingSlash(window.location.origin);
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
      const snippet = text.slice(0, 120).trim();

      if (!response.ok) {
        throw new ApiError(response.status, undefined, 'Не удалось выполнить запрос.');
      }

      throw new Error(
        `Сервер вернул неожиданный ответ: ${snippet || 'пустое тело'}. Проверьте конфигурацию API.`
      );
    }
  }

  const structuredPayload =
    payload && typeof payload === 'object' ? (payload as Record<string, unknown>) : null;

  if (!response.ok) {
    const messageValue = structuredPayload?.message;
    const codeValue = structuredPayload?.code;

    const message = typeof messageValue === 'string' ? messageValue : 'Не удалось выполнить запрос.';
    const code = typeof codeValue === 'string' ? codeValue : undefined;
    throw new ApiError(response.status, code, message);
  }

  return payload as T;
};
