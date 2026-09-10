"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import {
  FeedPost,
  type FeedPage,
  getFeed,
  getFeedUpdates,
  deleteFeed,
} from "../services/feed";
import FeedPostCard from "./_components/FeedPostCard";
import NewPostModal from "./_components/NewPostModal";
import NewContentButton from "./_components/NewContentButton";
import { useNewContentWatch } from "./_components/hooks/useNewContentWatch";

const FEED_LIMIT = 10;
// How often we ask whether new posts exist. Modest on purpose: the pill only
// needs to feel fresh, and the probe is deliberately tiny.
const UPDATES_POLL_MS = 25000;

export default function FeedPage() {
  const { user, loading: authLoading } = useAuth();

  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [meta, setMeta] = useState<FeedPage["meta"]>({
    nextCursor: null,
    hasNextPage: true,
  });

  // Ref lock that prevents concurrent requests (isLoading guard)
  const isFetchingRef = useRef<boolean>(false);
  const observerRef = useRef<HTMLDivElement | null>(null);

  // New post modal
  const [showNewPost, setShowNewPost] = useState<boolean>(false);

  const canCreate = !!user;

  /**
   * Highest post id currently on screen — the "you have seen up to here"
   * marker the activity probe compares against. Derived rather than stored so
   * it can never drift out of sync with the rendered list.
   */
  const highestSeenId = posts.reduce((max, p) => (p.id > max ? p.id : max), 0);

  // Tailored to just report posts newer than what is already rendered.
  const probeFeedUpdates = useCallback(
    (afterId: number) => getFeedUpdates(afterId),
    [],
  );

  const pendingUpdates = useNewContentWatch({
    probe: probeFeedUpdates,
    baseline: highestSeenId,
    // Pointless before the first page has rendered (we have no baseline yet),
    // and it would only add noise on an empty/broken feed.
    enabled: !loading && posts.length > 0,
    intervalMs: UPDATES_POLL_MS,
  });

  const [refreshingNew, setRefreshingNew] = useState<boolean>(false);

  // First call is cursorless; later ones use meta.nextCursor.
  const fetchFeed = useCallback(
    async (isInitial: boolean = false, cursor: number | null = null) => {
      // isLoading lock: funnel concurrent requests into a single channel
      if (isFetchingRef.current) return;
      if (!isInitial && !meta.hasNextPage) return;

      isFetchingRef.current = true;
      try {
        if (isInitial) setLoading(true);
        else setLoadingMore(true);
        setError(null);

        const response: FeedPage = await getFeed(FEED_LIMIT, cursor);

        setPosts((prev) => {
          if (isInitial) return response.data;
          const existingIds = new Set(prev.map((p) => p.id));
          // Deduplicate ids when merging pages
          const uniqueNew = response.data.filter((p) => !existingIds.has(p.id));
          return [...prev, ...uniqueNew];
        });

        setMeta({
          nextCursor: response.meta.nextCursor,
          hasNextPage: response.meta.hasNextPage,
        });
      } catch (err: any) {
        setError(err.message || "Failed to load the feed.");
      } finally {
        isFetchingRef.current = false;
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [meta.hasNextPage],
  );

  useEffect(() => {
    fetchFeed(true, null);
  }, [fetchFeed]);

  // Infinite scroll: stops once hasNextPage === false
  useEffect(() => {
    if (loading || !meta.hasNextPage || loadingMore || posts.length === 0)
      return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          fetchFeed(false, meta.nextCursor);
        }
      },
      { rootMargin: "200px" },
    );

    const currentTarget = observerRef.current;
    if (currentTarget) observer.observe(currentTarget);

    return () => {
      if (currentTarget) observer.unobserve(currentTarget);
    };
  }, [
    loading,
    meta.hasNextPage,
    meta.nextCursor,
    loadingMore,
    fetchFeed,
    posts.length,
  ]);

  const handleEdited = (updated: FeedPost) => {
    setPosts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
  };

  const handleDeleted = async (id: number) => {
    await deleteFeed(id);
    // Soft delete — remove from the list, data stays in the background
    setPosts((prev) => prev.filter((p) => p.id !== id));
  };

  const handleCreated = (post: FeedPost) => {
    setShowNewPost(false);
    // Prepend the new post to the feed
    setPosts((prev) => [post, ...prev]);
  };

  /**
   * Pull in everything published since the newest post on screen and prepend
   * it.
   *
   * Deliberately separate from `fetchFeed`: that function walks *backwards*
   * through the cursor for infinite scroll, whereas this walks forwards from
   * the current top. Merging forwards avoids touching `meta.nextCursor`, so a
   * refresh never breaks an in-progress scroll session.
   */
  const loadNewPosts = async () => {
    if (refreshingNew) return;
    setRefreshingNew(true);
    try {
      const response: FeedPage = await getFeed(FEED_LIMIT, null);

      setPosts((prev) => {
        const existingIds = new Set(prev.map((p) => p.id));
        const fresh = response.data.filter((p) => !existingIds.has(p.id));
        if (fresh.length === 0) return prev;
        // The response is already newest-first, so prepending preserves order.
        return [...fresh, ...prev];
      });

      // Scroll the reader to the very top so the new content is actually seen.
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err: any) {
      setError(err.message || "Failed to load new posts.");
    } finally {
      setRefreshingNew(false);
    }
  };

  if (loading && posts.length === 0) {
    return (
      <div className="text-center font-bold text-sm py-20 text-chess-text/40 animate-pulse">
        Loading feed...
      </div>
    );
  }

  if (error && posts.length === 0) {
    return (
      <div className="max-w-md mx-auto my-12 bg-red-500/10 text-red-400 p-6 rounded-2xl font-extrabold text-sm text-center">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-8 w-full py-6 text-chess-text mx-auto">
      {/* New-posts pill — only rendered when the probe found something new */}
      <NewContentButton
        count={pendingUpdates.count}
        onClick={loadNewPosts}
        loading={refreshingNew}
        label={pendingUpdates.count === 1 ? "new post" : "new posts"}
      />

      {/* Title Header */}
      <section className="space-y-1">
        <div className="text-xs font-black uppercase tracking-wider text-chess-primary flex items-center gap-1.5">
          <span>🔥</span> Community Feed
        </div>
        <h1 className="text-3xl font-black tracking-tight md:text-5xl">Feed</h1>
        <p className="text-sm font-bold text-chess-text/60">
          A live thread-style feed — fresh posts, thoughts, and discussions.
        </p>
      </section>

      {/* Create Post Action (signed-in users only) — opens modal */}
      {!authLoading && canCreate && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => setShowNewPost(true)}
            className="bg-chess-primary text-chess-surface font-black px-5 py-2.5 rounded-full hover:opacity-90 transition-opacity text-xs cursor-pointer"
          >
            + New Post
          </button>
        </div>
      )}

      {/* Feed Stream */}
      {posts.length === 0 ? (
        <div className="bg-chess-surface p-12 rounded-3xl text-center font-extrabold text-sm text-chess-text/50">
          No posts in the feed yet.
        </div>
      ) : (
        <div className="flex flex-col space-y-4">
          {posts.map((post) => (
            <FeedPostCard
              key={post.id}
              post={post}
              user={user}
              onEdited={handleEdited}
              onDeleted={handleDeleted}
            />
          ))}
        </div>
      )}

      {/* Infinite Scroll Anchor */}
      <div ref={observerRef} className="w-full pt-2">
        {loadingMore && (
          <div className="text-center font-bold text-xs text-chess-text/40 py-4 animate-pulse">
            Loading newer posts...
          </div>
        )}
      </div>

      {/* New Post Modal */}
      {showNewPost && (
        <NewPostModal
          onClose={() => setShowNewPost(false)}
          onCreated={handleCreated}
        />
      )}
    </div>
  );
}
