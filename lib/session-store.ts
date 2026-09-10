import { Prisma } from "@prisma/client";
import { prisma } from "./db";

/**
 * Pure session persistence helpers (no HTTP primitives). Session *cookie*
 * I/O stays in the controller layer.
 */

const SESSION_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days, same default as cookie

function buildSessionJson(userId: number): Prisma.InputJsonObject {
  return { userId };
}

function readSessionUserId(value: Prisma.JsonValue): number | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;
  return typeof raw.userId === "number" ? raw.userId : null;
}

/** Create a fresh session row and return its sid. */
export async function createSession(userId: number): Promise<string> {
  const sid = crypto.randomUUID();
  const expire = new Date(Date.now() + SESSION_MAX_AGE_MS);
  await prisma.session.create({
    data: { sid, sess: buildSessionJson(userId), expire },
  });
  return sid;
}

/** Return the ids matching a valid (non-expired) session sid, or null. */
export async function getUserIdBySid(sid: string): Promise<number | null> {
  const record = await prisma.session.findUnique({ where: { sid } });
  if (!record) return null;
  if (record.expire.getTime() < Date.now()) {
    await prisma.session.deleteMany({ where: { sid } });
    return null;
  }
  return readSessionUserId(record.sess);
}

export async function deleteSession(sid: string): Promise<void> {
  await prisma.session.deleteMany({ where: { sid } });
}
