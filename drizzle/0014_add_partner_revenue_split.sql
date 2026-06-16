ALTER TABLE "academy_professor_links"
  ADD COLUMN IF NOT EXISTS "partner_revenue_share_percent" real,
  ADD COLUMN IF NOT EXISTS "partner_revenue_notes" text;
