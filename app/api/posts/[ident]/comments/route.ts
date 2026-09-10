import { CommentsService } from "@/lib/services/comments.service";
import { createCommentSchema } from "@/lib/validations/comments.schema";
import { jsonMessage, jsonOk, parseBody, toApiError } from "@/lib/http";
import { getSessionUser } from "@/lib/auth";

/** GET /posts/:ident/comments — public nested comment thread. */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ ident: string }> },
) {
  const { ident } = await params;
  try {
    return jsonOk(await CommentsService.getTreeForPost(ident));
  } catch (error) {
    return toApiError(error);
  }
}

/** POST /posts/:ident/comments — requires an authenticated user. */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ ident: string }> },
) {
  const { ident } = await params;
  const caller = await getSessionUser();
  if (!caller) {
    return jsonMessage("You must be signed in to continue", 401);
  }

  const parsed = await parseBody(req, createCommentSchema);
  if (!parsed.ok) return parsed.response;

  try {
    const result = await CommentsService.addComment(ident, parsed.data, {
      id: caller.id,
      role: caller.role,
    });
    return jsonOk(result, 201);
  } catch (error) {
    return toApiError(error);
  }
}
