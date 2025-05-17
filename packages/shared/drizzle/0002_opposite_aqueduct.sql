ALTER TABLE "answers" RENAME COLUMN "document" TO "message";--> statement-breakpoint
ALTER TABLE "threads" RENAME COLUMN "document" TO "message";--> statement-breakpoint
ALTER TABLE "answers" ADD COLUMN "images" text[] DEFAULT '{}';--> statement-breakpoint
ALTER TABLE "threads" ADD COLUMN "images" text[] DEFAULT '{}';