import { PostsService } from "@/lib/services/posts.service";
import { createPostSchema } from "@/lib/validations/posts.schema";
import { jsonOk, jsonMessage, parseBody, toApiError } from "@/lib/http";
import { getSessionUser } from "@/lib/auth";

export async function GET() {
  const caller = await getSessionUser();
  if (!caller) return jsonMessage("You must be signed in to continue", 401);
  if (caller.role !== "admin") {
    return jsonMessage("Only admins can manage posts.", 403);
  }
  try {
    return jsonOk(await PostsService.listAll());
  } catch (error) {
    return toApiError(error);
  }
}

export async function POST(req: Request) {
  const caller = await getSessionUser();
  if (!caller) return jsonMessage("You must be signed in to continue", 401);
  if (caller.role !== "admin") {
    return jsonMessage("Only administrators may publish articles.", 403);
  }

  const parsed = await parseBody(req, createPostSchema);
  if (!parsed.ok) return parsed.response;

  try {
    const post = await PostsService.create(parsed.data, caller.id);
    return jsonOk(post, 201);
  } catch (error) {
    return toApiError(error);
  }
}
