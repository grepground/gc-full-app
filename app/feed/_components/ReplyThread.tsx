"use client";

import React, { useState } from "react";
import Link from "next/link";
import { memberProfileHref } from "../../services/profile";
import {
  FeedActor,
  ReplyNode,
  addFeedReply,
  deleteFeedReply,
  canManageFeedReply,
} from "../../services/feed";
import { errorMessage } from "../../services/api";
import UserAvatar from "../../components/common/UserAvatar";

export const REPLY_INPUT_DEPTH_LIMIT = 6;

interface ReplyThreadProps {
  feedPostId: number;
  /** Slug of the owning post, used to build each reply's own detail URL. */
  postSlug: string;
  reply: ReplyNode;
  depth: number;
  user: FeedActor | null;
  onChanged: () => void;
  /**
   * Renders the reply as the focal item of its own page: no link back to
   * itself, a larger avatar and no depth-collapsing.
   */
  isRoot?: boolean;
}

export function formatReplyDateTime(dateString: string): string {
  return new Date(dateString).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Absolute app path to a reply's own (threads-style) detail page. */
export function replyHref(postSlug: string, replyId: number): string {
  return `/feed/${postSlug}/reply/${replyId}`;
}

/**
 * A reply and its nested children.
 *
 * Each reply links to its own detail page (`/feed/:slug/reply/:id`) the way a
 * Threads post does, so a conversation can be opened from any node instead of
 * only from the root post.
 */
export default function ReplyThread({
  feedPostId,
  postSlug,
  reply,
  depth,
  user,
  onChanged,
  isRoot = false,
}: ReplyThreadProps) {
  const [replying, setReplying] = useState<boolean>(false);
  const [content, setContent] = useState<string>("");
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [confirmDelete, setConfirmDelete] = useState<boolean>(false);
  const [deleting, setDeleting] = useState<boolean>(false);
  const [justDeleted, setJustDeleted] = useState<boolean>(false);

  const canReply = !!user;
  const canDelete = canManageFeedReply(user, reply.author);

  const maxDepth = REPLY_INPUT_DEPTH_LIMIT;

  const submitReply = async () => {
    if (!content.trim()) return;
    setSubmitting(true);
    try {
      await addFeedReply(feedPostId, { content, parentId: reply.id });
      setContent("");
      setReplying(false);
      onChanged();
    } catch (err) {
      alert(errorMessage(err, "Failed to add reply."));
    } finally {
      setSubmitting(false);
    }
  };

  const removeReply = async () => {
    setDeleting(true);
    try {
      await deleteFeedReply(feedPostId, reply.id);
      setConfirmDelete(false);
      setJustDeleted(true);
      onChanged();
    } catch (err) {
      alert(errorMessage(err, "Failed to delete reply."));
    } finally {
      setDeleting(false);
    }
  };

  const isLimited = !isRoot && depth >= maxDepth;

  // A soft-deleted node stays in the tree only long enough for the parent list
  // to refresh and drop it; render nothing in that gap so the DOM does not keep
  // a stale branch visible (which caused a doubled/briefly-wrong list).
  if (justDeleted) return null;

  return (
    <div
      className={`${
        isRoot ? "pt-6 pb-6 first:pt-1" : "mt-3"
      } ${depth > 0 && !isRoot ? "ml-3 md:ml-6 pl-3 md:pl-4 border-l border-chess-border/15" : ""}`}
    >
      <div className="flex items-start gap-3">
        <Link
          href={memberProfileHref(reply.author.username)}
          className="shrink-0"
          aria-label={`View ${reply.author.username}'s profile`}
        >
          <UserAvatar
            avatar={reply.author.avatar}
            username={reply.author.username}
            className={isRoot ? "w-12 h-12 text-lg" : "w-9 h-9 text-sm"}
            sizes={isRoot ? "48px" : "36px"}
          />
        </Link>

        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-2 flex-wrap text-[11px] font-bold text-chess-text/50">
            <Link
              href={memberProfileHref(reply.author.username)}
              className="truncate min-w-0 hover:text-chess-primary transition-colors"
            >
              <span className="text-chess-text/80 font-black text-sm">
                {reply.author.username}
              </span>
            </Link>
            <span className="text-chess-text/20">•</span>
            {/* On the reply's own page this timestamp is plain text; elsewhere
                it links through to that reply. */}
            {isRoot ? (
              <span>{formatReplyDateTime(reply.createdAt)}</span>
            ) : (
              <Link
                href={replyHref(postSlug, reply.id)}
                className="hover:text-chess-primary transition-colors"
                title="Open this reply"
              >
                {formatReplyDateTime(reply.createdAt)}
              </Link>
            )}
          </div>

          {isLimited ? (
            <p className="text-sm font-bold text-chess-text/45 italic leading-relaxed">
              Thread is too deep — this branch is collapsed.
            </p>
          ) : isRoot ? (
            <p className="text-[15px] md:text-[17px] font-semibold text-chess-text/90 leading-[1.75] whitespace-pre-wrap wrap-break-word">
              {reply.content}
            </p>
          ) : (
            /* The body itself opens the reply's own page, so the whole node is
               a comfortable click target (not just the tiny timestamp). */
            <Link
              href={replyHref(postSlug, reply.id)}
              title="Open this reply"
              className="block rounded-xl -mx-1.5 px-1.5 py-0.5 hover:bg-chess-bg/60 transition-colors"
            >
              <p className="text-[15px] font-semibold text-chess-text/85 leading-[1.75] whitespace-pre-wrap wrap-break-word">
                {reply.content}
              </p>
            </Link>
          )}

          {/* Actions */}
          {!isLimited && (
            <div className="flex items-center gap-2 pt-1.5">
              {canReply && !replying && (
                <button
                  type="button"
                  onClick={() => setReplying(true)}
                  className="inline-flex items-center gap-1.5 text-[13px] font-black text-chess-text/50 hover:text-chess-primary hover:bg-chess-primary/10 px-2.5 py-1.5 -ml-1.5 rounded-full transition-colors cursor-pointer"
                >
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
                      d="M21 12a8 8 0 0 1-8 8H7l-4 3 1.2-4.2A8 8 0 1 1 21 12z"
                    />
                  </svg>
                  Reply
                </button>
              )}
              {canDelete && (
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  className="text-[13px] font-black text-red-400/50 hover:text-red-400 hover:bg-red-500/10 px-2.5 py-1.5 rounded-full transition-colors cursor-pointer"
                >
                  Delete
                </button>
              )}
            </div>
          )}

          {replying && (
            <div className="pt-2 animate-[fade-up_0.25s_ease-out]">
              <div className="rounded-2xl bg-chess-bg/70 ring-1 ring-chess-border/20 transition-all focus-within:ring-chess-primary/60">
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  onKeyDown={(e) => {
                    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                      e.preventDefault();
                      submitReply();
                    }
                  }}
                  rows={4}
                  autoFocus
                  placeholder={`Reply to ${reply.author.username}…`}
                  className="w-full bg-transparent px-3.5 pt-3.5 pb-2 font-semibold text-[15px] text-chess-text placeholder:text-chess-text/30 focus:outline-none resize-y min-h-[104px] leading-relaxed"
                />
                <div className="flex items-center justify-end gap-2 px-2.5 pb-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      setReplying(false);
                      setContent("");
                    }}
                    className="text-[13px] font-black text-chess-text/45 hover:text-chess-text transition-colors cursor-pointer px-2.5 py-1.5"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={submitReply}
                    disabled={submitting || !content.trim()}
                    className="inline-flex items-center gap-1.5 bg-chess-primary text-chess-surface text-[13px] font-black px-5 py-2 rounded-full hover:opacity-90 active:scale-95 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {submitting ? (
                      <>
                        <span className="w-3.5 h-3.5 rounded-full border-2 border-chess-surface/40 border-t-chess-surface animate-spin" />
                        Posting
                      </>
                    ) : (
                      "Post"
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Delete confirmation inline */}
          {confirmDelete && (
            <div className="mt-2 bg-red-500/5 border border-red-500/10 px-3 py-2 rounded-lg space-y-2">
              <p className="text-[11px] font-bold text-chess-text/60">
                Delete this reply? It will be hidden (soft delete).
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={removeReply}
                  disabled={deleting}
                  className="bg-red-500 text-white text-[11px] font-black px-3 py-1 rounded-md hover:bg-red-600 transition-colors cursor-pointer disabled:opacity-50"
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
      </div>

      {/* Recursive nested children */}
      {reply.replies.length > 0 && (
        <div className="space-y-1">
          {reply.replies.map((child) => (
            <ReplyThread
              key={child.id}
              feedPostId={feedPostId}
              postSlug={postSlug}
              reply={child}
              depth={depth + 1}
              user={user}
              onChanged={onChanged}
            />
          ))}
        </div>
      )}
    </div>
  );
}
