const hasConnectionString = Boolean(process.env.DATABASE_URL);
const hasExplicitConfig = Boolean(process.env.PGHOST && process.env.PGUSER && process.env.PGDATABASE);
const forceInMemory = process.env.USE_IN_MEMORY_DB === 'true';

export const shouldUseInMemoryDatabase = forceInMemory || (!hasConnectionString && !hasExplicitConfig);
