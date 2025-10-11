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
      res
        .status(409)
        .json({ code: 'version-conflict', message: 'Evaluation data is outdated. Refresh the page.' });
      return;
    case 'INCOMPLETE_SETUP':
      res
        .status(400)
        .json({ code: 'incomplete-setup', message: 'Заполните интервьюеров, кейсы и вопросы перед запуском.' });
      return;
    case 'PROCESS_ALREADY_STARTED':
      res.status(409).json({ code: 'already-started', message: 'Процесс уже запущен.' });
      return;
    case 'MAILER_UNAVAILABLE':
      res.status(503).json({ code: 'mailer-unavailable', message: 'Сервис отправки писем недоступен.' });
      return;
    case 'ACCESS_DENIED':
      res.status(403).json({ code: 'access-denied', message: 'Нет доступа к этой записи.' });
      return;
    default:
      res.status(500).json({ code: 'unknown', message: 'Failed to process the request.' });
  }
};

router.get('/', async (_req, res) => {
  const evaluations = await evaluationsService.listEvaluations();
  res.json(evaluations);
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

router.post('/:id/start', async (req, res) => {
  try {
    const evaluation = await evaluationsService.startProcess(req.params.id);
    res.json(evaluation);
  } catch (error) {
    handleError(error, res);
  }
});

router.get('/assignments', async (req, res) => {
  const email = typeof req.query.email === 'string' ? req.query.email : '';
  try {
    const assignments = await evaluationsService.listAssignments(email);
    res.json(assignments);
  } catch (error) {
    handleError(error, res);
  }
});

router.post('/assignments/:evaluationId/:slotId', async (req, res) => {
  const { evaluationId, slotId } = req.params;
  const { email, fitScore, caseScore, notes, submit } = req.body as {
    email?: unknown;
    fitScore?: unknown;
    caseScore?: unknown;
    notes?: unknown;
    submit?: unknown;
  };

  if (typeof email !== 'string') {
    res.status(400).json({ code: 'invalid-input', message: 'Укажите почту интервьюера.' });
    return;
  }

  try {
    const assignment = await evaluationsService.submitAssignment(email, evaluationId, slotId, {
      fitScore: typeof fitScore === 'number' ? fitScore : undefined,
      caseScore: typeof caseScore === 'number' ? caseScore : undefined,
      notes: typeof notes === 'string' ? notes : undefined,
      submit: typeof submit === 'boolean' ? submit : undefined
    });
    res.json(assignment);
  } catch (error) {
    handleError(error, res);
  }
});

export { router as evaluationsRouter };
