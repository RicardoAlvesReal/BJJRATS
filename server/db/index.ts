import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema.js';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required');
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Força UTF-8 para caracteres acentuados (ç, ã, é, etc.)
  ...(process.env.DATABASE_URL ? {} : {}),
});

// Garante que a conexão use UTF-8
pool.on('connect', async (client) => {
  await client.query("SET client_encoding = 'UTF8'");
});

export const db = drizzle(pool, { schema });
export { pool };
