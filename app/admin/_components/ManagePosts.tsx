"use client";

import React, { useState, useEffect } from "react";
import { apiFetch } from "../../services/api";
import { deletePost } from "../../services/posts";

interface PostItem {
  id: number;
  title: string;
  category: string;
  slug: string;
  createdAt: string;
}

export default function ManagePosts() {
  const [posts, setPosts] = useState<PostItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Custom confirmation modal anchor for post removals
  const [postIdToDelete, setPostIdToDelete] = useState<number | null>(null);

  const fetchPosts = async () => {
    try {
      setLoading(true);
      setError(null);
      // Calls your GET /posts endpoint directly
      const data = await apiFetch("/posts");
      setPosts(data);
    } catch (err: any) {
      setError(err.message || "Failed to load posts.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  const confirmDeletePost = async () => {
    if (!postIdToDelete) return;
    try {
      await deletePost(postIdToDelete);
      setPostIdToDelete(null); // Close modal cleanly
      await fetchPosts(); // Reload fresh database rows
    } catch (err: any) {
      alert(err.message || "Failed to complete deletion.");
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="text-center font-medium text-xs opacity-50 py-10 animate-pulse">
        Loading posts directory...
      </div>
    );
  }

  return (
    <div className="bg-chess-surface p-6 md:p-8 rounded-2xl space-y-6 animate-fade-in border border-chess-border/10">
      <div className="space-y-1 border-b border-chess-border border-opacity-20 pb-4">
        <h2 className="text-xl font-bold tracking-tight text-chess-text">
          Manage posts
        </h2>
        <p className="text-xs font-semibold text-chess-primary opacity-70">
          Review, analyze, and remove published strategic articles from active
          index logs
        </p>
      </div>

      {error && (
        <div className="bg-red-500/5 border border-red-500/10 px-4 py-2.5 rounded-xl text-xs font-semibold text-red-400">
          {error}
        </div>
      )}

      {posts.length === 0 ? (
        <div className="text-center py-10 font-bold text-xs opacity-40">
          No articles found in the database.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b border-chess-border/10 text-xs font-bold opacity-50">
                <th className="pb-3 font-bold">Title</th>
                <th className="pb-3 font-bold hidden sm:table-cell">
                  Category
                </th>
                <th className="pb-3 font-bold hidden md:table-cell">
                  Published Date
                </th>
                <th className="pb-3 text-right font-bold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-chess-border/5 font-medium text-chess-text/80">
              {posts.map((post) => (
                <tr
                  key={post.id}
                  className="hover:bg-chess-surface-hover/30 transition-colors group"
                >
                  <td className="py-3.5 pr-4 max-w-[200px] sm:max-w-xs truncate font-semibold">
                    <a
                      href={`/news/${post.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-chess-primary transition-colors"
                    >
                      {post.title}
                    </a>
                  </td>
                  <td className="py-3.5 hidden sm:table-cell text-xs font-bold text-chess-primary/80 uppercase tracking-wide">
                    {post.category}
                  </td>
                  <td className="py-3.5 hidden md:table-cell text-xs opacity-50">
                    {formatDate(post.createdAt)}
                  </td>
                  <td className="py-3.5 text-right">
                    <button
                      type="button"
                      onClick={() => setPostIdToDelete(post.id)}
                      className="text-xs font-bold text-red-500/70 hover:text-red-400 px-3 py-1.5 rounded-lg hover:bg-red-500/5 transition-all cursor-pointer"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Custom Clean Confirmation Modal */}
      {postIdToDelete !== null && (
        <>
          <div
            onClick={() => setPostIdToDelete(null)}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm animate-fade-in"
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <div className="bg-chess-surface border border-chess-border/20 w-full max-w-sm p-6 rounded-2xl space-y-5 pointer-events-auto animate-scale-up">
              <div className="space-y-1.5 text-center">
                <h4 className="text-base font-bold text-chess-text tracking-tight">
                  Delete Post
                </h4>
                <p className="text-xs text-chess-text/50 font-medium max-w-[240px] mx-auto leading-relaxed">
                  Are you sure you want to permanently remove this article from
                  the system? This action will cascade and drop all inner
                  comment nodes.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setPostIdToDelete(null)}
                  className="w-full bg-chess-bg/60 border border-chess-border/10 text-chess-text/70 py-2.5 rounded-xl hover:bg-chess-surface-hover transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmDeletePost}
                  className="w-full bg-red-500 text-white py-2.5 rounded-xl hover:bg-red-600 transition-colors cursor-pointer"
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
