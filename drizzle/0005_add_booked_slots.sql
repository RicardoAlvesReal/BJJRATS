CREATE TABLE IF NOT EXISTS "booked_slots" (
  "id" text PRIMARY KEY NOT NULL,
  "professor_uid" text NOT NULL REFERENCES "users"("uid") ON DELETE cascade,
  "student_uid" text NOT NULL REFERENCES "users"("uid") ON DELETE cascade,
  "student_name" text,
  "schedule_id" text REFERENCES "class_schedules"("id") ON DELETE set null,
  "date" text NOT NULL,
  "time" text NOT NULL,
  "duration_min" integer DEFAULT 60,
  "class_name" text,
  "notes" text,
  "status" text DEFAULT 'confirmed',
  "created_at" timestamp DEFAULT now()
);
