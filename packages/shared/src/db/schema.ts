import { relations } from 'drizzle-orm';
import { boolean, integer, pgTable, primaryKey, text, timestamp, varchar } from 'drizzle-orm/pg-core';
import { PgArray as array } from 'drizzle-orm/pg-core';

// Courses table
export const courses = pgTable('courses', {
  id: integer('id').primaryKey(),
  code: varchar('code', { length: 20 }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  year: varchar('year', { length: 10 }).notNull(),
  lastActive: timestamp('last_active'),
});


// Threads table
export const threads = pgTable('threads', {
  id: integer('id').primaryKey(),
  courseId: integer('course_id').notNull().references(() => courses.id),
  title: varchar('title', { length: 255 }).notNull(),
  message: text('message'),
  category: varchar('category', { length: 100 }),
  subcategory: varchar('subcategory', { length: 100 }),
  subsubcategory: varchar('subsubcategory', { length: 100 }),
  isAnswered: boolean('is_answered').default(false),
  isStaffAnswered: boolean('is_staff_answered').default(false),
  isStudentAnswered: boolean('is_student_answered').default(false),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at'),
  images: text('images').array().default([]),
});

// Answers/replies to threads
export const answers = pgTable('answers', {
  id: integer('id').primaryKey(),
  threadId: integer('thread_id').notNull().references(() => threads.id),
  courseId: integer('course_id').notNull().references(() => courses.id),
  parentId: integer('parent_id'),
  message: text('message'),
  images: text('images').array().default([]),
  isResolved: boolean('is_resolved').default(false),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at'),
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
