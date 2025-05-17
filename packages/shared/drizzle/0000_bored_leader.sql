CREATE TABLE "answers" (
	"id" integer PRIMARY KEY NOT NULL,
	"thread_id" integer NOT NULL,
	"course_id" integer NOT NULL,
	"parent_id" integer,
	"document" text,
	"is_resolved" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "courses" (
	"id" integer PRIMARY KEY NOT NULL,
	"code" varchar(20) NOT NULL,
	"name" varchar(255) NOT NULL,
	"year" varchar(10) NOT NULL,
	"last_active" timestamp
);
--> statement-breakpoint
CREATE TABLE "threads" (
	"id" integer PRIMARY KEY NOT NULL,
	"course_id" integer NOT NULL,
	"title" varchar(255) NOT NULL,
	"document" text,
	"category" varchar(100),
	"subcategory" varchar(100),
	"subsubcategory" varchar(100),
	"is_answered" boolean DEFAULT false,
	"is_staff_answered" boolean DEFAULT false,
	"is_student_answered" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "answers" ADD CONSTRAINT "answers_thread_id_threads_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."threads"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "answers" ADD CONSTRAINT "answers_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "threads" ADD CONSTRAINT "threads_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE no action ON UPDATE no action;