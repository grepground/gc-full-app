/** Generate a URL/web-safe lowercase slug from any input string. */
export function slugify(input: string): string {
  const normalized = input
    .toLowerCase()
    .trim()
    // Unicode letters/numbers + spaces -> separators; drop other symbols.
    .replace(/[^a-z0-9\s-]/g, "");
  const chunk = normalized
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  // If nothing usable remains (e.g. emoji-only title) fall back to a token.
  return chunk || "post";
}

function randomToken(length = 8): string {
  const alphabet = "abcdefghijklmnopqrstuvwxyz0123456789";
  let out = "";
  for (let i = 0; i < length; i++) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return out;
}

/**
 * Create a slug guaranteed (enough) to be unique even when several rows share
 * an identical title/body — the random suffix keeps fast-path collisions out.
 */
export function uniqueSlug(base: string): string {
  const fallback = base || "post";
  return `${uniqueSlugBase(fallback)}-${randomToken(6)}`;
}

function uniqueSlugBase(base: string): string {
  return slugify(base).slice(0, 48);
}

export function uniqueNewsSlug(title: string): string {
  return uniqueSlug(title);
}

export function uniqueFeedSlug(text: string): string {
  const firstLine = text.trim().split(/\s+/).slice(0, 6).join(" ").slice(0, 40);
  return uniqueSlug(slugify(firstLine));
}

/** Parse an API page cursor/limit from raw query-string values. */
export function parsePagination(
  searchParams: URLSearchParams,
  defaultLimit = 10,
  maxLimit = 20,
): { limit: number; cursor: number | null } {
  const rawLimit = Number(searchParams.get("limit"));
  const rawCursor = searchParams.get("cursor");

  const limit = Number.isFinite(rawLimit)
    ? Math.min(maxLimit, Math.max(1, Math.floor(rawLimit)))
    : defaultLimit;

  let cursor: number | null = null;
  if (rawCursor !== null && rawCursor !== "") {
    const parsed = Number(rawCursor);
    if (Number.isFinite(parsed)) cursor = Math.floor(parsed);
  }

  return { limit, cursor };
}

export function isIntegerString(value: string): boolean {
  return /^\d+$/.test(value);
}
