"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Chess } from "chess.js";
import ChessGame from "@/app/components/chess/ChessGame";
import { readPgnTimes } from "@/app/components/chess/pgnClocks";

/** Persist pasted/draft text locally so returning here doesn't lose it. */
const PGN_DRAFT_KEY = "chess.pgn.draft";

/** A short but complete timed PGN visitors can load to try the board at once. */
const SAMPLE_PGN = `[Event "PGN Analysis Demo"]
[Site "Check"]
[Date "2024.01.01"]
[White "Player One"]
[Black "Player Two"]
[Result "*"]
[TimeControl "300+3"]

1. e4 { [%clk 0:05:00] } e5 { [%clk 0:05:00] } 2. Nf3 { [%clk 0:04:57] }
Nc6 { [%clk 0:04:56] } 3. Bb5 { [%clk 0:04:52] } a6 { [%clk 0:04:51] }
4. Ba4 { [%clk 0:04:49] } Nf6 { [%clk 0:04:47] } 5. O-O { [%clk 0:04:44] }
Be7 { [%clk 0:04:42] } *`;

interface Parsed {
  white: string | undefined;
  black: string | undefined;
  moveCount: number;
  /** Whether the record carries clock annotations (a timed game). */
  hasTimes: boolean;
  /** Declared time control label, e.g. "5+3", when known. */
  timeControl: string | null;
}

/**
 * ChessGame parses the record it renders; this validator exists only so the
 * board is never handed an un-parseable string in the first place. It mirrors
 * the same rule ChessGame applies (a Chess() that loads the PGN with ≥ 1 move).
 *
 * A game may be given as pure movetext (no headers at all) — a bare
 * `1. e4 e5 2. Nf3 …` is a perfectly valid record, so headers are not required.
 */
function parsePgn(pgn: string): Parsed | null {
  const game = new Chess();
  try {
    game.loadPgn(pgn);
  } catch {
    return null;
  }
  const moveCount = game.history().length;
  if (moveCount === 0) return null;
  const h = game.header();
  // Header tags are absent ("?") for a headerless record; treat those as unset
  // rather than showing a literal "?" as a player name.
  const name = (v: string | null | undefined) =>
    v && v !== "?" ? v : undefined;
  const times = readPgnTimes(pgn);
  return {
    white: name(h.White),
    black: name(h.Black),
    moveCount,
    hasTimes: times.hasTimes,
    timeControl: times.control.label,
  };
}

const plural = (n: number) => `${n} move${n === 1 ? "" : "s"}`;

