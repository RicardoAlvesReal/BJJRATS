import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema.js';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required');
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Garante UTF-8 via parâmetro da conexão (evita query concorrente)
  options: '-c client_encoding=UTF8',
});

export const db = drizzle(pool, { schema });
export { pool };

export async function ensureDatabaseSchema() {
  try {
    await pool.query(`
      ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "provider" text DEFAULT 'asaas';
      ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "google_purchase_token" text;
      ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "google_order_id" text;
      ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "google_product_id" text;
      ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "apple_original_transaction_id" text;
      ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "apple_transaction_id" text;
      ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "apple_product_id" text;
      ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "trial_ends_at" timestamp;
      ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "trial_ends_at" timestamp;
      ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "subscription_exempt" boolean DEFAULT false;
      ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "comment_count" integer DEFAULT 0;
    `);
    console.log('[db] Schema essencial verificado com sucesso.');
  } catch (err) {
    console.warn('[db] Erro ao verificar schema essencial:', err);
  }
}
