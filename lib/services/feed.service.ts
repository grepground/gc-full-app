import { prisma } from "../db";
import { censorText } from "../censor";
import {
  buildFeedReplyTree,
  findAncestorChain,
  serializeFeedPost,
} from "../serializers";
import { uniqueFeedSlug } from "../utils";
import { resolveVisitor } from "../visits";
import {
  saveBase64Image,
  FEED_MEDIA_DIR,
  deleteStoredFeedImage,
} from "../uploads";
import { badRequestError, forbiddenError, notFoundError } from "../errors";
import type {
  SerializableFeedPage,
  SerializableFeedPost,
  SerializableFeedReply,
} from "../serializers";
import type {
  CreateFeedInput,
  CreateFeedReplyInput,
  UpdateFeedInput,
} from "../validations/feed.schema";

/**
 * Feed service.
 *
 * Owns every Prisma query/domain rule for feed posts and their threaded
 * replies. It is fully HTTP-agnostic: no request/response/cookie usage the
 * controller passes actors + primitives into these methods, which supervise
 * ownership/permissions internally.
 */

export interface Actor {
  id: number;
  role: string;
}

const postSelect = {
  id: true,
  slug: true,
  body: true,
  isActive: true,
  views: true,
  createdAt: true,
  updatedAt: true,
  user: { select: { username: true, avatar: true } },
  attachments: {
    orderBy: { position: "asc" as const },
    select: { filename: true, position: true },
  },
} as const;

const VIEW_WINDOW_MS = 24 * 60 * 60 * 1000;

function isStaff(role: string): boolean {
  return role === "admin" || role === "moderator";
}

async function findPost(id: number) {
  return prisma.feedPost.findUnique({
    where: { id },
    select: postSelect,
  });
}

async function findPostBySlug(slug: string) {
  return prisma.feedPost.findFirst({
    where: { slug, isActive: true },
    select: postSelect,
  });
}

export class FeedService {
  // -------------------------------------------------------------------------
  // Feed posts
  // -------------------------------------------------------------------------

