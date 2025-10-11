import { Router, Response } from 'express';
import { evaluationsService } from './evaluations.module.js';

const router = Router();

const handleError = (error: unknown, res: Response) => {
  if (!(error instanceof Error)) {
    res.status(500).json({ code: 'unknown', message: 'Unexpected error.' });
    return;
  }

  switch (error.message) {
    case 'INVALID_INPUT':
      res.status(400).json({ code: 'invalid-input', message: 'Invalid input.' });
      return;
    case 'NOT_FOUND':
      res.status(404).json({ code: 'not-found', message: 'Evaluation not found.' });
      return;
    case 'VERSION_CONFLICT':
      res.status(409).json({ code: 'version-conflict', message: 'The evaluation version is outdated.' });
      return;
    default:
      res.status(500).json({ code: 'unknown', message: 'Failed to process the request.' });
  }
};

router.get('/', async (_req, res) => {
  const evaluations = await evaluationsService.listEvaluations();
  res.json(evaluations);
});

router.get('/:id', async (req, res) => {
  try {
    const evaluation = await evaluationsService.getEvaluation(req.params.id);
    res.json(evaluation);
  } catch (error) {
    handleError(error, res);
  }
});

router.post('/', async (req, res) => {
  const { evaluation } = req.body as { evaluation?: unknown };
  if (!evaluation) {
    res.status(400).json({ code: 'invalid-input', message: 'Provide evaluation data.' });
    return;
  }
  try {
    const record = await evaluationsService.createEvaluation(evaluation);
    res.status(201).json(record);
  } catch (error) {
    handleError(error, res);
  }
});

router.put('/:id', async (req, res) => {
  const { evaluation, expectedVersion } = req.body as {
    evaluation?: unknown;
    expectedVersion?: unknown;
  };
  if (!evaluation || typeof expectedVersion !== 'number') {
    res
      .status(400)
      .json({ code: 'invalid-input', message: 'Provide evaluation data and expected version.' });
    return;
  }
  try {
    const record = await evaluationsService.updateEvaluation(req.params.id, evaluation, expectedVersion);
    res.json(record);
  } catch (error) {
    handleError(error, res);
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const id = await evaluationsService.deleteEvaluation(req.params.id);
    res.json({ id });
  } catch (error) {
    handleError(error, res);
  }
});

export { router as evaluationsRouter };
