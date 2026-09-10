"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { apiFetch } from "../services/api";

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
  createdAt: string;
}

interface ScrollMeta {
  nextCursor: number | null;
  hasNextPage: boolean;
}

export default function NewsPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>("All");

  const [meta, setMeta] = useState<ScrollMeta>({
    nextCursor: null,
    hasNextPage: true,
  });

  const observerRef = useRef<HTMLDivElement | null>(null);

  const fetchPosts = useCallback(
    async (isInitial: boolean = false, currentCursor: number | null = null) => {
      try {
        if (isInitial) setLoading(true);
        else setLoadingMore(true);

        setError(null);

        let url = `/posts/scroll?limit=5`;
        if (currentCursor) url += `&cursor=${currentCursor}`;

        const response = await apiFetch(url);

        setPosts((prev) => {
          if (isInitial) return response.data;
          const existingIds = new Set(prev.map((p) => p.id));
          const uniqueNewPosts = response.data.filter(
            (p: Post) => !existingIds.has(p.id),
          );
          return [...prev, ...uniqueNewPosts];
        });

        setMeta({
          nextCursor: response.meta.nextCursor,
          hasNextPage: response.meta.hasNextPage,
        });
      } catch (err: any) {
        setError(err.message || "Failed to load articles.");
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [],
  );

  const handleCategoryChange = (category: string) => {
    if (category === activeCategory) return;
    setActiveCategory(category);
  };

  useEffect(() => {
    fetchPosts(true, null);
  }, [fetchPosts]);

  useEffect(() => {
    if (loading || !meta.hasNextPage || loadingMore || posts.length === 0)
      return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          fetchPosts(false, meta.nextCursor);
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
    fetchPosts,
    posts.length,
  ]);

  const filteredArticles =
    activeCategory === "All"
      ? posts
      : posts.filter(
          (post) =>
            post.category.toLowerCase() === activeCategory.toLowerCase(),
        );

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "2-digit",
    });
  };

  if (loading && posts.length === 0) {
    return (
      <div className="text-center font-bold text-sm py-20 text-chess-text/40 animate-pulse">
        Loading articles...
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
    <div className="space-y-8 w-full py-6 text-chess-text mx-auto px-4 sm:px-6">
      {/* Title Header */}
      <section className="space-y-1">
        <div className="text-xs font-black uppercase tracking-wider text-chess-primary flex items-center gap-1.5">
          <span>📰</span> Tactical Chronicles
        </div>
        <h1 className="text-3xl font-black tracking-tight md:text-5xl">
          Articles & Insights
        </h1>
        <p className="text-sm font-bold text-chess-text/60">
          Curated notes on chess psychology, opening systems, and positional
          analysis.
        </p>
      </section>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2 pb-2">
        {["All", "News", "Training", "Games & Tech"].map((category) => (
          <button
            key={category}
            type="button"
            onClick={() => handleCategoryChange(category)}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-colors cursor-pointer ${
              activeCategory === category
                ? "bg-chess-primary text-chess-surface"
                : "bg-chess-surface text-chess-text/70 hover:text-chess-text hover:bg-chess-surface-hover"
            }`}
          >
            {category}
          </button>
        ))}
      </div>

      {/* Articles Stream */}
      {filteredArticles.length === 0 ? (
        <div className="bg-chess-surface p-12 rounded-3xl text-center font-extrabold text-sm text-chess-text/50">
          No articles published under this category yet.
        </div>
      ) : (
        <div className="flex flex-col space-y-6">
          {filteredArticles.map((post) => {
            const readTime = Math.max(
              1,
              Math.ceil(
                post.content.replace(/<[^>]*>/g, "").split(" ").length / 200,
              ),
            );

            return (
              <Link
                key={post.id}
                href={`/news/${post.slug}`}
                className="bg-chess-surface p-6 md:p-8 rounded-3xl flex flex-col md:flex-row gap-8 items-stretch hover:bg-chess-surface-hover hover:-translate-y-1 transition-all duration-300 ease-out group cursor-pointer block"
              >
                {/* Cover Image with default SVG fallback */}
                <div className="w-full md:w-80 h-56 md:h-auto rounded-2xl overflow-hidden bg-chess-bg relative shrink-0">
                  <Image
                    src={
                      post.coverImage
                        ? `/uploads/news/${post.coverImage}`
                        : "/uploads/news/default-cover.jpg"
                    }
                    alt={post.title}
                    fill
                    sizes="(max-width: 768px) 100vw, 320px"
                    className="object-cover object-center transition-transform duration-500 ease-out group-hover:scale-105"
                    unoptimized
                  />
                </div>

                {/* Content Details */}
                <div className="flex-1 flex flex-col justify-between py-1 space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-[11px] font-bold">
                      <span className="text-chess-primary font-black uppercase tracking-wider">
                        {post.category}
                      </span>
                      <span className="text-chess-text/30">•</span>
                      <span className="text-chess-text/50">
                        {readTime} min read
                      </span>
                    </div>

                    <h2 className="text-2xl md:text-3xl font-black leading-snug group-hover:text-chess-primary transition-colors text-chess-text">
                      {post.title}
                    </h2>

                    <p className="text-xs md:text-sm font-bold text-chess-text/60 line-clamp-3 leading-relaxed">
                      {post.excerpt}
                    </p>
                  </div>

                  {/* Footer Meta */}
                  <div className="flex items-center justify-between w-full text-[11px] font-bold text-chess-text/40 pt-2">
                    <div className="flex items-center gap-2">
                      <span>{formatDate(post.createdAt)}</span>
                      <span>•</span>
                      <span>👁 {post.views}</span>
                      {post.claps > 0 && (
                        <>
                          <span>•</span>
                          <span>👏 {post.claps}</span>
                        </>
                      )}
                    </div>

                    <span className="text-xs font-black text-chess-primary group-hover:underline flex items-center gap-1">
                      <span>Read Article</span>
                      <span className="group-hover:translate-x-0.5 transition-transform">
                        →
                      </span>
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* Infinite Scroll Anchor */}
      <div ref={observerRef} className="w-full pt-2">
        {loadingMore && (
          <div className="text-center font-bold text-xs text-chess-text/40 py-4 animate-pulse">
            Loading older articles...
          </div>
        )}
      </div>
    </div>
  );
}
