import { FeedService } from "@/lib/services/feed.service";
import { idParamSchema as idParam } from "@/lib/validations/feed.schema";
import { jsonMessage, jsonOk, toApiError, badRequest } from "@/lib/http";
import { getSessionUser } from "@/lib/auth";

/**
 * GET /api/feed/:ident/replies/:replyId — public.
 *
 * Returns one reply together with its post and its ancestor chain so the reply
 * can be rendered on its own page (threads-style), independent of the parent
 * post's full tree.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ ident: string; replyId: string }> },
) {
  const { ident, replyId } = await params;

  const postId = idParam.safeParse(ident);
  const reply = idParam.safeParse(replyId);
  if (!postId.success || !reply.success) {
    return badRequest("Invalid identifier.");
  }

  try {
    return jsonOk(
      await FeedService.getReplyContext(String(postId.data), reply.data),
    );
  } catch (error) {
    return toApiError(error);
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ ident: string; replyId: string }> },
) {
  const { ident, replyId } = await params;

  const postId = idParam.safeParse(ident);
  const reply = idParam.safeParse(replyId);
  if (!postId.success || !reply.success) {
    return badRequest("Invalid identifier.");
  }

  const caller = await getSessionUser();
  if (!caller) return jsonMessage("You must be signed in to continue", 401);

  try {
    const result = await FeedService.removeReply(
      String(postId.data),
      reply.data,
      { id: caller.id, role: caller.role },
    );
    return jsonOk(result);
  } catch (error) {
    return toApiError(error);
  }
}
