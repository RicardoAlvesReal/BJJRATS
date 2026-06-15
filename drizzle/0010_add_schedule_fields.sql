ALTER TABLE "class_schedules"
  ADD COLUMN IF NOT EXISTS "days"         jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS "time"         text,
  ADD COLUMN IF NOT EXISTS "type"         text,
  ADD COLUMN IF NOT EXISTS "mode"         text,
  ADD COLUMN IF NOT EXISTS "publico"      text,
  ADD COLUMN IF NOT EXISTS "duration_min" integer,
  ADD COLUMN IF NOT EXISTS "notes"        text;
