import { Router, Response } from 'express';
import { casesService } from './cases.module.js';

const router = Router();

const handleError = (error: unknown, res: Response) => {
  if (!(error instanceof Error)) {
    res.status(500).json({ code: 'unknown', message: 'Unexpected error.' });
    return;
  }

  switch (error.message) {
    case 'INVALID_NAME':
    case 'INVALID_INPUT':
      res.status(400).json({ code: 'invalid-input', message: 'Invalid input.' });
      return;
    case 'DUPLICATE_NAME':
      res.status(409).json({ code: 'duplicate', message: 'A folder with the same name already exists.' });
      return;
    case 'VERSION_CONFLICT':
      res.status(409).json({ code: 'version-conflict', message: 'The folder version is outdated.' });
      return;
    case 'NOT_FOUND':
      res.status(404).json({ code: 'not-found', message: 'Folder not found.' });
      return;
    default:
      res.status(500).json({ code: 'unknown', message: 'Failed to process the request.' });
  }
};

router.get('/', async (_req, res) => {
  const folders = await casesService.listFolders();
  res.json(folders);
});

router.get('/:id', async (req, res) => {
  try {
    const folder = await casesService.getFolder(req.params.id);
    res.json(folder);
  } catch (error) {
    handleError(error, res);
  }
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
    res.status(400).json({ code: 'invalid-input', message: 'Provide the expected version.' });
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
    res.status(400).json({ code: 'invalid-input', message: 'Invalid request data.' });
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
    res.status(400).json({ code: 'invalid-input', message: 'Invalid request data.' });
    return;
  }
  try {
    const folder = await casesService.removeFile(req.params.id, req.params.fileId, expectedVersion);
    res.json(folder);
  } catch (error) {
    handleError(error, res);
  }
});

router.post('/:id/criteria', async (req, res) => {
  const { id, title, ratings } = req.body as {
    id?: string;
    title?: string;
    ratings?: Partial<Record<'1' | '2' | '3' | '4' | '5', string>>;
  };
  const normalizedRatings: Partial<Record<1 | 2 | 3 | 4 | 5, string>> = {};
  if (ratings) {
    for (const key of Object.keys(ratings)) {
      const score = Number(key);
      if ([1, 2, 3, 4, 5].includes(score)) {
        const value = ratings[key as keyof typeof ratings];
        if (typeof value === 'string') {
          normalizedRatings[score as 1 | 2 | 3 | 4 | 5] = value;
        }
      }
    }
  }
  try {
    const criterion = await casesService.createCriterion(req.params.id, {
      id,
      title: title ?? '',
      ratings: normalizedRatings
    });
    res.status(201).json(criterion);
  } catch (error) {
    handleError(error, res);
  }
});

router.patch('/:id/criteria/:criterionId', async (req, res) => {
  const { title, ratings } = req.body as {
    title?: string;
    ratings?: Partial<Record<'1' | '2' | '3' | '4' | '5', string>>;
  };
  const normalizedRatings: Partial<Record<1 | 2 | 3 | 4 | 5, string>> = {};
  if (ratings) {
    for (const key of Object.keys(ratings)) {
      const score = Number(key);
      if ([1, 2, 3, 4, 5].includes(score)) {
        const value = ratings[key as keyof typeof ratings];
        if (typeof value === 'string') {
          normalizedRatings[score as 1 | 2 | 3 | 4 | 5] = value;
        }
      }
    }
  }
  try {
    const criterion = await casesService.updateCriterion(req.params.id, req.params.criterionId, {
      title: title ?? '',
      ratings: normalizedRatings
    });
    res.json(criterion);
  } catch (error) {
    handleError(error, res);
  }
});

router.delete('/:id/criteria/:criterionId', async (req, res) => {
  try {
    const id = await casesService.deleteCriterion(req.params.id, req.params.criterionId);
    res.json({ id });
  } catch (error) {
    handleError(error, res);
  }
});

export { router as casesRouter };
