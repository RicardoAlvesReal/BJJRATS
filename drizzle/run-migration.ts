import 'dotenv/config';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { Pool } from 'pg';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const sqlPath = resolve(__dirname, 'subscriptions.sql');
const sql = readFileSync(sqlPath, 'utf8');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  try {
    await pool.query(sql);
    console.log('✓ Migração aplicada com sucesso');
  } catch (e: any) {
    console.error('Erro:', e.message);
  }
  await pool.end();
  process.exit(0);
}

run();
