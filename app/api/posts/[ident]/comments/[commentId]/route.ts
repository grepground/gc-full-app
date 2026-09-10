import { CommentsService } from "@/lib/services/comments.service";
import { idParamSchema as idParam } from "@/lib/validations/comments.schema";
import { jsonMessage, jsonOk, toApiError, badRequest } from "@/lib/http";
import { getSessionUser } from "@/lib/auth";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ ident: string; commentId: string }> },
) {
  const { ident, commentId } = await params;

  const parsedCommentId = idParam.safeParse(commentId);
  if (!parsedCommentId.success) return badRequest("Invalid comment id.");

  const caller = await getSessionUser();
  if (!caller) return jsonMessage("You must be signed in to continue", 401);

  try {
    const result = await CommentsService.deleteComment(
      ident,
      parsedCommentId.data,
      { id: caller.id, role: caller.role },
    );
    return jsonOk(result);
  } catch (error) {
    return toApiError(error);
  }
}
