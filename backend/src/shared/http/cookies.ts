import type { Request } from 'express';

const parseCookies = (cookieHeader: string | undefined): Record<string, string> => {
  if (!cookieHeader) {
    return {};
  }
  return cookieHeader.split(';').reduce<Record<string, string>>((acc, part) => {
    const [rawName, ...rawValue] = part.split('=');
    const name = rawName?.trim();
    if (!name) {
      return acc;
    }
    const value = rawValue.join('=').trim();
    acc[name] = decodeURIComponent(value);
    return acc;
  }, {});
};

export const readCookie = (req: Request, name: string): string | undefined => {
  const cookies = parseCookies(req.headers.cookie);
  return cookies[name];
};
