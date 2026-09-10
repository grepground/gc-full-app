import { z } from "zod";

/**
 * Request DTOs for the Auth module.
 *
 * Usernames are normalized client-side to lowercase; emails are normalized in
 * the service layer. These schemas only describe what clients may send us in
 * terms of *shape + constraints*.
 */

const password = z.string({ required_error: "Password is required" }).min(6, {
  message: "Password must be at least 6 characters long",
});

/** POST /api/auth/login */
export const loginSchema = z.object({
  username: z
    .string({ required_error: "Username is required" })
    .trim()
    .min(1, { message: "Username is required" }),
  password: z
    .string({ required_error: "Password is required" })
    .min(6, { message: "Password must be at least 6 characters long" }),
});
export type LoginInput = z.infer<typeof loginSchema>;

/** POST /api/auth/forgot-password */
export const forgotPasswordSchema = z.object({
  email: z.string({ required_error: "Email is required" }).trim().email({
    message: "A valid email address is required",
  }),
});
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

/** POST /api/auth/reset-password */
export const resetPasswordSchema = z.object({
  email: z.string({ required_error: "Email is required" }).trim().email({
    message: "A valid email address is required",
  }),
  code: z
    .string({ required_error: "Verification code is required" })
    .trim()
    .length(6, { message: "The verification code is 6 digits" }),
  newPassword: password,
});
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

/** Shared output of a successful login / `/me` call. Avoids duplication. */
export type AuthUser = {
  id: number;
  username: string;
  email: string;
  role: string;
  firstName: string | null;
  lastName: string | null;
  nickname: string | null;
  bio: string | null;
  chesscomUsername: string | null;
  lichessUsername: string | null;
  avatar: string | null;
  isActive: boolean;
};
