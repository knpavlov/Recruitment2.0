import { Router } from 'express';
import { accountsService } from './accounts.module.js';

const router = Router();

router.get('/', async (_req, res) => {
  const accounts = await accountsService.listAccounts();
  res.json(accounts);
});

router.post('/invite', async (req, res) => {
  const { email, role = 'admin' } = req.body as { email?: string; role?: 'admin' | 'user' };
  try {
    const account = await accountsService.inviteAccount(email ?? '', role);
    res.status(201).json(account);
  } catch (error) {
    if (error instanceof Error && error.message === 'ALREADY_EXISTS') {
      res.status(409).json({ message: 'Указанный пользователь уже приглашён.' });
      return;
    }
    res.status(400).json({ message: 'Не удалось отправить приглашение.' });
  }
});

router.post('/:id/activate', async (req, res) => {
  try {
    const account = await accountsService.activateAccount(req.params.id);
    res.json(account);
  } catch (error) {
    res.status(404).json({ message: 'Аккаунт не найден.' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const account = await accountsService.removeAccount(req.params.id);
    res.json(account);
  } catch (error) {
    if (error instanceof Error && error.message === 'FORBIDDEN') {
      res.status(403).json({ message: 'Нельзя удалить суперадмина.' });
      return;
    }
    res.status(404).json({ message: 'Аккаунт не найден.' });
  }
});

export { router as accountsRouter };
