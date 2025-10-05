const DEFAULT_LOCAL_API = 'http://localhost:4000';
const PROBE_TIMEOUT_MS = 4000;

type Candidate = {
  url: string;
  reason: string;
};

const trimTrailingSlash = (value: string) => value.replace(/\/+$/, '');

const ensureAbsoluteUrl = (value: string, fallbackOrigin: string) => {
  if (/^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(value)) {
    return value;
  }

  const normalizedPath = value.startsWith('/') ? value : `/${value}`;
  return new URL(normalizedPath, fallbackOrigin).toString();
};

const normalizeCandidate = (value: string, fallbackOrigin: string) =>
  trimTrailingSlash(ensureAbsoluteUrl(value, fallbackOrigin));

const collectDomainCandidates = (hostname: string) => {
  const variants = new Set<string>();

  const replacePatterns: Array<[RegExp, string]> = [
    [/-frontend/i, '-backend'],
    [/-frontend-/i, '-'],
    [/frontend/i, 'backend'],
    [/-web/i, '-api'],
    [/web/i, 'api']
  ];

  for (const [pattern, replacement] of replacePatterns) {
    const candidate = hostname.replace(pattern, replacement);
    if (candidate !== hostname && candidate.trim().length > 0) {
      variants.add(candidate);
    }
  }

  // Дополнительно пробуем убрать явный сегмент -frontend полностью.
  const withoutFrontend = hostname.replace(/-frontend/gi, '');
  if (withoutFrontend !== hostname && withoutFrontend.trim().length > 0) {
    variants.add(withoutFrontend);
  }

  return Array.from(variants);
};

const collectCandidates = () => {
  if (typeof window === 'undefined') {
    return [
      {
        url: DEFAULT_LOCAL_API,
        reason: 'Запуск в Node.js (SSR или тесты)'
      }
    ];
  }

  const result: Candidate[] = [];
  const fallbackOrigin = window.location.origin;
  const unique = new Set<string>();

  const pushCandidate = (value: string, reason: string) => {
    const normalized = normalizeCandidate(value, fallbackOrigin);
    if (!unique.has(normalized)) {
      unique.add(normalized);
      result.push({ url: normalized, reason });
    }
  };

  const explicitBase = import.meta.env.VITE_API_URL?.trim();
  if (explicitBase) {
    pushCandidate(explicitBase, 'Переменная окружения VITE_API_URL');
  }

  pushCandidate(DEFAULT_LOCAL_API, 'Стандартный адрес разработки');
  pushCandidate(window.location.origin, 'Текущий домен без префикса');
  pushCandidate(`${window.location.origin}/api`, 'Текущий домен с префиксом /api');

  const protocol = window.location.protocol;
  const hostname = window.location.hostname;
  const domainSuffix = window.location.host.slice(hostname.length);

  const derivedHosts = collectDomainCandidates(hostname);
  for (const host of derivedHosts) {
    pushCandidate(`${protocol}//${host}${domainSuffix}`, 'Производный домен на основе эвристик');
  }

  return result;
};

const probeCandidate = async (candidate: Candidate): Promise<boolean> => {
  if (typeof window === 'undefined') {
    return candidate.url === DEFAULT_LOCAL_API;
  }

  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);

  try {
    const response = await fetch(new URL('/health', `${candidate.url}/`).toString(), {
      method: 'GET',
      signal: controller.signal,
      headers: { Accept: 'application/json' }
    });

    if (!response.ok) {
      return false;
    }

    const text = await response.text();
    if (!text) {
      return false;
    }

    try {
      const payload = JSON.parse(text) as { status?: string };
      return payload?.status === 'ok';
    } catch (error) {
      console.warn('Ответ /health не является корректным JSON для', candidate.url, error);
      return false;
    }
  } catch (error) {
    if ((error as Error).name !== 'AbortError') {
      console.warn('Не удалось обратиться к API по адресу', candidate.url, error);
    }
    return false;
  } finally {
    window.clearTimeout(timeout);
  }
};

let cachedBasePromise: Promise<string> | null = null;

const detectApiBase = async () => {
  const candidates = collectCandidates();

  for (const candidate of candidates) {
    if (await probeCandidate(candidate)) {
      if (candidate.reason) {
        console.info(`API обнаружено по адресу ${candidate.url} (${candidate.reason})`);
      }
      return candidate.url;
    }
  }

  const details = candidates.map((candidate) => `- ${candidate.url} — ${candidate.reason}`).join('\n');
  throw new Error(
    `Не удалось определить адрес API. Проверьте переменную окружения VITE_API_URL или конфигурацию прокси.\n` +
      `Проверены следующие варианты:\n${details}`
  );
};

export const getApiBase = () => {
  if (!cachedBasePromise) {
    cachedBasePromise = detectApiBase();
  }
  return cachedBasePromise;
};

export const buildApiUrl = async (path: string) => {
  const base = await getApiBase();
  const normalizedBase = base.endsWith('/') ? base : `${base}/`;
  return new URL(path.replace(/^\//, ''), normalizedBase).toString();
};

export const __resetApiBaseCacheForTests = () => {
  cachedBasePromise = null;
};
