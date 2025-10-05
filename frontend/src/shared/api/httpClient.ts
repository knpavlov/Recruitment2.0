const rawBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';
const normalizedBaseUrl = rawBaseUrl.endsWith('/') ? rawBaseUrl.slice(0, -1) : rawBaseUrl;

const buildUrl = (path: string) =>
  `${normalizedBaseUrl}${path.startsWith('/') ? path : `/${path}`}`;

const parseJson = async (response: Response) => {
  if (response.status === 204) {
    return null;
  }
  const text = await response.text();
  try {
    return text ? JSON.parse(text) : null;
  } catch (error) {
    console.error('Не удалось разобрать ответ сервера:', error);
    return null;
  }
};

const request = async <T>(path: string, init: RequestInit = {}): Promise<T> => {
  const response = await fetch(buildUrl(path), {
    credentials: 'include',
    ...init
  });

  if (!response.ok) {
    const payload = await parseJson(response);
    const message = typeof payload?.message === 'string' ? payload.message : 'REQUEST_FAILED';
    const error = new Error(message);
    (error as Error & { status?: number }).status = response.status;
    throw error;
  }

  return (await parseJson(response)) as T;
};

export const httpClient = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined
    }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined
    }),
  delete: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: 'DELETE',
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined
    })
};

export type HttpError = Error & { status?: number };
