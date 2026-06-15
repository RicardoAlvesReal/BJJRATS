import 'dotenv/config';
import { readFileSync } from 'fs';
import { basename, dirname, isAbsolute, relative, resolve } from 'path';
import { Pool } from 'pg';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const requestedFile = process.argv[2] ?? 'subscriptions.sql';
const sqlPath = resolve(__dirname, requestedFile);
const relativePath = relative(__dirname, sqlPath);

if (relativePath.startsWith('..') || isAbsolute(relativePath)) {
  console.error('Erro: informe um arquivo dentro da pasta drizzle.');
  process.exit(1);
}

const sql = readFileSync(sqlPath, 'utf8');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  try {
    const result = await pool.query(sql);
    const results = Array.isArray(result) ? result : [result];
    const affectedRows = results.reduce((total, item) => total + (item.rowCount ?? 0), 0);

    console.log(`Migration aplicada: ${basename(sqlPath)}`);
    console.log(`Linhas afetadas: ${affectedRows}`);
  } catch (e: any) {
    console.error('Erro:', e.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

run();
