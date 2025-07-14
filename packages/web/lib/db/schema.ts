import { relations } from "drizzle-orm";
import {
	boolean,
	integer,
	pgTable,
	text,
	timestamp,
	jsonb,
	varchar, // if you need specific length strings, otherwise text is fine
} from "drizzle-orm/pg-core";
export * from "./auth"; // add auth to db schema

// Courses table
export const courses = pgTable("courses", {
	id: integer("id").primaryKey(), // IDs from EdStem are integers
	code: text("code").notNull(), // Using text for variable length codes
	name: text("name").notNull(),
	year: text("year").notNull(),
	lastSynced: timestamp("last_synced"), // Use timestamp for PostgreSQL
});

// Threads table
export const threads = pgTable("threads", {
	id: integer("id").primaryKey(),
	courseId: integer("course_id")
		.notNull()
		.references(() => courses.id),
	title: text("title").notNull(),
	message: text("message"),
	category: text("category"),
	subcategory: text("subcategory"),
	subsubcategory: text("subsubcategory"),
	isAnswered: boolean("is_answered").default(false),
	isStaffAnswered: boolean("is_staff_answered").default(false),
	isStudentAnswered: boolean("is_student_answered").default(false),
	createdAt: timestamp("created_at").defaultNow(), // Use timestamp, defaultNow is fine for pg
	updatedAt: timestamp("updated_at").defaultNow(), // Use timestamp, can also use .onUpdateNow()
	images: jsonb("images").default("[]"),
});

// Answers/replies to threads
export const answers = pgTable("answers", {
	id: integer("id").primaryKey(),
	threadId: integer("thread_id")
		.notNull()
		.references(() => threads.id),
	courseId: integer("course_id")
		.notNull()
		.references(() => courses.id),
	parentId: integer("parent_id"), // Assuming parent_id refers to another answer's id
	message: text("message"),
	images: jsonb("images").default("[]"),
	isResolved: boolean("is_resolved").default(false),
	createdAt: timestamp("created_at").defaultNow(),
	updatedAt: timestamp("updated_at").defaultNow(),
});

// Relations
export const coursesRelations = relations(courses, ({ many }) => ({
	threads: many(threads),
}));

export const threadsRelations = relations(threads, ({ one, many }) => ({
	course: one(courses, {
		fields: [threads.courseId],
		references: [courses.id],
	}),
	answers: many(answers),
}));

export const answersRelations = relations(answers, ({ one }) => ({
	thread: one(threads, {
		fields: [answers.threadId],
		references: [threads.id],
	}),
}));
