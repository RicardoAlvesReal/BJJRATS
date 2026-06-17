CREATE TABLE IF NOT EXISTS "academy_professor_links" (
  "id" text PRIMARY KEY,
  "academy_uid" text NOT NULL REFERENCES "users"("uid") ON DELETE cascade,
  "professor_uid" text NOT NULL REFERENCES "users"("uid") ON DELETE cascade,
  "relation_type" text NOT NULL DEFAULT 'internal',
  "status" text DEFAULT 'active',
  "notes" text,
  "created_by_uid" text REFERENCES "users"("uid") ON DELETE set null,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "idx_academy_professor_link"
  ON "academy_professor_links" ("academy_uid", "professor_uid");

CREATE TABLE IF NOT EXISTS "academy_student_professor_assignments" (
  "id" text PRIMARY KEY,
  "academy_uid" text NOT NULL REFERENCES "users"("uid") ON DELETE cascade,
  "professor_uid" text NOT NULL REFERENCES "users"("uid") ON DELETE cascade,
  "student_uid" text NOT NULL REFERENCES "users"("uid") ON DELETE cascade,
  "relation_type" text NOT NULL DEFAULT 'internal',
  "status" text DEFAULT 'active',
  "student_name" text,
  "professor_name" text,
  "notes" text,
  "created_by_uid" text REFERENCES "users"("uid") ON DELETE set null,
  "decided_at" timestamp,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "idx_academy_student_professor_assignment"
  ON "academy_student_professor_assignments" ("academy_uid", "professor_uid", "student_uid");
