import { PostsService } from "@/lib/services/posts.service";
import { clapPostSchema } from "@/lib/validations/posts.schema";
import { jsonOk, parseBody, toApiError, badRequest } from "@/lib/http";

function asId(ident: string): number | null {
  return /^\d+$/.test(ident) ? Number(ident) : null;
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ ident: string }> },
) {
  const { ident } = await params;
  const id = asId(ident);
  if (id === null) return badRequest("Invalid article id.");

  const parsed = await parseBody(req, clapPostSchema);
  if (!parsed.ok) return parsed.response;

  try {
    return jsonOk(await PostsService.clap(id, parsed.data));
  } catch (error) {
    return toApiError(error);
  }
}
