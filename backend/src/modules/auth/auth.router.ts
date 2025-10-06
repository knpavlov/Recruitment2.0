import { Router, type Response } from 'express';
import { authService } from './auth.module.js';
import { readCookie } from '../../shared/http/cookies.js';
import { EXTENDED_SESSION_TTL_MS, SESSION_TTL_MS } from './auth.service.js';

const SESSION_COOKIE_NAME = 'session_token';
const COOKIE_SECURE = process.env.AUTH_COOKIE_SECURE === 'true';
const COOKIE_DOMAIN = process.env.AUTH_COOKIE_DOMAIN?.trim();

const buildCookieOptions = (rememberMe: boolean) => ({
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: COOKIE_SECURE,
  maxAge: rememberMe ? EXTENDED_SESSION_TTL_MS : SESSION_TTL_MS,
  path: '/',
  ...(COOKIE_DOMAIN ? { domain: COOKIE_DOMAIN } : {})
});

const clearSessionCookie = (res: Response) => {
  res.clearCookie(SESSION_COOKIE_NAME, {
    httpOnly: true,
    sameSite: 'lax',
    secure: COOKIE_SECURE,
    path: '/',
    ...(COOKIE_DOMAIN ? { domain: COOKIE_DOMAIN } : {})
  });
};

const router = Router();

router.post('/request-code', async (req, res) => {
  try {
    const result = await authService.requestAccessCode(String(req.body.email ?? ''));
    res.status(201).json(result);
  } catch (error) {
    res.status(404).json({ message: 'Account not found or access denied.' });
  }
});

router.post('/verify-code', async (req, res) => {
  const { email, code, rememberMe = false } = req.body as {
    email?: string;
    code?: string;
    rememberMe?: boolean;
  };
  if (!email || !code) {
    res.status(400).json({ message: 'Provide email and access code.' });
    return;
  }
  try {
    const session = await authService.verifyAccessCode(email, code, Boolean(rememberMe));
    res.cookie(SESSION_COOKIE_NAME, session.token, buildCookieOptions(session.rememberMe));
    res.json(session);
  } catch (error) {
    if (error instanceof Error && error.message === 'CODE_EXPIRED') {
      res.status(410).json({ message: 'Code expired. Request a new one.' });
      return;
    }
    res.status(401).json({ message: 'Invalid code.' });
  }
});

router.get('/session', async (req, res) => {
  const token = readCookie(req, SESSION_COOKIE_NAME);
  if (!token) {
    res.status(401).json({ message: 'Not authenticated.' });
    return;
  }
  const session = await authService.getSession(token);
  if (!session) {
    clearSessionCookie(res);
    res.status(401).json({ message: 'Session expired.' });
    return;
  }
  res.json({
    token: session.token,
    email: session.email,
    role: session.role,
    expiresAt: session.expiresAt.toISOString(),
    rememberMe: session.rememberMe
  });
});

router.post('/logout', async (req, res) => {
  const token = readCookie(req, SESSION_COOKIE_NAME);
  if (token) {
    await authService.logout(token);
  }
  clearSessionCookie(res);
  res.status(204).end();
});

export { router as authRouter };
