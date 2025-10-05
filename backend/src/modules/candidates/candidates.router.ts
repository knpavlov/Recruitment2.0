import { Router } from 'express';
import { candidatesService } from './candidates.module.js';

const router = Router();

router.get('/', async (_req, res) => {
  const candidates = await candidatesService.listCandidates();
  res.json(candidates);
});

export { router as candidatesRouter };
