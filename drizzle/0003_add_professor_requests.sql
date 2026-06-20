CREATE TABLE IF NOT EXISTS "professor_requests" (
  "id" text PRIMARY KEY NOT NULL,
  "student_uid" text NOT NULL REFERENCES "users"("uid") ON DELETE cascade,
  "student_name" text,
  "student_email" text,
  "student_photo" text,
  "student_belt" text,
  "professor_uid" text NOT NULL REFERENCES "users"("uid") ON DELETE cascade,
  "professor_name" text,
  "status" text DEFAULT 'pending',
  "created_at" timestamp DEFAULT now()
);
