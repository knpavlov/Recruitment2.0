import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { registerAppRoutes } from './setupRoutes';

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

registerAppRoutes(app);

const port = process.env.PORT || 4000;

app.listen(port, () => {
  // Логируем запуск сервера
  console.log(`API сервера запущено на порту ${port}`);
});
