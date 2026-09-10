"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "../context/AuthContext";
import { apiFetch } from "../services/api";

interface UnifiedGame {
  id: string;
  platform: "chesscom" | "lichess";
  white: { username: string; rating?: number };
  black: { username: string; rating?: number };
  timeClass?: string;
  date: string;
  timestamp?: number;
  pgn: string;
}

interface BrowserLichessGame {
  id?: string;
  pgn?: string;
  speed?: string;
  createdAt?: number;
  players?: {
    white?: {
      user?: { name?: string };
      rating?: number;
      aiLevel?: number;
    };
    black?: {
      user?: { name?: string };
      rating?: number;
      aiLevel?: number;
    };
  };
}

/**
 * Pull `count` (newest-first, oldest not newer) games from Lichess in the
 * browser.
 *
 * Lichess is public and CORS-open, and its game stream carries a strict
 * back-to-back rate limit ("Please only run 1 request(s) at a time") that a
 * single serverless IP trips easily. Running it here spreads the calls over
 * each signed-in visitor's own browser/IP. Because Lichess returns games
 * newest-first, requesting a larger `max` reveals progressively older games —
 * that is the cursor model the page uses to grow the list.
 */
async function fetchLichessWindow(
  username: string,
  count: number,
): Promise<UnifiedGame[]> {
  const url = `https://lichess.org/api/games/user/${encodeURIComponent(username)}?max=${count}&pgnInJson=1`;
  const res = await fetch(url, { headers: { Accept: "application/x-ndjson" } });
  if (!res.ok) {
    throw new Error(`Lichess responded ${res.status}`);
  }

  const text = await res.text();
  return text
    .trim()
    .split("\n")
    .filter(Boolean)
    .flatMap<BrowserLichessGame>((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return [];
      }
    })
    .filter((g) => !!g.pgn)
    .map((g): UnifiedGame => {
      const white =
        g.players?.white?.user?.name ??
        (g.players?.white?.aiLevel
          ? `Stockfish AI Lvl ${g.players.white.aiLevel}`
          : "White");
      const black =
        g.players?.black?.user?.name ??
        (g.players?.black?.aiLevel
          ? `Stockfish AI Lvl ${g.players.black.aiLevel}`
          : "Black");
      return {
        id: g.id || Math.random().toString(),
        platform: "lichess",
        white: {
          username: white,
          rating: g.players?.white?.rating,
        },
        black: {
          username: black,
          rating: g.players?.black?.rating,
        },
        timeClass: g.speed,
        date: g.createdAt ? new Date(g.createdAt).toLocaleDateString() : "",
        timestamp: g.createdAt,
        pgn: g.pgn!,
      };
    });
}

// Chess.com paged result returns the requested slice plus whether older games
// remain.
type ChessPage = { games: UnifiedGame[]; hasMore: boolean };

const PAGE_SIZE = 20;
const INITIAL_PAGE = 20;
const PLATFORM_VIEW_KEY = "chess.games.view";

