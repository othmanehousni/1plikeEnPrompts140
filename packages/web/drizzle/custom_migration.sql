-- First, drop the existing tables (if they exist)
DROP TABLE IF EXISTS "answers" CASCADE;
DROP TABLE IF EXISTS "threads" CASCADE; 
DROP TABLE IF EXISTS "courses" CASCADE;

-- Create the tables fresh
CREATE TABLE "courses" (
	"id" integer PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"year" text NOT NULL,
	"last_synced" timestamp
);

CREATE TABLE "threads" (
	"id" integer PRIMARY KEY NOT NULL,
	"course_id" integer NOT NULL,
	"title" text NOT NULL,
	"message" text,
	"category" text,
	"subcategory" text,
	"subsubcategory" text,
	"is_answered" boolean DEFAULT false,
	"is_staff_answered" boolean DEFAULT false,
	"is_student_answered" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"images" jsonb DEFAULT '[]'
);

CREATE TABLE "answers" (
	"id" integer PRIMARY KEY NOT NULL,
	"thread_id" integer NOT NULL,
	"course_id" integer NOT NULL,
	"parent_id" integer,
	"message" text,
	"images" jsonb DEFAULT '[]',
	"is_resolved" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);

-- Add constraints
ALTER TABLE "threads" ADD CONSTRAINT "threads_course_id_courses_id_fk" 
  FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "answers" ADD CONSTRAINT "answers_thread_id_threads_id_fk" 
  FOREIGN KEY ("thread_id") REFERENCES "threads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "answers" ADD CONSTRAINT "answers_course_id_courses_id_fk" 
  FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE; 