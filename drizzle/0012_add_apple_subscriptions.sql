-- Adiciona suporte ao provedor Apple App Store na tabela subscriptions
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "apple_original_transaction_id" text;
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "apple_transaction_id" text;
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "apple_product_id" text;
