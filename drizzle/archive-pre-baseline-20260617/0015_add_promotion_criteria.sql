ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "promotion_criteria" jsonb DEFAULT '[]'::jsonb;
