CREATE TABLE IF NOT EXISTS "training_videos" (
	"id" text PRIMARY KEY NOT NULL,
	"user_uid" text NOT NULL REFERENCES "users"("uid") ON DELETE CASCADE,
	"user_name" text,
	"user_photo" text,
	"user_belt" text,
	"academy_id" text,
	"academy_name" text,
	"title" text NOT NULL,
	"description" text,
	"video_url" text NOT NULL,
	"thumbnail_url" text,
	"duration_seconds" integer DEFAULT 0,
	"category" text DEFAULT 'posicao',
	"techniques" jsonb DEFAULT '[]'::jsonb,
	"likes" jsonb DEFAULT '[]'::jsonb,
	"comment_count" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now()
);
