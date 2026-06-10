ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "trial_requests_enabled" boolean DEFAULT true;
