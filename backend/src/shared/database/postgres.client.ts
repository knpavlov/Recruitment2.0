import 'dotenv/config';
import { Pool, PoolConfig } from 'pg';
import { shouldUseInMemoryDatabase } from './environment.js';

const buildPoolConfig = (): PoolConfig => {
  const connectionString = process.env.DATABASE_URL;
  if (connectionString) {
    return {
      connectionString,
      ssl: process.env.PGSSL === 'false' ? false : { rejectUnauthorized: false }
    };
  }

  const host = process.env.PGHOST;
  const user = process.env.PGUSER;
  const database = process.env.PGDATABASE;

  if (!host || !user || !database) {
    throw new Error('Недостаточно данных для подключения к PostgreSQL.');
  }

  const config: PoolConfig = {
    host,
    port: Number(process.env.PGPORT ?? 5432),
    user,
    password: process.env.PGPASSWORD,
    database
  };

  if (process.env.NODE_ENV === 'production') {
    config.ssl = { rejectUnauthorized: false };
  }

  return config;
};

const createPool = (): Pool => {
  if (shouldUseInMemoryDatabase) {
    return {
      async query() {
        throw new Error('Внутренняя in-memory БД активна: прямые SQL-запросы недоступны.');
      },
      async connect() {
        throw new Error('Внутренняя in-memory БД активна: подключение к PostgreSQL отключено.');
      },
      on() {
        return this;
      },
      async end() {
        /* noop */
      }
    } as unknown as Pool;
  }

  const pool = new Pool(buildPoolConfig());
  pool.on('error', (error: Error) => {
    console.error('Пул подключения к PostgreSQL получил ошибку:', error);
  });
  return pool;
};

export const postgresPool = createPool();
