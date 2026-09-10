import { FeedService } from "@/lib/services/feed.service";
import {
  createFeedReplySchema,
  idParamSchema as idParam,
} from "@/lib/validations/feed.schema";
import {
  jsonOk,
  jsonMessage,
  parseBody,
  toApiError,
  badRequest,
} from "@/lib/http";
import { getSessionUser } from "@/lib/auth";

/** GET /api/feed/:feedPostId/replies — threaded list (public). */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ ident: string }> },
) {
  const { ident } = await params;
  try {
    return jsonOk(await FeedService.getReplies(ident));
  } catch (error) {
    return toApiError(error);
  }
}

/** POST /api/feed/:feedPostId/replies — signed-in user writes a reply. */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ ident: string }> },
) {
  const { ident } = await params;
  const parsedId = idParam.safeParse(ident);
  if (!parsedId.success) return badRequest("Invalid feed post id.");

  const caller = await getSessionUser();
  if (!caller) return jsonMessage("You must be signed in to continue", 401);

  const parsed = await parseBody(req, createFeedReplySchema);
  if (!parsed.ok) return parsed.response;

  try {
    const result = await FeedService.addReply(ident, parsed.data, {
      id: caller.id,
      role: caller.role,
    });
    return jsonOk(result, 201);
  } catch (error) {
    return toApiError(error);
  }
}
