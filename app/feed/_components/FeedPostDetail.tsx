"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useAuth } from "../../context/AuthContext";
import { memberProfileHref } from "../../services/profile";
import {
  FeedPost,
  ReplyNode,
  addFeedReply,
  deleteFeed,
  getFeedReplies,
  getFeedRepliesUpdates,
  recordFeedPostView,
  updateFeed,
  canManageFeed,
} from "../../services/feed";
import FeedEditor from "./FeedEditor";
import FeedImageCarousel from "./FeedImageCarousel";
import ReplyThread from "./ReplyThread";
import NewContentButton from "./NewContentButton";
import { useNewContentWatch } from "./hooks/useNewContentWatch";
import UserAvatar from "../../components/common/UserAvatar";

interface FeedPostDetailProps {
  initialPost: FeedPost;
}

const REPLIES_POLL_MS = 25000;

/** Highest reply id anywhere in the tree (0 when there are no replies yet). */
function highestReplyId(nodes: ReplyNode[]): number {
  let max = 0;
  const walk = (list: ReplyNode[]) => {
    for (const node of list) {
      if (node.id > max) max = node.id;
      walk(node.replies);
    }
  };
  walk(nodes);
  return max;
}

export default function FeedPostDetail({ initialPost }: FeedPostDetailProps) {
  const { user } = useAuth();
  const [post, setPost] = useState<FeedPost>(initialPost);
  const [views, setViews] = useState<number>(initialPost.views ?? 0);
  const viewLoggedRef = useRef<boolean>(false);

  // Edit state
  const [editing, setEditing] = useState<boolean>(false);
  const [editBody, setEditBody] = useState<string>(initialPost.body);
  const [editActive, setEditActive] = useState<boolean>(initialPost.isActive);
  const [saving, setSaving] = useState<boolean>(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Delete state
  const [confirmDelete, setConfirmDelete] = useState<boolean>(false);
  const [deleting, setDeleting] = useState<boolean>(false);
  const [redirecting, setRedirecting] = useState<boolean>(false);

  // Replies state
  const [replies, setReplies] = useState<ReplyNode[]>([]);
  const [repliesLoading, setRepliesLoading] = useState<boolean>(true);
  const [topLevelReply, setTopLevelReply] = useState<string>("");
  const [submittingReply, setSubmittingReply] = useState<boolean>(false);

  const canManage = canManageFeed(user, post);
  const canReply = !!user;

  const loadReplies = useCallback(async () => {
    setRepliesLoading(true);
    try {
      const data = await getFeedReplies(post.id);
      setReplies(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load replies:", err);
      setReplies([]);
    } finally {
      setRepliesLoading(false);
    }
  }, [post.id]);

  useEffect(() => {
    loadReplies();
  }, [loadReplies]);

  /**
   * Highest reply id currently rendered — the "seen up to here" marker. When
   * the reply list refreshes this advances, which resets the pill.
   */
  const highestSeenReplyId = highestReplyId(replies);

  // The probe reports the newest reply id; anything beyond the rendered marker
  // means replies arrived while the reader was here. We surface it as a single
  // "new replies" prompt rather than a count, because the probe deliberately
  // does not download the tree — claiming an exact number we have not verified
  // would be a lie.
  const probeReplyUpdates = useCallback(
    async (afterId: number) => {
      const meta = await getFeedRepliesUpdates(post.id);
      const hasNew = meta.newestId !== null && meta.newestId > afterId;
      return { count: hasNew ? 1 : 0, newestId: meta.newestId };
    },
    [post.id],
  );

  const pendingReplies = useNewContentWatch({
    probe: probeReplyUpdates,
    baseline: highestSeenReplyId,
    enabled: !repliesLoading && replies.length > 0,
    intervalMs: REPLIES_POLL_MS,
  });

  const [refreshingReplies, setRefreshingReplies] = useState<boolean>(false);

  const loadNewReplies = async () => {
    if (refreshingReplies) return;
    setRefreshingReplies(true);
    try {
      await loadReplies();
    } finally {
      setRefreshingReplies(false);
    }
  };

  // Register a genuine single visit per page open (deduped server-side).
  useEffect(() => {
    if (viewLoggedRef.current) return;
    viewLoggedRef.current = true;
    recordFeedPostView(post.id)
      .then((result) => setViews(result.views))
      .catch((error) => console.error("Failed to record view:", error));
  }, [post.id]);

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  /** Short "how long ago" stamp for the hero meta row. */
  const relativeTime = (dateString: string) => {
    const then = new Date(dateString).getTime();
    if (Number.isNaN(then)) return "";

    const seconds = Math.max(0, Math.floor((Date.now() - then) / 1000));

    // Saniye cinsinden eşikler ve etiketler
    const thresholds: { limit: number; div: number; label: string }[] = [
      { limit: 60, div: 1, label: "s" },
      { limit: 3600, div: 60, label: "m" },
      { limit: 86400, div: 3600, label: "h" },
      { limit: 604800, div: 86400, label: "d" },
      { limit: 2629800, div: 604800, label: "w" }, // ~4.35 hafta
    ];

    for (const { limit, div, label } of thresholds) {
      if (seconds < limit) {
        return `${Math.floor(seconds / div)}${label} ago`;
      }
    }

    // 1 aydan daha eski tarihler için (hafta sınırını aşınca)
    const months = Math.floor(seconds / 2629800);
    return `${months}mo ago`;
  };

  const saveEdit = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      const updated = await updateFeed(post.id, {
        body: editBody,
        isActive: editActive,
      });
      setPost(updated);
      setEditing(false);
    } catch (err: any) {
      setSaveError(err.message || "Failed to update post.");
    } finally {
      setSaving(false);
    }
  };

  const removePost = async () => {
    setDeleting(true);
    try {
      await deleteFeed(post.id);
      setRedirecting(true);
      // Soft delete — bounce back to the feed
      window.location.href = "/feed";
    } catch (err: any) {
      alert(err.message || "Failed to delete post.");
      setConfirmDelete(false);
    } finally {
      setDeleting(false);
    }
  };

  const submitTopLevelReply = async () => {
    if (!topLevelReply.trim()) return;
    setSubmittingReply(true);
    try {
      await addFeedReply(post.id, { content: topLevelReply });
      setTopLevelReply("");
      await loadReplies();
    } catch (err: any) {
      alert(err.message || "Failed to add reply.");
    } finally {
      setSubmittingReply(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 py-8 px-4 text-chess-text">
      {/* Back Link */}
      <Link
        href="/feed"
        className="inline-flex items-center gap-2 text-xs font-black text-chess-text/60 hover:text-chess-primary transition-colors"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M10 19l-7-7m0 0l7-7m-7 7h18"
          />
        </svg>
        Back to Feed
      </Link>

      {/* Post */}
      <article className="relative overflow-hidden bg-chess-surface rounded-3xl ring-1 ring-chess-border/15 animate-[fade-up_0.4s_ease-out] [box-shadow:0_18px_50px_-30px_rgba(0,0,0,0.9)]">
        {/* Soft ambient wash so the card doesn't read as a flat grey slab */}
        <div
          aria-hidden
          className="pointer-events-none absolute -top-24 -right-16 w-56 h-56 rounded-full bg-chess-primary/10 blur-3xl"
        />

        <div className="relative p-5 md:p-8 flex flex-col gap-5">
          {/* Author row */}
          <div className="flex items-center gap-3.5">
            <Link
              href={memberProfileHref(post.user.username)}
              className="shrink-0 rounded-full ring-2 ring-chess-primary/25 transition-all hover:ring-chess-primary/70 focus-visible:ring-2 focus-visible:ring-chess-primary focus:outline-none"
              aria-label={`View ${post.user.username}'s profile`}
            >
              <UserAvatar
                avatar={post.user.avatar}
                username={post.user.username}
                className="w-14 h-14 text-lg"
                sizes="56px"
              />
            </Link>
            <div className="flex flex-col min-w-0">
              <Link
                href={memberProfileHref(post.user.username)}
                className="truncate min-w-0 hover:text-chess-primary transition-colors"
              >
                <span className="text-chess-text/90 truncate font-black text-base lg:text-lg">
                  {post.user.username}
                </span>
              </Link>
              <span
                className="text-[11px] font-bold text-chess-text/40"
                title={formatDateTime(post.createdAt)}
              >
                {relativeTime(post.createdAt)}
                <span className="text-chess-text/20"> · </span>
                <span>{views} views</span>
              </span>
            </div>
            <div className="ml-auto flex items-center gap-2">
              {canManage && !editing && (
                <>
                  <button
                    type="button"
                    onClick={() => setEditing(true)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-chess-bg/80 font-black text-chess-text/60 hover:text-chess-primary hover:bg-chess-primary/10 transition-colors text-xs cursor-pointer select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-chess-primary/60"
                  >
                    <svg
                      className="w-3.5 h-3.5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                      viewBox="0 0 24 24"
                      aria-hidden
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M16.86 4.49a1.9 1.9 0 1 1 2.65 2.65L7.5 19.15l-3.5 1 1-3.5L16.86 4.49z"
                      />
                    </svg>
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(true)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-chess-bg/80 font-black text-red-400/70 hover:text-red-400 hover:bg-red-500/10 transition-colors text-xs cursor-pointer select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400/60"
                  >
                    <svg
                      className="w-3.5 h-3.5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                      viewBox="0 0 24 24"
                      aria-hidden
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M4 7h16M9 7V5h6v2m-8 0 1 12h8l1-12"
                      />
                    </svg>
                    Delete
                  </button>
                </>
              )}
            </div>
          </div>

          {saveError && (
            <div className="bg-red-500/10 px-4 py-3 rounded-xl text-xs font-black text-red-400">
              {saveError}
            </div>
          )}

          {/* Media — prominent, centered under the author row (viewing only) */}
          {!editing && (post.images ?? []).length > 0 && (
            <div className="w-full">
              <FeedImageCarousel
                images={post.images ?? []}
                alt={`${post.user.username}'s post`}
                aspectClass="aspect-[16/10]"
              />
            </div>
          )}

          {/* Body or edit form */}
          {editing ? (
            <FeedEditor
              value={editBody}
              onChange={setEditBody}
              isActive={editActive}
              onActiveChange={setEditActive}
              submitting={saving}
              submitLabel={saving ? "Saving..." : "Save changes"}
              onCancel={() => {
                setEditBody(post.body);
                setEditActive(post.isActive);
                setSaveError(null);
                setEditing(false);
              }}
              onSubmit={saveEdit}
            />
          ) : (
            <p className="text-[17px] md:text-xl font-semibold text-chess-text/90 leading-[1.75] whitespace-pre-wrap wrap-break-word">
              {post.body}
            </p>
          )}

          {confirmDelete && (
            <div className="bg-red-500/5 border border-red-500/15 px-4 py-3 rounded-xl space-y-2">
              <p className="text-xs font-bold text-chess-text/60">
                Delete this post? It will be hidden (soft delete).
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={removePost}
                  disabled={deleting || redirecting}
                  className="bg-red-500 text-white text-[11px] font-black px-3 py-1.5 rounded-lg hover:bg-red-600 transition-colors cursor-pointer disabled:opacity-50"
                >
                  {deleting ? "Deleting..." : "Delete"}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="text-[11px] font-black text-chess-text/40 hover:text-chess-text transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </article>

      {/* Replies */}
      {!editing && (
        <section
          id="replies"
          className="bg-chess-surface rounded-3xl ring-1 ring-chess-border/15 overflow-hidden animate-[fade-up_0.5s_ease-out]"
        >
          <div className="relative">
            {/* New-replies pill — hidden unless the probe found something */}
            <NewContentButton
              count={pendingReplies.count}
              onClick={loadNewReplies}
              loading={refreshingReplies}
              label="new replies"
              hideCount
            />

            {/* Panel header */}
            <div className="flex items-center gap-2.5 px-5 md:px-6 pt-5 pb-4 border-b border-chess-border/10">
              <h3 className="text-sm font-black text-chess-text tracking-tight">
                Replies
              </h3>
              <span className="inline-flex items-center justify-center min-w-6 h-6 px-1.5 rounded-full bg-chess-bg text-[11px] font-black text-chess-text/60 tabular-nums">
                {replies.length}
              </span>
              <div className="ml-auto">
                <NewContentButton
                  count={0}
                  onClick={loadNewReplies}
                  label="new replies"
                  hideCount
                />
              </div>
            </div>

            <div className="px-3.5 md:px-5 py-4 space-y-4">
              {canReply ? (
                <div className="flex items-start gap-3">
                  <UserAvatar
                    avatar={user.avatar}
                    username={user.username ?? "You"}
                    className="hidden sm:block w-9 h-9 text-sm shrink-0 mt-1"
                    sizes="36px"
                  />
                  <div className="flex-1 min-w-0 rounded-2xl bg-chess-bg/70 ring-1 ring-chess-border/20 transition-all focus-within:ring-chess-primary/60 focus-within:bg-chess-bg">
                    <textarea
                      value={topLevelReply}
                      onChange={(e) => setTopLevelReply(e.target.value)}
                      onKeyDown={(e) => {
                        if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                          e.preventDefault();
                          submitTopLevelReply();
                        }
                      }}
                      rows={1}
                      placeholder="Share your thoughts…"
                      className="w-full bg-transparent px-4 pt-4 pb-2 text-[15px] font-semibold text-chess-text placeholder:text-chess-text/30 focus:outline-none resize-y min-h-[112px] leading-relaxed"
                    />
                    <div className="flex items-center justify-between gap-3 px-3 pb-3">
                      <span className="text-[11px] font-bold text-chess-text/30 select-none hidden sm:inline">
                        ⌘ / Ctrl + Enter to send
                      </span>
                      <span className="text-[11px] font-bold text-chess-text/30 sm:hidden" />
                      <div className="flex items-center gap-2">
                        {topLevelReply.trim() && (
                          <button
                            type="button"
                            onClick={() => setTopLevelReply("")}
                            className="text-[13px] font-black text-chess-text/40 hover:text-chess-text/80 transition-colors cursor-pointer px-2 py-1.5"
                          >
                            Clear
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={submitTopLevelReply}
                          disabled={submittingReply || !topLevelReply.trim()}
                          className="inline-flex items-center gap-1.5 bg-chess-primary text-chess-surface text-[13px] font-black px-5 py-2 rounded-full hover:opacity-90 active:scale-95 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          {submittingReply ? (
                            <>
                              <span className="w-3.5 h-3.5 rounded-full border-2 border-chess-surface/40 border-t-chess-surface animate-spin" />
                              Posting
                            </>
                          ) : (
                            <>
                              <svg
                                className="w-4 h-4"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth={2}
                                viewBox="0 0 24 24"
                                aria-hidden
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M5 12h13M13 6l6 6-6 6"
                                />
                              </svg>
                              Reply
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-center text-xs font-bold text-chess-text/40 py-2">
                  Sign in to join the conversation.
                </p>
              )}

              <div className="h-px bg-chess-border/8" />

              {repliesLoading ? (
                <div className="space-y-3 py-2">
                  {[0, 1].map((i) => (
                    <div
                      key={i}
                      className="flex items-start gap-3 animate-pulse"
                    >
                      <div className="w-9 h-9 rounded-full bg-chess-bg shrink-0" />
                      <div className="flex-1 space-y-2 pt-1">
                        <div className="h-2.5 w-28 rounded-full bg-chess-bg" />
                        <div className="h-2.5 w-full rounded-full bg-chess-bg/70" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : replies.length === 0 ? (
                <div className="text-center py-6 space-y-1">
                  <p className="text-2xl">💬</p>
                  <p className="text-xs font-black text-chess-text/40">
                    No replies yet
                  </p>
                  <p className="text-[11px] font-bold text-chess-text/25">
                    Be the first to share what you think.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-chess-border/8">
                  {replies.map((reply) => (
                    <ReplyThread
                      key={reply.id}
                      feedPostId={post.id}
                      postSlug={post.slug}
                      reply={reply}
                      depth={0}
                      user={user}
                      onChanged={loadReplies}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
