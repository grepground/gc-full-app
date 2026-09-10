import { PostsService } from "@/lib/services/posts.service";
import { postsScrollQuerySchema } from "@/lib/validations/posts.schema";
import { jsonOk, jsonMessage, toApiError } from "@/lib/http";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const query = postsScrollQuerySchema.safeParse(
    Object.fromEntries(url.searchParams.entries()),
  );

  if (!query.success) {
    return jsonMessage("Invalid pagination parameters.", 400);
  }

  try {
    const posts = await PostsService.scroll({
      limit: query.data.limit ?? 5,
      cursor: query.data.cursor ?? null,
    });
    return jsonOk(posts);
  } catch (error) {
    return toApiError(error);
  }
}
