import { Router } from 'express';
import { casesService } from './cases.module.js';

const router = Router();

router.get('/', async (_req, res) => {
  const folders = await casesService.listFolders();
  res.json(folders);
});

export { router as casesRouter };
