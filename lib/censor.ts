/**
 * Lightweight moderation helper for the feed.
 *
 * The banned word list is read from a single server-side env variable
 * (`CENSORED_WORDS`) and parsed as a comma-separated list, so it is easy to
 * keep extending the dictionary without touching code, e.g.:
 *
 *   CENSORED_WORDS="fuck,shit,asshole,bitch"
 *
 * Matching is intentionally loose ("sensitive") so obfuscated spellings are
 * caught too: it is case-insensitive and compares, for each word, both its raw
 * form and a de-doubled form (when it has repeated-letter runs such as `fuccckk`)
 * against every banned word. That catches variants like `fuck`, `fucck`,
 * `fuccckk`, typos and simple leetspeak slips. A matched token is replaced character-for-character with asterisks (same length), so
 * the rest of the post is preserved.
 *
 * This module is server-only (it runs on Node inside the route handlers). Do
 * not import it from client components.
 */

// Comma (or semicolon) separated list configured in the environment, lowered
// for comparison.
function readBannedWords(): string[] {
  const raw = (process.env.CENSORED_WORDS ?? "").trim();
  if (!raw) return [];
  return [
    ...new Set(
      raw
        .split(/[,;]/)
        .map((w) => w.trim().toLowerCase())
        .filter(Boolean),
    ),
  ];
}

const BANNED_WORDS = readBannedWords();

/** Collapse any run of the same word-character down to a single copy. */
function collapseRuns(s: string): string {
  let out = "";
  for (const ch of s) {
    if (out && out[out.length - 1] === ch) continue;
    out += ch;
  }
  return out;
}

/**
 * Tolerable edit distance for a banned word, scaled by its length. Short but
 * potent words stay tight (so ordinary English like `as` isn't over-masked)
 * while longer ones still allow a few editorial slips.
 */
function tolerance(len: number): number {
  return Math.max(0, Math.floor(len / 3));
}

/**
 * Classic Levenshtein edit distance between two strings.
 */
function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const prev = new Array(b.length + 1).fill(0).map((_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const curr = new Array(b.length + 1).fill(0);
    curr[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(
        curr[j - 1] + 1, // insertion
        prev[j] + 1, // deletion
        prev[j - 1] + cost, // substitution
      );
    }
    prev.splice(0, prev.length, ...curr);
  }
  return prev[b.length];
}

/**
 * Returns `true` when `candidate` is (case-insensitively) close enough to the
 * banned word to count as a match.
 *
 * Two passes are made:
 *   1. A raw fuzzy comparison scaled to the banned word's length, which catches
 *      simple typos / substitution tricks (`fucck`, `sh1t`, `FUCK`).
 *   2. If the candidate contains doubled/repeated letters (`fuccckk`), the runs
 *      are collapsed and it is compared again, so stretching a word out with
 *      extra repeated letters still triggers a match.
 */
function matches(candidate: string, banned: string): boolean {
  const raw = candidate.toLowerCase();
  const tol = tolerance(banned.length);

  if (levenshtein(raw, banned) <= tol) return true;

  // Doubled-letter obfuscation: `fuccckk` -> `fuck`. Only bother when the
  // candidate is actually stretched (not a plain repeat-less word) so common
  // dictionary tokens with their own legal repeated letters aren't affected.
  const collapsed = collapseRuns(raw);
  if (collapsed !== raw && collapsed.length >= 2) {
    if (levenshtein(collapsed, banned) <= tolerance(collapsed.length)) {
      return true;
    }
  }
  return false;
}

/**
 * Replaces every token that approximates a banned word with asterisks of the
 * same length. Text without any banned-ish token is returned unchanged; an
 * empty dictionary short-circuits for zero overhead.
 */
export function censorText(value: string): string {
  if (!value || BANNED_WORDS.length === 0) return value;

  const censored = new Array<boolean>(value.length).fill(false);
  const tokenRe = /[A-Za-z0-9]+/g;
  let m: RegExpExecArray | null;
  while ((m = tokenRe.exec(value)) !== null) {
    const token = m[0];
    let hit = false;
    for (const banned of BANNED_WORDS) {
      if (matches(token, banned)) {
        hit = true;
        break;
      }
    }
    if (hit) {
      for (let i = m.index; i < m.index + token.length; i++) {
        censored[i] = true;
      }
    }
  }

  // Nothing flagged → short-circuit and return the original reference.
  if (!censored.includes(true)) return value;

  let out = "";
  for (let i = 0; i < value.length; i++) {
    out += censored[i] ? "*" : value[i];
  }
  return out;
}
