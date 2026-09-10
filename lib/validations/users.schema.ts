import { z } from "zod";

/**
 * Request DTOs for the Users module (accounts + profile + admin controls).
 */

const ROLES = ["player", "user", "moderator", "admin"] as const;
const USERNAME = /^[a-z0-9]+$/;
export const usernameSchema = z
  .string()
  .trim()
  .min(3)
  .regex(USERNAME, "Use 3+ lowercase letters/numbers only");
export const emailSchema = z.string().trim().email();
export const passwordSchema = z
  .string()
  .min(6, "Password must be at least 6 characters long");

/** POST /api/users — public account registration. */
export const createUserSchema = z.object({
  username: usernameSchema,
  email: emailSchema,
  password: passwordSchema,
});
export type CreateUserInput = z.infer<typeof createUserSchema>;

const profileOptional = {
  firstName: z.string().trim().max(80).nullable().optional(),
  lastName: z.string().trim().max(80).nullable().optional(),
  nickname: z.string().trim().max(80).nullable().optional(),
};

/** Short, publicly visible self-description shown on the member profile. */
const optionalBio = z
  .string()
  .trim()
  .max(500, "Bio must be 500 characters or fewer")
  .nullable()
  .optional();

/** PATCH /api/users/:id — self profile edit or admin control payload. */
export const updateUserSchema = z
  .object({
    username: usernameSchema.optional(),
    email: emailSchema.optional(),
    role: z.enum(ROLES).optional(),
    isActive: z.boolean().optional(),
    chesscomUsername: z.string().nullable().optional(),
    lichessUsername: z.string().nullable().optional(),
    bio: optionalBio,
    ...profileOptional,
  })
  .partial()
  .refine((v) => Object.keys(v).length > 0, {
    message: "At least one field is required",
  });
export type UpdateUserInput = z.infer<typeof updateUserSchema>;

/** PATCH /api/users/:id/password */
export const changePasswordSchema = z.object({
  oldPassword: z.string().min(1, "Current password is required"),
  newPassword: passwordSchema,
});
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

/** Numeric id path param helper. */
export const idParamSchema = z
  .string()
  .regex(/^\d+$/, { message: "Invalid numeric id" })
  .transform(Number);
