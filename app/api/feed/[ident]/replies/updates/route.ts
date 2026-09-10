import { NextResponse } from "next/server";
import { FeedService } from "@/lib/services/feed.service";
import { toApiError } from "@/lib/http";

/**
 * GET /api/feed/:ident/replies/updates — public.
 *
 * Reply-activity probe for a single post: how many visible replies exist and
 * which one is newest. The post page polls this to decide whether to surface a
 * "new replies" pill, without pulling the full nested tree on every tick.
 *
 * Static sibling of `/replies/[replyId]`, so `updates` is never parsed as an id.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ ident: string }> },
) {
  const { ident } = await params;
  try {
    const result = await FeedService.getRepliesMeta(ident);
    return NextResponse.json(result, {
      status: 200,
      headers: { "Cache-Control": "no-store, max-age=0" },
    });
  } catch (error) {
    return toApiError(error);
  }
}
