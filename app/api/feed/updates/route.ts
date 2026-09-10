import { NextResponse } from "next/server";
import { FeedService } from "@/lib/services/feed.service";
import { feedUpdatesQuerySchema } from "@/lib/validations/feed.schema";
import { jsonMessage, toApiError } from "@/lib/http";

/**
 * GET /api/feed/updates?afterId=<id> — public.
 *
 * Cheap "is there anything new?" probe used by the feed's new-posts pill. It
 * deliberately returns only counts and ids (never post bodies) so polling stays
 * inexpensive regardless of how much content has been published.
 *
 * NOTE: this is a sibling of `/api/feed/[ident]`. Static segments win over
 * dynamic ones in the App Router, so `updates` is never mistaken for a post id
 * or slug.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const query = feedUpdatesQuerySchema.safeParse(
    Object.fromEntries(url.searchParams.entries()),
  );
  if (!query.success) {
    return jsonMessage("Invalid update parameters.", 400);
  }

  try {
    const result = await FeedService.countNewPosts(query.data.afterId);
    return NextResponse.json(result, {
      status: 200,
      // Freshness is the entire point of this endpoint; a cached copy would
      // keep the pill hidden (or shown) long after reality changed.
      headers: { "Cache-Control": "no-store, max-age=0" },
    });
  } catch (error) {
    return toApiError(error);
  }
}
