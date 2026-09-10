import { FeedService } from "@/lib/services/feed.service";
import {
  createFeedSchema,
  feedScrollQuerySchema,
} from "@/lib/validations/feed.schema";
import { jsonMessage, jsonOk, parseBody, toApiError } from "@/lib/http";
import { getSessionUser } from "@/lib/auth";

/** GET /api/feed — cursor-paginated active stream (public). */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const query = feedScrollQuerySchema.safeParse(
    Object.fromEntries(url.searchParams.entries()),
  );
  if (!query.success) {
    return jsonMessage("Invalid pagination parameters.", 400);
  }

  try {
    const page = await FeedService.scroll({
      limit: query.data.limit ?? 10,
      cursor: query.data.cursor ?? null,
    });
    return jsonOk(page);
  } catch (error) {
    return toApiError(error);
  }
}

/** POST /api/feed — signed-in users publish a post. */
export async function POST(req: Request) {
  const caller = await getSessionUser();
  if (!caller) return jsonMessage("You must be signed in to continue", 401);

  const parsed = await parseBody(req, createFeedSchema);
  if (!parsed.ok) return parsed.response;

  try {
    const post = await FeedService.create(parsed.data, {
      id: caller.id,
      role: caller.role,
    });
    return jsonOk(post, 201);
  } catch (error) {
    return toApiError(error);
  }
}
