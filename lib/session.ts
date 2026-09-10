import { cookies } from "next/headers";
import { prisma } from "./db";
import { Prisma } from "@prisma/client";

/**
 * Lightweight HTTP-only session backed by the `Session` table (sid/sess/expire).
 *
 * The `sess` JSON column holds the serialized session payload. Here we always
 * write `{ userId: <number> }` and read it back on every authenticated request.
 * The `sid` value is stored in an HttpOnly cookie so it is never reachable
 * from client-side JavaScript.
 */

export const SESSION_COOKIE_NAME =
  process.env.SESSION_COOKIE_NAME?.trim() || "app.sid";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

/**
 * The session cookie is prefixed with `__Host-` in production.
 *
 * `__Host-` is a browser-enforced guarantee that the cookie was set with
 * `Secure`, has no `Domain` attribute and uses `Path=/`. That makes it
 * impossible for a compromised/attacker-controlled subdomain to overwrite or
 * fixate the victim's session cookie.
 *
 * In development the prefix is skipped because `Secure` cookies are not sent
 * over plain `http://localhost`.
 */
export const SESSION_COOKIE_ATTRIBUTES = (
  process.env.NODE_ENV === "production"
    ? `__Host-${SESSION_COOKIE_NAME}`
    : SESSION_COOKIE_NAME
) satisfies string;

/**
 * Fail fast when a production deployment forgot `SESSION_SECRET`.
 *
 * Signed-in sessions are random 128-bit ids (so they are already unguessable),
 * but the secret also salts visitor view-counter fingerprints and any future
 * cookie signing. Shipping without it silently weakens those guarantees.
 */
export function assertSessionSecretConfigured(): void {
  if (process.env.NODE_ENV !== "production") return;
  const secret = process.env.SESSION_SECRET?.trim();
  if (!secret || secret.length < 32) {
    throw new Error(
      "SESSION_SECRET must be set to a random string of at least 32 characters " +
        "in production. Generate one with: openssl rand -base64 48",
    );
  }
}

assertSessionSecretConfigured();

const SESSION_LIFETIME_MS = SESSION_MAX_AGE_SECONDS * 1000;

function buildSessionInput(userId: number): Prisma.InputJsonObject {
  return { userId };
}

function readSessionPayload(sess: Prisma.JsonValue): { userId: number } | null {
  if (!sess || typeof sess !== "object" || Array.isArray(sess)) return null;
  const raw = sess as Record<string, unknown>;
  if (typeof raw.userId !== "number") return null;
  return { userId: raw.userId };
}

// ---------------------------------------------------------------------------
// Cookie helpers (must be used inside Request/Route Handler contexts)
// ---------------------------------------------------------------------------

export async function getSidFromCookie(): Promise<string | null> {
  const store = await cookies();
  // Read the hardened (`__Host-`) name first, then fall back to the legacy
  // unprefixed name so sessions created before a deploy keep working.
  return (
    store.get(SESSION_COOKIE_ATTRIBUTES)?.value ??
    store.get(SESSION_COOKIE_NAME)?.value ??
    null
  );
}

export async function setSessionCookie(sid: string): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE_ATTRIBUTES, sid, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  // Clear both names so a legacy cookie cannot linger after logout.
  for (const name of [SESSION_COOKIE_ATTRIBUTES, SESSION_COOKIE_NAME]) {
    store.set(name, "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });
  }
}

// ---------------------------------------------------------------------------
// Session persistence
// ---------------------------------------------------------------------------

export async function createSession(userId: number): Promise<string> {
  const sid = crypto.randomUUID();
  const expire = new Date(Date.now() + SESSION_LIFETIME_MS);
  await prisma.session.create({
    data: {
      sid,
      sess: buildSessionInput(userId),
      expire,
    },
  });
  return sid;
}

export async function destroySessionBySid(sid: string): Promise<void> {
  await prisma.session.deleteMany({ where: { sid } });
}

export async function resolveUserIdFromSid(
  sid: string,
): Promise<number | null> {
  const record = await prisma.session.findUnique({ where: { sid } });
  if (!record) return null;
  if (record.expire.getTime() < Date.now()) {
    await prisma.session.deleteMany({ where: { sid } });
    return null;
  }
  // refresh window not needed
  return readSessionPayload(record.sess)?.userId ?? null;
}
