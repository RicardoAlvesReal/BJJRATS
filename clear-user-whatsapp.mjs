import { Client } from 'pg';

const c = new Client(process.env.DATABASE_URL || 'postgresql://postgres:Rikaru@10@localhost:5432/bjjrats');

async function main() {
  await c.connect();
  const result = await c.query(`DELETE FROM whatsapp_instances WHERE professor_uid = 'Ool58qGfkawpIAGDRVJoh'`);
  console.log(`Registros deletados: ${result.rowCount}`);
  await c.end();
}

main().catch(e => { console.error(e.message); c.end(); });
