"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import MarkdownRender from "../_components/MarkdownRender";
import { apiFetch } from "../../services/api";
import { recordPostView } from "../../services/posts";
import { useAuth } from "../../context/AuthContext";
import { memberProfileHref } from "../../services/profile";
import QuillEditor from "../../admin/_components/QuillEditor";

interface UserMeta {
  username: string;
  avatar: string | null;
}

interface Comment {
  id: number;
  content: string;
  postId: number;
  userId: number;
  parentId: number | null;
  createdAt: string;
  user: UserMeta;
  replies: Comment[];
}

interface Post {
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
  createdAt: string;
}

interface ClientProps {
  initialPost: Post;
}

export default function ArticleDetailClient({ initialPost }: ClientProps) {
  const { user } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const [post, setPost] = useState<Post>(initialPost);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentError, setCommentError] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [commentIdToDelete, setCommentIdToDelete] = useState<number | null>(
    null,
  );

  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editTitle, setEditTitle] = useState<string>(initialPost.title);
  const [editExcerpt, setEditExcerpt] = useState<string>(initialPost.excerpt);
  const [editContent, setEditContent] = useState<string>(initialPost.content);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [claps, setClaps] = useState<number>(initialPost.claps);
  const [userClaps, setUserClaps] = useState<number>(0);
  const [isAnimating, setIsAnimating] = useState<boolean>(false);
  const [views, setViews] = useState<number>(initialPost.views ?? 0);

  const debounceTimer = useRef<NodeJS.Timeout | null>(null);
  const pendingIncrement = useRef<number>(0);
  const mainFormRef = useRef<HTMLFormElement>(null);
  const replyFormRef = useRef<HTMLFormElement>(null);
  const viewLoggedRef = useRef<boolean>(false);

  // Register a genuine single visit per page open (deduped server-side).
  useEffect(() => {
    if (viewLoggedRef.current) return;
    viewLoggedRef.current = true;
    recordPostView(post.id)
      .then((result) => setViews(result.views))
      .catch((error) => console.error("Failed to record view:", error));
  }, [post.id]);

  const coverSrc = post.coverImage
    ? `/uploads/news/${post.coverImage}`
    : "/uploads/news/default-cover.jpg";
  const fetchComments = async (postId: number) => {
    try {
      const data = await apiFetch(`/posts/${postId}/comments`);
      setComments(data);
    } catch (err) {
      console.error("Failed to load comments:", err);
    }
  };

  useEffect(() => {
    fetchComments(initialPost.id);
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [initialPost.id]);

  // Determine if the current user has permission to edit this article
  const hasEditorialPrivileges =
    user &&
    (user.role === "admin" ||
      user.role === "moderator" ||
      post.userId === user.id);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "2-digit",
    });
  };

  // Handle applause button interaction with batching
  const handleClapClick = () => {
    if (userClaps >= 50 || isEditing) return;

    setClaps((prev) => prev + 1);
    setUserClaps((prev) => prev + 1);
    setIsAnimating(true);
    pendingIncrement.current += 1;

    setTimeout(() => {
      setIsAnimating(false);
    }, 200);

    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    debounceTimer.current = setTimeout(async () => {
      const totalBatchToPush = pendingIncrement.current;
      if (totalBatchToPush === 0) return;
      try {
        await apiFetch(`/posts/${post.id}/clap`, {
          method: "PATCH",
          body: JSON.stringify({ clapsIncrement: totalBatchToPush }),
        });
        pendingIncrement.current = 0;
      } catch (error) {
        console.error("Failed to save applause data:", error);
      }
    }, 1000);
  };

  // Save changes made during editorial mode
  const handleSaveChanges = async () => {
    const hasChanged =
      editTitle !== post.title ||
      editExcerpt !== post.excerpt ||
      editContent !== post.content;

    if (!hasChanged) {
      setIsEditing(false);
      return;
    }

    setSaveError(null);
    setIsSaving(true);
    try {
      const updatedPost = await apiFetch(`/posts/${post.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          title: editTitle,
          excerpt: editExcerpt,
          content: editContent,
        }),
      });

      // Handle potential URL slug updates
      if (updatedPost.slug !== post.slug) {
        setPost(updatedPost);
        setIsEditing(false);
        router.refresh();
        router.push(`/news/${updatedPost.slug}`);
      } else {
        setPost(updatedPost);
        setIsEditing(false);
      }
    } catch (err: any) {
      setSaveError(err.message || "Failed to save article changes.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setEditTitle(post.title);
    setEditExcerpt(post.excerpt);
    setEditContent(post.content);
    setSaveError(null);
    setIsEditing(false);
  };

  // Post a new comment or reply
  const handleCommentSubmit = async (
    formData: FormData,
    parentId: number | null = null,
  ) => {
    setCommentError(null);
    const content = formData.get("content") as string;

    try {
      await apiFetch(`/posts/${post.id}/comments`, {
        method: "POST",
        body: JSON.stringify({ content, parentId }),
      });

      if (parentId) {
        setReplyingTo(null);
        replyFormRef.current?.reset();
      } else {
        mainFormRef.current?.reset();
      }

      await fetchComments(post.id);
    } catch (err: any) {
      setCommentError(err.message || "Failed to post comment.");
    }
  };

  // Confirm and delete a comment
  const confirmCommentDelete = async () => {
    if (!commentIdToDelete) return;
    try {
      await apiFetch(`/posts/${post.id}/comments/${commentIdToDelete}`, {
        method: "DELETE",
      });
      setCommentIdToDelete(null);
      await fetchComments(post.id);
    } catch (err: any) {
      alert(err.message || "Failed to delete comment.");
    }
  };

  // Recursive comment node component
  const CommentNode = ({
    comment,
    depth = 0,
  }: {
    comment: Comment;
    depth: number;
  }) => {
    const avatarPath = comment.user.avatar
      ? `/uploads/avatars/${comment.user.avatar}`
      : null;
    const initial = comment.user.username.charAt(0).toUpperCase();

    return (
      <div className={`space-y-2 ${depth > 0 ? "pl-3 sm:pl-5 mt-2" : ""}`}>
        <div className="bg-chess-surface p-4 rounded-2xl space-y-2">
          <div className="flex items-center justify-between text-xs font-black">
            <div className="flex items-center gap-2">
              <Link
                href={memberProfileHref(comment.user.username)}
                className="w-6 h-6 rounded-full bg-chess-primary/10 flex items-center justify-center text-chess-primary text-[10px] overflow-hidden select-none shrink-0"
                aria-label={`View ${comment.user.username}'s profile`}
              >
                {avatarPath ? (
                  <img
                    src={avatarPath}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span>{initial}</span>
                )}
              </Link>
              <Link
                href={memberProfileHref(comment.user.username)}
                className="truncate min-w-0 hover:text-chess-primary transition-colors"
              >
                <span className="text-chess-text">{comment.user.username}</span>
              </Link>
              <span className="text-chess-text/30">•</span>
              <span className="text-chess-text/40 font-bold">
                {formatDate(comment.createdAt)}
              </span>
            </div>

            <div className="flex items-center gap-3 font-bold">
              {user && !isEditing && (
                <button
                  type="button"
                  onClick={() =>
                    setReplyingTo(replyingTo === comment.id ? null : comment.id)
                  }
                  className="text-chess-text/60 hover:text-chess-primary cursor-pointer text-[11px]"
                >
                  Reply
                </button>
              )}
              {(user?.role === "admin" ||
                user?.username === comment.user.username) &&
                !isEditing && (
                  <button
                    type="button"
                    onClick={() => setCommentIdToDelete(comment.id)}
                    className="text-red-400 hover:text-red-500 cursor-pointer text-[11px]"
                  >
                    Delete
                  </button>
                )}
            </div>
          </div>

          <p className="text-xs sm:text-sm leading-relaxed text-chess-text/80 font-bold break-words whitespace-pre-wrap pl-8">
            {comment.content}
          </p>
        </div>

        {/* Inline Reply Form */}
        {replyingTo === comment.id && (
          <form
            ref={replyFormRef}
            action={(fd) => handleCommentSubmit(fd, comment.id)}
            className="pl-8 space-y-2"
          >
            <textarea
              name="content"
              required
              rows={2}
              placeholder={`Reply to ${comment.user.username}...`}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  e.currentTarget.form?.requestSubmit();
                }
              }}
              className="w-full bg-chess-bg px-3 py-2 rounded-2xl font-bold text-xs text-chess-text focus:outline-none placeholder:text-chess-text/30 resize-none"
            />
            <div className="flex justify-end gap-2 text-xs font-black">
              <button
                type="button"
                onClick={() => setReplyingTo(null)}
                className="px-3 py-1.5 rounded-full text-chess-text/50 hover:bg-chess-surface cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="bg-chess-primary text-chess-surface px-4 py-1.5 rounded-full hover:opacity-90 cursor-pointer"
              >
                Reply
              </button>
            </div>
          </form>
        )}

        {comment.replies &&
          comment.replies.map((reply) => (
            <CommentNode key={reply.id} comment={reply} depth={depth + 1} />
          ))}
      </div>
    );
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 py-8 px-4 text-chess-text">
      {/* Navigation Link */}
      <Link
        href="/news"
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
        Back to News
      </Link>

      {/* Error Alert */}
      {saveError && (
        <div className="bg-red-500/10 px-4 py-3 rounded-2xl text-xs font-black text-red-400">
          {saveError}
        </div>
      )}

      {/* Article Header */}
      <header className="space-y-4 pb-4">
        <div className="flex items-center justify-between flex-wrap gap-3 text-xs font-black">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-chess-primary uppercase tracking-wide">
              {post.category}
            </span>
            <span className="text-chess-text/30">•</span>
            <span className="text-chess-text/50">
              {formatDate(post.createdAt)}
            </span>
            <span className="text-chess-text/30">•</span>
            <span className="text-chess-text/50">
              {Math.max(
                1,
                Math.ceil(
                  (isEditing ? editContent : post.content || "")
                    .replace(/<[^>]*>/g, "")
                    .split(" ").length / 200,
                ),
              )}{" "}
              min read
            </span>
          </div>

          <div className="flex items-center gap-2">
            {hasEditorialPrivileges &&
              (isEditing ? (
                <div className="flex items-center gap-2 font-black text-xs">
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    disabled={isSaving}
                    className="px-4 py-1.5 bg-chess-surface rounded-full text-chess-text/60 hover:bg-chess-bg cursor-pointer disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveChanges}
                    disabled={isSaving}
                    className="px-4 py-1.5 bg-chess-primary text-chess-surface rounded-full hover:opacity-90 cursor-pointer disabled:opacity-50"
                  >
                    {isSaving ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="px-4 py-1.5 bg-chess-surface rounded-full font-black text-chess-text/70 hover:text-chess-primary transition-colors text-xs cursor-pointer select-none"
                >
                  Edit Article
                </button>
              ))}

            {!isEditing && (
              <span className="flex items-center gap-1.5 px-3 py-1.5 bg-chess-surface rounded-full font-black text-xs select-none">
                <span>👁</span>
                <span className="text-chess-text/80">{views}</span>
              </span>
            )}

            {!isEditing && (
              <button
                type="button"
                onClick={handleClapClick}
                className={`flex items-center gap-1.5 px-3 py-1.5 bg-chess-surface rounded-full font-black transition-all text-xs cursor-pointer select-none ${
                  isAnimating ? "scale-105" : "active:scale-95"
                }`}
              >
                <span>👏</span>
                <span className="text-chess-text/80">{claps}</span>
              </button>
            )}
          </div>
        </div>

        {isEditing ? (
          <div className="space-y-3 pt-2">
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              placeholder="Article Title"
              className="w-full text-xl sm:text-2xl font-black bg-chess-surface px-4 py-3 rounded-2xl text-chess-text focus:outline-none"
            />
            <textarea
              value={editExcerpt}
              onChange={(e) => setEditExcerpt(e.target.value)}
              placeholder="Short summary..."
              rows={2}
              className="w-full text-xs sm:text-sm bg-chess-surface px-4 py-3 rounded-2xl text-chess-text/80 focus:outline-none resize-none font-bold leading-relaxed"
            />
          </div>
        ) : (
          <>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-chess-text leading-tight">
              {post.title}
            </h1>
            <p className="text-sm sm:text-base font-bold text-chess-text/60 leading-relaxed bg-chess-surface p-4 rounded-2xl">
              {post.excerpt}
            </p>
          </>
        )}
      </header>

      {/* Cover Image */}
      <div className="w-full h-64 sm:h-96 rounded-3xl overflow-hidden bg-chess-surface">
        <img
          src={coverSrc}
          alt={isEditing ? editTitle : post.title}
          className="w-full h-full object-cover"
          loading="eager"
        />
      </div>

      {/* Main Body */}
      <main className="pt-2">
        {isEditing ? (
          <div className="space-y-2">
            <label className="text-xs font-black text-chess-text/40 uppercase tracking-wider">
              Article Content Editor
            </label>
            <QuillEditor
              value={editContent}
              onChange={setEditContent}
              placeholder="Write your article content here..."
            />
          </div>
        ) : (
          <div className="prose prose-chess max-w-none font-bold">
            <MarkdownRender source={post.content} />
          </div>
        )}
      </main>

      {!isEditing && (
        <>
          {/* Applause Footer */}
          <footer className="pt-8 pb-4 flex flex-col items-center justify-center space-y-2 select-none">
            <div className="relative">
              <button
                type="button"
                onClick={handleClapClick}
                className={`w-14 h-14 rounded-full bg-chess-surface flex items-center justify-center hover:bg-chess-surface-hover transition-all cursor-pointer text-xl relative ${
                  isAnimating ? "scale-110" : "active:scale-95"
                }`}
              >
                👏
                {userClaps > 0 && (
                  <span className="absolute -top-8 bg-chess-primary text-chess-surface text-[10px] font-black px-2 py-0.5 rounded-full">
                    +{userClaps}
                  </span>
                )}
              </button>
            </div>
            <div className="text-xs font-black text-chess-text/50 text-center">
              <span>{claps} claps</span>
              {userClaps > 0 && (
                <span className="text-chess-primary block mt-0.5 text-[11px] font-bold">
                  Thank you for supporting this article!
                </span>
              )}
            </div>
          </footer>

          {/* Comments Section */}
          <section className="space-y-5 pt-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-chess-text">Comments</h3>
              <span className="text-xs font-black text-chess-text/40">
                {comments.length}{" "}
                {comments.length === 1 ? "comment" : "comments"}
              </span>
            </div>

            {commentError && (
              <div className="bg-red-500/10 px-4 py-2.5 rounded-2xl text-xs font-black text-red-400">
                {commentError}
              </div>
            )}

            {user ? (
              <form
                ref={mainFormRef}
                action={(fd) => handleCommentSubmit(fd, null)}
                className="space-y-3"
              >
                <textarea
                  name="content"
                  required
                  rows={3}
                  placeholder="Write a comment..."
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      e.currentTarget.form?.requestSubmit();
                    }
                  }}
                  className="w-full bg-chess-surface px-4 py-3 rounded-2xl font-bold text-xs text-chess-text focus:outline-none placeholder:text-chess-text/30 resize-none"
                />
                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="bg-chess-primary text-chess-surface text-xs font-black px-5 py-2 rounded-full hover:opacity-90 transition-opacity cursor-pointer"
                  >
                    Post Comment
                  </button>
                </div>
              </form>
            ) : (
              <div className="bg-chess-surface rounded-2xl p-4 text-center text-xs font-black text-chess-text/50">
                Please{" "}
                <Link
                  href={`/auth?callbackUrl=${encodeURIComponent(pathname)}`}
                  className="text-chess-primary hover:underline cursor-pointer"
                >
                  sign in
                </Link>{" "}
                to leave a comment.
              </div>
            )}

            <div className="space-y-3 pt-2">
              {comments.length === 0 ? (
                <p className="text-center text-xs font-black text-chess-text/30 py-6">
                  No comments yet. Be the first to share your thoughts!
                </p>
              ) : (
                comments.map((comment) => (
                  <CommentNode key={comment.id} comment={comment} depth={0} />
                ))
              )}
            </div>
          </section>
        </>
      )}

      {/* Delete Confirmation Modal */}
      {commentIdToDelete !== null && (
        <>
          <div
            onClick={() => setCommentIdToDelete(null)}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs"
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <div className="bg-chess-surface w-full max-w-sm p-6 rounded-3xl space-y-4 pointer-events-auto">
              <div className="space-y-1 text-center">
                <h4 className="text-base font-black text-chess-text">
                  Delete Comment
                </h4>
                <p className="text-xs text-chess-text/50 font-bold leading-relaxed">
                  Are you sure you want to delete this comment?
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs font-black">
                <button
                  type="button"
                  onClick={() => setCommentIdToDelete(null)}
                  className="w-full bg-chess-bg text-chess-text/70 py-2.5 rounded-full hover:bg-chess-surface-hover transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmCommentDelete}
                  className="w-full bg-red-500 text-white py-2.5 rounded-full hover:bg-red-600 transition-colors cursor-pointer"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
