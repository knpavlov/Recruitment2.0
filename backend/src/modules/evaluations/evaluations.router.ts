import { Router } from 'express';
import { EvaluationsService } from './evaluations.service.js';

const router = Router();
const service = new EvaluationsService();

router.get('/', async (_req, res) => {
  const evaluations = await service.listEvaluations();
  res.json(evaluations);
});

export { router as evaluationsRouter };