export default function ChessGamesPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  // Per-source list growing page by page (Chess.com from our route, Lichess
  // directly from the browser). Merged/sorted view is derived below.
  const [chess, setChess] = useState<UnifiedGame[]>([]);
  const [lichessGames, setLichessGames] = useState<UnifiedGame[]>([]);
  const [chessHasMore, setChessHasMore] = useState(false);
  const [lichessHasMore, setLichessHasMore] = useState(false);
  const [gamesLoading, setGamesLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState<"chess" | "lichess" | null>(
    null,
  );
  const [fetchError, setFetchError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const busyRef = useRef(false);

  // ---- “Which platform’s games are shown?” --------------------------------
  // The visitor picks exactly one linked provider — either Chess.com or Lichess
  // (there is intentionally no merged “All” view). On first visit it defaults to
  // the only linked one; when both are linked we ask which to open first.
  function readSavedView(): "chesscom" | "lichess" | null {
    if (typeof window === "undefined") return null;
    const v = window.sessionStorage.getItem(PLATFORM_VIEW_KEY);
    return v === "chesscom" || v === "lichess" ? v : null;
  }

  // `null` = the visitor has not decided yet. When both platforms are linked
  // that intent is resolved by the “Which games?” chooser; when only one is
  // linked it simply falls through to that single provider below.
  const [platform, setPlatform] = useState<"chesscom" | "lichess" | null>(
    readSavedView,
  );
  const choosePlatform = (next: "chesscom" | "lichess") => {
    setPlatform(next);
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(PLATFORM_VIEW_KEY, next);
    }
  };

  const showSignedOut = !authLoading && !user;
  const chessUsername = user?.chesscomUsername ?? null;
  const lichessUsername = user?.lichessUsername ?? null;
  const bothLinked = !!chessUsername && !!lichessUsername;
  const canFetch = !authLoading && !!user;

  // The providers the visitor can actually switch between (linked ones only),
  // used for the live filter chips and any “switch platform” fallback actions.
  const platformOptions: { key: "chesscom" | "lichess"; label: string }[] = [];
  if (chessUsername)
    platformOptions.push({ key: "chesscom", label: "Chess.com" });
  if (lichessUsername)
    platformOptions.push({ key: "lichess", label: "Lichess" });

  // A valid explicitly chosen platform wins; otherwise fall back to a saved pick
  // that is still linked, then to the only linked provider, else null (signed
  // out / nothing linked — the empty states below handle that case).
  const saved = readSavedView();
  const chosen =
    platform &&
    ((platform === "chesscom" && chessUsername) ||
      (platform === "lichess" && lichessUsername))
      ? platform
      : saved &&
          ((saved === "chesscom" && chessUsername) ||
            (saved === "lichess" && lichessUsername))
        ? saved
        : chessUsername && !lichessUsername
          ? "chesscom"
          : lichessUsername && !chessUsername
            ? "lichess"
            : null;
  // Platform currently shown on this page.
  const view: "chesscom" | "lichess" | null = chosen;

  async function fetchChessSlice(
    skip: number,
    count: number,
  ): Promise<ChessPage> {
    const data = (await apiFetch(
      `/chess/games?skip=${skip}&count=${count}`,
    )) as ChessPage & { error?: string };
    if (data.error && !data.games) throw new Error(data.error);
    return { games: data.games ?? [], hasMore: !!data.hasMore };
  }

  // Loads each linked provider's first page. Overwrites prior pages (it runs
  // only on mount / reload / username change).
  useEffect(() => {
    if (!canFetch) return;
    let cancelled = false;
    busyRef.current = false;

    async function initial() {
      setGamesLoading(true);
      setFetchError(false);

      const jobs: Promise<{
        src: "chess" | "lichess";
        games: UnifiedGame[];
        more: boolean;
      } | null>[] = [];

      if (chessUsername) {
        jobs.push(
          fetchChessSlice(0, INITIAL_PAGE)
            .then((p) => ({
              src: "chess" as const,
              games: p.games,
              more: p.hasMore,
            }))
            .catch(() => null),
        );
      }
      if (lichessUsername) {
        jobs.push(
          fetchLichessWindow(lichessUsername, INITIAL_PAGE)
            .then((games) => ({
              src: "lichess" as const,
              games,
              // If we got a full slice we almost certainly have more; the next
              // “Load more” call confirms by looking for unseen games.
              more: games.length === INITIAL_PAGE,
            }))
            .catch(() => null),
        );
      }

      const settled = await Promise.all(jobs);
      let nextError = false;
      let resolved = 0;
      for (const r of settled) {
        if (r === null) {
          nextError = true;
          continue;
        }
        resolved++;
        if (r.src === "chess") {
          setChess(r.games);
          setChessHasMore(r.more);
        } else {
          setLichessGames(r.games);
          setLichessHasMore(r.more);
        }
      }

      if (!cancelled) {
        // Show the error panel only when every linked provider failed — if one
        // worked we keep whatever games it returned.
        setFetchError(resolved === 0 && settled.length > 0 && nextError);
        setGamesLoading(false);
      }
    }

    void initial();
    return () => {
      cancelled = true;
    };
  }, [canFetch, reloadKey, chessUsername, lichessUsername]);

  // Grow the currently viewed provider's list by one more page.
  async function loadMore(target: "chess" | "lichess") {
    if (busyRef.current || !canFetch) return;
    busyRef.current = true;
    setLoadingMore(target);
    try {
      if (target === "chess") {
        if (chessUsername && chessHasMore) {
          try {
            const page = await fetchChessSlice(chess.length, PAGE_SIZE);
            setChess((prev) => {
              const ids = new Set(prev.map((g) => g.id));
              return [...prev, ...page.games.filter((g) => !ids.has(g.id))];
            });
            setChessHasMore(page.hasMore);
          } catch {
            // ignore — keep whatever we have
          }
        }
      } else if (target === "lichess") {
        if (lichessUsername && lichessHasMore) {
          try {
            const window = await fetchLichessWindow(
              lichessUsername,
              lichessGames.length + PAGE_SIZE,
            );
            // Only keep games we have not already shown (Lichess returns the
            // newest window each time; a bigger window reveals older ones).
            const have = new Set(lichessGames.map((g) => g.id));
            const grows = window.filter((g) => !have.has(g.id));
            setLichessGames((prev) => [...prev, ...grows]);
            setLichessHasMore(grows.length > 0);
          } catch {
            setLichessHasMore(false);
          }
        }
      }
    } finally {
      busyRef.current = false;
      setLoadingMore(null);
    }
  }

  // Merged, newest-first across both sources (timestamp is ms for both).
  const games = useMemo(() => {
    const ids = new Set<string>();
    const merged: UnifiedGame[] = [];
    for (const g of [...chess, ...lichessGames]) {
      const key = `${g.platform}-${g.id}`;
      if (ids.has(key)) continue;
      ids.add(key);
      merged.push(g);
    }
    return merged.sort((a, b) => (b.timestamp ?? 0) - (a.timestamp ?? 0));
  }, [chess, lichessGames]);

  const linked = [
    user?.chesscomUsername ? "Chess.com" : null,
    user?.lichessUsername ? "Lichess" : null,
  ].filter(Boolean) as string[];

  function handleSelectGame(game: UnifiedGame) {
    sessionStorage.setItem("selected_game_pgn", game.pgn);
    // The PGN header carries names but no ratings, so persist the list's player
    // data alongside it for the analysis page's player strips.
    sessionStorage.setItem(
      "selected_game_players",
      JSON.stringify({
        white: { name: game.white.username, rating: game.white.rating },
        black: { name: game.black.username, rating: game.black.rating },
      }),
    );
    router.push(`/chess/analysis?id=${game.id}&platform=${game.platform}`);
  }

  const visible = games.filter((g) => g.platform === view);

  // Provider chips are useful only / switchable when both sources are linked;
  // with a single linked source there is nothing to switch and no merged view.
  const showFilters =
    !authLoading &&
    !showSignedOut &&
    !gamesLoading &&
    !fetchError &&
    platformOptions.length > 1;

  const chessPending = !!chessUsername && chessHasMore;
  const lichessPending = !!lichessUsername && lichessHasMore;
  const showLoadMore =
    !authLoading &&
    !showSignedOut &&
    !gamesLoading &&
    !fetchError &&
    visible.length > 0 &&
    (view === "chesscom" ? chessPending : lichessPending);
  const loadTarget: "chess" | "lichess" =
    view === "lichess" ? "lichess" : "chess";

  // When both platforms are linked we ask which single provider to show first
  // (no merged/all view exists — the user picks one source, switchable later).
  if (bothLinked && canFetch && platform === null && !authLoading) {
    const pick: Array<{
      key: "chesscom" | "lichess";
      title: string;
      desc: string;
      hint: string;
    }> = [
      {
        key: "chesscom",
        title: "♟️ Chess.com",
        desc: "List my Chess.com games",
        hint: chessUsername ?? "",
      },
      {
        key: "lichess",
        title: "♝ Lichess",
        desc: "List my Lichess games",
        hint: lichessUsername ?? "",
      },
    ];
    return (
      <div className="max-w-2xl mx-auto py-10 px-4 text-chess-text space-y-6">
        <div className="space-y-1">
          <div className="text-xs font-black uppercase tracking-wider text-chess-primary flex items-center gap-1.5">
            <span>♟️</span> Analysis Hub
          </div>
          <h1 className="text-3xl font-black tracking-tight">Which games?</h1>
          <p className="text-sm font-bold text-chess-text/60">
            You have both Chess.com and Lichess linked. Pick which account’s
            games to review — you can switch between them later.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {pick.map((p) => (
            <button
              key={p.key}
              type="button"
              onClick={() => choosePlatform(p.key)}
              className="text-left bg-chess-surface p-5 rounded-2xl border border-chess-text/10 hover:border-chess-primary/60 hover:bg-chess-surface/80 transition-colors cursor-pointer"
            >
              <div className="text-lg font-black text-chess-text">
                {p.title}
              </div>
              <div className="mt-1 text-xs font-bold text-chess-text/70">
                {p.desc}
              </div>
              <div className="mt-1 text-[11px] font-bold text-chess-text/40">
                {p.hint}
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 text-chess-text space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <div className="text-xs font-black uppercase tracking-wider text-chess-primary flex items-center gap-1.5">
            <span>♟️</span> Analysis Hub
          </div>
          <h1 className="text-3xl font-black tracking-tight text-chess-text md:text-4xl">
            Recent Games
          </h1>
          <p className="text-sm font-bold text-chess-text/60">
            {linked.length
              ? `Synced from ${linked.join(" & ")}.`
              : "Link your Chess.com / Lichess account and review your matches."}
          </p>
        </div>

        {user && (
          <Link
            href="/profile"
            className="text-xs font-black uppercase tracking-wide text-chess-primary hover:text-chess-text transition-colors"
          >
            Manage accounts →
          </Link>
        )}
      </div>

      {showFilters && (
        <div className="flex flex-row items-center justify-between gap-3">
          {/* Platform filter */}
          <div className="flex items-center gap-1 rounded-2xl bg-chess-surface p-1 w-fit">
            {platformOptions.map((tab) => {
              const active = view === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => choosePlatform(tab.key)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition-colors cursor-pointer ${
                    active
                      ? "bg-chess-primary text-chess-surface"
                      : "text-chess-text/60 hover:text-chess-text"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          <span className="text-xs font-bold text-chess-text/40 shrink-0">
            {visible.length === games.length
              ? `${games.length} game${games.length === 1 ? "" : "s"} loaded`
              : `${visible.length} / ${games.length} shown`}
          </span>
        </div>
      )}

      <div className="bg-chess-surface p-6 rounded-3xl min-h-[220px] flex items-stretch">
        {authLoading ? (
          <div className="flex flex-col items-center justify-center py-12 space-y-3 w-full">
            <div className="w-8 h-8 rounded-full border-4 border-chess-primary/20 border-t-chess-primary animate-spin" />
            <span className="text-xs font-bold text-chess-text/50">
              Loading your session…
            </span>
          </div>
        ) : showSignedOut ? (
          <div className="w-full flex flex-col items-center justify-center text-center space-y-3 py-10">
            <p className="text-sm font-black text-chess-text">Sign in first</p>
            <p className="text-xs font-bold text-chess-text/50 max-w-sm">
              To pull recent games from Chess.com or Lichess you need to be
              signed in and have linked a platform on your profile.
            </p>
            <div className="flex gap-3 pt-1">
              <Link
                href="/auth"
                className="bg-chess-primary text-chess-surface px-5 py-2 rounded-xl text-xs font-black"
              >
                Sign in / Register
              </Link>
              <Link
                href="/profile"
                className="px-5 py-2 rounded-xl border border-chess-text/20 text-xs font-black text-chess-text/70 hover:border-chess-primary/60"
              >
                Open profile
              </Link>
            </div>
          </div>
        ) : gamesLoading ? (
          <div className="flex flex-col items-center justify-center py-12 space-y-3 w-full">
            <div className="w-8 h-8 rounded-full border-4 border-chess-primary/20 border-t-chess-primary animate-spin" />
            <span className="text-xs font-bold text-chess-text/50">
              Fetching synced matches...
            </span>
          </div>
        ) : fetchError ? (
          <div className="flex flex-col items-center justify-center text-center space-y-3 py-10 w-full">
            <p className="text-sm font-black text-chess-text">
              Couldn’t load your games
            </p>
            <p className="text-xs font-bold text-chess-text/50 max-w-sm">
              The game provider may be unreachable right now. Try again in a
              moment.
            </p>
            <button
              type="button"
              onClick={() => setReloadKey((k) => k + 1)}
              className="bg-chess-primary text-chess-surface px-5 py-2 rounded-xl text-xs font-black cursor-pointer"
            >
              Retry
            </button>
          </div>
        ) : games.length === 0 ? (
          <div className="w-full flex flex-col items-center justify-center text-center space-y-3 py-10">
            <p className="text-sm font-black text-chess-text">
              {linked.length ? "No recent games found" : "No platforms linked"}
            </p>
            <p className="text-xs font-bold text-chess-text/50 max-w-sm">
              {linked.length
                ? "Your linked accounts returned no recent playable games yet."
                : "Add your Chess.com and/or Lichess username on your profile to sync matches here."}
            </p>
            <Link
              href="/profile"
              className="bg-chess-primary text-chess-surface px-5 py-2 rounded-xl text-xs font-black"
            >
              {linked.length ? "Check your account" : "Link an account"}
            </Link>
          </div>
        ) : visible.length === 0 ? (
          <div className="w-full flex flex-col items-center justify-center text-center space-y-2 py-10">
            <p className="text-sm font-black text-chess-text">
              No games from this platform
            </p>
            <p className="text-xs font-bold text-chess-text/50 max-w-sm">
              {view === "lichess"
                ? "Lichess is not linked, or it returned no recent games."
                : "Chess.com is not linked, or it returned no recent games."}
            </p>
            {(() => {
              const other = platformOptions.find((o) => o.key !== view);
              return other ? (
                <button
                  type="button"
                  onClick={() => choosePlatform(other.key)}
                  className="mt-1 bg-chess-primary text-chess-surface px-5 py-2 rounded-xl text-xs font-black cursor-pointer"
                >
                  Show {other.label} games
                </button>
              ) : (
                <Link
                  href="/profile"
                  className="mt-1 bg-chess-primary text-chess-surface px-5 py-2 rounded-xl text-xs font-black"
                >
                  Manage accounts
                </Link>
              );
            })()}
          </div>
        ) : (
          <div className="w-full space-y-3">
            {visible.map((game) => (
              <div
                key={`${game.platform}-${game.id}`}
                className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 bg-chess-bg/50 hover:bg-chess-bg rounded-2xl transition-all"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full ${
                      game.platform === "chesscom"
                        ? "bg-emerald-500/10 text-emerald-400"
                        : "bg-sky-500/10 text-sky-400"
                    }`}
                  >
                    {game.platform}
                  </span>
                  <div className="space-y-0.5">
                    <div className="text-sm font-black text-chess-text">
                      ⚪ {game.white.username} ({game.white.rating ?? "?"}) vs
                      ⚫ {game.black.username} ({game.black.rating ?? "?"})
                    </div>
                    <div className="text-xs font-bold text-chess-text/40">
                      {game.timeClass && (
                        <span className="capitalize">{game.timeClass} • </span>
                      )}
                      {game.date}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => handleSelectGame(game)}
                  className="w-full sm:w-auto bg-chess-primary text-chess-surface font-black px-5 py-2 rounded-xl text-xs hover:opacity-90 transition-all cursor-pointer"
                >
                  Analyze with Stockfish
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {showLoadMore && (
        <div className="flex justify-center">
          <button
            type="button"
            disabled={!!loadingMore}
            onClick={() => void loadMore(loadTarget)}
            className="inline-flex items-center gap-2 bg-chess-surface border border-chess-primary/30 hover:border-chess-primary text-chess-primary font-black px-6 py-2.5 rounded-xl text-xs uppercase tracking-wide transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loadingMore ? (
              <>
                <span className="w-3.5 h-3.5 rounded-full border-2 border-chess-primary/30 border-t-chess-primary animate-spin" />
                Loading more…
              </>
            ) : (
              "Load more"
            )}
          </button>
        </div>
      )}
    </div>
  );
}
