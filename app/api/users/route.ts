import { UsersService } from "@/lib/services/users.service";
import { createUserSchema } from "@/lib/validations/users.schema";
import {
  jsonMessage,
  jsonOk,
  parseBody,
  toApiError,
  unauthorized,
} from "@/lib/http";
import { getSessionUser } from "@/lib/auth";

/** POST /api/users — create an account (public). */
export async function POST(req: Request) {
  const parsed = await parseBody(req, createUserSchema);
  if (!parsed.ok) return parsed.response;

  try {
    const user = await UsersService.register(parsed.data);
    return jsonOk(user, 201);
  } catch (error) {
    return toApiError(error);
  }
}

/** GET /api/users — admin-only account directory. */
export async function GET() {
  const caller = await getSessionUser();
  if (!caller) return unauthorized();
  if (caller.role !== "admin") {
    return jsonMessage("You don't have permission to do that.", 403);
  }

  try {
    return jsonOk(await UsersService.listAll());
  } catch (error) {
    return toApiError(error);
  }
}
