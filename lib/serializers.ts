import type {
  Post,
  User,
  FeedPost,
  FeedPostImage,
  FeedReply,
  Comment,
} from "@prisma/client";

const toIso = (d: Date) => d.toISOString();

// ---------------------------------------------------------------------------
// News / posts
// ---------------------------------------------------------------------------

export type AuthorMeta = { username: string; avatar: string | null };

export type SerializableComment = {
  id: number;
  content: string;
  postId: number;
  userId: number;
  parentId: number | null;
  createdAt: string;
  user: AuthorMeta;
  replies: SerializableComment[];
};

export type SerializablePost = {
  id: number;
  slug: string;
  title: string;
  category: string;
  excerpt: string;
  content: string;
  coverImage: string | null;
  claps: number;
  views: number;
  userId: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

type FeatPostMinimal = {
  id: number;
  slug: string;
  title: string;
  category: string;
  excerpt: string;
  content: string;
  coverImage: string | null;
  claps: number;
  views: number;
  userId: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

/**
 * Serialize a Post fetched with just its scalar fields. This is the exact shape
 * used by pages that render the news listing / article pages.
 */
export function serializePost(post: FeatPostMinimal): SerializablePost {
  return {
    id: post.id,
    slug: post.slug,
    title: post.title,
    category: post.category,
    excerpt: post.excerpt,
    content: post.content,
    coverImage: post.coverImage,
    claps: post.claps,
    views: post.views,
    userId: post.userId,
    isActive: post.isActive,
    createdAt: toIso(post.createdAt),
    updatedAt: toIso(post.updatedAt),
  };
}

/** CommentUser narrow selection helper because Prisma types are awkward here. */
export type CommentUserRow = User;

function commentAuthor(user: AuthorMeta): AuthorMeta {
  return { username: user.username, avatar: user.avatar };
}

/** Nest flat comment rows (already joined against their `user`) into a tree. */
export function buildCommentTree(
  rows: Array<Comment & { user: User }>,
): SerializableComment[] {
  const byId = new Map<number, Comment & { user: User }>();
  for (const row of rows) byId.set(row.id, row);

  const result: SerializableComment[] = [];

  const toNode = (row: Comment & { user: User }): SerializableComment => ({
    id: row.id,
    content: row.content,
    postId: row.postId,
    userId: row.userId,
    parentId: row.parentId,
    createdAt: toIso(row.createdAt),
    user: commentAuthor(row.user),
    replies: [],
  });

  // First pass: create a node per row.
  const nodes = new Map<number, SerializableComment>();
  for (const row of rows) nodes.set(row.id, toNode(row));

  // Second pass: attach children under their parent.
  for (const row of rows) {
    const node = nodes.get(row.id)!;
    if (row.parentId !== null && nodes.has(row.parentId)) {
      nodes.get(row.parentId)!.replies.push(node);
    } else {
      result.push(node);
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// Feed
// ---------------------------------------------------------------------------

export type SerializableFeedPost = {
  id: number;
  slug: string;
  body: string;
  images: string[];
  isActive: boolean;
  views: number;
  createdAt: string;
  updatedAt: string;
  user: AuthorMeta;
};

export type SerializableFeedReply = {
  id: number;
  content: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  author: AuthorMeta;
  replies: SerializableFeedReply[];
};

/** Serialized feed row used by the React layer for feed rendering. */
export type FeedRowWithAuthor = {
  id: number;
  slug: string;
  body: string;
  isActive: boolean;
  views: number;
  createdAt: Date;
  updatedAt: Date;
  user: Pick<User, "username" | "avatar">;
  attachments: Array<Pick<FeedPostImage, "filename" | "position">>;
};

/** Serialize a FeedPost with its joined user and ordered attachments. */
export function serializeFeedPost(
  post: FeedRowWithAuthor,
): SerializableFeedPost {
  const images = [...post.attachments]
    .sort((a, b) => a.position - b.position)
    .map((a) => a.filename);
  return {
    id: post.id,
    slug: post.slug,
    body: post.body,
    images,
    isActive: post.isActive,
    views: post.views,
    createdAt: toIso(post.createdAt),
    updatedAt: toIso(post.updatedAt),
    user: { username: post.user.username, avatar: post.user.avatar },
  };
}

/**
 * Build a threaded reply tree for the feed. Rows are expected to already be
 * filtered to visible (isActive) nodes.
 */
export function buildFeedReplyTree(
  rows: Array<
    FeedReply & {
      user: Pick<User, "username" | "avatar">;
    }
  >,
): SerializableFeedReply[] {
  type Row = FeedReply & { user: Pick<User, "username" | "avatar"> };

  const nodes = new Map<number, SerializableFeedReply>();
  for (const row of rows) {
    nodes.set(row.id, {
      id: row.id,
      content: row.content,
      isActive: row.isActive,
      createdAt: toIso(row.createdAt),
      updatedAt: toIso(row.updatedAt),
      author: { username: row.user.username, avatar: row.user.avatar },
      replies: [],
    });
  }

  const roots: SerializableFeedReply[] = [];
  for (const row of rows) {
    const node = nodes.get(row.id)!;
    if (row.parentId !== null && nodes.has(row.parentId)) {
      nodes.get(row.parentId)!.replies.push(node);
    } else {
      roots.push(node);
    }
  }
  return roots;
}

export type MinimalFeedRow = FeedPost & {
  user: Pick<User, "username" | "avatar">;
  attachments: Array<Pick<FeedPostImage, "filename" | "position">>;
};

/**
 * Locate a reply inside a built tree and return the path from the root down to
 * it (the target itself is the last element). Returns `null` when the id is not
 * present in the tree.
 */
export function findAncestorChain(
  nodes: SerializableFeedReply[],
  targetId: number,
): SerializableFeedReply[] | null {
  for (const node of nodes) {
    if (node.id === targetId) return [node];
    const below = findAncestorChain(node.replies, targetId);
    if (below) return [node, ...below];
  }
  return null;
}

export type SerializableFeedPage = {
  data: SerializableFeedPost[];
  meta: { nextCursor: number | null; hasNextPage: boolean };
};
