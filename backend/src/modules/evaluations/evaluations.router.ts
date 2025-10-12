import { Router, Response } from 'express';
import { evaluationWorkflowService, evaluationsService } from './evaluations.module.js';

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
    case 'PROCESS_ALREADY_STARTED':
      res.status(409).json({ code: 'process-already-started', message: 'The process has already been started.' });
      return;
    case 'MISSING_ASSIGNMENT_DATA':
      res.status(400).json({ code: 'missing-assignment-data', message: 'Fill in interviewers, cases and fit questions.' });
      return;
    case 'MAILER_UNAVAILABLE':
      res
        .status(503)
        .json({ code: 'mailer-unavailable', message: 'Email service is not configured. Cannot notify interviewers.' });
      return;
    case 'INVALID_PORTAL_URL':
      res
        .status(503)
        .json({
          code: 'invalid-portal-url',
          message: 'Configure INTERVIEW_PORTAL_URL with a publicly reachable interviewer portal URL.'
        });
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

router.post('/:id/start', async (req, res) => {
  try {
    const result = await evaluationWorkflowService.startProcess(req.params.id);
    res.json(result);
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

router.delete('/:id', async (req, res) => {
  try {
    const id = await evaluationsService.deleteEvaluation(req.params.id);
    res.json({ id });
  } catch (error) {
    handleError(error, res);
  }
});

export { router as evaluationsRouter };
