"use client";

import React from "react";
import type { AccuracySide, GameAccuracyJob } from "./useGameAccuracy";
import { formatClock } from "./pgnClocks";

export interface PlayerInfo {
  name: string;
  rating?: number;
  color: "white" | "black";
}

/** Short label for a side, used in headings and result text. */
export const sideLabel = (color: "white" | "black") =>
  color === "white" ? "White" : "Black";

/**
 * A compact identity chip for one player, drawn next to the board.
 *
 * `active` highlights whoever is to move in the current position, which is the
 * fastest way to read “whose turn is it” while stepping through a game.
 */
export function PlayerStrip({
  player,
  active,
  winner,
  clock,
}: {
  player: PlayerInfo;
  active: boolean;
  winner?: boolean | null;
  /** Seconds left on this player's clock at the current step, if timed. */
  clock?: number | null;
}) {
  const isWhite = player.color === "white";
  return (
    <div
      className={`flex items-center gap-2.5 rounded-xl px-3 py-2 ring-1 transition-colors ${
        active
          ? "bg-chess-primary/10 ring-chess-primary/40"
          : "bg-chess-surface ring-chess-border/20"
      }`}
    >
      <span
        aria-hidden
        className={`w-4 h-4 shrink-0 rounded-full border ${
          isWhite
            ? "bg-chess-text border-chess-border"
            : "bg-[#2a221e] border-chess-border"
        }`}
      />
      <span className="min-w-0 flex-1 truncate text-xs font-black text-chess-text">
        {player.name}
      </span>
      {typeof player.rating === "number" && (
        <span className="shrink-0 text-[11px] font-black text-chess-text/40 tabular-nums">
          {player.rating}
        </span>
      )}
      {typeof clock === "number" && (
        <span
          className={`shrink-0 rounded-lg px-2 py-0.5 text-xs font-black tabular-nums transition-colors ${
            active
              ? "bg-chess-bg text-chess-primary"
              : "bg-chess-bg/60 text-chess-text/70"
          } ${
            clock <= 30 ? "text-red-400" : clock <= 60 ? "text-amber-400" : ""
          }`}
        >
          {formatClock(clock)}
        </span>
      )}
      {winner && (
        <span className="shrink-0 text-xs" aria-label="Winner">
          👑
        </span>
      )}
      {active && !winner && (
        <span className="shrink-0 text-[9px] font-black uppercase tracking-wide text-chess-primary">
          to move
        </span>
      )}
    </div>
  );
}

/** Percentage of a side's moves that were best or near-best. */
function accuracyTone(accuracy: number | null): string {
  if (accuracy === null) return "text-chess-text/40";
  if (accuracy >= 90) return "text-emerald-400";
  if (accuracy >= 75) return "text-chess-primary";
  if (accuracy >= 60) return "text-amber-400";
  return "text-red-400";
}

const CLASS_ROWS: {
  key: keyof AccuracySide["counts"];
  label: string;
  className: string;
}[] = [
  { key: "best", label: "Best", className: "text-emerald-400" },
  { key: "excellent", label: "Excellent", className: "text-emerald-400/80" },
  { key: "good", label: "Good", className: "text-chess-text/60" },
  { key: "inaccuracy", label: "Inaccuracy", className: "text-amber-400" },
  { key: "mistake", label: "Mistake", className: "text-orange-400" },
  { key: "blunder", label: "Blunder", className: "text-red-400" },
];

