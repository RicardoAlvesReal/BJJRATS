CREATE TABLE "passkey_credentials" (
	"id" text PRIMARY KEY NOT NULL,
	"user_uid" text NOT NULL REFERENCES "users"("uid") ON DELETE CASCADE,
	"public_key" text NOT NULL,
	"counter" integer DEFAULT 0 NOT NULL,
	"device_name" text,
	"created_at" timestamp DEFAULT now(),
	"last_used_at" timestamp
);
