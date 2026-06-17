CREATE TABLE IF NOT EXISTS "settings" (
  "key"   text PRIMARY KEY NOT NULL,
  "value" text NOT NULL
);

INSERT INTO "settings" ("key", "value") VALUES ('app_store_url', ''), ('play_store_url', '') ON CONFLICT ("key") DO NOTHING;
