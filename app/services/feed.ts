// Standalone, type-safe API layer for the feed module.
// The feed is fully independent of the posts/news module and lives under `/feed`.
// Cookie-based authentication is handled inside `apiFetch` via `credentials: "include"`.

import { apiFetch } from "./api";

// --- Types ---

// Feed post shape returned by the feed endpoint.
export interface FeedPost {
  id: number;
  slug: string; // URL-safe slug, used for the per-post detail page
  body: string; // text content
  images: string[]; // bare feed filenames (server-driven order), empty when none
  isActive: boolean;
  createdAt: string; // ISO
  updatedAt: string; // ISO
  views: number;
  user: {
    username: string;
    avatar: string | null;
  };
}

export interface FeedPage {
  data: FeedPost[];
  meta: {
    nextCursor: number | null;
    hasNextPage: boolean;
  };
}

// Create requires a signed-in session. `images` are data-URLs (max 8).
export interface CreateFeedInput {
  body: string;
  images?: string[];
}

// Update fields where at least one should be sent. `images` are data-URLs (max 8).
export interface UpdateFeedInput {
  body?: string;
  isActive?: boolean;
  images?: string[];
}

export interface DeleteFeedResult {
  success: boolean;
  message: string;
}

// Nested (thread-style) reply node returned by the replies endpoint.
export interface ReplyNode {
  id: number;
  content: string;
  author: {
    username: string;
    avatar: string | null;
  };
  createdAt: string; // ISO
  updatedAt: string; // ISO
  isActive: boolean;
  replies: ReplyNode[]; // recursive nested
}

// Body for adding a reply; parentId nests it under another reply (infinite depth).
export interface AddReplyInput {
  content: string;
  parentId?: number;
}

// Actor used to evaluate edit/delete permissions.
export interface FeedActor {
  username: string;
  role: string;
}

// --- Permission helpers ---

export const isAdminOrMod = (user: FeedActor | null | undefined): boolean =>
  user?.role === "admin" || user?.role === "moderator";

// Can manage a feed post: owner (username match) OR admin/mod.
export const canManageFeed = (
  user: FeedActor | null | undefined,
  post: Pick<FeedPost, "user">,
): boolean => isAdminOrMod(user) || user?.username === post.user.username;

// Can manage a feed reply: author (username match) OR admin/mod.
export const canManageFeedReply = (
  user: FeedActor | null | undefined,
  author: ReplyNode["author"],
): boolean => isAdminOrMod(user) || user?.username === author.username;

// --- Reply tree helpers ---

// Recursively collect every reply (and nested child) into a flat array.
export function flattenReplies(nodes: ReplyNode[]): ReplyNode[] {
  const flat: ReplyNode[] = [];
  const walk = (list: ReplyNode[]) => {
    for (const node of list) {
      flat.push(node);
      walk(node.replies);
    }
  };
  walk(nodes);
  return flat;
}

// Count total replies and return the timestamp of the most recent one.
export function repliesMeta(nodes: ReplyNode[]): {
  count: number;
  latest: string | null;
} {
  const flat = flattenReplies(nodes);
  let latest: string | null = null;
  for (const reply of flat) {
    if (!latest || reply.createdAt > latest) latest = reply.createdAt;
  }
  return { count: flat.length, latest };
}

// --- API Methods ---

// GET /feed — first call without cursor, later ones use meta.nextCursor.
export async function getFeed(
  limit: number = 10,
  cursor?: number | null,
): Promise<FeedPage> {
  const params = new URLSearchParams();
  params.set("limit", String(Math.min(20, Math.max(1, limit))));
  if (cursor) params.set("cursor", String(cursor));

  return apiFetch(`/feed?${params.toString()}`);
}

// Activity probe results: how many new items exist and which id is newest.
export interface FeedUpdates {
  count: number;
  newestId: number | null;
}

// GET /feed/updates — how many active posts are newer than `afterId`.
// Pass the highest post id currently on screen; omit it on a cold start.
export async function getFeedUpdates(
  afterId: number = 0,
): Promise<FeedUpdates> {
  return apiFetch(`/feed/updates?afterId=${Math.max(0, afterId)}`);
}

// GET /feed/:slug — fetch a single post by its slug. Used by the per-post detail page.
export async function getFeedPostBySlug(slug: string): Promise<FeedPost> {
  return apiFetch(`/feed/${encodeURIComponent(slug)}`);
}

// POST /feed — requires a signed-in session.
export async function createFeed(input: CreateFeedInput): Promise<FeedPost> {
  return apiFetch("/feed", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

// PATCH /feed/:id — Owner OR admin/mod.
export async function updateFeed(
  id: number,
  input: UpdateFeedInput,
): Promise<FeedPost> {
  return apiFetch(`/feed/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

// DELETE /feed/:id — Soft delete (isActive: false). Owner OR admin/mod.
export async function deleteFeed(id: number): Promise<DeleteFeedResult> {
  return apiFetch(`/feed/${id}`, { method: "DELETE" });
}

// --- Replies ---

// GET /feed/:feedPostId/replies — public; returns a nested reply tree.
export async function getFeedReplies(feedPostId: number): Promise<ReplyNode[]> {
  return apiFetch(`/feed/${feedPostId}/replies`);
}

// GET /feed/:feedPostId/replies/updates — reply count + newest reply id.
// Used to detect new replies without re-downloading the whole tree.
export async function getFeedRepliesUpdates(
  feedPostId: number,
): Promise<FeedUpdates> {
  return apiFetch(`/feed/${feedPostId}/replies/updates`);
}

// A single reply plus the context needed to render its own threaded page:
// the post it belongs to and the chain of ancestors leading down to it.
export interface ReplyContext {
  reply: ReplyNode;
  post: FeedPost;
  /** Root → direct parent. Empty when the reply is top-level. */
  ancestors: ReplyNode[];
}

// GET /feed/:feedPostId/replies/:replyId — public; one reply in context.
export async function getFeedReply(
  feedPostId: number | string,
  replyId: number,
): Promise<ReplyContext> {
  return apiFetch(`/feed/${feedPostId}/replies/${replyId}`);
}

// POST /feed/:feedPostId/replies — requires a signed-in session.
// parentId (optional) nests the reply under another reply (reply-to-reply).
export async function addFeedReply(
  feedPostId: number,
  input: AddReplyInput,
): Promise<ReplyNode> {
  return apiFetch(`/feed/${feedPostId}/replies`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

// DELETE /feed/:feedPostId/replies/:replyId — Soft delete. Owner/admin/mod.
export async function deleteFeedReply(
  feedPostId: number,
  replyId: number,
): Promise<DeleteFeedResult> {
  return apiFetch(`/feed/${feedPostId}/replies/${replyId}`, {
    method: "DELETE",
  });
}

// POST /feed/:id/view — registers a genuine single visit (deduped server-side).
export async function recordFeedPostView(
  id: number,
): Promise<{ id: number; views: number }> {
  return apiFetch(`/feed/${id}/view`, { method: "POST" });
}
