// Script rápido pra ver planos no banco de produção
import pg from 'pg';
const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  const { rows } = await pool.query('SELECT id, slug, name, description FROM plans');
  console.log(JSON.stringify(rows, null, 2));
  await pool.end();
}
main().catch(e => { console.error(e); process.exit(1); });
