CREATE TABLE IF NOT EXISTS "announcements" (
  "id" text PRIMARY KEY,
  "title" text NOT NULL,
  "content" text NOT NULL,
  "image_url" text,
  "link_url" text,
  "link_text" text,
  "is_active" boolean DEFAULT true,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "announcement_dismissals" (
  "id" text PRIMARY KEY,
  "announcement_id" text NOT NULL REFERENCES announcements(id) ON DELETE CASCADE,
  "user_uid" text NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
  "dismissed_at" timestamp DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "idx_announcement_dismissal"
  ON "announcement_dismissals" ("announcement_id", "user_uid");
