CREATE TABLE "academy_requests" (
	"id" text PRIMARY KEY NOT NULL,
	"student_uid" text NOT NULL,
	"student_name" text,
	"student_email" text,
	"student_photo" text,
	"student_belt" text,
	"professor_uid" text NOT NULL,
	"academy_name" text,
	"status" text DEFAULT 'pending',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "challenges" (
	"id" text PRIMARY KEY NOT NULL,
	"creator_uid" text NOT NULL,
	"academy_id" text,
	"title" text NOT NULL,
	"description" text,
	"target" integer DEFAULT 1,
	"unit" text DEFAULT 'treinos',
	"start_date" text,
	"end_date" text,
	"media_url" text,
	"is_public" boolean DEFAULT true,
	"participants" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "class_check_ins" (
	"id" text PRIMARY KEY NOT NULL,
	"schedule_id" text,
	"academy_id" text NOT NULL,
	"student_uid" text NOT NULL,
	"check_in_date" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "class_schedules" (
	"id" text PRIMARY KEY NOT NULL,
	"academy_id" text NOT NULL,
	"professor_uid" text NOT NULL,
	"day_of_week" integer,
	"start_time" text,
	"end_time" text,
	"class_name" text,
	"modality" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "comments" (
	"id" text PRIMARY KEY NOT NULL,
	"post_id" text NOT NULL,
	"author_uid" text NOT NULL,
	"author_name" text,
	"author_photo" text,
	"content" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "competitions" (
	"id" text PRIMARY KEY NOT NULL,
	"uid" text NOT NULL,
	"name" text NOT NULL,
	"date" text,
	"location" text,
	"category" text,
	"weight_class" text,
	"result" text DEFAULT 'gold',
	"notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "enrollments" (
	"id" text PRIMARY KEY NOT NULL,
	"professor_uid" text NOT NULL,
	"professor_name" text,
	"academy_name" text,
	"student_uid" text NOT NULL,
	"student_name" text,
	"monthly_fee" real DEFAULT 0,
	"due_day" integer DEFAULT 1,
	"status" text DEFAULT 'active',
	"pix_key" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" text PRIMARY KEY NOT NULL,
	"creator_uid" text NOT NULL,
	"academy_id" text,
	"title" text NOT NULL,
	"description" text,
	"event_date" text,
	"event_time" text,
	"location" text,
	"media_url" text,
	"is_public" boolean DEFAULT true,
	"rsvps" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "extra_trainings" (
	"id" text PRIMARY KEY NOT NULL,
	"uid" text NOT NULL,
	"training_date" text NOT NULL,
	"activity" text,
	"duration" integer NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "goals" (
	"id" text PRIMARY KEY NOT NULL,
	"uid" text NOT NULL,
	"title" text NOT NULL,
	"target" integer DEFAULT 0,
	"unit" text DEFAULT 'treinos',
	"period" text DEFAULT 'weekly',
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" text PRIMARY KEY NOT NULL,
	"to_uid" text NOT NULL,
	"from_uid" text,
	"from_name" text,
	"type" text,
	"message" text NOT NULL,
	"data" jsonb,
	"read" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" text PRIMARY KEY NOT NULL,
	"professor_uid" text NOT NULL,
	"student_uid" text NOT NULL,
	"student_name" text,
	"student_email" text,
	"amount" real NOT NULL,
	"due_date" timestamp,
	"paid_at" timestamp,
	"status" text DEFAULT 'pending',
	"pix_link" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "posts" (
	"id" text PRIMARY KEY NOT NULL,
	"author_uid" text NOT NULL,
	"author_name" text,
	"author_photo" text,
	"author_belt" text,
	"content" text,
	"media_url" text,
	"media_type" text,
	"post_type" text DEFAULT 'community',
	"academy_id" text,
	"training_data" jsonb,
	"likes" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "promotions" (
	"id" text PRIMARY KEY NOT NULL,
	"professor_uid" text NOT NULL,
	"student_uid" text NOT NULL,
	"student_name" text,
	"from_belt" text,
	"to_belt" text,
	"from_stripes" integer,
	"to_stripes" integer,
	"notes" text,
	"promoted_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "trainings" (
	"id" text PRIMARY KEY NOT NULL,
	"uid" text NOT NULL,
	"training_date" text NOT NULL,
	"session_type" text,
	"modality" text,
	"duration" integer NOT NULL,
	"intensity" integer,
	"satisfaction" integer,
	"techniques" jsonb DEFAULT '{}'::jsonb,
	"notes" text,
	"academy" text,
	"professor" text,
	"training_photo_url" text,
	"xp" integer DEFAULT 0,
	"extra_data" jsonb,
	"comp_data" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "user_achievements" (
	"id" text PRIMARY KEY NOT NULL,
	"uid" text NOT NULL,
	"achievement_id" text NOT NULL,
	"unlocked_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "users" (
	"uid" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"photo" text,
	"belt" text DEFAULT 'Branca' NOT NULL,
	"stripes" integer DEFAULT 0,
	"academy" text DEFAULT '',
	"academy_id" text,
	"professor" text DEFAULT '',
	"dob" text,
	"sex" text,
	"weight_kg" text,
	"height_cm" text,
	"phone" text,
	"address" text,
	"bjj_since" text,
	"xp" integer DEFAULT 0,
	"total_trainings" integer DEFAULT 0,
	"total_minutes" integer DEFAULT 0,
	"streak" integer DEFAULT 0,
	"last_training_date" text,
	"athlete_type" text,
	"is_academy_admin" boolean DEFAULT false,
	"role" text DEFAULT 'student',
	"academy_name" text,
	"academy_address" text,
	"academy_city" text,
	"academy_state" text,
	"academy_logo_url" text,
	"academy_cnpj" text,
	"academy_cep" text,
	"academy_number" text,
	"academy_neighborhood" text,
	"academy_complement" text,
	"professor_photo_url" text,
	"saved_academies" jsonb DEFAULT '[]'::jsonb,
	"saved_professors" jsonb DEFAULT '[]'::jsonb,
	"invite_code" text,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "academy_requests" ADD CONSTRAINT "academy_requests_student_uid_users_uid_fk" FOREIGN KEY ("student_uid") REFERENCES "public"."users"("uid") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "academy_requests" ADD CONSTRAINT "academy_requests_professor_uid_users_uid_fk" FOREIGN KEY ("professor_uid") REFERENCES "public"."users"("uid") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "challenges" ADD CONSTRAINT "challenges_creator_uid_users_uid_fk" FOREIGN KEY ("creator_uid") REFERENCES "public"."users"("uid") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "class_check_ins" ADD CONSTRAINT "class_check_ins_schedule_id_class_schedules_id_fk" FOREIGN KEY ("schedule_id") REFERENCES "public"."class_schedules"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "class_check_ins" ADD CONSTRAINT "class_check_ins_student_uid_users_uid_fk" FOREIGN KEY ("student_uid") REFERENCES "public"."users"("uid") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "class_schedules" ADD CONSTRAINT "class_schedules_professor_uid_users_uid_fk" FOREIGN KEY ("professor_uid") REFERENCES "public"."users"("uid") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_author_uid_users_uid_fk" FOREIGN KEY ("author_uid") REFERENCES "public"."users"("uid") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "competitions" ADD CONSTRAINT "competitions_uid_users_uid_fk" FOREIGN KEY ("uid") REFERENCES "public"."users"("uid") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_professor_uid_users_uid_fk" FOREIGN KEY ("professor_uid") REFERENCES "public"."users"("uid") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_student_uid_users_uid_fk" FOREIGN KEY ("student_uid") REFERENCES "public"."users"("uid") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_creator_uid_users_uid_fk" FOREIGN KEY ("creator_uid") REFERENCES "public"."users"("uid") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "extra_trainings" ADD CONSTRAINT "extra_trainings_uid_users_uid_fk" FOREIGN KEY ("uid") REFERENCES "public"."users"("uid") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goals" ADD CONSTRAINT "goals_uid_users_uid_fk" FOREIGN KEY ("uid") REFERENCES "public"."users"("uid") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_to_uid_users_uid_fk" FOREIGN KEY ("to_uid") REFERENCES "public"."users"("uid") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_professor_uid_users_uid_fk" FOREIGN KEY ("professor_uid") REFERENCES "public"."users"("uid") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_student_uid_users_uid_fk" FOREIGN KEY ("student_uid") REFERENCES "public"."users"("uid") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_author_uid_users_uid_fk" FOREIGN KEY ("author_uid") REFERENCES "public"."users"("uid") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promotions" ADD CONSTRAINT "promotions_professor_uid_users_uid_fk" FOREIGN KEY ("professor_uid") REFERENCES "public"."users"("uid") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promotions" ADD CONSTRAINT "promotions_student_uid_users_uid_fk" FOREIGN KEY ("student_uid") REFERENCES "public"."users"("uid") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trainings" ADD CONSTRAINT "trainings_uid_users_uid_fk" FOREIGN KEY ("uid") REFERENCES "public"."users"("uid") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_achievements" ADD CONSTRAINT "user_achievements_uid_users_uid_fk" FOREIGN KEY ("uid") REFERENCES "public"."users"("uid") ON DELETE cascade ON UPDATE no action;