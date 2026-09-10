"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import ChessGame from "@/app/components/chess/ChessGame";
import { useAuth } from "@/app/context/AuthContext";

const PGN_STORAGE_KEY = "selected_game_pgn";
const PLAYERS_STORAGE_KEY = "selected_game_players";

interface StoredPlayers {
  white?: { name?: string; rating?: number };
  black?: { name?: string; rating?: number };
}

/** Read a PGN header tag, e.g. `[White "Magnus"]` → `Magnus`. */
function pgnTag(pgn: string, name: string): string | undefined {
  return new RegExp(`^\\[${name} "([^"]*)"\\]`, "m").exec(pgn)?.[1];
}

/** Read the [White "…"] / [Black "…"] player tags out of a PGN header. */
function pgnPlayerNames(pgn: string): { white?: string; black?: string } {
  return { white: pgnTag(pgn, "White"), black: pgnTag(pgn, "Black") };
}

interface Selection {
  id: string | null;
  platform: "chesscom" | "lichess" | null;
}

/**
 * Analysis page. `app/chess/page.tsx` stores the chosen game’s PGN in
 * sessionStorage before soft-navigating here, so a simple client read (rather
 * than `useSearchParams`) avoids the async-params/Suspense dance entirely.
 */
export default function ChessAnalysisPage() {
  const { user, loading: authLoading } = useAuth();
  const [selection, setSelection] = useState<Selection>({
    id: null,
    platform: null,
  });
  const [pgn, setPgn] = useState<string | null>(null);
  const [storedPlayers, setStoredPlayers] = useState<StoredPlayers>({});
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // read browser-only state after hydration; schedule via rAF so the
    // state writes aren’t synchronous inside the effect body.
    const raf = requestAnimationFrame(() => {
      const params = new URLSearchParams(window.location.search);
      const rawPlatform = params.get("platform");
      setSelection({
        id: params.get("id"),
        platform:
          rawPlatform === "lichess" || rawPlatform === "chesscom"
            ? rawPlatform
            : null,
      });
      setPgn(sessionStorage.getItem(PGN_STORAGE_KEY));
      try {
        const raw = sessionStorage.getItem(PLAYERS_STORAGE_KEY);
        setStoredPlayers(raw ? (JSON.parse(raw) as StoredPlayers) : {});
      } catch {
        setStoredPlayers({});
      }
      setReady(true);
    });
    return () => cancelAnimationFrame(raf);
  }, []);

  const backHref = "/chess";
  const title =
    selection.platform === "lichess"
      ? "Lichess Game"
      : selection.platform === "chesscom"
        ? "Chess.com Game"
        : "Game";

  // The colour this account (currently signed in) held in the recorded game,
  // derived by matching the platform username against the PGN header. Falls back
  // to White when there is no signed-in player among the two (e.g. viewing a
  // game that wasn't theirs) so the board still has a sane starting viewpoint.
  const playerColor = useMemo<"white" | "black">(() => {
    if (!pgn || !user) return "white";
    const { white, black } = pgnPlayerNames(pgn);
    const username =
      selection.platform === "lichess"
        ? user.lichessUsername
        : user.chesscomUsername;
    if (!username) return "white";
    const matches = (who?: string) =>
      !!who && who.trim().toLowerCase() === username.trim().toLowerCase();
    if (matches(black)) return "black";
    if (matches(white)) return "white";
    return "white";
  }, [pgn, user, selection.platform]);

  const pgnNames = useMemo(
    () => (pgn ? pgnPlayerNames(pgn) : { white: undefined, black: undefined }),
    [pgn],
  );

  // Prefer the names/ratings captured with the game (they include ratings); the
  // PGN header is the fallback so a hand-pasted record still labels the sides.
  const whitePlayer = {
    name: storedPlayers.white?.name || pgnNames.white || "White",
    rating: storedPlayers.white?.rating,
  };
  const blackPlayer = {
    name: storedPlayers.black?.name || pgnNames.black || "Black",
    rating: storedPlayers.black?.rating,
  };

  return (
    <div className="mx-auto py-6 px-4 text-chess-text space-y-6">
      {/* Top-left back navigation */}
      <Link
        href={backHref}
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
          <span>♟️</span> {title}
        </div>
        <h1 className="text-2xl font-black tracking-tight">
          Analyze {selection.id ? `#${selection.id}` : ""}
        </h1>
        <p className="text-sm font-bold text-chess-text/60">
          Step backward and forward through the moves and follow Stockfish’s
          on-board arrows to scout each position.
        </p>
      </div>

      {!ready ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 rounded-full border-4 border-chess-primary/20 border-t-chess-primary animate-spin" />
        </div>
      ) : !pgn ? (
        <div className="rounded-3xl bg-chess-surface p-8 text-center space-y-2">
          <p className="font-black text-chess-text">No game record here</p>
          <p className="text-sm font-bold text-chess-text/60 max-w-md mx-auto">
            Pick a game from your recent list first — its moves are loaded into
            the board before you land here.
          </p>
          <Link
            href={backHref}
            className="inline-block mt-2 bg-chess-primary text-chess-surface px-5 py-2 rounded-xl text-xs font-black"
          >
            Choose a game
          </Link>
        </div>
      ) : authLoading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 rounded-full border-4 border-chess-primary/20 border-t-chess-primary animate-spin" />
        </div>
      ) : (
        <ChessGame
          pgn={pgn}
          playerColor={playerColor}
          whiteName={whitePlayer.name}
          blackName={blackPlayer.name}
          whiteRating={whitePlayer.rating}
          blackRating={blackPlayer.rating}
          showEvalBar
        />
      )}
    </div>
  );
}
