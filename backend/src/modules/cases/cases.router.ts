import { Router } from 'express';
import { CasesService } from './cases.service.js';

const router = Router();
const service = new CasesService();

router.get('/', async (_req, res) => {
  const folders = await service.listFolders();
  res.json(folders);
});

export { router as casesRouter };
