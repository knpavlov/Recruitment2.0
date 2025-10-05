import { Router } from 'express';
import { authService } from './auth.module.js';

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
  const { email, code } = req.body as { email?: string; code?: string };
  if (!email || !code) {
    res.status(400).json({ message: 'Provide email and access code.' });
    return;
  }
  try {
    const session = await authService.verifyAccessCode(email, code);
    res.json(session);
  } catch (error) {
    if (error instanceof Error && error.message === 'CODE_EXPIRED') {
      res.status(410).json({ message: 'Code expired. Request a new one.' });
      return;
    }
    res.status(401).json({ message: 'Invalid code.' });
  }
});

export { router as authRouter };
