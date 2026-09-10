import { z } from "zod";
import { MAX_FEED_IMAGES } from "../uploads";

/**
 * Request DTOs for the Feed module (feed posts + their threaded replies).
 */

const feedBody = z
  .string({ required_error: "Post content is required" })
  .min(1, { message: "Post content cannot be empty" })
  .max(5000, { message: "Feed posts are limited to 5000 characters" });

const feedImages = z
  .array(
    z.string().startsWith("data:image/", { message: "Invalid image payload" }),
  )
  .max(MAX_FEED_IMAGES, {
    message: `A post can have up to ${MAX_FEED_IMAGES} images`,
  });

/** POST /api/feed */
export const createFeedSchema = z.object({
  body: feedBody,
  images: feedImages.optional().default([]),
});
export type CreateFeedInput = z.input<typeof createFeedSchema>;

/** PATCH /api/feed/:id — at least one field must be present. */
export const updateFeedSchema = z
  .object({
    body: feedBody.optional(),
    isActive: z.boolean().optional(),
    images: feedImages.optional(),
  })
  .refine(
    (v) =>
      v.body !== undefined ||
      v.isActive !== undefined ||
      (v.images !== undefined && v.images.length > 0),
    { message: "At least one field is required to update a feed post" },
  );
export type UpdateFeedInput = z.input<typeof updateFeedSchema>;

/** GET /api/feed (query) */
export const feedScrollQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(20).optional().default(10),
  cursor: z.coerce.number().int().min(1).nullable().optional(),
});
export type FeedScrollQuery = z.infer<typeof feedScrollQuerySchema>;

/**
 * GET /api/feed/updates (query)
 *
 * `afterId` is the highest post id the client already has. The probe reports
 * how many active posts are newer than it. Defaults to 0, which simply counts
 * the whole active feed on a cold start.
 */
export const feedUpdatesQuerySchema = z.object({
  afterId: z.coerce.number().int().min(0).optional().default(0),
});
export type FeedUpdatesQuery = z.infer<typeof feedUpdatesQuerySchema>;

/** POST /api/feed/:id/replies */
export const createFeedReplySchema = z.object({
  content: z
    .string({ required_error: "Reply content is required" })
    .min(1, { message: "Reply content cannot be empty" })
    .max(2000, { message: "Replies are limited to 2000 characters" }),
  parentId: z.nullable(z.number().int().positive()).optional(),
});
export type CreateFeedReplyInput = z.infer<typeof createFeedReplySchema>;

/** Path param(s) helper for id-like route segments. */
export const idParamSchema = z
  .string()
  .regex(/^\d+$/, { message: "Invalid numeric id" })
  .transform(Number);
