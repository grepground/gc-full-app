import { PostsService } from "@/lib/services/posts.service";
import { updatePostSchema } from "@/lib/validations/posts.schema";
import {
  jsonOk,
  jsonMessage,
  parseBody,
  toApiError,
  badRequest,
} from "@/lib/http";
import { getSessionUser } from "@/lib/auth";

function asId(ident: string): number | null {
  return /^\d+$/.test(ident) ? Number(ident) : null;
}

/** GET /posts/:ident (id or slug) — public */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ ident: string }> },
) {
  const { ident } = await params;
  try {
    const post = await PostsService.getByIdent(ident);
    if (!post) {
      return jsonMessage("This article doesn't exist or was removed.", 404);
    }
    return jsonOk(post);
  } catch (error) {
    return toApiError(error);
  }
}

/** PATCH /posts/:id — owner/admin/mod editorial update */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ ident: string }> },
) {
  const { ident } = await params;
  const id = asId(ident);
  if (id === null)
    return badRequest("You can only edit an article by its numeric id.");

  const caller = await getSessionUser();
  if (!caller) return jsonMessage("You must be signed in to continue", 401);

  const parsed = await parseBody(req, updatePostSchema);
  if (!parsed.ok) return parsed.response;

  try {
    const updated = await PostsService.update(id, parsed.data, {
      id: caller.id,
      role: caller.role,
    });
    return jsonOk(updated);
  } catch (error) {
    return toApiError(error);
  }
}

/** DELETE /posts/:id — soft delete by owner/admin/mod */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ ident: string }> },
) {
  const { ident } = await params;
  const id = asId(ident);
  if (id === null)
    return badRequest("You can only delete an article by its numeric id.");

  const caller = await getSessionUser();
  if (!caller) return jsonMessage("You must be signed in to continue", 401);

  try {
    const result = await PostsService.softDelete(id, {
      id: caller.id,
      role: caller.role,
    });
    return jsonOk(result);
  } catch (error) {
    return toApiError(error);
  }
}
