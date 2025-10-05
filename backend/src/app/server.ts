import 'dotenv/config';
import express from 'express';
import cors, { type CorsOptions } from 'cors';
import { registerAppRoutes } from './setupRoutes.js';
import { runMigrations } from '../shared/database/migrations.js';

const bootstrap = async () => {
  // Ensure the database is ready before serving requests
  await runMigrations();

  const app = express();

  const allowedOrigins = (process.env.CORS_ALLOWED_ORIGINS || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  const corsOptions: CorsOptions = {
    credentials: true,
    origin: (origin, callback) => {
      // Разрешаем запросы без Origin (например, от curl) и любые домены, если список пустой
      if (!origin || allowedOrigins.length === 0) {
        callback(null, true);
        return;
      }
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error('Origin not allowed by CORS policy'));
    }
  };

  app.use(cors(corsOptions));
  app.use(express.json({ limit: '10mb' }));

  registerAppRoutes(app);

  const port = process.env.PORT || 4000;

  app.listen(port, () => {
    // Log server startup
    console.log(`API server is running on port ${port}`);
  });
};

bootstrap().catch((error) => {
  console.error('Failed to start the server:', error);
  process.exit(1);
});
