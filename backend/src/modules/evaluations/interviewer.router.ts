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
      res.status(400).json({ code: 'invalid-input', message: 'Invalid request data.' });
      return;
    case 'ACCESS_DENIED':
      res.status(403).json({ code: 'access-denied', message: 'You are not assigned to this interview.' });
      return;
    case 'NOT_FOUND':
      res.status(404).json({ code: 'not-found', message: 'Interview slot not found.' });
      return;
    case 'FORM_ALREADY_SUBMITTED':
      res
        .status(409)
        .json({ code: 'form-locked', message: 'The review was already submitted and can no longer be edited.' });
      return;
    case 'VERSION_CONFLICT':
      res
        .status(409)
        .json({ code: 'version-conflict', message: 'Someone else updated this review. Refresh the page and try again.' });
      return;
    default:
      res.status(500).json({ code: 'unknown', message: 'Unexpected error while processing the request.' });
  }
};

router.get('/assignments', async (req, res) => {
  const { email } = req.query as { email?: string };
  if (!email || typeof email !== 'string') {
    res.status(400).json({ code: 'invalid-input', message: 'Provide the interviewer email address.' });
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
    res.status(400).json({ code: 'invalid-input', message: 'Provide the interviewer email address.' });
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
