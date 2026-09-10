"use client";

import { EvalResult } from "./useStockfish";
import type { AccuracySide } from "./useGameAccuracy";

interface EvalBarProps {
  evaluation: EvalResult;
  /**
   * Which colour sits on the *bottom* of the board. The bar mirrors that
   * orientation: White’s share always grows against White’s side of the board
   * (bottom when white is bottom, top when the board is flipped to black).
   */
  orientation?: "white" | "black";
  /** Cost of the move that led to this position, in 0..1 pawns. */
  moveLoss?: number | null;
  /** How that move was classified, once the accuracy replay has finished. */
  moveClass?: keyof AccuracySide["counts"] | null;
}

const CLASS_STYLES: Record<
  keyof AccuracySide["counts"],
  { label: string; className: string }
> = {
  best: { label: "Best", className: "bg-emerald-500/15 text-emerald-400" },
  excellent: {
    label: "Excellent",
    className: "bg-emerald-500/10 text-emerald-400/90",
  },
  good: { label: "Good", className: "bg-chess-text/10 text-chess-text/70" },
  inaccuracy: {
    label: "Inaccuracy",
    className: "bg-amber-500/15 text-amber-400",
  },
  mistake: { label: "Mistake", className: "bg-orange-500/15 text-orange-400" },
  blunder: { label: "Blunder", className: "bg-red-500/15 text-red-400" },
};

// Soft, but still responsive, slide so the gauge doesn't snap harshly between
// moves. Applied to the height transitions below.
const MOVE_EASING = "650ms cubic-bezier(0.22, 1, 0.36, 1)";

export function EvalBar({
  evaluation,
  orientation = "white",
  moveLoss = null,
  moveClass = null,
}: EvalBarProps) {
  let whiteWinPercent = 50;
  let textDisplay = "0.0";

  if (evaluation.type === "cp") {
    const val = evaluation.value / 100;
    // Win-probability-ish mapping of a centipawn score (White frame).
    whiteWinPercent =
      50 + 50 * (2 / (1 + Math.exp(-0.004 * evaluation.value)) - 1);
    textDisplay = val > 0 ? `+${val.toFixed(1)}` : val.toFixed(1);
  } else {
    whiteWinPercent = evaluation.value > 0 ? 100 : 0;
    textDisplay = `M${Math.abs(evaluation.value)}`;
  }

  // Portion of the gauge that should sit on the TOP half of the bar. White is
  // always “light” and Black always “dark”; when White sits at the bottom, the
  // top region is Black’s (100 − white), and when flipped it is White’s share.
  const topHeight =
    orientation === "white" ? 100 - whiteWinPercent : whiteWinPercent;

  const colorFor: Record<"white" | "black", string> = {
    white: "#f4efe3", // brand cream — White’s share
    black: "#2a221e", // deep ash — Black’s share
  };

  const topColor = (orientation === "white" ? "black" : "white") as
    "white" | "black";
  const bottomColor = orientation === "white" ? "white" : "black";

  return (
    <div className="flex flex-col items-center gap-2 h-full">
      {moveClass && (
        <span
          className={`w-full rounded-lg px-1.5 py-1 text-center text-[9px] font-black uppercase tracking-wide ${CLASS_STYLES[moveClass].className}`}
          title={
            moveLoss !== null
              ? `${(moveLoss * 100).toFixed(0)} centipawn-equivalent loss`
              : undefined
          }
        >
          {CLASS_STYLES[moveClass].label}
        </span>
      )}

      <div className="relative w-8 flex-1 min-h-[380px] overflow-hidden rounded-xl border border-chess-border/60 bg-chess-bg">
        {/* Top share of the gauge (colour facing the board top). */}
        <div
          className="w-full transition-[height]"
          style={{
            height: `${topHeight}%`,
            transition: `height ${MOVE_EASING}`,
            backgroundColor: colorFor[topColor],
          }}
        />
        {/* Bottom share (colour of whoever sits at the board bottom). */}
        <div
          className="w-full transition-[height]"
          style={{
            height: `${100 - topHeight}%`,
            transition: `height ${MOVE_EASING}`,
            backgroundColor: colorFor[bottomColor],
          }}
        />

        {/* Score caption, pinned near the bottom and legible on either colour. */}
        <span className="pointer-events-none absolute bottom-1.5 left-0 right-0 select-none text-center text-[11px] font-bold text-chess-text mix-blend-difference">
          {textDisplay}
        </span>
      </div>

      {/* Cost of the move that produced this position. Shown once the accuracy
          replay has scored it, so it tracks the reader's steps. */}
      {moveLoss !== null && (
        <span
          className={`w-full rounded-lg py-1 text-center text-[10px] font-black tabular-nums ${
            moveLoss < 0.2
              ? "text-chess-text/40"
              : moveLoss < 0.5
                ? "text-amber-400"
                : moveLoss < 1
                  ? "text-orange-400"
                  : "text-red-400"
          }`}
          title="Pawns of winning chances given away by this move"
        >
          −{moveLoss.toFixed(2)}
        </span>
      )}
    </div>
  );
}
