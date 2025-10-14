import { Router, Response } from 'express';
import { caseCriteriaService } from './caseCriteria.module.js';

const router = Router();

const handleError = (error: unknown, res: Response) => {
  if (!(error instanceof Error)) {
    res.status(500).json({ code: 'unknown', message: 'Unexpected error.' });
    return;
  }

  switch (error.message) {
    case 'INVALID_INPUT':
      res.status(400).json({ code: 'invalid-input', message: 'Проверьте корректность введённых данных.' });
      return;
    case 'VERSION_CONFLICT':
      res.status(409).json({ code: 'version-conflict', message: 'Данные были обновлены другим пользователем.' });
      return;
    default:
      res.status(500).json({ code: 'unknown', message: 'Не удалось выполнить запрос.' });
  }
};

router.get('/', async (_req, res) => {
  const result = await caseCriteriaService.listAll();
  res.json(result);
});

router.put('/', async (req, res) => {
  const { items, expectedVersion } = req.body as { items?: unknown; expectedVersion?: unknown };
  if (typeof expectedVersion !== 'number') {
    res.status(400).json({ code: 'invalid-input', message: 'Укажите ожидаемую версию данных.' });
    return;
  }
  try {
    const normalizedItems = Array.isArray(items) ? items : [];
    const result = await caseCriteriaService.saveAll(normalizedItems, expectedVersion);
    res.json(result);
  } catch (error) {
    handleError(error, res);
  }
});

export { router as caseCriteriaRouter };
