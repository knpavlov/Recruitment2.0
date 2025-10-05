import { Router } from 'express';
import { CandidatesService } from './candidates.service';

const router = Router();
const service = new CandidatesService();

router.get('/', async (_req, res) => {
  const candidates = await service.listCandidates();
  res.json(candidates);
});

export { router as candidatesRouter };
