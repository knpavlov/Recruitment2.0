import { Application } from 'express';
import { accountsRouter } from '../modules/accounts/accounts.router';
import { casesRouter } from '../modules/cases/cases.router';
import { candidatesRouter } from '../modules/candidates/candidates.router';
import { evaluationsRouter } from '../modules/evaluations/evaluations.router';
import { questionsRouter } from '../modules/questions/questions.router';
import { healthRouter } from '../shared/health.router';
import { authRouter } from '../modules/auth/auth.router';

export const registerAppRoutes = (app: Application) => {
  // TODO: добавить middleware для аутентификации и логирования запросов
  app.use('/health', healthRouter);
  app.use('/accounts', accountsRouter);
  app.use('/auth', authRouter);
  app.use('/cases', casesRouter);
  app.use('/candidates', candidatesRouter);
  app.use('/evaluations', evaluationsRouter);
  app.use('/questions', questionsRouter);
};
