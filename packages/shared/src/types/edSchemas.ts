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
  vote: z.number()
});

// Type de base pour les posts
export type EDBasePost = z.infer<typeof EDBasePostSchema>;

// Définition du schéma pour les commentaires (de manière récursive)
export const EDCommentSchema: z.ZodType<any> = z.lazy(() => 
  EDBasePostSchema.extend({
    thread_id: z.number(),
    parent_id: z.number().nullable(),
    editor_id: z.number().nullable(),
    number: z.number(),
    type: z.literal("comment"),
    kind: z.string(),
    is_resolved: z.boolean(),
    comments: z.array(EDCommentSchema).default([])
  })
);

// Type pour les commentaires
export type EDComment = z.infer<typeof EDCommentSchema>;

// Schéma pour les réponses (answers)
export const EDAnswerSchema = EDBasePostSchema.extend({
  thread_id: z.number(),
  original_id: z.number().nullable(),
  parent_id: z.number().nullable(),
  editor_id: z.number().nullable(),
  number: z.number(),
  type: z.literal("answer"),
  kind: z.string(),
  is_resolved: z.boolean(),
  comments: z.array(EDCommentSchema).default([])
});

// Type pour les réponses
export type EDAnswer = z.infer<typeof EDAnswerSchema>;

// Schéma pour les threads
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
  comments: z.array(EDCommentSchema).default([])
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
  tutorials: z.record(z.any())
});

// Type pour les utilisateurs
export type EDUser = z.infer<typeof EDUserSchema>;

// Schéma pour la réponse complète de l'API
export const EDThreadResponseSchema = z.object({
  thread: EDThreadSchema,
  users: z.array(EDUserSchema).default([])
});

// Type pour la réponse de l'API
export type EDThreadResponse = z.infer<typeof EDThreadResponseSchema>; 