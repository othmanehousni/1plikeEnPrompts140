import { z } from "zod";

// Schéma de base pour les propriétés communes à tous les types de posts ED
const EDBasePostSchema = z.object({
	id: z.number(),
	user_id: z.number(),
	course_id: z.number(),
	content: z.string(),
	document: z.string(),
	flag_count: z.number(),
	vote_count: z.number(),
	is_endorsed: z.boolean(),
	is_anonymous: z.boolean(),
	is_private: z.boolean(),
	created_at: z.string(),
	updated_at: z.string().nullable(),
	deleted_at: z.string().nullable(),
	anonymous_id: z.number(),
	vote: z.number(),
});

// Type de base pour les posts
export type EDBasePost = z.infer<typeof EDBasePostSchema>;

// Schéma pour les cours ED (fusionné depuis EDCourseSchema et EdStemCourseInfoSchema/EdStemUserInfoCourseSchema)
export const EDCourseSchema = z.object({
	id: z.number(),
	code: z.string().optional(),
	name: z.string().optional(),
	year: z.string().optional(), // Corresponds to 'period' in some contexts or 'year' directly
	last_active_at: z.string().optional().nullable(), // Combined from various sources
	// Add other relevant course fields if needed
});

export type EDCourse = z.infer<typeof EDCourseSchema>;

// Schema for the API response when fetching a list of courses (e.g., /api/courses)
export const EDCoursesApiResponseSchema = z.object({
	courses: z.array(EDCourseSchema),
});
export type EDCoursesApiResponse = z.infer<typeof EDCoursesApiResponseSchema>;

// Schema for a course entry as part of user information
export const EDUserCourseEntrySchema = z.object({
	course: EDCourseSchema,
	role: z.object({
		role: z.string(),
	}).optional(),
	last_active: z.string().optional().nullable(), // Distinct from course.last_active_at in some contexts
});
export type EDUserCourseEntry = z.infer<typeof EDUserCourseEntrySchema>;

// Schema for the user API response (e.g., /api/user)
export const EDUserApiResponseSchema = z.object({
	courses: z.array(EDUserCourseEntrySchema),
	// user_id: z.number().optional(), // from JWT example, add if needed
});
export type EDUserApiResponse = z.infer<typeof EDUserApiResponseSchema>;

// Définition du schéma pour les commentaires (de manière récursive)
export const EDCommentSchema = z.lazy(() =>
	EDBasePostSchema.extend({
		thread_id: z.number(),
		parent_id: z.number().nullable(),
		editor_id: z.number().nullable(),
		number: z.number(),
		type: z.literal("comment"),
		kind: z.string(),
		is_resolved: z.boolean(),
		comments: z.array(z.lazy(() => EDCommentSchema)).default([]),
	}),
) as z.ZodType<EDBasePost & {
	thread_id: number;
	parent_id: number | null;
	editor_id: number | null;
	number: number;
	type: "comment";
	kind: string;
	is_resolved: boolean;
	comments: Array<any>; // Circular reference handled by the 'as' assertion
}>;

// Type pour les commentaires
export type EDComment = z.infer<typeof EDCommentSchema>;

// Schéma pour les réponses (answers) - DETAILED version from existing ed.schema.ts
export const EDAnswerSchema = EDBasePostSchema.extend({
	thread_id: z.number(),
	original_id: z.number().nullable(),
	parent_id: z.number().nullable(), // This is important for hierarchy
	editor_id: z.number().nullable(),
	number: z.number(),
	type: z.literal("answer"),
	kind: z.string(),
	is_resolved: z.boolean(),
	comments: z.array(EDCommentSchema).default([]),
	// content / document are from EDBasePostSchema
});

// Type pour les réponses
export type EDAnswer = z.infer<typeof EDAnswerSchema>;

