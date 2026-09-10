import { UsersService } from "@/lib/services/users.service";
import { changePasswordSchema } from "@/lib/validations/users.schema";
import {
  jsonMessage,
  jsonOk,
  parseBody,
  toApiError,
  badRequest,
} from "@/lib/http";
import { getSessionUser } from "@/lib/auth";

/** PATCH /api/users/:id/password */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!/^\d+$/.test(id)) return badRequest("Invalid user id.");
  const targetId = Number(id);

  const caller = await getSessionUser();
  if (!caller) return jsonMessage("You must be signed in to continue", 401);
  if (caller.role !== "admin" && caller.id !== targetId) {
    return jsonMessage("You can only change your own password.", 403);
  }

  const parsed = await parseBody(req, changePasswordSchema);
  if (!parsed.ok) return parsed.response;

  try {
    const result = await UsersService.changePassword(targetId, parsed.data);
    return jsonOk(result);
  } catch (error) {
    return toApiError(error);
  }
}
