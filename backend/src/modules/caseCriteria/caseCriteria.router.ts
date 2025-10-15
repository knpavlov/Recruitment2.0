import { Router, Response } from 'express';
import { caseCriteriaService } from './caseCriteria.module.js';

const router = Router();

const handleError = (error: unknown, res: Response) => {
  if (!(error instanceof Error)) {
    res.status(500).json({ code: 'unknown', message: 'Неизвестная ошибка.' });
    return;
  }

  switch (error.message) {
    case 'INVALID_INPUT':
      res.status(400).json({ code: 'invalid-input', message: 'Переданы некорректные данные.' });
      return;
    case 'VERSION_CONFLICT':
      res
        .status(409)
        .json({ code: 'version-conflict', message: 'Версия данных устарела. Обновите страницу.' });
      return;
    default:
      res.status(500).json({ code: 'unknown', message: 'Не удалось обработать запрос.' });
  }
};

router.get('/', async (_req, res) => {
  const result = await caseCriteriaService.listCriteria();
  res.json(result);
});

router.put('/', async (req, res) => {
  const { criteria, expectedVersion } = req.body as { criteria?: unknown; expectedVersion?: unknown };
  if (typeof expectedVersion !== 'number') {
    res
      .status(400)
      .json({ code: 'invalid-input', message: 'Укажите набор критериев и ожидаемую версию.' });
    return;
  }
  try {
    const result = await caseCriteriaService.replaceCriteria(criteria ?? [], expectedVersion);
    res.json(result);
  } catch (error) {
    handleError(error, res);
  }
});

export { router as caseCriteriaRouter };
