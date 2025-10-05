import { Router } from 'express';
import { evaluationsService } from './evaluations.module.js';

const router = Router();

router.get('/', async (_req, res) => {
  const evaluations = await evaluationsService.listEvaluations();
  res.json(evaluations);
});

export { router as evaluationsRouter };
