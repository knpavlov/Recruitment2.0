import { Router } from 'express';
import { casesService } from './cases.module.js';
import { CaseDomainError } from './cases.types.js';

const router = Router();

const mapErrorToResponse = (error: unknown, res: any) => {
  if (error instanceof CaseDomainError) {
    const payload = { message: error.message || error.code };
    switch (error.code) {
      case 'invalid-input':
        res.status(400).json(payload);
        return;
      case 'duplicate':
        res.status(409).json(payload);
        return;
      case 'version-conflict':
        res.status(409).json(payload);
        return;
      case 'not-found':
      default:
        res.status(404).json(payload);
        return;
    }
  }

  console.error('[cases] Неожиданная ошибка', error);
  res.status(500).json({ message: 'Внутренняя ошибка сервера.' });
};

router.get('/', async (_req, res) => {
  const folders = await casesService.listFolders();
  res.json(folders);
});

router.post('/', async (req, res) => {
  try {
    const folder = await casesService.createFolder(String(req.body?.name ?? ''));
    res.status(201).json(folder);
  } catch (error) {
    mapErrorToResponse(error, res);
  }
});

router.patch('/:id', async (req, res) => {
  try {
    const folder = await casesService.renameFolder(
      req.params.id,
      String(req.body?.name ?? ''),
      Number(req.body?.expectedVersion ?? NaN)
    );
    res.json(folder);
  } catch (error) {
    mapErrorToResponse(error, res);
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await casesService.deleteFolder(req.params.id);
    res.status(204).send();
  } catch (error) {
    mapErrorToResponse(error, res);
  }
});

router.post('/:id/files', async (req, res) => {
  try {
    const folder = await casesService.addFiles(
      req.params.id,
      Array.isArray(req.body?.files) ? req.body.files : [],
      Number(req.body?.expectedVersion ?? NaN)
    );
    res.status(201).json(folder);
  } catch (error) {
    mapErrorToResponse(error, res);
  }
});

router.delete('/:id/files/:fileId', async (req, res) => {
  try {
    const folder = await casesService.removeFile(
      req.params.id,
      req.params.fileId,
      Number(req.body?.expectedVersion ?? NaN)
    );
    res.json(folder);
  } catch (error) {
    mapErrorToResponse(error, res);
  }
});

export { router as casesRouter };
