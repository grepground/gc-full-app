"use client";

import { useMemo, useState } from "react";
import { Chess } from "chess.js";
import type { Move, Square } from "chess.js";
import { Chessboard } from "react-chessboard";
import type { PieceRenderObject } from "react-chessboard";
import { useStockfish } from "./useStockfish";
import { useGameAccuracy } from "./useGameAccuracy";
import { AccuracyPanel, PlayerStrip } from "./PlayerPanel";
import type { PlayerInfo } from "./PlayerPanel";
import { EvalBar } from "./EvalBar";
import { formatClock, readPgnTimes } from "./pgnClocks";

const PIECE_NAMES = [
  "bB",
  "bK",
  "bN",
  "bP",
  "bQ",
  "bR",
  "wB",
  "wK",
  "wN",
  "wP",
  "wQ",
  "wR",
] as const;

// Board squares are tinted from the app's palette: the cream text/base tone on
// the light squares and the moss green primary on the dark ones. Arrows are a
// warm gold accent so they stand out clearly against both the cream and green
// squares. Ranking is conveyed through opacity (strongest line most opaque).
const LIGHT_SQUARE_COLOR = "#ece2c6";
const DARK_SQUARE_COLOR = "#4e8454";
const ARROW_COLORS = ["rgba(255, 193, 66, 0.95)", "rgba(255, 193, 66, 0.5)"];

interface ChessGameProps {
  /** Load a game from PGN for review/analysis. */
  pgn?: string;
  /**
   * The colour the signed-in player held in this recorded game. The board
   * starts facing that side (steady for the whole review); the user may still
   * flip it freely. When omitted (no known player) it defaults to White.
   */
  playerColor?: "white" | "black";
  /** Both players' display names, read from the PGN header. */
  whiteName?: string;
  blackName?: string;
  /** Ratings from the game list, when the provider supplied them. */
  whiteRating?: number;
  blackRating?: number;
  /**
   * Render the Stockfish evaluation bar beside the board.
   *
   * Off by default: the bar is a strong visual claim about a position, so pages
   * that are purely about replaying a record (e.g. the PGN analyzer) opt out and
   * keep the focus on the arrows and clocks.
   */
  showEvalBar?: boolean;
}

/** Return the ordered SAN moves of a PGN, or null when it fails to parse. */
function parsePgnMoves(pgn: string): Move[] | null {
  const game = new Chess();
  try {
    game.loadPgn(pgn);
    return game.history({ verbose: true });
  } catch {
    return null;
  }
}

/**
 * An optional divergence the user explored from the recorded game. The recorded
 * PGN (`moves`) is never mutated: once the user plays a new move at recorded ply
 * index `at`, `path` holds that experiment (and any follow-ups they add), which
 * is overlaid on the pristine recorded prefix while stepping through it.
 */
type Overlay = { at: number; path: Move[] };

/** Distinct identity for a move when comparing against the recorded line. */
const moveKey = (m: Pick<Move, "from" | "to" | "promotion">) =>
  `${m.from}>${m.to}>${m.promotion || ""}`;

/** Number of plies currently available to step through. */
function sessionLength(moves: Move[], overlay: Overlay | null): number {
  return overlay ? overlay.at + overlay.path.length : moves.length;
}

/** The move displayed at session ply `p` (recorded or explored). */
function sessionMove(moves: Move[], overlay: Overlay | null, p: number) {
  if (overlay && p >= overlay.at) return overlay.path[p - overlay.at] ?? null;
  return moves[p] ?? null;
}

/** FEN at session ply `p`, where explored moves replace the recorded tail. */
function sessionAt(moves: Move[], overlay: Overlay | null, p: number): string {
  const game = new Chess();
  if (overlay) {
    const toPrefix = Math.min(p, overlay.at);
    for (let i = 0; i < toPrefix; i++) {
      const m = moves[i];
      game.move({ from: m.from, to: m.to, promotion: m.promotion });
    }
    const played = Math.max(0, p - overlay.at);
    for (let i = 0; i < played; i++) {
      const m = overlay.path[i];
      game.move({ from: m.from, to: m.to, promotion: m.promotion });
    }
  } else {
    for (let i = 0; i < p; i++) {
      const m = moves[i];
      game.move({ from: m.from, to: m.to, promotion: m.promotion });
    }
  }
  return game.fen();
}

