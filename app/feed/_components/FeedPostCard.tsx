"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { memberProfileHref } from "../../services/profile";
import {
  FeedActor,
  FeedPost,
  ReplyNode,
  getFeedReplies,
  updateFeed,
  canManageFeed,
  repliesMeta,
  wasEdited,
} from "../../services/feed";
import FeedEditor from "./FeedEditor";
import FeedImageCarousel from "./FeedImageCarousel";
import UserAvatar from "../../components/common/UserAvatar";

const timeAgo = (dateString: string) => {
  const diff = Date.now() - new Date(dateString).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
};

interface FeedPostCardProps {
  post: FeedPost;
  user: FeedActor | null;
  onEdited: (updated: FeedPost) => void;
  onDeleted: (id: number) => Promise<void>;
}

export default function FeedPostCard({
  post,
  user,
  onEdited,
  onDeleted,
}: FeedPostCardProps) {
  const router = useRouter();

  // Inline edit state
  const [editing, setEditing] = useState<boolean>(false);
  const [editBody, setEditBody] = useState<string>(post.body);
  const [editActive, setEditActive] = useState<boolean>(post.isActive);
  const [saving, setSaving] = useState<boolean>(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Delete confirmation state
  const [confirmDelete, setConfirmDelete] = useState<boolean>(false);
  const [deleting, setDeleting] = useState<boolean>(false);

  // Reply footer state (count + last reply time)
  const [replySummary, setReplySummary] = useState<{
    count: number;
    latest: string | null;
  }>({ count: 0, latest: null });

  const canManage = canManageFeed(user, post);

  const loadReplies = useCallback(async () => {
    try {
      const data: ReplyNode[] = await getFeedReplies(post.id);
      setReplySummary(repliesMeta(Array.isArray(data) ? data : []));
    } catch (err) {
      console.error("Failed to load replies:", err);
    }
  }, [post.id]);

  useEffect(() => {
    loadReplies();
  }, [loadReplies]);

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const startEdit = () => {
    setEditBody(post.body);
    setEditActive(post.isActive);
    setSaveError(null);
    setEditing(true);
  };

  const cancelEdit = () => {
    setEditing(false);
    setSaveError(null);
  };

  const saveEdit = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      const updated = await updateFeed(post.id, {
        body: editBody,
        isActive: editActive,
      });
      onEdited(updated);
      setEditing(false);
    } catch (err: any) {
      setSaveError(err.message || "Failed to update post.");
    } finally {
      setSaving(false);
    }
  };

  const openPost = () => {
    if (editing || confirmDelete) return;
    router.push(`/feed/${post.slug}`);
  };

  const removePost = async () => {
    setDeleting(true);
    try {
      await onDeleted(post.id);
      setConfirmDelete(false);
    } catch (err: any) {
      alert(err.message || "Failed to delete post.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <article
      onClick={openPost}
      className="bg-chess-surface p-5 md:p-6 rounded-3xl flex flex-col gap-4 hover:bg-chess-surface-hover transition-colors group cursor-pointer"
    >
      {/* Author row */}
      <div className="flex items-center gap-3">
        <Link
          href={memberProfileHref(post.user.username)}
          onClick={(e) => e.stopPropagation()}
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
        <div className="flex items-center gap-2 text-[11px] font-bold text-chess-text/50 min-w-0">
          <Link
            href={memberProfileHref(post.user.username)}
            onClick={(e) => e.stopPropagation()}
            className="truncate min-w-0 hover:text-chess-primary hover:underline underline-offset-4 transition-colors"
          >
            <span className="text-chess-text/80 font-black text-sm lg:text-base">
              {post.user.username}
            </span>
          </Link>
          <span className="text-chess-text/20">•</span>
          <span className="shrink-0">{formatDateTime(post.createdAt)}</span>
          {wasEdited(post) && (
            <>
              <span className="text-chess-text/20">•</span>
              <span
                className="shrink-0 italic text-chess-text/40"
                title={`Edited ${formatDateTime(post.updatedAt)}`}
              >
                Edited
              </span>
            </>
          )}
        </div>
        <div className="ml-auto flex items-center gap-2">
          {canManage && !editing && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  startEdit();
                }}
                className="text-[11px] font-black text-chess-text/50 hover:text-chess-primary px-2.5 py-1.5 rounded-lg hover:bg-chess-bg transition-colors cursor-pointer"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setConfirmDelete(true);
                }}
                className="text-[11px] font-black text-red-500/60 hover:text-red-400 px-2.5 py-1.5 rounded-lg hover:bg-red-500/5 transition-colors cursor-pointer"
              >
                Delete
              </button>
            </>
          )}
        </div>
      </div>

      {/* Media — only shown when viewing (not editing) to keep the inline edit visible */}
      {!editing && (post.images ?? []).length > 0 && (
        <FeedImageCarousel
          images={post.images ?? []}
          alt={`${post.user.username}'s post`}
          aspectClass="aspect-[4/3]"
        />
      )}

      {/* Body or inline edit */}
      {editing ? (
        <>
          {saveError && (
            <div className="bg-red-500/10 px-4 py-3 rounded-xl text-xs font-black text-red-400">
              {saveError}
            </div>
          )}
          <FeedEditor
            value={editBody}
            onChange={setEditBody}
            isActive={editActive}
            onActiveChange={setEditActive}
            submitting={saving}
            submitLabel={saving ? "Saving..." : "Save changes"}
            onCancel={cancelEdit}
            onSubmit={saveEdit}
          />
        </>
      ) : (
        <p className="text-sm md:text-base font-bold text-chess-text/80 leading-relaxed whitespace-pre-wrap break-words">
          {post.body}
        </p>
      )}

      {/* Delete confirmation */}
      {confirmDelete && (
        <div className="bg-red-500/5 border border-red-500/10 px-3 py-2 rounded-lg space-y-2">
          <p className="text-[11px] font-bold text-chess-text/60">
            Delete this post? It will be hidden (soft delete).
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={removePost}
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

      {/* Footer: reply count, last reply time, link to post page */}
      {!editing && (
        <div className="flex items-center justify-between border-t border-chess-border/10 pt-3 mt-1">
          <div className="flex flex-col">
            <span className="text-[11px] font-black text-chess-text/50">
              👁 {post.views} views
            </span>
            <span className="text-[11px] font-black text-chess-text/50">
              {replySummary.count}{" "}
              {replySummary.count === 1 ? "reply" : "replies"}
            </span>
            {replySummary.latest && (
              <span className="text-[10px] font-bold text-chess-text/35">
                Last reply {timeAgo(replySummary.latest)}
              </span>
            )}
          </div>
          <Link
            href={`/feed/${post.slug}`}
            className="text-[11px] font-black text-chess-primary hover:underline flex items-center gap-1"
          >
            View post
            <span className="group-hover:translate-x-0.5 transition-transform">
              →
            </span>
          </Link>
        </div>
      )}
    </article>
  );
}
