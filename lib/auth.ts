import type { User } from "@prisma/client";
import { prisma } from "./db";
import {
  destroySessionBySid,
  getSidFromCookie,
  resolveUserIdFromSid,
  setSessionCookie,
  clearSessionCookie,
} from "./session";

/**
 * Request-scoped helpers that resolve the *current* signed-in user from the
 * HTTP-only session cookie. These functions must only be called from Server
 * Components and Route Handlers.
 */

export interface SessionUserShape {
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
}

type PublicUser = Pick<
  User,
  | "id"
  | "username"
  | "email"
  | "role"
  | "firstName"
  | "lastName"
  | "nickname"
  | "bio"
  | "chesscomUsername"
  | "lichessUsername"
  | "avatar"
  | "isActive"
>;

/** Public JSON-safe view of a user (the password hash is never exposed). */
export function serializeUser(user: PublicUser): SessionUserShape {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
    firstName: user.firstName,
    lastName: user.lastName,
    nickname: user.nickname,
    bio: user.bio,
    chesscomUsername: user.chesscomUsername,
    lichessUsername: user.lichessUsername,
    avatar: user.avatar,
    isActive: user.isActive,
  };
}

const PUBLIC_USER_SELECT = {
  id: true,
  username: true,
  email: true,
  role: true,
  firstName: true,
  lastName: true,
  nickname: true,
  bio: true,
  chesscomUsername: true,
  lichessUsername: true,
  avatar: true,
  isActive: true,
} satisfies Record<keyof PublicUser, true>;

/** Current user source-of-truth resolver. */
async function resolveRawUser(): Promise<PublicUser | null> {
  const sid = await getSidFromCookie();
  if (!sid) return null;

  const userId = await resolveUserIdFromSid(sid);
  if (!userId) return null;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: PUBLIC_USER_SELECT,
  });
  return user ?? null;
}

/**
 * Return the active signed-in user, or null when there is no valid session.
 * Suspended (isActive === false) users cannot authenticate.
 */
export async function getSessionUser(): Promise<SessionUserShape | null> {
  const user = await resolveRawUser();
  return user ? serializeUser(user) : null;
}

/** Raw DB (already password-free) user for the current session, or null. */
export async function getRawSessionUser(): Promise<PublicUser | null> {
  return resolveRawUser();
}

export function hasModRole(role: string): boolean {
  return role === "admin" || role === "moderator";
}

export { destroySessionBySid, setSessionCookie, clearSessionCookie };
