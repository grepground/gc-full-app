import { FeedService } from "@/lib/services/feed.service";
import { jsonOk, toApiError } from "@/lib/http";
import { getSessionUser } from "@/lib/auth";

function clientIp(req: Request): string | null {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) {
    const first = fwd.split(",")[0]?.trim();
    if (first) return first;
  }
  return req.headers.get("x-real-ip");
}

/** POST /feed/:ident/view — register a genuine single visit (public). */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ ident: string }> },
) {
  const { ident } = await params;
  const caller = await getSessionUser();
  try {
    return jsonOk(
      await FeedService.registerView(ident, caller?.id ?? null, clientIp(req)),
    );
  } catch (error) {
    return toApiError(error);
  }
}
