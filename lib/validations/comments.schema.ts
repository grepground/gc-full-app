import { z } from "zod";

/**
 * Request DTOs for the article Comments module.
 */

/** POST /posts/:ident/comments */
export const createCommentSchema = z.object({
  content: z
    .string({ required_error: "Comment content is required" })
    .trim()
    .min(1, { message: "Comment content cannot be empty" })
    .max(2000, { message: "Comment must be shorter than 2000 characters" }),
  /** Parent comment id when this is a nested reply. */
  parentId: z.nullable(z.number().int().positive()).optional(),
});
export type CreateCommentInput = z.infer<typeof createCommentSchema>;

/** Path param schema helper (not a body) for reuse in route ids. */
export const idParamSchema = z
  .string()
  .regex(/^\d+$/, { message: "Invalid numeric id" })
  .transform(Number);
