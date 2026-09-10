/**
 * PGN clock / time-control extraction.
 *
 * chess.js deliberately drops move comments from its move objects, but it does
 * preserve them when re-serialising (`game.pgn()`), so the raw text is the only
 * reliable source. Clock annotations turn up in several shapes in the wild:
 *
 *   { [%clk 0:05:00] }        Lichess / Chess.com — remaining time after a move
 *   { [%clk 1:30:45.5] }      hours, and tenths of a second
 *   { [%eval 0.2] [%clk …] }  combined with engine annotations
 *   { [%emt 0:00:03] }        elapsed-move-time instead of remaining
 *
 * All of these are normalised into seconds so the UI can render consistently.
 */

/** A parsed clock annotation attached to the move that *preceded* it. */
export interface ClockAnnotation {
  /** Ply index (0-based) of the move this annotation belongs to. */
  ply: number;
  /** Remaining clock time after playing the move, in seconds. */
  remaining: number | null;
  /** Time spent on the move, in seconds (only when `[%emt]` was present). */
  elapsed: number | null;
}

export interface TimeControlInfo {
  /** Initial allotment in seconds, when the header declares one. */
  initial: number | null;
  /** Increment in seconds. */
  increment: number;
  /** Base minutes for display, e.g. `5` for "300+3" or "5+0". */
  label: string | null;
  /** True when the PGN carries a FEN/SetUp start rather than move 1. */
  fromPosition: boolean;
}

/** Matches a `[%clk …]` / `[%emt …]` value, e.g. `0:05:00`, `1:30:45.5`, `300`. */
const CLOCK_TOKEN = /%?(clk|emt)\s+(\d+(?::\d+){0,2}(?:\.\d+)?)/gi;

/** Parse `H:MM:SS`, `M:SS` or plain seconds into seconds. */
function clockToSeconds(raw: string): number | null {
  const parts = raw.split(":").map((p) => Number(p));
  if (parts.some((n) => !Number.isFinite(n))) return null;
  if (parts.length === 1) return parts[0];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return parts[0] * 3600 + parts[1] * 60 + parts[2];
}