export default function ChessPgnAnalysisPage() {
  const [draft, setDraft] = useState("");
  // The record currently on the board. Kept apart from `draft` so editing the
  // source never tears down a live analysis until “Analyze” is pressed again.
  const [activePgn, setActivePgn] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  // Restore a previously saved draft once mounted (client-only storage).
  useEffect(() => {
    const saved = window.localStorage.getItem(PGN_DRAFT_KEY);
    if (saved) setDraft(saved);
  }, []);

  const persist = (text: string) => {
    if (typeof window !== "undefined")
      window.localStorage.setItem(PGN_DRAFT_KEY, text);
  };

  // Live read of whatever is in the box right now (not the committed PGN).
  const preview = useMemo(() => parsePgn(draft), [draft]);

  const submitAnalysis = () => {
    if (!draft.trim()) {
      setError("Paste a PGN record first — then hit Analyze.");
      return;
    }
    setError(null);
    setAnalyzing(true);
    // Parse synchronously on the next frame so the button can reflect the
    // pending state and very large records don’t block the click handler.
    requestAnimationFrame(() => {
      setAnalyzing(false);
      const parsed = parsePgn(draft);
      if (!parsed) {
        setError(
          "That doesn’t look like a valid PGN — check the format and try again.",
        );
        return;
      }
      persist(draft);
      setActivePgn(draft);
    });
  };

  const verifiedPgn = useMemo(() => parsePgn(activePgn || ""), [activePgn]);
  const boardLabel = useMemo(() => {
    if (!verifiedPgn) return "Loaded PGN";
    const names = [verifiedPgn.white, verifiedPgn.black]
      .filter(Boolean)
      .join(" vs ");
    const bits = [
      names || null,
      plural(verifiedPgn.moveCount),
      verifiedPgn.timeControl ? `${verifiedPgn.timeControl} timed` : null,
    ].filter(Boolean);
    return bits.join(" · ");
  }, [verifiedPgn]);

  const newAnalysis = () => {
    setActivePgn(null);
    setError(null);
    setDraft("");
    persist("");
  };

  const loadExample = () => {
    setError(null);
    setDraft(SAMPLE_PGN);
    persist(SAMPLE_PGN);
  };

  return (
    <div className="mx-auto py-6 px-4 text-chess-text space-y-6">
      {/* Top-left back navigation (same pattern as the games analysis page). */}
      <Link
        href="/chess"
        className="inline-flex items-center gap-2 text-xs font-black text-chess-text/60 hover:text-chess-primary transition-colors"
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
            d="M10 19l-7-7m0 0l7-7m-7 7h18"
          />
        </svg>
        Back to games
      </Link>

      <div className="space-y-1">
        <div className="text-xs font-black uppercase tracking-wider text-chess-primary flex items-center gap-1.5">
          <span>♟️</span> PGN Analysis
        </div>
        <h1 className="text-2xl font-black tracking-tight">Analyze any game</h1>
        <p className="text-sm font-bold text-chess-text/60">
          Paste or edit a PGN — with or without clock annotations — then step
          through the game with Stockfish’s suggestion arrows and a per-move
          accuracy read-out.
        </p>
      </div>

      {!activePgn ? (
        <div className="rounded-3xl bg-chess-surface p-5 sm:p-6 space-y-4">
          <label
            htmlFor="pgn-input"
            className="text-xs font-black uppercase tracking-wide text-chess-text/80"
          >
            PGN record
          </label>
          <textarea
            id="pgn-input"
            value={draft}
            onChange={(e) => {
              const next = e.target.value;
              setDraft(next);
              persist(next);
            }}
            onKeyDown={(e) => {
              // Ctrl/Cmd + Enter analyzes without leaving the composer.
              if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                e.preventDefault();
                submitAnalysis();
              }
            }}
            spellCheck={false}
            placeholder={`[Event "…"]\n[White "White"]\n[Black "Black"]\n\n1. e4 { [%clk 0:05:00] } e5 { [%clk 0:04:58] } …\n\n…or just the moves: 1. e4 e5 2. Nf3 Nc6`}
            className="w-full min-h-[220px] rounded-2xl bg-chess-bg focus:outline-none focus:ring-2 focus:ring-chess-primary/40 px-4 py-3 text-sm text-chess-text placeholder:text-chess-text/30 font-mono leading-relaxed resize-y"
          />

          <p className="-mt-1 text-xs font-bold text-chess-text/40">
            {error ? (
              <span className="text-chess-text/80">{error}</span>
            ) : !draft.trim() ? (
              "Paste a PGN — headers are optional, and clock annotations are read when present."
            ) : preview ? (
              `Looks ready — ${plural(preview.moveCount)} parsed${
                preview.hasTimes
                  ? preview.timeControl
                    ? ` · ${preview.timeControl} timed`
                    : " · timed"
                  : ""
              }.`
            ) : (
              "Looks incomplete — add the rest of the game."
            )}
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={submitAnalysis}
              disabled={!draft.trim() || analyzing}
              className="rounded-xl bg-chess-primary px-6 py-2.5 text-xs font-black uppercase tracking-wide text-chess-surface hover:opacity-90 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {analyzing ? "Analyzing…" : "Analyze"}
            </button>
            <span className="text-[11px] font-bold text-chess-text/30">
              {draft.length.toLocaleString()} chars
            </span>
            <button
              type="button"
              onClick={loadExample}
              className="ml-auto text-xs font-black text-chess-primary hover:text-chess-text transition-colors cursor-pointer"
            >
              ↺ Load example
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Editing bar — lets the user return to the text between moves. */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-chess-surface px-4 py-3">
            <div className="text-xs font-bold text-chess-text/70 truncate">
              {boardLabel}
            </div>
            <button
              type="button"
              onClick={newAnalysis}
              className="shrink-0 text-xs font-black text-chess-primary hover:text-chess-text transition-colors cursor-pointer"
            >
              New PGN →
            </button>
          </div>

          <ChessGame
            pgn={activePgn}
            whiteName={verifiedPgn?.white ?? undefined}
            blackName={verifiedPgn?.black ?? undefined}
          />
        </>
      )}
    </div>
  );
}
