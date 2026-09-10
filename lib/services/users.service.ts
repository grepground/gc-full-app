import { Prisma, type User } from "@prisma/client";
import { prisma } from "../db";
import { hashPassword, verifyPassword } from "../passwords";
import * as storage from "../uploads";
import {
  badRequestError,
  conflictError,
  forbiddenError,
  notFoundError,
} from "../errors";
import type {
  ChangePasswordInput,
  CreateUserInput,
  UpdateUserInput,
} from "../validations/users.schema";

/**
 * Users service.
 *
 * Owns every Prisma/domain rule for accounts (registration, listing, profile
 * edits, avatar & password changes). It is fully HTTP-agnostic: problems are
 * raised as `ServiceError` and callers pass the acting user separate from data.
 */

export interface Actor {
  id: number;
  role: string;
}

export type UserView = Pick<
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

const USER_LIST_SELECT = {
  id: true,
  username: true,
  email: true,
  role: true,
  isActive: true,
  firstName: true,
  lastName: true,
  nickname: true,
  createdAt: true,
  updatedAt: true,
} as const;

function toView(u: User): UserView {
  return {
    id: u.id,
    username: u.username,
    email: u.email,
    role: u.role,
    firstName: u.firstName,
    lastName: u.lastName,
    nickname: u.nickname,
    bio: u.bio,
    chesscomUsername: u.chesscomUsername,
    lichessUsername: u.lichessUsername,
    avatar: u.avatar,
    isActive: u.isActive,
  };
}

async function assertUnique(
  field: "username" | "email",
  value: string,
  ignoreId: number,
) {
  const other =
    field === "username"
      ? await prisma.user.findUnique({ where: { username: value } })
      : await prisma.user.findUnique({ where: { email: value } });
  if (other && other.id !== ignoreId) {
    throw conflictError(
      field === "username"
        ? "Username already taken."
        : "Email already in use.",
    );
  }
}

function isUniqueViolation(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}

export class UsersService {
  private static isAdmin(role: string): boolean {
    return role === "admin";
  }

  private static isModOrAdmin(role: string): boolean {
    return role === "admin" || role === "moderator";
  }

  // -------------------------------------------------------------------------
  // Reads
  // -------------------------------------------------------------------------

  /** Public user row (password never included). */
  static async getById(id: number): Promise<UserView | null> {
    const user = await prisma.user.findUnique({ where: { id } });
    return user ? toView(user) : null;
  }

  /**
   * Public identity for another member's profile page — deliberately limited to
   * the handful of self-exposed fields (username, avatar, name & nickname) so
   * clicking a feed/comment author never leaks private data. Always excludes
   * account holders that were deactivated or suspended.
   */
  static async getPublicByName(username: string) {
    const user = await prisma.user.findFirst({
      where: { username, isActive: true },
      select: {
        username: true,
        avatar: true,
        firstName: true,
        lastName: true,
        nickname: true,
        bio: true,
        createdAt: true,
      },
    });
    return user ?? null;
  }

  /** Admin directory listing — used by management UIs. */
  static async listAll() {
    return prisma.user.findMany({
      orderBy: { createdAt: "asc" },
      select: USER_LIST_SELECT,
    });
  }

  // -------------------------------------------------------------------------
  // Writes
  // -------------------------------------------------------------------------

  /** Register a fresh account (privilege always defaults to "player"). */
  static async register(input: CreateUserInput): Promise<UserView> {
    const username = input.username.toLowerCase();
    const email = input.email.toLowerCase();

    try {
      const user = await prisma.user.create({
        data: {
          username,
          email,
          password: await hashPassword(input.password),
          role: "player",
        },
      });
      return toView(user);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw conflictError("That username or email is already in use.");
      }
      throw error;
    }
  }

  /**
   * Update a user record. Non-admins may only change their own profile fields;
   * admins may also change username / role / active state.
   */
  static async update(id: number, input: UpdateUserInput, actor: Actor) {
    const target = await prisma.user.findUnique({ where: { id } });
    if (!target) throw notFoundError("User not found.");

    const isAdmin = this.isAdmin(actor.role);
    const isSelf = actor.id === id;
    if (!isAdmin && !isSelf) {
      throw forbiddenError("You can only edit your own profile.");
    }

    const data: Prisma.UserUpdateInput = {};

    if (input.username !== undefined) {
      if (!isAdmin)
        throw forbiddenError("Only admins can change the username.");
      const username = input.username.toLowerCase();
      await assertUnique("username", username, id);
      data.username = username;
    }
    if (input.email !== undefined) {
      if (!isSelf && !isAdmin) {
        throw forbiddenError("You can only change your own email.");
      }
      const email = input.email.toLowerCase();
      await assertUnique("email", email, id);
      data.email = email;
    }
    if (input.role !== undefined) {
      if (!isAdmin) throw forbiddenError("Only admins can change roles.");
      data.role = input.role;
    }
    if (input.isActive !== undefined) {
      if (!isAdmin)
        throw forbiddenError("Only admins can change account status.");
      data.isActive = input.isActive;
    }
    for (const key of ["firstName", "lastName", "nickname"] as const) {
      const value = input[key];
      if (value !== undefined) {
        data[key] = value ? String(value).trim() || null : null;
      }
    }
    if (input.bio !== undefined) {
      const bio = input.bio ? String(input.bio).trim() : "";
      data.bio = bio.slice(0, 500) || null;
    }
    for (const key of ["chesscomUsername", "lichessUsername"] as const) {
      const value = input[key];
      if (value !== undefined) {
        data[key] = value ? String(value).trim() || null : null;
      }
    }

    if (Object.keys(data).length === 0) return toView(target);

    try {
      const updated = await prisma.user.update({ where: { id }, data });
      return toView(updated);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw conflictError("That username or email is already in use.");
      }
      throw error;
    }
  }

  /** Replace an avatar from raw parsed upload fields. */
  static async updateAvatar(
    id: number,
    upload: { bytes: ArrayBuffer; mime: string },
  ) {
    const target = await prisma.user.findUnique({
      where: { id },
      select: { id: true, avatar: true },
    });
    if (!target) throw notFoundError("User not found.");
    if (!storage.isAcceptedImage(upload.mime)) {
      throw badRequestError(
        "Uploaded file must be a PNG, JPEG, WebP, GIF, AVIF or SVG image.",
      );
    }

    const filename = await storage.saveRawImage(
      upload.bytes,
      upload.mime,
      "avatar",
      storage.AVATAR_DIR,
    );
    if (!filename) throw badRequestError("Failed to store the uploaded image.");

    const updated = await prisma.user.update({
      where: { id },
      data: { avatar: filename },
    });
    if (target.avatar && target.avatar !== filename) {
      await storage.deleteStoredAvatar(target.avatar);
    }
    return toView(updated);
  }

  /** Change the password after verifying the current one. */
  static async changePassword(id: number, input: ChangePasswordInput) {
    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, password: true },
    });
    if (!user) throw notFoundError("User not found.");

    const matches = await verifyPassword(input.oldPassword, user.password);
    if (!matches) {
      throw badRequestError("Your current password is incorrect.");
    }

    await prisma.user.update({
      where: { id },
      data: { password: await hashPassword(input.newPassword) },
    });
    return { ok: true as const, message: "Password changed successfully." };
  }

  /** Authorization helper usable by controllers for avatar/password writing. */
  static isModOrAdminRole(role: string): boolean {
    return this.isModOrAdmin(role);
  }
}
