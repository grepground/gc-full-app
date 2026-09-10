import { FeedService } from "@/lib/services/feed.service";
import { updateFeedSchema } from "@/lib/validations/feed.schema";
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

/** GET /api/feed/:ident (numeric id or slug) — public */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ ident: string }> },
) {
  const { ident } = await params;
  try {
    const post = await FeedService.getByIdent(ident);
    if (!post) {
      return jsonMessage("That feed post doesn't exist or was removed.", 404);
    }
    return jsonOk(post);
  } catch (error) {
    return toApiError(error);
  }
}

/** PATCH /api/feed/:id — owner/admin/mod may edit body/visibility. */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ ident: string }> },
) {
  const { ident } = await params;
  const id = asId(ident);
  if (id === null) {
    return badRequest("You can only edit a feed post by id.");
  }
  const caller = await getSessionUser();
  if (!caller) return jsonMessage("You must be signed in to continue", 401);

  const parsed = await parseBody(req, updateFeedSchema);
  if (!parsed.ok) return parsed.response;

  try {
    const updated = await FeedService.update(id, parsed.data, {
      id: caller.id,
      role: caller.role,
    });
    return jsonOk(updated);
  } catch (error) {
    return toApiError(error);
  }
}

/** DELETE /api/feed/:id — soft delete by owner or staff. */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ ident: string }> },
) {
  const { ident } = await params;
  const id = asId(ident);
  if (id === null) {
    return badRequest("You can only delete a feed post by id.");
  }
  const caller = await getSessionUser();
  if (!caller) return jsonMessage("You must be signed in to continue", 401);

  try {
    const result = await FeedService.remove(id, {
      id: caller.id,
      role: caller.role,
    });
    return jsonOk(result);
  } catch (error) {
    return toApiError(error);
  }
}
