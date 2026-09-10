import { prisma } from "../db";
import { serializePost } from "../serializers";
import { resolveVisitor } from "../visits";
import { NEWS_COVER_DIR, saveBase64Image } from "../uploads";
import { uniqueNewsSlug } from "../utils";
import { badRequestError, forbiddenError, notFoundError } from "../errors";
import type { SerializablePost } from "../serializers";
import type {
  ClapPostInput,
  CreatePostInput,
  UpdatePostInput,
} from "../validations/posts.schema";

/**
 * Posts (news articles) service.
 *
 * Owns every Prisma query + domain rule for articles and is fully HTTP-agnostic:
 * it never reads cookies/requests nor returns responses. Callers provide the
 * actor (`{ id, role }`) from their own auth boundary and the service performs
 * its own ownership/role checks.
 */

export interface PostActor {
  id: number;
  role: string;
}

export type PostScrollResult = {
  data: SerializablePost[];
  meta: { nextCursor: number | null; hasNextPage: boolean };
};

const POST_ORDER = { createdAt: "desc" as const };

export class PostsService {
  private static isStaff(role: string): boolean {
    return role === "admin" || role === "moderator";
  }

  private static readonly VIEW_WINDOW_MS = 24 * 60 * 60 * 1000;

  // --------------------------------------------------------------------------
  // Reads
  // --------------------------------------------------------------------------

  /** Admin dashboard — every row, active or not. */
  static async listAll(): Promise<SerializablePost[]> {
    const posts = await prisma.post.findMany({ orderBy: POST_ORDER });
    return posts.map(serializePost);
  }

  /** Public cursor-paginated stream of active articles. */
  static async scroll(opts: {
    limit: number;
    cursor: number | null;
  }): Promise<PostScrollResult> {
    const where = {
      isActive: true,
      ...(opts.cursor !== null ? { id: { lt: opts.cursor } } : {}),
    };
    const rows = await prisma.post.findMany({
      where,
      orderBy: POST_ORDER,
      take: opts.limit + 1,
    });
    const hasNextPage = rows.length > opts.limit;
    const page = rows.slice(0, opts.limit);
    const last = page[page.length - 1];
    return {
      data: page.map(serializePost),
      meta: { nextCursor: hasNextPage && last ? last.id : null, hasNextPage },
    };
  }

  /** Find one active article by numeric id OR slug. Null when absent. */
  static async getByIdent(ident: string): Promise<SerializablePost | null> {
    const id = /^\d+$/.test(ident) ? Number(ident) : null;
    const post = await prisma.post.findFirst({
      where: {
        isActive: true,
        ...(id !== null ? { id } : { slug: ident }),
      },
      orderBy: POST_ORDER,
    });
    return post ? serializePost(post) : null;
  }

  // --------------------------------------------------------------------------
  // Mutations
  // --------------------------------------------------------------------------

  /** Author an article (persists optional base64 cover to disk). */
  static async create(input: CreatePostInput, authorId: number) {
    let coverImage: string | null = null;
    if (input.coverImage) {
      const stored = await saveBase64Image(
        input.coverImage,
        "news",
        NEWS_COVER_DIR,
      );
      if (!stored) {
        throw badRequestError("Cover image is not a supported image type.");
      }
      coverImage = stored;
    }

    const post = await prisma.post.create({
      data: {
        slug: uniqueNewsSlug(input.title),
        title: input.title,
        category: input.category,
        excerpt: input.excerpt,
        content: input.content,
        coverImage,
        userId: authorId,
      },
    });
    return serializePost(post);
  }

  /**
   * Update an article. Members can only edit their own; staff may edit any.
   * Changing the title rotates the slug (when different) so the canonical URL
   * stays unique.
   */
  static async update(ident: number, input: UpdatePostInput, actor: PostActor) {
    const target = await prisma.post.findUnique({ where: { id: ident } });
    if (!target) throw notFoundError("Article not found.");
    if (!this.isStaff(actor.role) && actor.id !== target.userId) {
      throw forbiddenError("You don't have permission to edit this article.");
    }

    const data: {
      title?: string;
      excerpt?: string;
      content?: string;
      slug?: string;
    } = {};

    if (input.title !== undefined) {
      if (target.title.toLowerCase() !== input.title.toLowerCase()) {
        data.slug = uniqueNewsSlug(input.title);
      }
      data.title = input.title;
    }
    if (input.excerpt !== undefined) data.excerpt = input.excerpt;
    if (input.content !== undefined) data.content = input.content;

    const updated =
      Object.keys(data).length > 0
        ? await prisma.post.update({ where: { id: ident }, data })
        : target;

    return serializePost(updated);
  }

  /** Soft-delete an article (owner or staff). */
  static async softDelete(ident: number, actor: PostActor) {
    const target = await prisma.post.findUnique({ where: { id: ident } });
    if (!target) throw notFoundError("Article not found.");
    if (!this.isStaff(actor.role) && actor.id !== target.userId) {
      throw forbiddenError("You don't have permission to delete this article.");
    }
    await prisma.post.update({
      where: { id: ident },
      data: { isActive: false },
    });
    return { ok: true as const, message: "Article deleted." };
  }

  /** Clap aggregation (public). Persists the cumulative increment atomically. */
  static async clap(id: number, input: ClapPostInput) {
    const post = await prisma.post.findUnique({
      where: { id, isActive: true },
      select: { id: true },
    });
    if (!post) throw notFoundError("Article not found.");

    const updated = await prisma.post.update({
      where: { id },
      data: {
        claps: { increment: Math.min(50, Math.floor(input.clapsIncrement)) },
      },
      select: { id: true, claps: true },
    });
    return updated;
  }

  /**
   * Register a view for an article (numeric id or slug). Each visitor counts
   * at most once within a rolling 24h window per article.
   */
  static async registerView(
    ident: string,
    actorId: number | null,
    ip: string | null | undefined,
  ) {
    const id = /^\d+$/.test(ident) ? Number(ident) : null;
    const post = await prisma.post.findFirst({
      where: {
        isActive: true,
        ...(id !== null ? { id } : { slug: ident }),
      },
      select: { id: true, views: true },
    });
    if (!post) throw notFoundError("Article not found.");

    const fingerprint = resolveVisitor(ip, actorId);
    const postResult = { id: post.id, views: post.views };

    return prisma.$transaction(async (tx) => {
      const existing = await tx.postVisit.findUnique({
        where: { postId_fingerprint: { postId: post.id, fingerprint } },
      });
      if (existing && existing.countedThrough.getTime() > Date.now()) {
        return postResult;
      }

      const countedThrough = new Date(Date.now() + this.VIEW_WINDOW_MS);
      await tx.postVisit.upsert({
        where: { postId_fingerprint: { postId: post.id, fingerprint } },
        create: { postId: post.id, fingerprint, countedThrough },
        update: { countedThrough },
      });
      const updated = await tx.post.update({
        where: { id: post.id },
        data: { views: { increment: 1 } },
        select: { id: true, views: true },
      });
      return updated;
    });
  }
}