  /** Cursor-paginated, active-only stream. */
  static async scroll(opts: {
    limit: number;
    cursor: number | null;
  }): Promise<SerializableFeedPage> {
    const where = {
      isActive: true,
      ...(opts.cursor !== null ? { id: { lt: opts.cursor } } : {}),
    };
    const postRows = await prisma.feedPost.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { username: true, avatar: true } },
        attachments: {
          orderBy: { position: "asc" },
          select: { filename: true, position: true },
        },
      },
      take: opts.limit + 1,
    });
    const hasNextPage = postRows.length > opts.limit;
    const page = postRows.slice(0, opts.limit);
    const last = page[page.length - 1];
    return {
      data: page.map(serializeFeedPost),
      meta: { nextCursor: hasNextPage && last ? last.id : null, hasNextPage },
    };
  }

  /** One post by numeric id or by slug (active only for slugs). */
  static async getByIdent(ident: string): Promise<SerializableFeedPost | null> {
    const post = /^\d+$/.test(ident)
      ? await findPost(Number(ident))
      : await findPostBySlug(ident);
    return post ? serializeFeedPost(post) : null;
  }

  /**
   * Count active posts newer than `sinceId`, plus the id of the newest one.
   *
   * Drives the "new posts available" pill without shipping any post bodies:
   * the poller only needs to know *whether* something arrived and how many, and
   * the real content is fetched when the reader actually asks for it.
   */
  static async countNewPosts(sinceId: number): Promise<{
    count: number;
    newestId: number | null;
  }> {
    const rows = await prisma.feedPost.findMany({
      where: { isActive: true, id: { gt: sinceId } },
      select: { id: true },
      orderBy: { id: "desc" },
    });
    return {
      count: rows.length,
      newestId: rows[0]?.id ?? null,
    };
  }

  /** Publish a new feed post. */
  static async create(input: CreateFeedInput, actor: Actor) {
    const body = censorText(input.body).trim();
    let slug = uniqueFeedSlug(body);
    for (let attempt = 0; attempt < 3; attempt++) {
      const taken = await prisma.feedPost.findUnique({ where: { slug } });
      if (!taken) break;
      slug = uniqueFeedSlug(body);
    }

    // Persist data-URL attachments first; skip any that fail to save.
    const filenames: string[] = [];
    for (const dataUrl of input.images ?? []) {
      const filename = await saveBase64Image(dataUrl, "feed", FEED_MEDIA_DIR);
      if (filename) filenames.push(filename);
    }

    const row = await prisma.$transaction(async (tx) => {
      const created = await tx.feedPost.create({
        data: { body, slug, userId: actor.id },
      });
      if (filenames.length) {
        await tx.feedPostImage.createMany({
          data: filenames.map((filename, position) => ({
            feedPostId: created.id,
            filename,
            position,
          })),
        });
      }
      return created;
    });

    const post = await findPost(row.id);
    if (!post) throw notFoundError("Feed post not found.");
    return serializeFeedPost(post);
  }

  /** Edit body/visibility/images. Author or staff. */
  static async update(id: number, input: UpdateFeedInput, actor: Actor) {
    const target = await prisma.feedPost.findUnique({
      where: { id },
      include: { user: { select: { id: true, username: true } } },
    });
    if (!target) throw notFoundError("Feed post not found.");
    if (!isStaff(actor.role) && actor.id !== target.user.id) {
      throw forbiddenError("You don't have permission to edit this post.");
    }

    const data: { body?: string; isActive?: boolean } = {};
    if (input.body !== undefined) data.body = censorText(input.body).trim();
    if (input.isActive !== undefined) data.isActive = input.isActive;

    // Persist incoming replacement images up front; skip any that fail to save.
    const replaceImages = input.images !== undefined;
    const newFilenames: string[] = [];
    for (const dataUrl of input.images ?? []) {
      const filename = await saveBase64Image(dataUrl, "feed", FEED_MEDIA_DIR);
      if (filename) newFilenames.push(filename);
    }

    await prisma.$transaction(async (tx) => {
      if (replaceImages) {
        const old = await tx.feedPostImage.findMany({
          where: { feedPostId: id },
          select: { filename: true },
        });
        await tx.feedPostImage.deleteMany({ where: { feedPostId: id } });
        // Best-effort cleanup of the replaced stored files.
        for (const entry of old) await deleteStoredFeedImage(entry.filename);
        if (newFilenames.length) {
          await tx.feedPostImage.createMany({
            data: newFilenames.map((filename, position) => ({
              feedPostId: id,
              filename,
              position,
            })),
          });
        }
      }
      if (Object.keys(data).length) {
        await tx.feedPost.update({ where: { id }, data });
      }
    });

    const exists = await findPost(id);
    if (!exists) throw notFoundError("Feed post not found.");
    return serializeFeedPost(exists);
  }

  /** Soft-delete a feed post. */
  static async remove(id: number, actor: Actor) {
    const target = await prisma.feedPost.findUnique({
      where: { id },
      include: { user: { select: { id: true } } },
    });
    if (!target) throw notFoundError("Feed post not found.");
    if (!isStaff(actor.role) && actor.id !== target.user.id) {
      throw forbiddenError("You don't have permission to delete this post.");
    }
    await prisma.feedPost.update({
      where: { id },
      data: { isActive: false },
    });
    return { ok: true as const, message: "Feed post deleted." };
  }

  // -------------------------------------------------------------------------
  // Feed replies (threaded)
  // -------------------------------------------------------------------------

  private static async replyTreeFor(
    postId: number,
  ): Promise<SerializableFeedReply[]> {
    const replies = await prisma.feedReply.findMany({
      where: { feedPostId: postId, isActive: true },
      orderBy: { createdAt: "asc" },
      include: { user: { select: { username: true, avatar: true } } },
    });
    return buildFeedReplyTree(
      replies as unknown as Array<
        import("@prisma/client").FeedReply & {
          user: import("@prisma/client").User;
        }
      >,
    );
  }

  private static async assertPostExists(id: number) {
    const found = await prisma.feedPost.findFirst({
      where: { id },
      select: { id: true },
    });
    if (!found) throw notFoundError("Feed post not found.");
  }

  /** Fetch the visible threaded reply list for a feed post. */
  static async getReplies(postIdent: string): Promise<SerializableFeedReply[]> {
    const id = /^\d+$/.test(postIdent) ? Number(postIdent) : null;
    if (id === null) throw notFoundError("Feed post not found.");
    await this.assertPostExists(id);
    return this.replyTreeFor(id);
  }

  /**
   * Lightweight reply-activity probe for a post.
   *
   * Returns the newest visible reply id and the total reply count so a polling
   * client can tell whether anything changed since its last check without
   * re-downloading the whole (potentially deep) reply tree.
   */
  static async getRepliesMeta(postIdent: string): Promise<{
    count: number;
    newestId: number | null;
  }> {
    const postId = /^\d+$/.test(postIdent) ? Number(postIdent) : null;
    if (postId === null) throw notFoundError("Feed post not found.");
    await this.assertPostExists(postId);

    const [count, newest] = await Promise.all([
      prisma.feedReply.count({
        where: { feedPostId: postId, isActive: true },
      }),
      prisma.feedReply.findFirst({
        where: { feedPostId: postId, isActive: true },
        orderBy: { id: "desc" },
        select: { id: true },
      }),
    ]);

    return { count, newestId: newest?.id ?? null };
  }

  /**
   * Resolve a single reply together with the post it belongs to and the chain
   * of ancestors above it. Powers the per-reply detail page, so a reply can be
   * opened (and answered) on its own URL the way a Threads post can.
   */
  static async getReplyContext(
    postIdent: string,
    replyId: number,
  ): Promise<{
    reply: SerializableFeedReply;
    post: SerializableFeedPost;
    ancestors: SerializableFeedReply[];
  }> {
    const postId = /^\d+$/.test(postIdent) ? Number(postIdent) : null;
    if (postId === null) throw notFoundError("Feed post not found.");

    const post = await findPost(postId);
    if (!post || !post.isActive) throw notFoundError("Feed post not found.");

    const reply = await prisma.feedReply.findFirst({
      where: { id: replyId, feedPostId: postId, isActive: true },
      select: { id: true },
    });
    if (!reply) throw notFoundError("Reply not found.");

    // Walk the full tree once, then locate the target path inside it. A reply
    // is only reachable through an active parent chain, so a hidden ancestor
    // correctly makes the whole branch unresolvable.
    const tree = await this.replyTreeFor(postId);
    const chain = findAncestorChain(tree, replyId);
    if (!chain) throw notFoundError("Reply not found.");

    return {
      reply: chain[chain.length - 1],
      post: serializeFeedPost(post),
      // Everything above the focused reply, root first.
      ancestors: chain.slice(0, -1),
    };
  }

  /** Add a reply (or nested reply under `parentId`). */
  static async addReply(
    postIdent: string,
    input: CreateFeedReplyInput,
    actor: Actor,
  ) {
    const id = /^\d+$/.test(postIdent) ? Number(postIdent) : null;
    if (id === null) throw notFoundError("Feed post not found.");
    await this.assertPostExists(id);

    const parentId = input.parentId ?? null;
    if (parentId !== null) {
      const parent = await prisma.feedReply.findUnique({
        where: { id: parentId },
      });
      if (!parent || parent.feedPostId !== id || !parent.isActive) {
        throw badRequestError(
          "Parent reply does not belong to this feed post.",
        );
      }
    }

    const created = await prisma.feedReply.create({
      data: {
        content: censorText(input.content),
        feedPostId: id,
        userId: actor.id,
        parentId,
      },
    });

    return {
      id: created.id,
      feedPostId: id,
      success: true as const,
      message: "Reply posted.",
    };
  }

  /** Soft-delete a single reply. */
  static async removeReply(postIdent: string, replyId: number, actor: Actor) {
    const postId = /^\d+$/.test(postIdent) ? Number(postIdent) : null;
    if (postId === null) throw badRequestError("Invalid feed post id.");

    const reply = await prisma.feedReply.findUnique({
      where: { id: replyId },
      include: { user: { select: { id: true } } },
    });
    if (!reply || reply.feedPostId !== postId) {
      throw notFoundError("Reply not found.");
    }
    if (!isStaff(actor.role) && actor.id !== reply.user.id) {
      throw forbiddenError("You don't have permission to delete this reply.");
    }
    await prisma.feedReply.update({
      where: { id: replyId },
      data: { isActive: false },
    });
    return { id: replyId, success: true as const, message: "Reply deleted." };
  }

  /**
   * Register a view for a feed post (numeric id or slug). Each visitor counts
   * at most once within a rolling 24h window per feed post.
   */
  static async registerView(
    ident: string,
    actorId: number | null,
    ip: string | null | undefined,
  ) {
    const id = /^\d+$/.test(ident) ? Number(ident) : null;
    const feedPost = await prisma.feedPost.findFirst({
      where: {
        isActive: true,
        ...(id !== null ? { id } : { slug: ident }),
      },
      select: { id: true, views: true },
    });
    if (!feedPost) throw notFoundError("Feed post not found.");

    const fingerprint = resolveVisitor(ip, actorId);
    const postResult = { id: feedPost.id, views: feedPost.views };

    return prisma.$transaction(async (tx) => {
      const existing = await tx.feedPostVisit.findUnique({
        where: {
          feedPostId_fingerprint: { feedPostId: feedPost.id, fingerprint },
        },
      });
      if (existing && existing.countedThrough.getTime() > Date.now()) {
        return postResult;
      }

      const countedThrough = new Date(Date.now() + VIEW_WINDOW_MS);
      await tx.feedPostVisit.upsert({
        where: {
          feedPostId_fingerprint: { feedPostId: feedPost.id, fingerprint },
        },
        create: { feedPostId: feedPost.id, fingerprint, countedThrough },
        update: { countedThrough },
      });
      const updated = await tx.feedPost.update({
        where: { id: feedPost.id },
        data: { views: { increment: 1 } },
        select: { id: true, views: true },
      });
      return updated;
    });
  }
}