/** Format seconds as `M:SS`, or `H:MM:SS` past an hour. */
export function formatClock(seconds: number | null): string {
  if (seconds === null || !Number.isFinite(seconds)) return "—";
  const total = Math.max(0, Math.floor(seconds));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

/**
 * The movetext only — headers stripped — so a `[%clk …]` inside the header
 * block (e.g. a TimeControl tag) is never mistaken for a move annotation.
 */
function movetext(pgn: string): string {
  return pgn
    .split(/\r?\n/)
    .filter((line) => !/^\s*\[/.test(line))
    .join("\n");
}

/**
 * Walk the movetext and attach each clock comment to its move.
 *
 * A comment always follows the move it describes, so the running move counter
 * is incremented as moves are seen and the pending annotation is assigned to
 * the most recently counted ply. Variations in parentheses are skipped so a
 * side line's clock never overwrites the main line's.
 */
export function extractClocks(pgn: string): ClockAnnotation[] {
  const text = movetext(pgn);
  const out: ClockAnnotation[] = [];
  let ply = -1; // index of the last move fully read
  let depth = 0;
  let buffer = "";

  const flush = () => {
    if (!buffer.trim()) {
      buffer = "";
      return;
    }
    if (ply >= 0 && depth === 0) {
      const remaining = /%clk\s+(\d+(?::\d+){0,2}(?:\.\d+)?)/i.exec(buffer);
      const elapsed = /%emt\s+(\d+(?::\d+){0,2}(?:\.\d+)?)/i.exec(buffer);
      if (remaining || elapsed) {
        out.push({
          ply,
          remaining: remaining ? clockToSeconds(remaining[1]) : null,
          elapsed: elapsed ? clockToSeconds(elapsed[1]) : null,
        });
      }
    }
    buffer = "";
  };

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (ch === "{") {
      buffer = "";
      continue;
    }
    if (ch === "}") {
      flush();
      continue;
    }
    if (ch === "(") {
      depth++;
      continue;
    }
    if (ch === ")") {
      depth = Math.max(0, depth - 1);
      continue;
    }

    // Anything inside a brace-comment is collected, not tokenised.
    if (text[i - 1] !== undefined && isInsideComment(text, i)) {
      buffer += ch;
      continue;
    }

    if (ch === ";") {
      // Line comment — skip to end of line.
      while (i < text.length && text[i] !== "\n") i++;
      continue;
    }

    if (/[a-hKQRBNO]/.test(ch) && depth === 0) {
      // A move token starts here. Consume it to avoid counting its inner
      // characters (e.g. the SAN's own digits) as new moves.
      let j = i;
      while (j < text.length && /[^\s{}()]/.test(text[j])) j++;
      const token = text.slice(i, j);
      // Ignore move numbers ("12.", "12...") and results ("1-0", "*").
      const isMoveNumber = /^\d+\.*$/.test(token);
      const isResult = /^(\*|1-0|0-1|1\/2-1\/2|½-½)$/.test(token);
      if (!isMoveNumber && !isResult) ply++;
      i = j - 1;
    }
  }

  return out;
}

/** True when index `i` sits inside an unclosed `{ … }` comment. */
function isInsideComment(text: string, i: number): boolean {
  const open = text.lastIndexOf("{", i);
  const close = text.lastIndexOf("}", i);
  return open > close;
}

/**
 * Read the declared time control from the headers. The `TimeControl` tag is the
 * authoritative form (`"300+3"`, `"300"`, `"40/7200:1800+30"`); failing that,
 * the first `[%clk …]` annotation tells us the base allotment.
 */
export function readTimeControl(
  pgn: string,
  clocks: ClockAnnotation[] = [],
): TimeControlInfo {
  const header = /^\s*\[(TimeControl)\s+"([^"]*)"\]/im.exec(pgn)?.[2] ?? null;
  const fromPosition = /^\s*\[(SetUp|FEN)\s+"/im.test(pgn);

  let initial: number | null = null;
  let increment = 0;

  if (header && header !== "-" && header !== "?") {
    // Take the final stage of a multi-stage control (e.g. "40/7200:1800+30").
    const stage = header.split(":").pop() ?? header;
    const [base, inc] = stage.split("+");
    const baseSeconds = base.includes("/")
      ? Number(base.split("/")[1])
      : Number(base);
    if (Number.isFinite(baseSeconds)) initial = baseSeconds;
    const incSeconds = Number(inc);
    if (Number.isFinite(incSeconds)) increment = incSeconds;
  } else {
    // Infer the base from a first move that still had the full clock.
    const first = clocks.find((c) => c.remaining !== null);
    if (first && first.remaining !== null) initial = first.remaining;
  }

  const label =
    initial === null
      ? null
      : `${Math.round((initial / 60) * 10) / 10}${
          increment ? `+${increment}` : ""
        }`;

  return { initial, increment, label, fromPosition };
}

/** Convenience: everything the UI needs about a recorded game's clocks. */
export interface PgnTimes {
  clocks: ClockAnnotation[];
  /** ply → annotation, for O(1) lookup while stepping. */
  byPly: Map<number, ClockAnnotation>;
  control: TimeControlInfo;
  /** Whether any move carries a usable clock. */
  hasTimes: boolean;
}

export function readPgnTimes(pgn: string): PgnTimes {
  const clocks = extractClocks(pgn);
  const byPly = new Map<number, ClockAnnotation>();
  for (const c of clocks) byPly.set(c.ply, c);
  const control = readTimeControl(pgn, clocks);
  return {
    clocks,
    byPly,
    control,
    hasTimes: clocks.some((c) => c.remaining !== null || c.elapsed !== null),
  };
}