export default function ChessGame({
  pgn,
  playerColor,
  whiteName,
  blackName,
  whiteRating,
  blackRating,
  showEvalBar = false,
}: ChessGameProps) {
  const { moves, invalid } = useMemo(() => {
    if (!pgn) return { moves: [] as Move[], invalid: false };
    const parsed = parsePgnMoves(pgn);
    return { moves: parsed ?? [], invalid: parsed === null };
  }, [pgn]);

  // Clock annotations and the declared time control, straight from the PGN.
  // Empty for an untimed record, in which case no clock UI is rendered at all.
  const times = useMemo(
    () => (pgn && !invalid ? readPgnTimes(pgn) : null),
    [pgn, invalid],
  );

  // The pristine, recorded game. During analysis you may step through it freely
  // or drag your own moves; a deviation is kept as an `overlay` on the untouched
  // prefix, so rewinding simply falls back onto the correct recorded data.
  const [ply, setPly] = useState(0); // cursor into the session / exploration
  const [overlay, setOverlay] = useState<Overlay | null>(null);

  // Board perspective. Starts from the player's own side (the side this person
  // played in the recorded game); staying stable means stepping through the
  // game never flips it. The toolbar button toggles it whenever desired.
  const [orientation, setOrientation] = useState<"white" | "black">(
    playerColor ?? "white",
  );
  const flipBoard = () =>
    setOrientation((current) => (current === "white" ? "black" : "white"));

  const total = sessionLength(moves, overlay);
  const displayFen = useMemo(() => {
    if (!pgn || invalid) return new Chess().fen();
    return sessionAt(moves, overlay, ply);
  }, [pgn, invalid, moves, overlay, ply]);

  const evaluation = useStockfish(displayFen);

  const exploring = !!overlay && ply >= overlay.at;

  // Display identities for both sides. Names come from the game list (PGN
  // headers) with sane fallbacks, so an unlabelled game still reads correctly.
  const players = useMemo(
    () => ({
      white: {
        name: whiteName?.trim() || "White",
        rating: whiteRating,
        color: "white" as const,
      },
      black: {
        name: blackName?.trim() || "Black",
        rating: blackRating,
        color: "black" as const,
      },
    }),
    [whiteName, blackName, whiteRating, blackRating],
  );

  const turn = useMemo(() => {
    try {
      return new Chess(displayFen).turn();
    } catch {
      return "w" as const;
    }
  }, [displayFen]);

  /**
   * The outcome of the finished game at the current position, or null while the
   * game is still in progress. Distinguishes *when* a game ended (this position
   * is terminal) from *who won*, so the UI can announce a winner instead of only
   * saying “Checkmate”.
   */
  const outcome = useMemo<{
    title: string;
    winner: "white" | "black" | null;
    detail: string;
  } | null>(() => {
    if (invalid) return null;
    if (!total || ply < total) return null;
    const g = new Chess(displayFen);
    if (g.isCheckmate()) {
      // The side to move is the one that got mated.
      const winner = g.turn() === "w" ? "black" : "white";
      return {
        title: `${winner === "white" ? "White" : "Black"} wins`,
        winner,
        detail: "by checkmate",
      };
    }
    if (g.isStalemate()) {
      return { title: "Draw", winner: null, detail: "by stalemate" };
    }
    if (g.isThreefoldRepetition()) {
      return { title: "Draw", winner: null, detail: "by repetition" };
    }
    if (g.isInsufficientMaterial()) {
      return {
        title: "Draw",
        winner: null,
        detail: "insufficient material",
      };
    }
    if (g.isDraw()) {
      return { title: "Draw", winner: null, detail: "by the fifty-move rule" };
    }
    return null;
  }, [invalid, total, ply, displayFen]);

  const lastMove = ply > 0 ? sessionMove(moves, overlay, ply - 1) : null;

  // Score the whole recorded game once, when the reader reaches the end. The
  // result is informational, so it is only started on demand rather than on
  // every page open.
  const atEnd = !!total && ply >= total;
  const accuracy = useGameAccuracy(
    moves,
    atEnd && !invalid && moves.length > 0,
  );

  // Per-ply accuracy data, once the replay has finished. Only meaningful for
  // the recorded line, so it is ignored while the user explores their own moves.
  const plyLoss =
    !exploring && accuracy.result ? accuracy.result.losses[ply - 1] : null;
  const plyClass =
    !exploring && accuracy.result ? accuracy.result.classes[ply - 1] : null;

  // The clock values for the current step: the time each side had *after* this
  // move, falling back to the rating panel when the record carries no clocks.
  const clockFor = (color: "white" | "black") => {
    if (!times?.hasTimes || ply === 0) return null;
    const mover = ply % 2 === 1 ? "white" : "black";
    if (mover !== color) return null;
    const annotation = times.byPly.get(ply - 1);
    return annotation?.remaining ?? null;
  };

  // Stockfish's suggested moves drawn as arrows on the board. While the engine
  // is still thinking about a position we deliberately draw nothing, so the
  // arrows from the previous move never linger over the new one. A finished game
  // has no suggestions at all, so the board stays clean there too.
  const suggestionArrows = useMemo(() => {
    if (evaluation.thinking || evaluation.gameOver) return [];
    return evaluation.suggestions.map((s, i) => ({
      startSquare: s.from,
      endSquare: s.to,
      color: ARROW_COLORS[i % ARROW_COLORS.length],
    }));
  }, [evaluation.suggestions, evaluation.thinking, evaluation.gameOver]);

  const customPieces = useMemo<PieceRenderObject>(() => {
    const piecesMap: PieceRenderObject = {};
    PIECE_NAMES.forEach((piece) => {
      piecesMap[piece] = () => (
        // next/image fails to size here: the piece must fill the responsive
        // square box created by react-chessboard, so a raw <img> is required.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`/pieces/${piece}.svg`}
          alt={piece}
          draggable={false}
          className="select-none object-contain"
          style={{ width: "100%", height: "100%" }}
        />
      );
    });
    return piecesMap;
  }, []);

  /**
   * Validate + commit a move the user plays on the board.
   *
   * If it simply continues the recorded main line we fast-path a regular
   * forward step. Anything else starts (or extends) one exploration `overlay`;
   * the recorded PGN is left untouched so rewinding returns to correct data.
   */
  const commitBoardMove = (fromSquare: string, toSquare: string): boolean => {
    if (invalid) return false;
    const g = new Chess(displayFen);
    const candidates = (
      g.moves({ square: fromSquare as Square, verbose: true }) as Move[]
    ).filter((m) => m.to === toSquare);
    const chosen =
      candidates.find((m) => !m.promotion) ??
      candidates.find((m) => m.promotion === "q") ??
      candidates[0];
    if (!chosen) return false;

    // Continuing the untouched recorded game? Just step forward.
    if (
      !overlay &&
      ply < moves.length &&
      moveKey(moves[ply]) === moveKey(chosen)
    ) {
      setPly(ply + 1);
      return true;
    }

    const newPly = ply + 1;
    setOverlay((prev) => {
      if (prev === null) return { at: ply, path: [chosen] };
      if (ply < prev.at) {
        // Rewound before the earlier experiment: begin a fresh overlay here.
        return { at: ply, path: [chosen] };
      }
      const keep = prev.path.slice(0, ply - prev.at);
      keep.push(chosen);
      return { at: prev.at, path: keep };
    });
    setPly(newPly);
    return true;
  };

  // Step back one ply. If that rewind leaves the user's exploration entirely
  // (crossing back below where it began), drop the overlay so continuing forward
  // replays the genuine recorded moves instead of the experiment.
  const stepBack = () => {
    const target = Math.max(0, ply - 1);
    if (overlay && target < overlay.at) setOverlay(null);
    setPly(target);
  };

  const moveLabel =
    !pgn || invalid
      ? "—"
      : ply === 0
        ? moves.length
          ? "Start position"
          : "Empty game (no moves)"
        : `${Math.ceil(ply / 2)}${ply % 2 === 1 ? "." : "…"} ${lastMove?.san ?? ""}`;

  return (
    <div className="flex flex-col lg:flex-row gap-5 items-start justify-center">
      <div className="flex gap-3 items-center justify-center">
        <div className="flex flex-col items-center gap-2.5 w-[min(90vw,520px)]">
          {/* Names follow the board: the side sitting at the top is listed
              above the board, whichever colour it is after a flip. */}
          <div className="w-full">
            <PlayerStrip
              player={orientation === "white" ? players.black : players.white}
              active={
                !outcome &&
                (orientation === "white" ? turn === "b" : turn === "w")
              }
              winner={
                outcome?.winner
                  ? outcome.winner ===
                    (orientation === "white" ? "black" : "white")
                  : false
              }
              clock={
                orientation === "white" ? clockFor("black") : clockFor("white")
              }
            />
          </div>

          <div className="w-full flex gap-2.5 items-stretch">
            {/* Eval bar mirrors the board: it sits beside it and flips with it.
                Only shown where the page asks for it. */}
            {showEvalBar && (
              <div className="shrink-0">
                <EvalBar
                  evaluation={evaluation}
                  orientation={orientation}
                  moveLoss={plyLoss}
                  moveClass={plyClass}
                />
              </div>
            )}
            <div className="flex-1 aspect-square min-w-0">
              <Chessboard
                options={{
                  position: displayFen,
                  allowDragging: true,
                  allowDragOffBoard: false,
                  pieces: customPieces,
                  arrows: suggestionArrows,
                  onPieceDrop: ({ sourceSquare, targetSquare }) =>
                    targetSquare
                      ? commitBoardMove(sourceSquare, targetSquare)
                      : false,
                  boardOrientation: orientation,
                  boardStyle: {
                    borderRadius: "12px",
                    // Flat ring instead of a lifted shadow to match app aesthetic.
                    boxShadow: "0 0 0 1px var(--color-chess-border)",
                    overflow: "hidden",
                  },
                  darkSquareStyle: { backgroundColor: DARK_SQUARE_COLOR },
                  lightSquareStyle: { backgroundColor: LIGHT_SQUARE_COLOR },
                  darkSquareNotationStyle: {
                    color: "rgba(244, 239, 227, 0.85)",
                    fontSize: "clamp(9px, 1.5vw, 12px)",
                    fontWeight: 700,
                  },
                  lightSquareNotationStyle: {
                    color: "rgba(30, 29, 26, 0.55)",
                    fontSize: "clamp(9px, 1.5vw, 12px)",
                    fontWeight: 700,
                  },
                  arrowOptions: {
                    arrowWidthDenominator: 6,
                    arrowLengthReducerDenominator: 8,
                    sameTargetArrowLengthReducerDenominator: 8,
                    colors: {
                      default: "rgba(255,193,66,0.6)",
                      shift: "rgba(255,145,40,0.6)",
                      ctrl: "rgba(255,220,120,0.6)",
                      alt: "rgba(255,180,80,0.6)",
                      meta: "rgba(255,210,90,0.6)",
                    },
                    // Deprecated aliases — still referenced by the type, kept as the
                    // gold used by freshly drawn arrows.
                    color: "rgba(255,193,66,0.9)",
                    secondaryColor: "rgba(255,145,40,0.9)",
                    tertiaryColor: "rgba(255,220,120,0.9)",
                    activeArrowWidthMultiplier: 1,
                    opacity: 1,
                    activeOpacity: 1,
                    arrowStartOffset: 0,
                  },
                }}
              />
            </div>
          </div>

          <div className="w-full">
            <PlayerStrip
              player={orientation === "white" ? players.white : players.black}
              active={
                !outcome &&
                (orientation === "white" ? turn === "w" : turn === "b")
              }
              winner={
                outcome?.winner
                  ? outcome.winner ===
                    (orientation === "white" ? "white" : "black")
                  : false
              }
              clock={
                orientation === "white" ? clockFor("white") : clockFor("black")
              }
            />
          </div>

          <button
            type="button"
            onClick={flipBoard}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-chess-surface text-xs font-black uppercase tracking-wide text-chess-text/70 hover:text-chess-primary transition-colors cursor-pointer"
            aria-label="Flip board orientation"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5"
              />
            </svg>
            Flip · view from {orientation === "white" ? "White" : "Black"}
          </button>
        </div>
      </div>

      <div className="w-full max-w-md space-y-3">
        <div className="space-y-1">
          <div className="text-xs font-black uppercase tracking-wider text-chess-primary">
            ♟️ Move Analysis
          </div>
          <p className="text-sm font-bold text-chess-text/60">
            Drag any piece to explore your own lines — then rewind: you always
            land back on the recorded game, never on analysis steps.
            {!atEnd &&
              " Reach the final move to have Stockfish replay the game and score both sides."}
          </p>
          <div
            className="flex items-center gap-2 pt-1 text-xs font-black uppercase tracking-wide text-chess-text/60"
            aria-live="polite"
          >
            <span
              className={`w-3 h-3 rounded-full border-2 border-chess-primary/25 border-t-chess-primary ${
                evaluation.thinking ? "animate-spin" : "opacity-0"
              }`}
            />
            <span className={evaluation.thinking ? "text-chess-primary" : ""}>
              {evaluation.thinking
                ? "Stockfish thinking…"
                : evaluation.gameOver
                  ? "Game over — no moves to suggest"
                  : "Stockfish ready"}
            </span>
          </div>
        </div>

        {outcome && (
          <div
            className={`rounded-2xl p-4 ring-1 animate-[fade-up_0.4s_ease-out] ${
              outcome.winner === "white"
                ? "bg-chess-text/8 ring-chess-text/15"
                : outcome.winner === "black"
                  ? "bg-black/30 ring-chess-border/40"
                  : "bg-chess-primary/8 ring-chess-primary/20"
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl" aria-hidden>
                {outcome.winner ? "🏁" : "🤝"}
              </span>
              <div className="min-w-0">
                <div className="text-base font-black text-chess-text">
                  {outcome.title}
                </div>
                <div className="text-xs font-bold text-chess-text/50">
                  {outcome.detail}
                </div>
              </div>
              {outcome.winner && (
                <span
                  className={`ml-auto shrink-0 w-5 h-5 rounded-full border-2 ${
                    outcome.winner === "white"
                      ? "bg-chess-text border-chess-border"
                      : "bg-[#2a221e] border-chess-border"
                  }`}
                  aria-label={`${outcome.winner} pieces`}
                />
              )}
            </div>
          </div>
        )}

        <AccuracyPanel job={accuracy} players={players} willAnalyze={atEnd} />

        <div className="rounded-2xl bg-chess-surface p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={stepBack}
              disabled={ply === 0 || invalid}
              className="px-3 py-2 rounded-xl bg-chess-bg font-black text-sm transition-colors hover:bg-chess-primary/20 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
            >
              ← Prev
            </button>
            <div className="text-sm font-black text-chess-text tabular-nums">
              {total ? `${ply} / ${total}` : "—"}
              {exploring && (
                <span className="block text-center text-[10px] font-black uppercase tracking-wide text-chess-primary mt-0.5">
                  exploring
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={() => setPly((v) => Math.min(total, v + 1))}
              disabled={ply === total || invalid}
              className="px-3 py-2 rounded-xl bg-chess-bg font-black text-sm transition-colors hover:bg-chess-primary/20 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
            >
              Next →
            </button>
          </div>

          <div className="rounded-xl bg-chess-bg/60 px-3 py-2 text-sm font-bold text-chess-text/80 text-center wrap-break-word">
            {invalid
              ? "This game record couldn’t be loaded."
              : `${moveLabel}${outcome ? ` · ${outcome.title}` : ""}`}
          </div>

          {/* Cost of the move that led here, once the accuracy replay has scored
              it. Shown in the panel (not only on the eval bar) so the read-out
              is available even where the bar is hidden. */}
          {plyClass && plyLoss !== null && !exploring && (
            <div className="flex items-center justify-center gap-2 text-[11px] font-black">
              <span
                className={`rounded-lg px-2 py-0.5 uppercase tracking-wide ${
                  plyClass === "blunder"
                    ? "bg-red-500/15 text-red-400"
                    : plyClass === "mistake"
                      ? "bg-orange-500/15 text-orange-400"
                      : plyClass === "inaccuracy"
                        ? "bg-amber-500/15 text-amber-400"
                        : "bg-chess-text/10 text-chess-text/60"
                }`}
              >
                {plyClass}
              </span>
              <span className="text-chess-text/40 tabular-nums">
                −{plyLoss.toFixed(2)} pawns
              </span>
            </div>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setOverlay(null); // discard user exploration, back to recorded
                setPly(0);
              }}
              disabled={invalid}
              className="flex-1 px-3 py-2 rounded-xl border border-chess-text/20 text-xs font-black uppercase tracking-wide text-chess-text/70 hover:border-chess-primary/60 hover:text-chess-primary transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Start
            </button>
            <button
              type="button"
              onClick={() => {
                setOverlay(null); // discard exploration when jumping to the end
                setPly(total);
              }}
              disabled={invalid || total === 0}
              className="flex-1 px-3 py-2 rounded-xl border border-chess-text/20 text-xs font-black uppercase tracking-wide text-chess-text/70 hover:border-chess-primary/60 hover:text-chess-primary transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              End
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
