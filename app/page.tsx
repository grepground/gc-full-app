"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { apiFetch } from "./services/api";
import { getSiteName } from "./services/siteConfig";

interface Post {
  id: number;
  slug: string;
  title: string;
  category: string;
  excerpt: string;
  content: string;
  coverImage: string | null;
  claps: number;
  createdAt: string;
}

export default function HomePage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function loadLatestPosts() {
      try {
        setLoading(true);
        const response = await apiFetch("/posts/scroll?limit=5");
        setPosts(response.data || []);
      } catch (err) {
        console.error("Failed to load home posts", err);
      } finally {
        setLoading(false);
      }
    }

    loadLatestPosts();
  }, []);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "2-digit",
      year: "numeric",
    });
  };

  const calculateReadTime = (content: string) => {
    const words = content.replace(/<[^>]*>/g, "").split(" ").length;
    return Math.max(1, Math.ceil(words / 200));
  };

  const featuredPost = posts.length > 0 ? posts[0] : null;
  const secondaryPosts = posts.length > 1 ? posts.slice(1) : [];

  return (
    <div className="space-y-12 max-w-5xl mx-auto px-4 sm:px-6 py-8 text-chess-text w-full">
      {/* Early Access Banner - Gentle but noticeable */}
      <section className="relative overflow-hidden bg-chess-surface p-5 sm:p-7 rounded-3xl text-center sm:text-left border border-chess-primary/10 animate-[fade-up_0.6s_ease-out]">
        {/* Gentle, cheap radial glows (no blur filter = no repeated repaint cost) */}
        <div className="pointer-events-none absolute -top-20 -right-20 w-64 h-64 rounded-full bg-[radial-gradient(closest-side,rgba(78,132,84,0.18),transparent)]" />
        <div className="pointer-events-none absolute -bottom-16 -left-16 w-48 h-48 rounded-full bg-[radial-gradient(closest-side,rgba(78,132,84,0.10),transparent)]" />

        <div className="relative space-y-3">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-4">
            <div className="inline-flex items-center gap-2 bg-chess-primary/15 text-chess-primary font-black text-[11px] px-3.5 py-1 rounded-full">
              <span className="inline-block animate-[float-slow_3s_ease-in-out_infinite]">
                🚀
              </span>
              <span className="uppercase tracking-wider">
                early access beta
              </span>
            </div>
          </div>

          <div className="space-y-1.5">
            <h2 className="text-xl sm:text-2xl font-black text-chess-text tracking-tight lowercase">
              {getSiteName()} is just getting started!
            </h2>
            <p className="text-xs sm:text-sm font-bold text-chess-text/70 leading-relaxed max-w-2xl">
              I am building this little corner of the internet by myself, and
              you are one of the very first to stop by. New articles, puzzles,
              and features are on the way — so for now, make an account, share
              your thoughts in the comments, and grow this space with me.
            </p>
          </div>

          <div className="pt-1 flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
            <Link
              href="/auth"
              className="bg-chess-primary text-chess-surface font-black px-5 py-2.5 rounded-full hover:opacity-90 transition-opacity text-xs"
            >
              Join the Community
            </Link>
            <Link
              href="/about"
              className="bg-chess-bg text-chess-text font-black px-5 py-2.5 rounded-full hover:bg-chess-surface-hover transition-colors text-xs"
            >
              Read Our Story
            </Link>
          </div>
        </div>
      </section>
      {/* Hero Header */}
      <section className="space-y-4 text-center md:text-left animate-[fade-up_0.6s_ease-out_0.1s]">
        <div className="inline-flex items-center gap-2 bg-chess-primary/10 text-chess-primary font-black text-xs px-4 py-2 rounded-full">
          <span>♟️</span>
          <span>a friendly place for chess fans</span>
        </div>

        <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-chess-text leading-tight lowercase">
          read, discuss & <br className="hidden md:inline" />
          <span className="text-chess-primary">grow together.</span>
        </h1>

        <p className="text-sm sm:text-base md:text-lg text-chess-text/75 font-bold leading-relaxed max-w-2xl">
          A cozy community for chess fans to read the latest news, share their
          own thoughts in the comments, and improve at their own pace.
        </p>
      </section>

      {/* Community Feed CTA */}
      <section className="bg-chess-surface p-5 sm:p-7 rounded-3xl border border-chess-primary/10 animate-[fade-up_0.6s_ease-out_0.2s]">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 bg-chess-primary/15 text-chess-primary font-black text-[11px] px-3.5 py-1 rounded-full">
            <span>💬</span>
            <span className="uppercase tracking-wider">
              what the community is chatting about
            </span>
          </div>
          <div className="space-y-1.5">
            <h2 className="text-xl sm:text-2xl font-black text-chess-text tracking-tight lowercase">
              community feed
            </h2>
            <p className="text-xs sm:text-sm font-bold text-chess-text/70 leading-relaxed max-w-2xl">
              thoughts, threads & chatter from registered community members —
              anyone registered can post here too.
            </p>
          </div>
          <div className="pt-1 flex flex-wrap items-center gap-2.5">
            <Link
              href="/feed"
              className="bg-chess-primary text-chess-surface font-black px-5 py-2.5 rounded-full hover:opacity-90 transition-opacity text-xs"
            >
              Open the Feed →
            </Link>
          </div>
        </div>
      </section>

      {/* Dynamic News Section Below Features */}
      <section className="space-y-6 pt-4">
        <div className="flex items-center justify-between px-1">
          <div className="space-y-0.5">
            <span className="text-xs font-black text-chess-primary uppercase tracking-wider">
              Recent Dispatches
            </span>
            <h2 className="text-2xl font-black text-chess-text tracking-tight">
              Latest Chronicles
            </h2>
          </div>
          <Link
            href="/news"
            className="text-xs font-black text-chess-primary hover:underline flex items-center gap-1 group"
          >
            <span>View All</span>
            <span className="group-hover:translate-x-1 transition-transform">
              →
            </span>
          </Link>
        </div>

        {loading ? (
          <div className="space-y-6">
            <div className="bg-chess-surface h-72 rounded-3xl animate-pulse" />
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-chess-surface h-56 rounded-3xl animate-pulse" />
              <div className="bg-chess-surface h-56 rounded-3xl animate-pulse" />
            </div>
          </div>
        ) : posts.length === 0 ? (
          <div className="bg-chess-surface p-10 rounded-3xl text-center font-bold text-xs text-chess-text/50">
            No articles published yet. Check back soon!
          </div>
        ) : (
          <div className="space-y-6">
            {/* FEATURED MAIN ARTICLE */}
            {featuredPost && (
              <Link
                href={`/news/${featuredPost.slug}`}
                className="bg-chess-surface p-6 md:p-8 rounded-3xl flex flex-col md:flex-row gap-8 items-stretch hover:bg-chess-surface-hover hover:-translate-y-1 transition-all duration-300 ease-out group cursor-pointer block"
              >
                <div className="w-full md:w-80 h-56 md:h-auto rounded-2xl overflow-hidden bg-chess-bg relative shrink-0">
                  <Image
                    src={
                      featuredPost.coverImage
                        ? `/uploads/news/${featuredPost.coverImage}`
                        : "/uploads/news/default-cover.jpg"
                    }
                    alt={featuredPost.title}
                    fill
                    sizes="(max-width: 768px) 100vw, 320px"
                    className="object-cover object-center transition-transform duration-500 ease-out group-hover:scale-105"
                    unoptimized
                  />
                </div>

                <div className="flex-1 flex flex-col justify-between py-1 space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-[11px] font-bold">
                      <span className="text-chess-primary font-black uppercase tracking-wider">
                        {featuredPost.category}
                      </span>
                      <span className="text-chess-text/30">•</span>
                      <span className="text-chess-text/50">
                        {calculateReadTime(featuredPost.content)} min read
                      </span>
                    </div>

                    <h3 className="text-2xl md:text-3xl font-black leading-snug group-hover:text-chess-primary transition-colors text-chess-text">
                      {featuredPost.title}
                    </h3>

                    <p className="text-xs md:text-sm font-bold text-chess-text/60 line-clamp-3 leading-relaxed">
                      {featuredPost.excerpt}
                    </p>
                  </div>

                  <div className="flex items-center justify-between text-[11px] font-bold text-chess-text/40 pt-2">
                    <span>{formatDate(featuredPost.createdAt)}</span>
                    <span className="text-chess-primary font-black group-hover:underline flex items-center gap-1">
                      <span>Read Full Article</span>
                      <span className="group-hover:translate-x-0.5 transition-transform">
                        →
                      </span>
                    </span>
                  </div>
                </div>
              </Link>
            )}

            {/* SECONDARY GRID ARTICLES */}
            {secondaryPosts.length > 0 && (
              <div className="grid md:grid-cols-2 gap-6">
                {secondaryPosts.map((post) => (
                  <Link
                    key={post.id}
                    href={`/news/${post.slug}`}
                    className="bg-chess-surface p-6 rounded-3xl space-y-4 hover:bg-chess-surface-hover hover:-translate-y-1 transition-all duration-300 ease-out group cursor-pointer flex flex-col justify-between"
                  >
                    <div className="space-y-3">
                      <div className="w-full h-44 rounded-2xl overflow-hidden bg-chess-bg relative">
                        <Image
                          src={
                            post.coverImage
                              ? `/uploads/news/${post.coverImage}`
                              : "/uploads/news/default-cover.jpg"
                          }
                          alt={post.title}
                          fill
                          sizes="(max-width: 768px) 100vw, 400px"
                          className="object-cover object-center transition-transform duration-500 ease-out group-hover:scale-105"
                          unoptimized
                        />
                      </div>

                      <div className="flex items-center gap-2 text-[11px] font-bold">
                        <span className="text-chess-primary font-black uppercase tracking-wider">
                          {post.category}
                        </span>
                        <span className="text-chess-text/30">•</span>
                        <span className="text-chess-text/50">
                          {calculateReadTime(post.content)} min read
                        </span>
                      </div>

                      <h3 className="text-lg font-black leading-snug group-hover:text-chess-primary transition-colors line-clamp-2">
                        {post.title}
                      </h3>

                      <p className="text-xs font-bold text-chess-text/60 line-clamp-2 leading-relaxed">
                        {post.excerpt}
                      </p>
                    </div>

                    <div className="flex items-center justify-between text-[11px] font-bold text-chess-text/40 pt-2">
                      <span>{formatDate(post.createdAt)}</span>
                      <span className="text-chess-primary font-black group-hover:underline flex items-center gap-1">
                        <span>Read Article</span>
                        <span className="group-hover:translate-x-0.5 transition-transform">
                          →
                        </span>
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
