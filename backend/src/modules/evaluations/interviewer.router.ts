import { Router, Response } from 'express';
import { evaluationWorkflowService } from './evaluations.module.js';

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
    case 'ACCESS_DENIED':
      res.status(403).json({ code: 'access-denied', message: 'You are not allowed to access this evaluation.' });
      return;
    case 'NOT_FOUND':
      res.status(404).json({ code: 'not-found', message: 'Interview assignment not found.' });
      return;
    case 'VERSION_CONFLICT':
      res
        .status(409)
        .json({ code: 'version-conflict', message: 'The data changed. Refresh the page and try again.' });
      return;
    case 'FORM_LOCKED':
      res.status(409).json({ code: 'form-locked', message: 'This form has already been submitted.' });
      return;
    default:
      res.status(500).json({ code: 'unknown', message: 'Failed to process the request.' });
  }
};

router.get('/assignments', async (req, res) => {
  const { email } = req.query as { email?: string };
  if (!email || typeof email !== 'string') {
    res.status(400).json({ code: 'invalid-input', message: 'Provide an email address.' });
    return;
  }
  try {
    const assignments = await evaluationWorkflowService.listAssignmentsForInterviewer(email);
    res.json(assignments);
  } catch (error) {
    handleError(error, res);
  }
});

router.post('/assignments/:evaluationId/:slotId', async (req, res) => {
  const { email, submitted, notes, fitScore, caseScore, fitNotes, caseNotes } =
    req.body as Record<string, unknown>;
  if (typeof email !== 'string') {
    res.status(400).json({ code: 'invalid-input', message: 'Provide an email address.' });
    return;
  }
  const fitScoreValue =
    typeof fitScore === 'number'
      ? fitScore
      : typeof fitScore === 'string'
        ? fitScore
        : undefined;
  const caseScoreValue =
    typeof caseScore === 'number'
      ? caseScore
      : typeof caseScore === 'string'
        ? caseScore
        : undefined;
  try {
    const result = await evaluationWorkflowService.submitInterviewForm(
      req.params.evaluationId,
      req.params.slotId,
      email,
      {
        submitted: typeof submitted === 'boolean' ? submitted : undefined,
        notes: typeof notes === 'string' ? notes : undefined,
        fitScore: fitScoreValue,
        caseScore: caseScoreValue,
        fitNotes: typeof fitNotes === 'string' ? fitNotes : undefined,
        caseNotes: typeof caseNotes === 'string' ? caseNotes : undefined
      }
    );
    res.json(result);
  } catch (error) {
    handleError(error, res);
  }
});

export { router as interviewerRouter };
