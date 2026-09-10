import { z } from "zod";

/**
 * Request DTOs for the News/Posts module.
 */

const title = z
  .string({ required_error: "Title is required" })
  .trim()
  .min(1, { message: "Title cannot be empty" })
  .max(200, { message: "Title must be 200 characters or fewer" });

/** POST /api/posts */
export const createPostSchema = z.object({
  title,
  category: z
    .string({ required_error: "Category is required" })
    .trim()
    .min(1, { message: "Category cannot be empty" }),
  excerpt: z
    .string({ required_error: "Excerpt is required" })
    .trim()
    .min(1, { message: "Excerpt cannot be empty" })
    .max(500, { message: "Excerpt must be 500 characters or fewer" }),
  content: z
    .string({ required_error: "Content is required" })
    .min(1, { message: "Content cannot be empty" }),
  /** Optional base64 data-URL image (or empty string => no cover). */
  coverImage: z.string().nullable().optional(),
});
export type CreatePostInput = z.infer<typeof createPostSchema>;

/** PATCH /api/posts/:id — all fields optional but at least one present. */
export const updatePostSchema = z
  .object({
    title: title.optional(),
    excerpt: z
      .string()
      .trim()
      .min(1, { message: "Excerpt cannot be empty" })
      .max(500)
      .optional(),
    content: z.string().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, {
    message: "At least one field is required to update an article",
  });
export type UpdatePostInput = z.infer<typeof updatePostSchema>;

/** PATCH /api/posts/:id/clap */
export const clapPostSchema = z.object({
  clapsIncrement: z
    .number({ required_error: "clapsIncrement is required" })
    .int()
    .min(1, { message: "Invalid clap increment" })
    .max(50, { message: "Clap increment is capped at 50" }),
});
export type ClapPostInput = z.infer<typeof clapPostSchema>;

/** Query params for GET /api/posts/scroll */
export const postsScrollQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(20).optional().default(5),
  cursor: z.coerce.number().int().min(1).nullable().optional(),
});
export type PostsScrollQuery = z.infer<typeof postsScrollQuerySchema>;
