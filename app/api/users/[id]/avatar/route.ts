import { UsersService } from "@/lib/services/users.service";
import { jsonMessage, jsonOk, toApiError, badRequest } from "@/lib/http";
import { getSessionUser } from "@/lib/auth";

const MAX_AVATAR_BYTES = 10 * 1024 * 1024; // 10 MB transport guard

/** PATCH /api/users/:id/avatar — multipart avatar upload. */
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
    return jsonMessage("You can only update your own avatar.", 403);
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return badRequest("Expected a multipart form upload.");
  }

  const entry = form.get("avatar");
  if (!(entry instanceof File))
    return badRequest("No image file was uploaded.");
  if (entry.size <= 0 || entry.size > MAX_AVATAR_BYTES) {
    return badRequest(
      "Image must be at least 1 byte and no larger than 10 MB.",
    );
  }

  try {
    const user = await UsersService.updateAvatar(targetId, {
      bytes: await entry.arrayBuffer(),
      mime: entry.type || "",
    });
    return jsonOk(user);
  } catch (error) {
    return toApiError(error);
  }
}
