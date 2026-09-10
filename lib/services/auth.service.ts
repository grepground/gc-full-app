import { randomInt } from "node:crypto";
import { prisma } from "../db";
import { hashPassword, verifyPassword } from "../passwords";
import { sendTransactionalEmail, displayName } from "../email";
import { createSession, deleteSession, getUserIdBySid } from "../session-store";
import { ServiceError, unauthorizedError, badRequestError } from "../errors";
import type { AuthUser } from "../validations/auth.schema";

/**
 * Auth service.
 *
 * Contains the entire domain + Prisma logic for signing in, starting/clearing a
 * session, password recovery and user serialization. It is fully HTTP-agnostic:
 * - Inputs are primitives / DTOs (strings, numbers, ...).
 * - Cookie reads & writes are intentionally *not* performed here; controllers
 *   read the session cookie and then pass `sid` or an `identifier` into these
 *   methods, and set/clear cookies afterwards.
 * Errors are raised as `ServiceError` and mapped to responses by controllers.
 */

const CODE_EXPIRY_MS = 15 * 60 * 1000; // 15 minutes

/**
 * A valid bcrypt hash that matches no real password. Used as a constant-time
 * dummy target when the login identifier does not resolve to a user, so the
 * credentials check costs the same whether or not the account exists.
 */
const DUMMY_PASSWORD_HASH =
  "$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy";

export class AuthService {
  /** Narrow a full/Prisma user (which may include password) to the public view. */
  private static userView(user: import("@prisma/client").User): AuthUser {
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

  private static userSelect = {
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
  } as const;

  private static async viewForId(userId: number): Promise<AuthUser | null> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { ...this.userSelect },
    });
    if (!user) return null;
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

  /**
   * Verify an identifier + password and open a session. Returns the user view
   * alongside a fresh session id which the controller persists as a cookie.
   */
  static async login(
    identifier: string,
    password: string,
  ): Promise<{ user: AuthUser; sid: string }> {
    const normalized = identifier.trim().toLowerCase();
    const user = await prisma.user.findFirst({
      where: { OR: [{ username: normalized }, { email: normalized }] },
    });

    // Always run a bcrypt comparison, even when the account does not exist, so
    // the response time cannot be used to enumerate valid usernames/emails.
    // (Otherwise an unknown identifier answers noticeably faster than a wrong
    // password, which is a reliable account-existence oracle.)
    const passwordOk = await verifyPassword(
      password,
      user?.password ?? DUMMY_PASSWORD_HASH,
    );
    if (!user || !passwordOk) {
      throw unauthorizedError("Invalid username or password.");
    }
    if (!user.isActive)
      throw unauthorizedError("Your account has been suspended.");

    const sid = await createSession(user.id);
    return { user: this.userView(user), sid };
  }

  /** Resolve the logged-in user for the given cookie sid, if any. */
  static async getUserBySid(sid: string | null): Promise<AuthUser | null> {
    if (!sid) return null;
    const userId = await getUserIdBySid(sid);
    if (!userId) return null;
    return this.viewForId(userId);
  }

  /** Sign the user out: drop the session row associated with the sid. */
  static async logout(sid: string | null): Promise<void> {
    if (sid) await deleteSession(sid);
  }

  /**
   * Issue a recovery code and notify the owner. This never leaks whether the
   * email exists: a lookup failure is silently swallowed and a success message
   * returned regardless.
   */
  static async requestPasswordReset(email: string): Promise<{ ok: true }> {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
    if (user) {
      // Cryptographically secure 6-digit code. Math.random() is predictable
      // (its state can be reconstructed from a few outputs), which would let an
      // attacker guess a freshly issued reset code instead of brute-forcing it.
      const code = String(randomInt(100000, 1000000));
      await prisma.$transaction([
        prisma.resetCode.deleteMany({
          where: { userId: user.id, isUsed: false },
        }),
        prisma.resetCode.create({
          data: {
            code,
            email: user.email,
            userId: user.id,
            expiresAt: new Date(Date.now() + CODE_EXPIRY_MS),
          },
        }),
      ]);

      await sendTransactionalEmail({
        to: user.email,
        subject: `${displayName()} — password reset code`,
        text:
          `Hi ${user.username},\n\n` +
          `Use the following code to reset your password:\n\n${code}\n\n` +
          "This code expires in 15 minutes. If you didn't request it, you can safely ignore this email.",
        html:
          `<p>Hi ${user.username},</p>` +
          `<p>Use the following code to reset your password:</p>` +
          `<p style="font-size:28px;letter-spacing:6px;font-weight:700">${code}</p>` +
          `<p>This code expires in 15 minutes. If you didn't request it, ignore this email.</p>`,
      });
    }
    return { ok: true };
  }

  /** Redeem a recovery code and set a new password. */
  static async resetPassword(
    email: string,
    code: string,
    newPassword: string,
  ): Promise<{ ok: true }> {
    const reset = await prisma.resetCode.findFirst({
      where: {
        email: email.toLowerCase(),
        code,
        isUsed: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
    });
    if (!reset) {
      throw badRequestError(
        "That verification code is invalid or has expired. Please request a new one.",
      );
    }

    const nextHash = await hashPassword(newPassword);
    await prisma.$transaction([
      prisma.user.update({
        where: { id: reset.userId },
        data: { password: nextHash },
      }),
      prisma.resetCode.update({
        where: { id: reset.id },
        data: { isUsed: true },
      }),
    ]);
    return { ok: true };
  }
}
