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
    case 'INVALID_EMAIL':
      res.status(400).json({ code: 'invalid-email', message: 'Provide a valid email.' });
      return;
    case 'INVALID_SETUP':
      res.status(400).json({ code: 'invalid-setup', message: 'Complete all interview assignments before starting.' });
      return;
    case 'NOT_FOUND':
      res.status(404).json({ code: 'not-found', message: 'Evaluation not found.' });
      return;
    case 'ALREADY_STARTED':
      res.status(409).json({ code: 'already-started', message: 'The evaluation process has already started.' });
      return;
    case 'PROCESS_NOT_STARTED':
      res.status(409).json({ code: 'process-not-started', message: 'The evaluation has not been started yet.' });
      return;
    case 'VERSION_CONFLICT':
      res
        .status(409)
        .json({ code: 'version-conflict', message: 'Evaluation data is outdated. Refresh the page.' });
      return;
    default:
      res.status(500).json({ code: 'unknown', message: 'Failed to process the request.' });
  }
};

router.get('/', async (_req, res) => {
  const evaluations = await evaluationsService.listEvaluations();
  res.json(evaluations);
});

router.get('/interviewer/assignments', async (req, res) => {
  const emailParam = typeof req.query.email === 'string' ? req.query.email : '';
  try {
    const assignments = await evaluationsService.listInterviewerAssignments(emailParam);
    res.json(assignments);
  } catch (error) {
    handleError(error, res);
  }
});

router.post('/', async (req, res) => {
  const { config } = req.body as { config?: unknown };
  if (!config) {
    res.status(400).json({ code: 'invalid-input', message: 'Provide evaluation data.' });
    return;
  }

  try {
    const evaluation = await evaluationsService.createEvaluation(config);
    res.status(201).json(evaluation);
  } catch (error) {
    handleError(error, res);
  }
});

router.post('/:id/start', async (req, res) => {
  const { expectedVersion } = req.body as { expectedVersion?: unknown };
  if (typeof expectedVersion !== 'number') {
    res.status(400).json({ code: 'invalid-input', message: 'Provide the expected version of evaluation data.' });
    return;
  }

  try {
    const evaluation = await evaluationsService.startEvaluationProcess(req.params.id, expectedVersion);
    res.json(evaluation);
  } catch (error) {
    handleError(error, res);
  }
});

router.put('/:id', async (req, res) => {
  const { config, expectedVersion } = req.body as { config?: unknown; expectedVersion?: unknown };
  if (!config || typeof expectedVersion !== 'number') {
    res
      .status(400)
      .json({ code: 'invalid-input', message: 'Provide evaluation data and the expected version.' });
    return;
  }

  try {
    const evaluation = await evaluationsService.updateEvaluation(req.params.id, config, expectedVersion);
    res.json(evaluation);
  } catch (error) {
    handleError(error, res);
  }
});

router.post('/:id/forms/:slotId', async (req, res) => {
  const { email, expectedVersion, ...formPayload } = req.body as {
    email?: unknown;
    expectedVersion?: unknown;
    [key: string]: unknown;
  };

  if (typeof email !== 'string' || typeof expectedVersion !== 'number') {
    res
      .status(400)
      .json({ code: 'invalid-input', message: 'Provide interviewer email and the expected version.' });
    return;
  }

  try {
    const evaluation = await evaluationsService.submitInterviewerForm(
      req.params.id,
      req.params.slotId,
      email,
      formPayload,
      expectedVersion
    );
    res.json(evaluation);
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
