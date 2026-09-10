import { prisma } from "../db";
import { buildCommentTree } from "../serializers";
import { badRequestError, forbiddenError, notFoundError } from "../errors";
import type { SerializableComment } from "../serializers";
import type { CreateCommentInput } from "../validations/comments.schema";

/**
 * Article Comments service.
 *
 * Owns threaded comment queries/mutations for the news/posts module and stays
 * fully HTTP-agnostic: no request/response/cookie access. The controller maps an
 * article `ident` (numeric id or slug), actor id/role, and validated body into
 * these methods.
 */

export interface Actor {
  id: number;
  role: string;
}

async function resolvePostId(ident: string): Promise<number | null> {
  if (/^\d+$/.test(ident)) {
    const found = await prisma.post.findFirst({
      where: { id: Number(ident) },
      select: { id: true },
    });
    return found ? found.id : null;
  }
  const bySlug = await prisma.post.findFirst({
    where: { slug: ident },
    select: { id: true },
  });
  return bySlug ? bySlug.id : null;
}

export class CommentsService {
  /** The full nested comment tree for an article (public). */
  static async getTreeForPost(
    articleIdent: string,
  ): Promise<SerializableComment[]> {
    const postId = await resolvePostId(articleIdent);
    if (!postId) throw notFoundError("Article not found.");

    const comments = await prisma.comment.findMany({
      where: { postId },
      orderBy: { createdAt: "asc" },
      include: { user: { select: { username: true, avatar: true } } },
    });
    return buildCommentTree(
      comments as unknown as Array<
        import("@prisma/client").Comment & {
          user: import("@prisma/client").User;
        }
      >,
    );
  }

  /** Add a top-level comment or a nested reply. `actor` must be the author. */
  static async addComment(
    articleIdent: string,
    input: CreateCommentInput,
    actor: Actor,
  ) {
    const postId = await resolvePostId(articleIdent);
    if (!postId) throw notFoundError("Article not found.");

    const parentId = input.parentId ?? null;
    if (parentId !== null) {
      const parent = await prisma.comment.findUnique({ where: { id: parentId } });
      if (!parent || parent.postId !== postId) {
        throw badRequestError("Parent comment does not belong to this article.");
      }
    }

    const created = await prisma.comment.create({
      data: {
        content: input.content,
        postId,
        userId: actor.id,
        parentId,
      },
    });
    return {
      id: created.id,
      postId: created.postId,
      success: true as const,
      message: "Comment posted.",
    };
  }

  /** Remove a comment (physical; children cascade). Author or staff only. */
  static async deleteComment(
    articleIdent: string,
    commentId: number,
    actor: Actor,
  ) {
    const postId = await resolvePostId(articleIdent);
    if (!postId) throw notFoundError("Article not found.");

    const target = await prisma.comment.findUnique({
      where: { id: commentId },
      select: { id: true, postId: true, userId: true },
    });
    if (!target || target.postId !== postId) {
      throw notFoundError("Comment not found.");
    }

    const isStaff = actor.role === "admin" || actor.role === "moderator";
    if (!isStaff && actor.id !== target.userId) {
      throw forbiddenError("You don't have permission to delete this comment.");
    }

    await prisma.comment.delete({ where: { id: target.id } });
    return { id: target.id, success: true as const, message: "Comment deleted." };
  }
}
