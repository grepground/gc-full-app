"use client";

import { Chess } from "chess.js";
import { useCallback, useEffect, useRef, useState } from "react";

export interface EvalResult {
  type: "cp" | "mate";
  value: number; // Centipawns (+100 = +1.0) or moves to mate (positive = better for White)
  /**
   * Up to `bestLines` moves Stockfish recommends for the side to move, ordered
   * strongest first. Each entry only describes the first move of the engine's
   * line, so it can be drawn on the current board as an arrow.
   */
  suggestions: { from: string; to: string }[];
  /** True while Stockfish is still searching the current position. */
  thinking: boolean;
  /**
   * True when the position is terminal (checkmate / stalemate / draw), so there
   * is nothing to search. The engine is idle and no arrows are shown.
   */
  gameOver: boolean;
}

const STOCKFISH_URL = "/stockfish.js";

/** Decode a UCI long-algebraic move ("e2e4" / "e7e8q") into square ids. */
function decodeUciMove(uci: string | undefined) {
  if (!uci) return null;
  const from = uci.slice(0, 2);
  const to = uci.slice(2, 4);
  if (from.length !== 2 || to.length !== 2) return null;
  return { from, to };
}

/**
 * Evaluate a position with Stockfish and surface the centipawn/mate score, plus
 * the engine's top candidate moves (already decoded to square ids so the board
 * can render suggestion arrows).
 *
 * The UCI worker is deliberately kept alive for the lifetime of the hook so we
 * don't pay the (multi-MB) JS download cost on every board change. Requests are
 * gated on the worker reporting `readyok`, otherwise the very first `position /
 * go` posted before the engine finished booting would silently be dropped and
 * the eval would stay at 0.0.
 *
 * `bestLines > 1` enables Stockfish's MultiPV so the board can show more than a
 * single candidate. This costs extra search time per position, so the depth is
 * reduced by default to keep forward/back stepping responsive.
 */
