import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema.js';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required');
}

// Configuração robusta do pool para suportar alta escala (100k - 200k usuários)
// e compatibilidade com PgBouncer / Supabase Pooler
const maxPoolSize = process.env.DB_POOL_MAX ? parseInt(process.env.DB_POOL_MAX, 10) : 20;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: maxPoolSize,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  // Garante UTF-8 via parâmetro da conexão (evita query concorrente)
  options: '-c client_encoding=UTF8',
});

// Captura erros em conexões inativas para evitar encerramento inesperado do processo Node
pool.on('error', (err) => {
  console.error('[db:pool] Erro inesperado em conexão ociosa com o Postgres:', err.message);
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

      -- Índices essenciais para escala de Rede Social (100k - 200k usuários)
      CREATE INDEX IF NOT EXISTS idx_posts_feed ON "posts" ("post_type", "created_at" DESC);
      CREATE INDEX IF NOT EXISTS idx_posts_academy ON "posts" ("academy_id", "created_at" DESC);
      CREATE INDEX IF NOT EXISTS idx_posts_author ON "posts" ("author_uid", "created_at" DESC);
      CREATE INDEX IF NOT EXISTS idx_comments_post ON "comments" ("post_id", "created_at" ASC);
      CREATE INDEX IF NOT EXISTS idx_trainings_user_date ON "trainings" ("uid", "training_date" DESC);
      CREATE INDEX IF NOT EXISTS idx_notifications_to_unread ON "notifications" ("to_uid", "read", "created_at" DESC);
      CREATE INDEX IF NOT EXISTS idx_users_academy_id ON "users" ("academy_id");
    `);
    console.log('[db] Schema essencial e índices de alta performance verificados com sucesso.');
  } catch (err) {
    console.warn('[db] Erro ao verificar schema essencial e índices:', err);
  }
}
