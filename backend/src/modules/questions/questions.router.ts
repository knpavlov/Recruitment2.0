import { Router } from 'express';
import { questionsService } from './questions.module.js';

const router = Router();

router.get('/', async (_req, res) => {
  const questions = await questionsService.listQuestions();
  res.json(questions);
});

export { router as questionsRouter };
