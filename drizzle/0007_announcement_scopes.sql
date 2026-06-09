ALTER TABLE "announcements" ADD COLUMN IF NOT EXISTS "source_uid" text;
ALTER TABLE "announcements" ADD COLUMN IF NOT EXISTS "source_name" text;
ALTER TABLE "announcements" ADD COLUMN IF NOT EXISTS "source_role" text;
ALTER TABLE "announcements" ADD COLUMN IF NOT EXISTS "scope" text DEFAULT 'global';
ALTER TABLE "announcements" ADD COLUMN IF NOT EXISTS "audience" text DEFAULT 'all';
ALTER TABLE "announcements" ADD COLUMN IF NOT EXISTS "target_academy_id" text;
ALTER TABLE "announcements" ADD COLUMN IF NOT EXISTS "target_professor_uid" text;
ALTER TABLE "announcements" ADD COLUMN IF NOT EXISTS "urgent" boolean DEFAULT false;
