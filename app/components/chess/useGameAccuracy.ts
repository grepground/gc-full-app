"use client";

import { useEffect, useRef, useState } from "react";
import { Chess } from "chess.js";
import type { Move } from "chess.js";

const STOCKFISH_URL = "/stockfish.js";

/** Plies analysed before accuracy is reported. Keeps a game to one pass. */
const ANNOTATE_DEPTH = 10;

export type AnnotationJob = "idle" | "analyzing" | "done";

export interface AccuracySide {
  /**
   * Average accuracy 0..100 (Lichess-style: mean of exp(-loss/4.35)).
   * Null when the player had no scored move (e.g. an empty or one-move game).
   */
  accuracy: number | null;
  /** Number of that player's moves that contributed to the score. */
  moves: number;
  /** Lichess-style move classification counts for that player. */
  counts: {
    best: number;
    excellent: number;
    good: number;
    inaccuracy: number;
    mistake: number;
    blunder: number;
  };
}

export interface GameAccuracy {
  white: AccuracySide;
  black: AccuracySide;
  /**
   * Per-ply move loss, indexed by ply. `null` where the move could not be
   * scored. Lets the UI show how costly each individual move was.
   */
  losses: (number | null)[];
  /** Per-ply classification, matching `losses`. */
  classes: (keyof AccuracySide["counts"] | null)[];
}

export interface GameAccuracyJob {
  status: AnnotationJob;
  /** Plies finished so far / overall, for a progress read-out. */
  done: number;
  total: number;
  result: GameAccuracy | null;
}

const EMPTY_SIDE = (): AccuracySide => ({
  accuracy: null,
  moves: 0,
  counts: {
    best: 0,
    excellent: 0,
    good: 0,
    inaccuracy: 0,
    mistake: 0,
    blunder: 0,
  },
});

export const EMPTY_ACCURACY: GameAccuracy = {
  white: EMPTY_SIDE(),
  black: EMPTY_SIDE(),
  losses: [],
  classes: [],
};

/**
 * Win probability (0..1) for the side to move at a White-perspective score.
 *
 * Uses the same logistic curve as the eval bar so the two readouts agree. The
 * slope is gentler than the bar's display curve would suggest because accuracy
 * is derived from *differences* in this curve: a steep curve compresses the
 * middle of the range so much that an ordinary 90cp dip reads as a total loss.
 */
function winProbability(cp: number): number {
  const clamped = Math.max(-1200, Math.min(1200, cp));
  return 1 / (1 + Math.exp(-0.0015 * clamped));
}

/**
 * Convert Stockfish scores to centipawns and, crucially, express White's *best
 * achievable* evaluation rather than what actually happened.
 *
 * UCI reports mate scores as a signed distance plus whose turn it is. A move
 * that walks into mate-in-4 while the opponent can mate in 1 in the previous
 * position is a real blunder; without this conversion a mate score would
 * otherwise be compared against a centipawn score of a completely different
 * magnitude.
 */
function scoreToCp(
  type: "cp" | "mate",
  value: number,
  turn: "w" | "b",
): number {
  if (type === "cp") return value;
  const magnitude = Math.min(Math.abs(value), 10);
  const cp = 1000 - magnitude * 50;
  // `value` is always from the side-to-move's view, so flip it when Black is
  // the one to move to bring it back to the White frame.
  return turn === "w" ? cp : -cp;
}

/**
 * The evaluation of the best move available in a position, from White's view.
 *
 * This is the key input to move loss: comparing the position before a move with
 * the position after it measures the *opponent's* reply as well, so a player who
 * simply picks a slightly worse move gets charged for the opponent's discovered
 * improvement. Scoring each position by its own best line isolates the mover's
 * decision.
 */
function bestEvalFor(position: PlyScore): number {
  return position.bestCp;
}

/** A ply's raw analysis, flattened for the two consumers (loss and accuracy). */
interface PlyScore {
  /** Score of the position itself, from White's point of view. */
  cp: number;
  /**
   * Score of the engine's best move from here, from White's point of view.
   * This is what move loss is measured against, not `cp`.
   */
  bestCp: number;
  type: "cp" | "mate";
  value: number;
  /** UCI of the engine's preferred move in this position (null if terminal). */
  best: string | null;
}

/**
 * Lichess accuracy formula: each move contributes exp(-moveLoss / 4.35).
 *
 * `moveLoss` is expressed on 0..1 e-pawns, so a 1.0-pawn error lands around
 * 79% — the shape players know from Lichess/Chess.com. A move that matches the
 * engine's choice is perfect regardless of the swing, which keeps a forced
 * recapture from being punished.
 */
function moveAccuracy(moveLoss: number, matchedBest: boolean): number {
  if (matchedBest) return 100;
  return 100 * Math.exp(-moveLoss / 4.35);
}