export function useStockfish(fen: string, depth = 12, bestLines = 2) {
  const [evaluation, setEvaluation] = useState<EvalResult>({
    type: "cp",
    value: 0,
    suggestions: [],
    thinking: true,
    gameOver: false,
  });

  const workerRef = useRef<Worker | null>(null);
  const readyRef = useRef(false);
  const fenRef = useRef(fen);
  const depthRef = useRef(depth);
  const bestLinesRef = useRef(bestLines);
  const suggestionsRef = useRef<Map<number, { from: string; to: string }>>(
    new Map(),
  );
  const cancelledRef = useRef(false);

  // Keep refs in sync without touching them during render (React hook rules).
  useEffect(() => {
    fenRef.current = fen;
    depthRef.current = depth;
    bestLinesRef.current = bestLines;
  }, [fen, depth, bestLines]);

  // Posts `position fen …` + `go` once the engine is ready. Drops any leftover
  // suggestions from the previous position so stale arrows never linger; the
  // bar itself animates gently to settle on the new position’s score below.
  const requestEval = useCallback(() => {
    const worker = workerRef.current;
    if (!worker || !readyRef.current || cancelledRef.current) return;

    suggestionsRef.current.clear();
    // Drop the outgoing position's arrows right away: the engine may need a
    // moment before it reports the first candidates, and a stale arrow from the
    // previous move would otherwise sit on the new board meanwhile.
    setEvaluation((prev) =>
      prev.suggestions.length || prev.thinking
        ? { ...prev, suggestions: [], thinking: true }
        : prev,
    );
    worker.postMessage("stop");

    // A finished game has no moves to suggest — mate, stalemate and drawn
    // positions all terminate the search instantly. Skipping them avoids a
    // permanent “thinking” state at the end of a game, and clears any arrows
    // that belonged to the last playable position.
    let terminal = false;
    try {
      const position = new Chess(fenRef.current);
      terminal = position.isGameOver();
    } catch {
      terminal = false;
    }
    if (terminal) {
      setEvaluation((prev) => ({
        ...prev,
        suggestions: [],
        thinking: false,
        gameOver: true,
      }));
      return;
    }

    setEvaluation((prev) =>
      prev.gameOver ? { ...prev, gameOver: false } : prev,
    );
    worker.postMessage(`setoption name MultiPV value ${bestLinesRef.current}`);
    worker.postMessage(`position fen ${fenRef.current}`);
    worker.postMessage(`go depth ${depthRef.current}`);
  }, []);

  useEffect(() => {
    const worker = new Worker(STOCKFISH_URL);
    workerRef.current = worker;
    readyRef.current = false;
    cancelledRef.current = false; // allow re-init when the component remounts

    // Rebuild the suggestion arrow list from every MultiPV the engine has
    // reported so far, kept ordered by rank (1 = strongest). Rendered arrows are
    // keyed by "from-to", so identical candidate moves must be de-duplicated to
    // keep the strongest version of each move (and avoid duplicate React keys).
    const publishSuggestions = () => {
      const limit = Math.max(1, bestLinesRef.current);
      const ranks = [...suggestionsRef.current.keys()]
        .filter((k) => k >= 1 && k <= limit)
        .sort((a, b) => a - b)
        .slice(0, limit);
      // Rendered arrows are keyed by "from-to", so duplicate candidate moves
      // must be collapsed to keep the strongest version and avoid duplicate
      // React keys inside react-chessboard's arrow layer.
      const byMove = new Map<string, { from: string; to: string }>();
      for (const k of ranks) {
        const move = suggestionsRef.current.get(k);
        if (!move) continue;
        const key = `${move.from}-${move.to}`;
        if (!byMove.has(key)) byMove.set(key, move); // strongest wins
      }
      const suggestions = [...byMove.values()].slice(0, limit);
      setEvaluation((prev) => ({ ...prev, suggestions, thinking: false }));
    };

    worker.onmessage = (event: MessageEvent) => {
      const line: string = typeof event.data === "string" ? event.data : "";

      if (line.startsWith("uciok")) {
        // Ask the engine to signal readiness before we start analysing.
        worker.postMessage("isready");
        return;
      }

      if (line.startsWith("readyok")) {
        readyRef.current = true;
        requestEval();
        return;
      }

      if (!line.startsWith("info ")) return;

      // Tokenise one `info …` line and pull out the fields we care about:
      //   info depth 11 seldepth 12 multipv 1 score cp 25 pv e2e4 e7e5 …
      const tokens = line.trim().split(/\s+/);
      let rank = 1;
      let lineDepth = 0;
      let pvStart = -1;
      let hasScore = false;
      let scoreType: EvalResult["type"] | null = null;
      let scoreValue = 0;

      for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i];
        if (token === "depth") {
          lineDepth = parseInt(tokens[i + 1], 10) || 0;
          i += 1;
        } else if (token === "multipv") {
          rank = parseInt(tokens[i + 1], 10) || 1;
          i += 1;
        } else if (token === "score") {
          const kind = tokens[i + 1];
          if (kind === "cp" || kind === "mate") {
            scoreType = kind;
            scoreValue = parseInt(tokens[i + 2], 10) || 0;
            hasScore = true;
          }
          i += 2;
        } else if (token === "pv") {
          pvStart = i + 1;
          break;
        }
      }

      // Early shallow scores bounce around before the engine converges, which
      // makes the bar animate wildly. Defer painting until the search has gone
      // reasonably deep (near the requested depth) so the bar only reflects a
      // settled value; a decisive mate is already final.
      const depthFloor = Math.max(4, depthRef.current - 3);
      const barSettled =
        scoreType === "mate" || (hasScore && lineDepth >= depthFloor);
      if (hasScore && lineDepth >= depthRef.current) {
        // The search has reached the requested depth: this is the final score.
        setEvaluation((prev) => ({
          ...prev,
          type: scoreType!,
          value: scoreValue,
          thinking: false,
        }));
      } else if (hasScore && rank === 1 && barSettled) {
        setEvaluation((prev) => ({
          ...prev,
          type: scoreType!,
          value: scoreValue,
        }));
      }

      // Track the surfaced candidate move for each rank.
      const decoded = decodeUciMove(tokens[pvStart]);
      if (decoded) {
        suggestionsRef.current.set(rank, decoded);
        publishSuggestions();
      }
    };

    worker.postMessage("uci");

    return () => {
      // `requestEval` closed over by the same render is still valid here.
      cancelledRef.current = true;
      worker.terminate();
      workerRef.current = null;
      readyRef.current = false;
    };
    // `requestEval` reads the latest refs, so it is intentionally excluded.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When a new position (or depth) arrives, kick off a fresh search.
  useEffect(() => {
    if (readyRef.current) {
      requestEval();
    }
  }, [fen, depth, bestLines, requestEval]);

  return evaluation;
}
