// This module resolves base URLs for client-side network requests
// so API logic stays isolated and migration-friendly.

const trimTrailingSlash = (value: string) => value.replace(/\/+$/, '');

const ensureAbsoluteUrl = (value: string, fallbackOrigin: string) => {
  if (/^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(value)) {
    return value;
  }

  const normalizedPath = value.startsWith('/') ? value : `/${value}`;
  return new URL(normalizedPath, fallbackOrigin).toString();
};

const normalizeUrl = (value: string, fallbackOrigin: string) =>
  trimTrailingSlash(ensureAbsoluteUrl(value, fallbackOrigin));

const isBrowserEnvironment = () => typeof window !== 'undefined' && typeof document !== 'undefined';

const readMetaContent = (name: string): string | undefined => {
  if (!isBrowserEnvironment()) {
    return undefined;
  }

  const element = document.querySelector(`meta[name="${name}"]`);
  return element?.getAttribute('content')?.trim() || undefined;
};

type RuntimeConfigWindow = Window & {
  __RECRUITMENT_CONFIG__?: {
    apiBaseUrl?: string;
  };
};

const readGlobalConfig = (): string | undefined => {
  if (!isBrowserEnvironment()) {
    return undefined;
  }

  const globalConfig = (window as RuntimeConfigWindow).__RECRUITMENT_CONFIG__;
  return globalConfig?.apiBaseUrl?.trim() || undefined;
};

// Attempt to derive the backend host from the frontend host name.
// Covers deployments where services follow a "frontend"/"backend" naming scheme (e.g. Railway).
const deriveBackendHost = (hostname: string): string | undefined => {
  const attempts: string[] = [];

  if (hostname.includes('-frontend-')) {
    attempts.push(hostname.replace('-frontend-', '-backend-'));
  }

  if (hostname.includes('-frontend.')) {
    attempts.push(hostname.replace('-frontend.', '-backend.'));
  }

  if (hostname.startsWith('frontend-')) {
    attempts.push(hostname.replace(/^frontend-/, 'backend-'));
  }

  if (hostname.startsWith('frontend.')) {
    attempts.push(hostname.replace(/^frontend\./, 'backend.'));
  }

  if (hostname.includes('.frontend-')) {
    attempts.push(hostname.replace('.frontend-', '.backend-'));
  }

  if (hostname.includes('.frontend.')) {
    attempts.push(hostname.replace('.frontend.', '.backend.'));
  }

  if (hostname.endsWith('.frontend')) {
    attempts.push(hostname.replace(/\.frontend$/, '.backend'));
  }

  const bySegments = hostname
    .split('.')
    .map((segment) => (segment === 'frontend' ? 'backend' : segment))
    .join('.');
  attempts.push(bySegments);

  if (hostname.includes('frontend')) {
    attempts.push(hostname.replace('frontend', 'backend'));
  }

  for (const candidate of attempts) {
    if (candidate && candidate !== hostname) {
      return candidate;
    }
  }

  return undefined;
};

const isLocalHostname = (hostname: string) => {
  const normalized = hostname.toLowerCase();
  return (
    normalized === 'localhost' ||
    normalized === '127.0.0.1' ||
    normalized === '0.0.0.0'
  );
};

// In the browser, try to infer the backend origin from the current location.
const deriveBackendOriginFromLocation = (): string | undefined => {
  if (!isBrowserEnvironment()) {
    return undefined;
  }

  const { location } = window;

  if (isLocalHostname(location.hostname)) {
    return undefined;
  }

  try {
    const baseUrl = new URL(location.origin);
    const backendHost = deriveBackendHost(baseUrl.hostname);

    if (!backendHost) {
      return undefined;
    }

    baseUrl.hostname = backendHost;
    baseUrl.port = '';

    return baseUrl.origin;
  } catch {
    return undefined;
  }
};

const resolveApiBaseUrl = (): string => {
  const browser = isBrowserEnvironment();
  const fallbackOrigin = browser ? window.location.origin : 'http://localhost:4000';

  const fromEnv = import.meta.env.VITE_API_URL?.trim();
  if (fromEnv) {
    return normalizeUrl(fromEnv, fallbackOrigin);
  }

  const fromGlobal = readGlobalConfig();
  if (fromGlobal) {
    return normalizeUrl(fromGlobal, fallbackOrigin);
  }

  const fromMeta = readMetaContent('recruitment:api-base');
  if (fromMeta) {
    return normalizeUrl(fromMeta, fallbackOrigin);
  }

  if (browser) {
    const derivedOrigin = deriveBackendOriginFromLocation();
    if (derivedOrigin) {
      return trimTrailingSlash(derivedOrigin);
    }
  }

  if (browser && isLocalHostname(window.location.hostname)) {
    return 'http://localhost:4000';
  }

  return 'http://localhost:4000';
};

const API_BASE_URL = resolveApiBaseUrl();

export const getApiBaseUrl = () => API_BASE_URL;

export const buildApiUrl = (path: string) => {
  const base = getApiBaseUrl();
  const normalizedBase = base.endsWith('/') ? base : `${base}/`;
  return new URL(path.replace(/^\//, ''), normalizedBase).toString();
};
