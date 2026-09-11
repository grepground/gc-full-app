"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "../../context/AuthContext";
import { memberProfileHref } from "../../services/profile";
import {
  FeedPost,
  ReplyContext,
  ReplyNode,
  addFeedReply,
  getFeedReplies,
  getFeedReply,
  canManageFeed,
  wasEdited,
} from "../../services/feed";
import FeedImageCarousel from "./FeedImageCarousel";
import ReplyThread, { formatReplyDateTime } from "./ReplyThread";
import UserAvatar from "../../components/common/UserAvatar";
import { errorMessage } from "../../services/api";

interface ReplyDetailProps {
  replyId: number;
  /** Server-rendered reply context (post + ancestor chain + target reply). */
  initialContext: ReplyContext;
}

const excerpt = (text: string, length = 90) =>
  text.length > length ? `${text.slice(0, length)}…` : text;

/**
 * Reply detail view — the Threads-style "open a single comment" page.
 *
 * Shows the parent post as context, the ancestor chain collapsed to a trail,
 * the focused reply, and that reply's own children with full reply/delete
 * affordances. Replies are re-fetched on change so a new child shows the same
 * way it would on the post page.
 */
export default function ReplyDetailClient({
  replyId,
  initialContext,
}: ReplyDetailProps) {
  const { user } = useAuth();

  const [post] = useState<FeedPost>(initialContext.post);
  const [ancestors] = useState<ReplyNode[]>(initialContext.ancestors);
  const [reply, setReply] = useState<ReplyNode>(initialContext.reply);

  // The focused reply is the root of its own sub-tree, so refreshing means
  // re-reading it (plus its children) rather than the whole post tree.
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [topLevelReply, setTopLevelReply] = useState<string>("");
  const [submittingReply, setSubmittingReply] = useState<boolean>(false);

  const canManage = canManageFeed(user, post);
  const canReply = !!user;

  const reload = useCallback(async () => {
    setRefreshing(true);
    try {
      const fresh = await getFeedReply(post.id, replyId);
      setReply(fresh.reply);
    } catch (err) {
      // A deleted focused reply would 404 here — fall back to a full tree read
      // so the user still sees the surviving conversation instead of an error.
      console.error("Failed to reload reply:", err);
      try {
        const tree = await getFeedReplies(post.id);
        const found = findReply(tree, replyId);
        if (found) setReply(found);
      } catch (inner) {
        console.error("Failed to reload replies:", inner);
      }
    } finally {
      setRefreshing(false);
    }
  }, [post.id, replyId]);

  useEffect(() => {
    document.title = `${excerpt(reply.content)} | reply`;
  }, [reply.content]);

  const submitReply = async () => {
    if (!topLevelReply.trim()) return;
    setSubmittingReply(true);
    try {
      await addFeedReply(post.id, {
        content: topLevelReply,
        parentId: reply.id,
      });
      setTopLevelReply("");
      await reload();
    } catch (err) {
      alert(errorMessage(err, "Failed to add reply."));
    } finally {
      setSubmittingReply(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 py-8 px-4 text-chess-text">
      {/* Back to the full post */}
      <Link
        href={`/feed/${post.slug}`}
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
        Back to the post
      </Link>

      {/* Parent post — context, condensed */}
      <article className="bg-chess-surface p-5 md:p-6 rounded-3xl space-y-4">
        <div className="flex items-center gap-3">
          <Link
            href={memberProfileHref(post.user.username)}
            className="shrink-0 rounded-full transition-shadow hover:ring-2 hover:ring-chess-primary/60 focus-visible:ring-2 focus-visible:ring-chess-primary"
            aria-label={`View ${post.user.username}'s profile`}
          >
            <UserAvatar
              avatar={post.user.avatar}
              username={post.user.username}
              className="w-12 h-12 text-base"
              sizes="48px"
            />
          </Link>
          <div className="flex flex-col min-w-0">
            <Link
              href={memberProfileHref(post.user.username)}
              className="truncate min-w-0 hover:text-chess-primary hover:underline underline-offset-4 transition-colors"
            >
              <span className="text-chess-text/80 truncate font-black text-base">
                {post.user.username}
              </span>
            </Link>
            <span className="text-[11px] font-bold text-chess-text/40">
              {formatReplyDateTime(post.createdAt)}
              {wasEdited(post) && (
                <>
                  {" · "}
                  <span
                    className="italic text-chess-text/30"
                    title={`Edited ${formatReplyDateTime(post.updatedAt)}`}
                  >
                    Edited
                  </span>
                </>
              )}
            </span>
          </div>
          <Link
            href={`/feed/${post.slug}`}
            className="ml-auto text-[11px] font-black text-chess-primary hover:underline shrink-0"
          >
            View post →
          </Link>
        </div>

        {canManage && (post.images ?? []).length > 0 && (
          <FeedImageCarousel
            images={post.images ?? []}
            alt={`${post.user.username}'s post`}
            aspectClass="aspect-[16/9]"
          />
        )}

        <p className="text-sm md:text-base font-bold text-chess-text/85 leading-relaxed whitespace-pre-wrap break-words">
          {post.body}
        </p>
      </article>

      {/* Ancestor trail — how you got to this reply */}
      {ancestors.length > 0 && (
        <div className="px-1 space-y-1">
          <span className="text-[10px] font-black uppercase tracking-wider text-chess-text/35">
            In reply to
          </span>
          <div className="space-y-1">
            {ancestors.map((ancestor) => (
              <Link
                key={ancestor.id}
                href={`/feed/${post.slug}/reply/${ancestor.id}`}
                className="flex items-start gap-2 text-xs font-bold text-chess-text/55 hover:text-chess-primary transition-colors"
              >
                <span
                  className="text-chess-text/25 shrink-0 select-none"
                  aria-hidden
                >
                  ↳
                </span>
                <span className="truncate min-w-0">
                  <span className="font-black text-chess-text/75">
                    {ancestor.author.username}
                  </span>{" "}
                  {excerpt(ancestor.content, 70)}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Focused reply + its own thread */}
      <section
        aria-busy={refreshing}
        className={`bg-chess-surface p-5 md:p-6 rounded-3xl transition-opacity ${
          refreshing ? "opacity-70" : "opacity-100"
        }`}
      >
        <ReplyThread
          feedPostId={post.id}
          postSlug={post.slug}
          reply={reply}
          depth={0}
          user={user}
          onChanged={reload}
          isRoot
        />

        {/* Reply to this reply (nested one level under the focused node) */}
        {canReply && (
          <div className="flex items-center gap-2 mt-4 pt-4 border-t border-chess-border/10">
            <input
              type="text"
              value={topLevelReply}
              onChange={(e) => setTopLevelReply(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") submitReply();
              }}
              placeholder={`Reply to ${reply.author.username}...`}
              className="flex-1 bg-chess-bg border border-chess-border/20 px-3 py-2 rounded-full text-xs font-semibold text-chess-text focus:outline-none focus:border-chess-primary transition-colors"
            />
            <button
              type="button"
              onClick={submitReply}
              disabled={submittingReply}
              className="bg-chess-primary text-chess-surface text-[11px] font-black px-4 py-2 rounded-full hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50"
            >
              {submittingReply ? "Posting..." : "Reply"}
            </button>
          </div>
        )}
      </section>
    </div>
  );
}

/** Depth-first search for a reply inside a built reply tree. */
function findReply(nodes: ReplyNode[], id: number): ReplyNode | null {
  for (const node of nodes) {
    if (node.id === id) return node;
    const hit = findReply(node.replies, id);
    if (hit) return hit;
  }
  return null;
}
