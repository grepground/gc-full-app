import { createHash } from "node:crypto";

/**
 * Fallback used only in development, where reproducibility is more useful than
 * unpredictability. Production builds must provide a real secret (see below) so
 * that visitor fingerprints can never be forged from a value that ships in the
 * repository.
 */
const DEV_FALLBACK_SALT = "dev-only:view-counter";

let warnedAboutSalt = false;

/**
 * Resolve the salt used to blind visitor fingerprints.
 *
 * `VISIT_COUNTER_SALT` is preferred so the view counter can be rotated without
 * invalidating sessions. In production a missing salt is a hard error: a
 * hardcoded/guessable salt would let anyone recompute the `a:<digest>`
 * fingerprints and correlate them back to a raw IP address.
 */
function maskingSalt(): string {
  const configured =
    process.env.VISIT_COUNTER_SALT?.trim() ||
    process.env.SESSION_SECRET?.trim();
  if (configured) return configured;

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "VISIT_COUNTER_SALT (or SESSION_SECRET) must be set in production so " +
        "visitor fingerprints cannot be derived from a public constant.",
    );
  }

  if (!warnedAboutSalt) {
    warnedAboutSalt = true;
    console.warn(
      "[visits] VISIT_COUNTER_SALT/SESSION_SECRET is not set — using the " +
        "development-only fallback salt. Never deploy without a real secret.",
    );
  }
  return DEV_FALLBACK_SALT;
}

/**
 * Blinded, stable identity for a single view. Signed-in users are tracked by
 * account id (no IP needed); anonymous visitors by a salted SHA-256 of their IP
 * so a raw IP address is never persisted or exposed.
 */
export function resolveVisitor(
  ip: string | null | undefined,
  actorId: number | null,
): string {
  if (actorId) return `u:${actorId}`;
  const raw = (ip ?? "").trim() || "unknown";
  const digest = createHash("sha256")
    .update(`${maskingSalt()}:${raw}`)
    .digest("hex");
  return `a:${digest}`;
}
