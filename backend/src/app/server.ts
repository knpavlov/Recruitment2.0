import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { registerAppRoutes } from './setupRoutes.js';
import { runMigrations } from '../shared/database/migrations.js';

const bootstrap = async () => {
  // Сначала убеждаемся, что база данных готова
  await runMigrations();

  const app = express();
  app.use(cors());
  app.use(express.json({ limit: '10mb' }));

  registerAppRoutes(app);

  const port = process.env.PORT || 4000;

  app.listen(port, () => {
    // Логируем запуск сервера
    console.log(`API сервера запущено на порту ${port}`);
  });
};

bootstrap().catch((error) => {
  console.error('Не удалось запустить сервер:', error);
  process.exit(1);
});
