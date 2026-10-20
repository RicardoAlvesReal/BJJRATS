-- Adiciona suporte ao provedor Google Play Billing na tabela subscriptions
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "provider" text DEFAULT 'asaas';
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "google_purchase_token" text;
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "google_order_id" text;
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "google_product_id" text;
