ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "academy_phone" text;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "academy_instagram" text;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "academy_style" text;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "academy_franchise" text;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "academy_monthly_fee" real;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "academy_daily_fee" real;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "academy_pix_key" text;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "academy_photo_urls" jsonb DEFAULT '[]';
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "academy_waiver_text" text;
