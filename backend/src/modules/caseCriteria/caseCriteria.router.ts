import { Router, Response } from 'express';
import { caseCriteriaService } from './caseCriteria.module.js';

const router = Router();

const handleError = (error: unknown, res: Response) => {
  if (!(error instanceof Error)) {
    res.status(500).json({ code: 'unknown', message: 'Не удалось обработать запрос.' });
    return;
  }
  switch (error.message) {
    case 'INVALID_INPUT':
      res.status(400).json({ code: 'invalid-input', message: 'Некорректные данные запроса.' });
      return;
    case 'VERSION_CONFLICT':
      res
        .status(409)
        .json({ code: 'version-conflict', message: 'Данные уже были обновлены. Обновите страницу и повторите попытку.' });
      return;
    default:
      res.status(500).json({ code: 'unknown', message: 'Не удалось обработать запрос.' });
  }
};

const parseExpectedVersion = (value: unknown): number | null => {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value === 'number' && Number.isInteger(value) && value > 0) {
    return value;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }
    const parsed = Number(trimmed);
    if (Number.isInteger(parsed) && parsed > 0) {
      return parsed;
    }
  }
  throw new Error('INVALID_INPUT');
};

router.get('/', async (_req, res) => {
  try {
    const result = await caseCriteriaService.listCriteria();
    res.json(result);
  } catch (error) {
    handleError(error, res);
  }
});

router.put('/', async (req, res) => {
  const { items, expectedVersion } = req.body as { items?: unknown; expectedVersion?: unknown };
  try {
    const version = parseExpectedVersion(expectedVersion ?? null);
    if (!Array.isArray(items)) {
      throw new Error('INVALID_INPUT');
    }
    const result = await caseCriteriaService.saveCriteriaSet(items, version);
    res.json(result);
  } catch (error) {
    handleError(error, res);
  }
});

export { router as caseCriteriaRouter };
