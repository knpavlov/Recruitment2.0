import { Router, Response } from 'express';
import { questionsService } from './questions.module.js';

const router = Router();

const handleError = (error: unknown, res: Response) => {
  if (!(error instanceof Error)) {
    res.status(500).json({ code: 'unknown', message: 'Unexpected error.' });
    return;
  }

  switch (error.message) {
    case 'INVALID_INPUT':
      res.status(400).json({ code: 'invalid-input', message: 'Некорректные данные вопроса.' });
      return;
    case 'NOT_FOUND':
      res.status(404).json({ code: 'not-found', message: 'Вопрос не найден.' });
      return;
    case 'VERSION_CONFLICT':
      res
        .status(409)
        .json({ code: 'version-conflict', message: 'Версия вопроса устарела, обновите данные.' });
      return;
    default:
      res.status(500).json({ code: 'unknown', message: 'Не удалось обработать запрос.' });
  }
};

router.get('/', async (_req, res) => {
  const questions = await questionsService.listQuestions();
  res.json(questions);
});

router.post('/', async (req, res) => {
  const { question } = req.body as { question?: unknown };
  if (!question) {
    res.status(400).json({ code: 'invalid-input', message: 'Укажите данные вопроса.' });
    return;
  }
  try {
    const created = await questionsService.createQuestion(question);
    res.status(201).json(created);
  } catch (error) {
    handleError(error, res);
  }
});

router.put('/:id', async (req, res) => {
  const { question, expectedVersion } = req.body as { question?: unknown; expectedVersion?: unknown };
  if (!question || typeof expectedVersion !== 'number') {
    res
      .status(400)
      .json({ code: 'invalid-input', message: 'Передайте данные вопроса и актуальную версию.' });
    return;
  }
  try {
    const updated = await questionsService.updateQuestion(req.params.id, question, expectedVersion);
    res.json(updated);
  } catch (error) {
    handleError(error, res);
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const id = await questionsService.deleteQuestion(req.params.id);
    res.json({ id });
  } catch (error) {
    handleError(error, res);
  }
});

export { router as questionsRouter };
