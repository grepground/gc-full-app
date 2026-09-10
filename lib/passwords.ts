import bcrypt from "bcryptjs";

const SALT_ROUNDS = 10;

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

export function verifyPassword(
  plain: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

// Helpers reused by validators so every route shares the same rules.
export const USERNAME_REGEX = /^[a-z0-9]+$/;

export function isValidUsername(username: string): boolean {
  return USERNAME_REGEX.test(username) && username.length >= 3;
}

export function isValidEmail(email: string): boolean {
  return /.+@.+\..+/.test(email);
}
