import { UsersService } from "@/lib/services/users.service";
import { updateUserSchema } from "@/lib/validations/users.schema";
import {
  jsonMessage,
  jsonOk,
  parseBody,
  toApiError,
  badRequest,
} from "@/lib/http";
import { getSessionUser } from "@/lib/auth";

function asId(id: string): number | null {
  return /^\d+$/.test(id) ? Number(id) : null;
}

function actorFor(caller: { id: number; role: string }): {
  id: number;
  role: string;
} {
  return { id: caller.id, role: caller.role };
}

/** PATCH /api/users/:id — self profile edit or admin management. */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const targetId = asId(id);
  if (targetId === null) return badRequest("Invalid user id.");

  const caller = await getSessionUser();
  if (!caller) {
    return jsonMessage("You must be signed in to continue", 401);
  }
  if (caller.role !== "admin" && caller.id !== targetId) {
    return jsonMessage("You can only edit your own profile.", 403);
  }

  const parsed = await parseBody(req, updateUserSchema);
  if (!parsed.ok) return parsed.response;

  try {
    const user = await UsersService.update(
      targetId,
      parsed.data,
      actorFor(caller),
    );
    return jsonOk(user);
  } catch (error) {
    return toApiError(error);
  }
}

/** GET /api/users/:id — self or an admin reads one public profile. */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const targetId = asId(id);
  if (targetId === null) return badRequest("Invalid user id.");

  const caller = await getSessionUser();
  if (!caller) {
    return jsonMessage("You must be signed in to continue", 401);
  }
  if (caller.role !== "admin" && caller.id !== targetId) {
    return jsonMessage("You can only view your own profile.", 403);
  }

  try {
    const user = await UsersService.getById(targetId);
    if (!user) return jsonMessage("User not found.", 404);
    return jsonOk(user);
  } catch (error) {
    return toApiError(error);
  }
}