// Schéma pour les threads - DETAILED version from existing ed.schema.ts
export const EDThreadSchema = EDBasePostSchema.extend({
	original_id: z.number().nullable(),
	editor_id: z.number().nullable(),
	accepted_id: z.number().nullable(),
	duplicate_id: z.number().nullable(),
	number: z.number(),
	type: z.string(),
	title: z.string(),
	category: z.string(),
	subcategory: z.string(),
	subsubcategory: z.string(),
	star_count: z.number(),
	view_count: z.number(),
	unique_view_count: z.number(),
	reply_count: z.number(),
	unresolved_count: z.number(),
	is_locked: z.boolean(),
	is_pinned: z.boolean(),
	is_answered: z.boolean(),
	is_student_answered: z.boolean(),
	is_staff_answered: z.boolean(),
	is_archived: z.boolean(),
	is_megathread: z.boolean(),
	anonymous_comments: z.boolean(),
	approved_status: z.string(),
	pinned_at: z.string().nullable(),
	is_seen: z.boolean(),
	is_starred: z.boolean(),
	is_watched: z.boolean().nullable(),
	glanced_at: z.string().nullable(),
	new_reply_count: z.number(),
	duplicate_title: z.string().nullable(),
	answers: z.array(EDAnswerSchema).default([]),
	comments: z.array(EDCommentSchema).default([]),
});

// Type pour les threads
export type EDThread = z.infer<typeof EDThreadSchema>;

// Schéma pour l'utilisateur ED
export const EDUserSchema = z.object({
	id: z.number(),
	role: z.string(),
	name: z.string(),
	avatar: z.string().nullable(),
	course_role: z.string().nullable(),
	tutorials: z.record(z.any()),
});

// Type pour les utilisateurs
export type EDUser = z.infer<typeof EDUserSchema>;

// Schéma pour la réponse complète de l'API pour UN thread (includes users, detailed thread, answers, comments)
export const EDThreadResponseSchema = z.object({
	thread: EDThreadSchema, // This is the detailed EDThreadSchema
	users: z.array(EDUserSchema).default([]),
});

// Type pour la réponse de l'API
export type EDThreadResponse = z.infer<typeof EDThreadResponseSchema>;

// Schemas for LISTING threads and answers (simpler, from ed-client.ts)

export const EDListedAnswerSchema = z.object({
	id: z.number(),
	parent_id: z.number().optional().nullable(),
	message: z.string().optional().nullable(), // Corresponds to 'content' or 'document' in detailed schemas
	images: z.array(z.string()).optional().nullable(), // Keep flexible for now
	is_resolved: z.boolean().optional().nullable(),
	created_at: z.string(),
	updated_at: z.string(),
	// Allow additional fields that might be in the API response
	// but not strictly defined in our schema
}).passthrough();
export type EDListedAnswer = z.infer<typeof EDListedAnswerSchema>;

export const EDListedThreadSchema = z.object({
	id: z.number(),
	title: z.string(),
	message: z.string().optional().nullable(),
	category: z.string().optional().nullable(),
	subcategory: z.string().optional().nullable(),
	subsubcategory: z.string().optional().nullable(),
	is_answered: z.boolean().optional().nullable(),
	is_staff_answered: z.boolean().optional().nullable(),
	is_student_answered: z.boolean().optional().nullable(),
	created_at: z.string(),
	updated_at: z.string(),
	images: z.array(z.string()).optional().nullable(),
	// Allow additional fields
}).passthrough();
export type EDListedThread = z.infer<typeof EDListedThreadSchema>;

// Schema for the API response when fetching a list of threads for a course
export const EDThreadsListResponseSchema = z.object({
	threads: z.array(EDListedThreadSchema),
	pagination: z.object({
		total: z.number(),
		per_page: z.number(),
		current_page: z.number(),
		last_page: z.number(),
	}).optional(),
});
export type EDThreadsListResponse = z.infer<typeof EDThreadsListResponseSchema>;

// Schema for the API response when fetching a list of answers for a thread
// Note: ed-client currently gets answers from the full EDThreadResponseSchema.
// This schema is for a hypothetical endpoint or if parsing needs change.
export const EDAnswersListResponseSchema = z.object({
	answers: z.array(EDListedAnswerSchema), // Using EDListedAnswerSchema for consistency if it's a list
	pagination: z.object({
		total: z.number(),
		per_page: z.number(),
		current_page: z.number(),
		last_page: z.number(),
	}).optional(),
});
export type EDAnswersListResponse = z.infer<typeof EDAnswersListResponseSchema>;
