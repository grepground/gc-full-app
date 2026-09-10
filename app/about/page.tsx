import React from "react";
import Link from "next/link";
import Image from "next/image";
import { getPageTitle, getSiteName } from "../services/siteConfig";

export const metadata = {
  title: getPageTitle("About"),
  description: `Learn about ${getSiteName()} — a small community for chess fans, built by someone who loves the game more than he's good at it.`,
};

export default function AboutPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-8 py-10 px-4 text-chess-text">
      {/* Header Section */}
      <section className="space-y-3">
        <div className="inline-flex items-center gap-2 bg-chess-primary/10 px-3 py-1 rounded-full text-chess-primary text-xs font-black">
          <span>♟️</span>
          <span>small chess community</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-black tracking-tight lowercase">
          about {getSiteName()}
        </h1>
        <p className="text-sm sm:text-base font-bold text-chess-text/70 leading-relaxed max-w-2xl">
          Welcome to {getSiteName()} — a small, friendly corner of the internet
          for people who love chess.
        </p>
      </section>

      {/* Main Mission Card */}
      <section className="bg-chess-surface p-6 sm:p-8 rounded-3xl space-y-4">
        <h2 className="text-xl sm:text-2xl font-black">
          Made by a chess lover, not a chess expert
        </h2>
        <p className="text-xs sm:text-sm font-bold text-chess-text/70 leading-relaxed">
          To be honest, I am not great at chess. I blunder pieces, I repeat the
          same mistakes, and I have lost count of how many times I have thrown
          away a winning position. But I love this game — I love watching it,
          reading about it, and thinking about it. That is exactly what
          {getSiteName()} is: a place where I can share the things I enjoy and
          learn alongside other fans, without pretending to be an expert.
        </p>
        <p className="text-xs sm:text-sm font-bold text-chess-text/70 leading-relaxed">
          This is a small community, and I want to keep it that way. As we grow,
          we will add more articles, puzzles, and features — but the heart of it
          will always be a friendly place to talk about chess together.
        </p>
      </section>

      {/* Feature Grid */}
      <section className="grid sm:grid-cols-2 gap-4">
        {/* Current Features */}
        <div className="bg-chess-surface p-6 sm:p-8 rounded-3xl space-y-3">
          <div className="w-10 h-10 rounded-2xl bg-chess-primary/10 text-chess-primary flex items-center justify-center font-black text-lg">
            📰
          </div>
          <h3 className="text-lg font-black">News & Articles</h3>
          <p className="text-xs font-bold text-chess-text/60 leading-relaxed">
            Read carefully chosen articles about big tournaments, famous games,
            and the stories behind the board. Share your own thoughts in the
            comment section.
          </p>
        </div>

        {/* Roadmap / Future Features */}
        <div className="bg-chess-surface p-6 sm:p-8 rounded-3xl space-y-3">
          <div className="w-10 h-10 rounded-2xl bg-chess-primary/10 text-chess-primary flex items-center justify-center font-black text-lg">
            🧩
          </div>
          <h3 className="text-lg font-black">Puzzles & Learning</h3>
          <p className="text-xs font-bold text-chess-text/60 leading-relaxed">
            Coming soon: friendly puzzles, step-by-step solutions, and simple
            guides to help players of every level understand the game a little
            better.
          </p>
        </div>
      </section>

      {/* Call to Action */}
      <section className="bg-chess-surface p-6 sm:p-8 rounded-3xl text-center space-y-4">
        <h2 className="text-xl font-black">Let's Learn Together</h2>
        <p className="text-xs font-bold text-chess-text/60 max-w-lg mx-auto leading-relaxed">
          Stay connected with us on social media for daily content, fun chess
          videos, tournament updates, and news about new features.
        </p>
        <div className="pt-2 flex flex-wrap justify-center gap-3">
          <Link
            href="/news"
            className="bg-chess-primary text-chess-surface font-black px-6 py-2.5 rounded-full hover:opacity-90 transition-opacity text-xs"
          >
            Explore Articles
          </Link>
          <Link
            href="/contact"
            className="bg-chess-bg text-chess-text font-black px-6 py-2.5 rounded-full hover:bg-chess-surface-hover transition-colors text-xs"
          >
            Contact Us
          </Link>
        </div>
      </section>
    </div>
  );
}
