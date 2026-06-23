ALTER TABLE "extra_trainings" ADD COLUMN IF NOT EXISTS "distance" real;
--> statement-breakpoint
ALTER TABLE "extra_trainings" ADD COLUMN IF NOT EXISTS "calories" integer;
--> statement-breakpoint
ALTER TABLE "extra_trainings" ADD COLUMN IF NOT EXISTS "pace" text;
--> statement-breakpoint
ALTER TABLE "extra_trainings" ADD COLUMN IF NOT EXISTS "extra_xp" integer DEFAULT 0;
--> statement-breakpoint
ALTER TABLE "extra_trainings" ADD COLUMN IF NOT EXISTS "training_photo_url" text;
