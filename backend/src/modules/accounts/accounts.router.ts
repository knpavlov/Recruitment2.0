import { Router } from 'express';
import { accountsService } from './accounts.module.js';
import { AccountRecord } from './accounts.service.js';

const router = Router();

const toDto = (account: AccountRecord) => ({
  id: account.id,
  email: account.email,
  role: account.role,
  status: account.status,
  invitedAt: account.createdAt.toISOString(),
  activatedAt: account.activatedAt ? account.activatedAt.toISOString() : undefined
});

router.get('/', async (_req, res) => {
  const accounts = await accountsService.listAccounts();
  res.json(accounts.map(toDto));
});

router.post('/invite', async (req, res) => {
  const { email, role = 'admin' } = req.body as { email?: string; role?: 'admin' | 'user' };
  try {
    const account = await accountsService.inviteAccount(email ?? '', role);
    res.status(201).json(toDto(account));
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'ALREADY_EXISTS') {
        res.status(409).json({ message: 'duplicate' });
        return;
      }
      if (error.message === 'INVALID_INVITE') {
        res.status(400).json({ message: 'invalid-input' });
        return;
      }
    }
    console.error('[accounts] Ошибка при приглашении пользователя', error);
    res.status(500).json({ message: 'server-error' });
  }
});

router.post('/:id/activate', async (req, res) => {
  try {
    const account = await accountsService.activateAccount(req.params.id);
    res.json(toDto(account));
  } catch (error) {
    res.status(404).json({ message: 'not-found' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const account = await accountsService.removeAccount(req.params.id);
    res.json(toDto(account));
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'FORBIDDEN') {
        res.status(403).json({ message: 'invalid-input' });
        return;
      }
    }
    res.status(404).json({ message: 'not-found' });
  }
});

export { router as accountsRouter };
