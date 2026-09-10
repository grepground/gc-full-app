import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

export interface UnifiedGame {
  id: string;
  platform: "chesscom" | "lichess";
  white: { username: string; rating?: number };
  black: { username: string; rating?: number };
  timeClass?: string;
  date: string;
  timestamp?: number;
  pgn: string;
}

interface ChessComGame {
  url?: string;
  pgn?: string;
  time_class?: string;
  end_time?: number;
  white?: { username?: string; rating?: number };
  black?: { username?: string; rating?: number };
}

// Chess.com is a public API with no per-request auth, so it is fetched here on
// the server just like any other backend integration.
//
// Lichess, however, is fetched directly from the browser: its game-download
// endpoint carries a strict end-to-end rate limit ("Please only run 1
// request(s) at a time") that is easy to trip when many requests stream out of
// a single server IP back-to-back. Running it in the client spreads the load
// across each visitor's own browser/IP, which keeps it well under that limit.
// The browser feature lives in app/chess/page.tsx / fetchLichessFromBrowser()
// (the DTO shape below is mirrored there).
//
// Query params (all optional):
//   skip  — how many newest playable games to jump over (default 0)
//   count — how many newest-remaining games to return (default 20, max 100)
// Responses include `hasMore` so a “load more” UI knows whether to keep asking.
export type ChessPaged = { games: UnifiedGame[]; hasMore: boolean };

function clampInt(
  raw: string | null,
  fallback: number,
  min: number,
  max: number,
) {
  const n = Number(raw);
  if (raw === null || !Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(n)));
}

function toUnified(g: ChessComGame): UnifiedGame {
  // Chess.com reports end_time in seconds; normalise to ms so it can be mixed
  // with Lichess timestamps (ms) on the client.
  const endMs = g.end_time ? g.end_time * 1000 : undefined;
  return {
    id: g.url
      ? g.url.split("/").pop() || Math.random().toString()
      : Math.random().toString(),
    platform: "chesscom",
    white: { username: g.white?.username || "White", rating: g.white?.rating },
    black: { username: g.black?.username || "Black", rating: g.black?.rating },
    timeClass: g.time_class,
    date: endMs ? new Date(endMs).toLocaleDateString() : "",
    timestamp: endMs,
    pgn: g.pgn!,
  };
}

export async function GET(req: NextRequest) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: sessionUser.id },
      select: { chesscomUsername: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const params = req.nextUrl.searchParams;
    const skip = clampInt(params.get("skip"), 0, 0, Number.MAX_SAFE_INTEGER);
    const count = clampInt(params.get("count"), 20, 1, 100);

    if (!user.chesscomUsername) {
      return NextResponse.json({ games: [], hasMore: false });
    }

    const headers = {
      "User-Agent": "ChessAnalysis/1.0 (contact: chess analysis)",
    };
    const archivesRes = await fetch(
      `https://api.chess.com/pub/player/${user.chesscomUsername.toLowerCase()}/games/archives`,
      { headers, cache: "no-store" },
    );

    if (!archivesRes.ok) {
      console.error(
        `Chess.com archives request failed for ${user.chesscomUsername}:`,
        archivesRes.status,
      );
      return NextResponse.json({ games: [], hasMore: false });
    }

    const archives =
      (
        (await archivesRes.json()) as { archives?: string[] }
      ).archives?.slice() ?? [];

    // To report `hasMore` truthfully we only need to look slightly past the end
    // of the requested slice, so scan pages newest→oldest until we have
    // (skip + count + 1) playable games or run out of months (bounded). All
    // Chess.com time data is epoch-seconds — order by newest first.
    const collected: UnifiedGame[] = [];
    const MAX_MONTH_LOOKUPS = 120;
    let lookups = 0;
    let hitArchiveEnd = true;

    outer: for (
      let i = archives.length - 1;
      i >= 0 && lookups < MAX_MONTH_LOOKUPS;
      i--
    ) {
      lookups++;
      const monthRes = await fetch(archives[i], { headers, cache: "no-store" });
      if (!monthRes.ok) continue;
      const monthData = (await monthRes.json()) as { games?: ChessComGame[] };
      const monthGames = monthData.games ?? [];
      // Within a month, Chess.com returns games chronological (they do not use
      // newest-at-front), so walk backwards to keep newest games first.
      for (let j = monthGames.length - 1; j >= 0; j--) {
        const g = monthGames[j];
        if (!g || !g.pgn || !g.white?.username) continue;
        collected.push(toUnified(g));
        if (collected.length >= skip + count + 1) {
          hitArchiveEnd = false;
          break outer;
        }
      }
    }

    const games = collected.slice(skip, skip + count);
    const hasMore = hitArchiveEnd
      ? lookups >= MAX_MONTH_LOOKUPS || collected.length > skip + count
      : collected.length > skip + count;

    return NextResponse.json({ games, hasMore } satisfies ChessPaged, {
      headers: {
        "Cache-Control": "no-store, max-age=0, must-revalidate",
      },
    });
  } catch (error) {
    console.error("Fetch games error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