function SideAccuracy({
  side,
  accuracy,
}: {
  side: AccuracySide;
  accuracy: number | null;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-baseline gap-1">
        <span
          className={`text-2xl font-black tabular-nums ${accuracyTone(accuracy)}`}
        >
          {accuracy === null ? "—" : accuracy.toFixed(1)}
        </span>
        {accuracy !== null && (
          <span className="text-xs font-black text-chess-text/40">%</span>
        )}
      </div>
      <div className="space-y-0.5">
        {CLASS_ROWS.filter((row) => side.counts[row.key] > 0).map((row) => (
          <div
            key={row.key}
            className="flex items-center justify-between gap-3 text-[11px] font-bold"
          >
            <span className={row.className}>{row.label}</span>
            <span className="text-chess-text/50 tabular-nums">
              {side.counts[row.key]}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Post-game accuracy read-out: Stockfish replays the recorded game and reports
 * how precisely each side played, alongside a per-move classification count.
 */
export function AccuracyPanel({
  job,
  players,
  willAnalyze,
}: {
  job: GameAccuracyJob;
  players: { white: PlayerInfo; black: PlayerInfo };
  /**
   * The game is over, so a replay is either running or waiting to start. Used
   * to announce the upcoming analysis before any progress exists, so reaching
   * the final move doesn't look like the page has finished with nothing to show.
   */
  willAnalyze: boolean;
}) {
  // Nothing to say yet: the game is still in progress and no replay has run.
  if (job.status === "idle" && !willAnalyze) return null;

  const accuracy = job.result;
  const percent = job.total > 0 ? Math.round((job.done / job.total) * 100) : 0;
  const starting = job.status === "idle";

  return (
    <div className="rounded-2xl bg-chess-surface ring-1 ring-chess-border/15 p-4 space-y-4 animate-[fade-up_0.4s_ease-out]">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-xs font-black uppercase tracking-wider text-chess-primary">
          ♟️ Accuracy
        </h3>
        {job.status === "analyzing" && (
          <span className="flex items-center gap-2 text-[11px] font-black text-chess-text/50">
            <span className="w-3 h-3 rounded-full border-2 border-chess-primary/25 border-t-chess-primary animate-spin" />
            Analysing {job.done}/{job.total}
          </span>
        )}
      </div>

      {job.status === "analyzing" && (
        <div className="h-1 rounded-full bg-chess-bg overflow-hidden">
          <div
            className="h-full bg-chess-primary transition-[width] duration-200"
            style={{ width: `${percent}%` }}
          />
        </div>
      )}

      {accuracy ? (
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="text-[11px] font-black uppercase tracking-wide text-chess-text/50">
              ⚪ {players.white.name}
            </div>
            <SideAccuracy
              side={accuracy.white}
              accuracy={accuracy.white.accuracy}
            />
          </div>
          <div className="space-y-2 border-l border-chess-border/15 pl-4">
            <div className="text-[11px] font-black uppercase tracking-wide text-chess-text/50 truncate">
              ⚫ {players.black.name}
            </div>
            <SideAccuracy
              side={accuracy.black}
              accuracy={accuracy.black.accuracy}
            />
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-xs font-bold text-chess-text/50">
            {starting
              ? "Game over — Stockfish is about to replay every move and score both sides."
              : "Stockfish is replaying the game to score every move."}
          </p>
          {/* Skeleton placeholders shaped like the final read-out, so the panel
              reads as “coming up” rather than as an empty or finished state. */}
          <div className="grid grid-cols-2 gap-4 animate-pulse">
            {[0, 1].map((i) => (
              <div
                key={i}
                className={`space-y-2 ${i === 1 ? "border-l border-chess-border/15 pl-4" : ""}`}
              >
                <div className="h-2.5 w-20 rounded-full bg-chess-bg" />
                <div className="h-7 w-16 rounded-lg bg-chess-bg" />
                <div className="h-2.5 w-full rounded-full bg-chess-bg/70" />
                <div className="h-2.5 w-3/4 rounded-full bg-chess-bg/70" />
              </div>
            ))}
          </div>
        </div>
      )}

      {accuracy && (
        <p className="text-[10px] font-bold text-chess-text/30">
          Stockfish’s own read of this game — close to, but not identical with,
          the numbers your platform reported.
        </p>
      )}
    </div>
  );
}

export default PlayerStrip;
