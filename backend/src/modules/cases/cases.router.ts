import { Router, Response } from 'express';
import { casesService } from './cases.module.js';

const router = Router();

const handleError = (error: unknown, res: Response) => {
  if (!(error instanceof Error)) {
    res.status(500).json({ code: 'unknown', message: 'Непредвиденная ошибка.' });
    return;
  }

  switch (error.message) {
    case 'INVALID_NAME':
    case 'INVALID_INPUT':
      res.status(400).json({ code: 'invalid-input', message: 'Некорректные данные.' });
      return;
    case 'DUPLICATE_NAME':
      res.status(409).json({ code: 'duplicate', message: 'Папка с таким названием уже существует.' });
      return;
    case 'VERSION_CONFLICT':
      res.status(409).json({ code: 'version-conflict', message: 'Версия папки устарела.' });
      return;
    case 'NOT_FOUND':
      res.status(404).json({ code: 'not-found', message: 'Папка не найдена.' });
      return;
    default:
      res.status(500).json({ code: 'unknown', message: 'Не удалось обработать запрос.' });
  }
};

router.get('/', async (_req, res) => {
  const folders = await casesService.listFolders();
  res.json(folders);
});

router.post('/', async (req, res) => {
  const { name } = req.body as { name?: string };
  try {
    const folder = await casesService.createFolder(name ?? '');
    res.status(201).json(folder);
  } catch (error) {
    handleError(error, res);
  }
});

router.patch('/:id', async (req, res) => {
  const { name, expectedVersion } = req.body as { name?: string; expectedVersion?: number };
  if (typeof expectedVersion !== 'number') {
    res.status(400).json({ code: 'invalid-input', message: 'Укажите ожидаемую версию.' });
    return;
  }
  try {
    const folder = await casesService.renameFolder(req.params.id, name ?? '', expectedVersion);
    res.json(folder);
  } catch (error) {
    handleError(error, res);
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const id = await casesService.deleteFolder(req.params.id);
    res.json({ id });
  } catch (error) {
    handleError(error, res);
  }
});

router.post('/:id/files', async (req, res) => {
  const { files, expectedVersion } = req.body as { files?: any[]; expectedVersion?: number };
  if (!Array.isArray(files) || typeof expectedVersion !== 'number') {
    res.status(400).json({ code: 'invalid-input', message: 'Некорректные данные запроса.' });
    return;
  }
  try {
    const folder = await casesService.registerFiles(req.params.id, files, expectedVersion);
    res.json(folder);
  } catch (error) {
    handleError(error, res);
  }
});

router.delete('/:id/files/:fileId', async (req, res) => {
  const { expectedVersion } = req.body as { expectedVersion?: number };
  if (typeof expectedVersion !== 'number') {
    res.status(400).json({ code: 'invalid-input', message: 'Некорректные данные запроса.' });
    return;
  }
  try {
    const folder = await casesService.removeFile(req.params.id, req.params.fileId, expectedVersion);
    res.json(folder);
  } catch (error) {
    handleError(error, res);
  }
});

export { router as casesRouter };