/** Classify a move by its 0..1 pawn-equivalent loss, Lichess thresholds. */
function classify(
  moveLoss: number,
  matchedBest: boolean,
): keyof AccuracySide["counts"] {
  if (matchedBest) return "best";
  if (moveLoss < 0.2) return "excellent";
  if (moveLoss < 0.5) return "good";
  if (moveLoss < 1) return "inaccuracy";
  if (moveLoss < 3) return "mistake";
  return "blunder";
}

/** Read `score …` out of a Stockfish `info` line. */
function parseScore(line: string): {
  type: "cp" | "mate";
  value: number;
  depth: number;
} | null {
  const tokens = line.trim().split(/\s+/);
  let type: "cp" | "mate" | null = null;
  let value = 0;
  let depth = 0;
  for (let i = 0; i < tokens.length; i++) {
    if (tokens[i] === "depth") {
      depth = parseInt(tokens[i + 1], 10) || 0;
    } else if (tokens[i] === "score") {
      const kind = tokens[i + 1];
      if (kind === "cp" || kind === "mate") {
        type = kind;
        value = parseInt(tokens[i + 2], 10) || 0;
      }
    }
  }
  return type ? { type, value, depth } : null;
}

/**
 * Extract the full principal variation of a Stockfish `info` line as UCI moves.
 * Needed to replay the engine's best line and read its *second* score, which is
 * the evaluation after the best move (i.e. the value of choosing it).
 */
function parsePv(line: string): string[] {
  const match = /\bpv\s+(.+)$/.exec(line);
  if (!match) return [];
  return match[1].trim().split(/\s+/).filter(Boolean);
}

function decodeUci(uci: string): {
  from: string;
  to: string;
  promotion?: string;
} {
  return {
    from: uci.slice(0, 2),
    to: uci.slice(2, 4),
    promotion: uci.slice(4, 5) || undefined,
  };
}

/** Apply a UCI move to a board, silently ignoring anything unparseable. */
function applyUci(game: Chess, uci: string): boolean {
  try {
    game.move({
      from: uci.slice(0, 2),
      to: uci.slice(2, 4),
      promotion: uci.slice(4, 5) || undefined,
    });
    return true;
  } catch {
    return false;
  }
}

/** FEN after applying `moves[0..count]` to a fresh board. */
function fenAt(moves: Move[], count: number): string {
  const game = new Chess();
  for (let i = 0; i < count; i++) {
    const m = moves[i];
    game.move({ from: m.from, to: m.to, promotion: m.promotion });
  }
  return game.fen();
}

/**
 * Score every position of a recorded game with Stockfish and derive per-player
 * accuracy.
 *
 * The engine walks the game forward one ply at a time, evaluating the position
 * *before* each move. A move's cost is the drop in the mover's win probability,
 * so the analysis is self-contained: each position is searched exactly once and
 * no second engine pass is needed to know what the choice gave away.
 *
 * The search runs at a shallower depth than the live board analysis and yields
 * between plies (`await tick()`) so the UI keeps painting and moving the board
 * doesn't fight a busy worker.
 */
export function useGameAccuracy(
  moves: Move[],
  enabled: boolean,
): GameAccuracyJob {
  const [job, setJob] = useState<GameAccuracyJob>({
    status: "idle",
    done: 0,
    total: 0,
    result: null,
  });

  // Keep the latest move list reachable without making the worker effect re-run
  // (which would tear down and re-spawn the engine on every move).
  const movesRef = useRef(moves);
  useEffect(() => {
    movesRef.current = moves;
  }, [moves]);

  // Bumped by callers through `enabled`; a plain counter forces a full replay.
  const runIdRef = useRef(0);

  useEffect(() => {
    if (!enabled) {
      setJob({ status: "idle", done: 0, total: 0, result: null });
      return;
    }

    const list = movesRef.current;
    if (list.length === 0) {
      setJob({ status: "done", done: 0, total: 0, result: null });
      return;
    }

    const runId = ++runIdRef.current;
    const total = list.length;
    // `total + 1` slots: one score per position the game passes through. The
    // final slot is the position after the last move, which is what the last
    // move's cost is measured against.
    const scores: PlyScore[] = new Array(total + 1);
    // Searches performed, for the progress read-out. The last ply costs an extra
    // search (see below), so this is one more than the ply count.
    const steps = total + 1;
    let worker: Worker | null = null;
    let cancelled = false;

    // The worker's onmessage handler is synchronous, so all communication goes
    // through a serial queue of pending resolvers: each entry is settled by the
    // next `bestmove` (and absorbs the `info` lines leading up to it).
    type Waiter = {
      resolve: (score: PlyScore | null) => void;
      score: { type: "cp" | "mate"; value: number } | null;
      pv: string[];
      turn: "w" | "b";
      depth: number;
      terminal: boolean;
      /** Set once resolved, so a late timeout cannot double-resolve it. */
      settled: boolean;
      timer?: ReturnType<typeof setTimeout>;
    };
    const queue: Waiter[] = [];

    /**
     * Hard cap on a single engine search. Stockfish normally answers a `go depth
     * N` in well under a second at this depth, so a reply that never arrives
     * means the engine died or the position confused it. Without this the whole
     * loop would wait forever on one ply.
     */
    const SEARCH_TIMEOUT_MS = 15000;

    /** Yield a macrotask so React can paint between engine searches. */
    const tick = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

    /**
     * Send `next` and stash its resolver so the trailing `bestmove` settles it.
     *
     * Resolves to null if the engine never answers, so one bad search degrades
     * into a neutral score instead of hanging the whole analysis.
     */
    const request = (
      fen: string,
      next: () => void,
      terminal = false,
    ): Promise<PlyScore | null> => {
      if (!worker || cancelled) return Promise.resolve(null);
      const turn: "w" | "b" = fen.split(" ")[1] === "b" ? "b" : "w";
      return new Promise((resolve) => {
        const waiter: Waiter = {
          resolve,
          score: null,
          pv: [],
          turn,
          depth: 0,
          terminal,
          settled: false,
        };
        queue.push(waiter);

        waiter.timer = setTimeout(() => {
          if (waiter.settled) return;
          waiter.settled = true;
          const index = queue.indexOf(waiter);
          if (index >= 0) queue.splice(index, 1);
          worker?.postMessage("stop");
          resolve(null);
        }, SEARCH_TIMEOUT_MS);

        next();
      });
    };

    /**
     * Value of the engine's best move in a position, from White's view.
     *
     * Move loss must compare the position against what a perfect player would
     * have reached, not against what actually happened after the opponent
     * replied. `position fen … moves <best>` asks Stockfish to apply the best
     * move and score the resulting position, so the answer accounts for the
     * opponent's best response too.
     */
    const bestMoveEval = async (
      fen: string,
      bestUci: string | null,
    ): Promise<number | null> => {
      if (!bestUci) return null;
      const next = await request(fen, () => {
        worker!.postMessage(`position fen ${fen} moves ${bestUci}`);
        worker!.postMessage(`go depth ${ANNOTATE_DEPTH}`);
      });
      return next ? next.cp : null;
    };

    /**
     * Search one position while Stockfish is *free to move* (not in checkmate),
     * and return both the position's score and, separately, the score after the
     * engine's own best move. The pair is what isolates move quality.
     */
    const analysePly = async (fen: string): Promise<PlyScore> => {
      const terminal = new Chess(fen).isGameOver();
      if (terminal) {
        // A finished game has nothing to search. Whatever score the previous
        // ply left behind already describes this terminal state, so keep it
        // instead of zeroing it — zeroing would erase the very loss that
        // delivering (or missing) mate should be credited with.
        return { cp: 0, bestCp: 0, type: "cp", value: 0, best: null };
      }

      const raw = await request(fen, () => {
        worker!.postMessage(`position fen ${fen}`);
        worker!.postMessage(`go depth ${ANNOTATE_DEPTH}`);
      });
      const entry: PlyScore = raw ?? {
        cp: 0,
        bestCp: 0,
        type: "cp",
        value: 0,
        best: null,
      };
      if (cancelled) return entry;

      // Second search: what does the engine's chosen move actually achieve?
      // Comparing against the played move's resulting position instead would
      // silently charge the mover for the opponent's reply too.
      if (entry.best) {
        const bestCp = await bestMoveEval(fen, entry.best);
        if (bestCp !== null) entry.bestCp = bestCp;
      }
      return entry;
    };

    const run = async () => {
      try {
        // Each ply needs two numbers to judge the move played: the position's
        // own score, and what a perfect player would have achieved from it.
        //
        // The loop runs to `total` (one past the last move) so that a game
        // ending in checkmate is judged too: the score after the final move is
        // known — the position is terminal — and only the value of what the
        // winner *could* have played still needs a search.
        for (let i = 0; i < total; i++) {
          if (cancelled) return;
          const fen = fenAt(list, i);
          const terminal = new Chess(fen).isGameOver();

          let entry: PlyScore;
          if (terminal) {
            entry = { cp: 0, bestCp: 0, type: "cp", value: 0, best: null };
          } else {
            entry = await analysePly(fen);
          }
          if (cancelled) return;

          // The final ply is a theoretical move that was never played, but its
          // *value* is what the move before it should be measured against —
          // this is the baseline for the last real move. Search it on the board
          // as it stands (the mover stayed on turn).
          if (i === total - 1 && !terminal) {
            const played = list[i];
            const playedCp = await bestMoveEval(
              fen,
              `${played.from}${played.to}${played.promotion ?? ""}`,
            );
            if (cancelled) return;
            if (playedCp !== null) entry.cp = playedCp;
          }

          scores[i] = entry;

          if (runId === runIdRef.current) {
            setJob({
              status: "analyzing",
              done: i + 1,
              total: steps,
              result: null,
            });
          }
          await tick();
        }

        if (cancelled || runId !== runIdRef.current) return;

        // --- Reduce the ply scores into per-side accuracy ---
        const sides: Record<"w" | "b", AccuracySide> = {
          w: EMPTY_SIDE(),
          b: EMPTY_SIDE(),
        };
        const sums: Record<"w" | "b", number> = { w: 0, b: 0 };
        const losses: (number | null)[] = new Array(total).fill(null);
        const classes: (keyof AccuracySide["counts"] | null)[] = new Array(
          total,
        ).fill(null);

        for (let i = 0; i < total; i++) {
          const mover: "w" | "b" = i % 2 === 0 ? "w" : "b";
          const before = scores[i];
          const after = scores[i + 1];
          if (!before || !after) continue;

          // Evaluate both candidate continuations from the mover's own seat.
          // `flip` converts the White-perspective centipawns into win
          // probability for whoever is on move.
          const flip = mover === "w" ? 1 : -1;
          const played = list[i];
          const playedUci = `${played.from}${played.to}${played.promotion ?? ""}`;
          const matchedBest =
            !!before.best && playedUci.startsWith(before.best);

          // Loss = (what the best move was worth) − (what the played move was
          // worth), both measured on the mover's own scale. Comparing the
          // before/after positions instead would fold in the opponent's best
          // reply, systematically understating errors.
          const pBest = winProbability(before.bestCp * flip);
          const pPlayed = winProbability(after.cp * flip);
          const moveLoss = Math.max(0, (pBest - pPlayed) * 100);

          const side = sides[mover];
          const kind = classify(moveLoss, matchedBest);
          side.moves += 1;
          side.counts[kind] += 1;
          sums[mover] += moveAccuracy(moveLoss, matchedBest);
          losses[i] = moveLoss;
          classes[i] = kind;
        }

        for (const key of ["w", "b"] as const) {
          const side = sides[key];
          side.accuracy = side.moves > 0 ? sums[key] / side.moves : null;
        }

        setJob({
          status: "done",
          done: steps,
          total: steps,
          result: { white: sides.w, black: sides.b, losses, classes },
        });
      } catch (error) {
        console.error("Accuracy analysis failed:", error);
        if (!cancelled && runId === runIdRef.current) {
          setJob({ status: "idle", done: 0, total: 0, result: null });
        }
      }
    };

    worker = new Worker(STOCKFISH_URL);
    worker.onmessage = (event: MessageEvent) => {
      const line: string = typeof event.data === "string" ? event.data : "";

      if (line.startsWith("uciok")) {
        worker!.postMessage("isready");
        return;
      }
      if (line.startsWith("readyok")) {
        void run();
        return;
      }

      if (line.startsWith("info ")) {
        const waiter = queue[0];
        if (!waiter) return;
        const parsed = parseScore(line);
        // Keep the deepest score Stockfish has reported for this position.
        if (parsed && parsed.depth >= waiter.depth) {
          waiter.score = { type: parsed.type, value: parsed.value };
          waiter.depth = parsed.depth;
        }
        const best = parsePv(line)[0] ?? null;
        if (best) waiter.pv = [best];
        return;
      }

      if (line.startsWith("bestmove")) {
        const waiter = queue.shift();
        if (!waiter || waiter.settled) return;
        waiter.settled = true;
        if (waiter.timer) clearTimeout(waiter.timer);
        const uciBest = line.trim().split(/\s+/)[1] ?? null;
        const type = waiter.score?.type ?? "cp";
        const value = waiter.score?.value ?? 0;
        // Normalise into the White frame here, where the position (and so whose
        // turn it is) is still in hand, so every consumer downstream compares
        // scores on the same scale.
        const cp = scoreToCp(type, value, waiter.turn);
        waiter.resolve({
          cp,
          bestCp: cp,
          type,
          value,
          best:
            waiter.pv[0] ?? (uciBest && uciBest !== "(none)" ? uciBest : null),
        });
      }
    };

    worker.postMessage("uci");

    return () => {
      cancelled = true;
      for (const waiter of queue) {
        waiter.settled = true;
        if (waiter.timer) clearTimeout(waiter.timer);
      }
      queue.length = 0;
      worker?.terminate();
      worker = null;
    };
  }, [enabled]);

  return job;
}
