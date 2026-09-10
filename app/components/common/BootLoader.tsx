"use client";

import { useEffect, useState } from "react";
import { getSiteName } from "../../services/siteConfig";

/**
 * Boot overlay: only shown on the very first full page load.
 *
 * Why: the first paint often suffers from layout/image-decode jank right as
 * critical assets land. Instead of showing that stutter to the user we render a
 * lightweight full-screen boot screen immediately, then reveal the app with a
 * short crossfade once the first resources have finished loading. It runs once
 * per full navigation — client-side route changes don't re-trigger it.
 */

const MIN_DISPLAY_MS = 650; // feel like the app "warmed up" without feeling slow
const FADE_MS = 350; // must match the Tailwind duration below
const SEEN_KEY = "app:booted";

function waitForFirstLoad(): Promise<void> {
  // Wait for the browser to finish loading the initial page/its resources
  // (scripts, stylesheets, <img>s above the fold, …). If we're already in a
  // fully loaded state (fast back-forward cache) resolve immediately.
  const loaded =
    document.readyState === "complete"
      ? Promise.resolve()
      : new Promise<void>((resolve) => {
          window.addEventListener("load", () => resolve(), { once: true });
        });

  return Promise.all([
    loaded,
    new Promise((resolve) => setTimeout(() => resolve(null), MIN_DISPLAY_MS)),
  ]).then(() => undefined);
}

export default function BootLoader() {
  const [closing, setClosing] = useState(false);
  const [mounted, setMounted] = useState(true);

  useEffect(() => {
    let disposed = false;
    let removeTimer = 0;

    // Show the boot overlay only on the first load of a browser session.
    // Repeating it on every full navigation (back/forward, hard link reload)
    // read as jank — the app was ready, yet a full-screen layer covered it.
    let alreadyBooted = false;
    try {
      alreadyBooted = sessionStorage.getItem(SEEN_KEY) === "1";
    } catch {
      // sessionStorage can throw in restricted/private contexts — fail open to
      // the (harmless) one-time overlay rather than crashing the layout.
    }

    if (alreadyBooted) {
      // Defer the state update out of the synchronous effect body so React
      // does not cascade an extra render pass on mount.
      removeTimer = window.setTimeout(() => setMounted(false), 0);
      return () => {
        if (removeTimer) window.clearTimeout(removeTimer);
      };
    }

    try {
      sessionStorage.setItem(SEEN_KEY, "1");
    } catch {
      /* ignore storage failures */
    }

    waitForFirstLoad().then(() => {
      if (disposed) return;
      requestAnimationFrame(() => {
        setClosing(true); // fade overlay out to reveal the now-ready app
      });
      // Remove the element only after the fade finishes — never before the
      // first-load promise resolved, so a slow network keeps it covered.
      removeTimer = window.setTimeout(
        () => requestAnimationFrame(() => setMounted(false)),
        FADE_MS + 90,
      );
    });

    return () => {
      disposed = true;
      if (removeTimer) window.clearTimeout(removeTimer);
    };
  }, []);

  if (!mounted) return null;

  return (
    <div
      aria-hidden
      className={`fixed inset-0 z-[60] flex flex-col items-center justify-center gap-6 bg-chess-bg transition-opacity duration-300 pointer-events-none ${
        closing ? "opacity-0" : "opacity-100"
      }`}
    >
      {/* Animated illustration — a tiny abstract chess piece floating on a
          thin orbital track. Designed as a single self-contained drawing. */}
      <div className="relative w-24 h-24 sm:w-28 sm:h-28">
        {/* Soft halo behind the drawing */}
        <div className="absolute inset-[-14px] rounded-full bg-chess-primary/10 animate-pulse" />

        <svg
          viewBox="0 0 120 120"
          aria-hidden
          className="relative w-full h-full"
        >
          <title>Loading</title>

          {/* Outer dashed orbit — sweeps continuously */}
          <circle
            cx="60"
            cy="60"
            r="44"
            fill="none"
            stroke="var(--color-chess-text)"
            strokeOpacity="0.14"
            strokeWidth="2"
            strokeDasharray="1 10"
            strokeLinecap="round"
            className="animate-[ia-sway_14s_linear_infinite]"
            style={{ transformOrigin: "60px 60px" }}
          />

          {/* Second, inner guiding arc */}
          <circle
            cx="60"
            cy="60"
            r="36"
            fill="none"
            stroke="var(--color-chess-primary)"
            strokeOpacity="0.32"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeDasharray="60 220"
            className="animate-[spin_9s_linear_infinite_reverse]"
            style={{ transformOrigin: "60px 60px" }}
          />

          {/* Central piece — bobs gently in place */}
          <g className="animate-[ia-bob_1.8s_ease-in-out_infinite]">
            {/* Crown peak */}
            <rect
              x="48"
              y="34"
              width="24"
              height="6"
              rx="2"
              fill="var(--color-chess-primary)"
            />
            {/* Castle crenellation */}
            <rect
              x="46"
              y="38"
              width="7"
              height="8"
              fill="var(--color-chess-text)"
            />
            <rect
              x="67"
              y="38"
              width="7"
              height="8"
              fill="var(--color-chess-text)"
            />
            {/* Crown walls */}
            <rect
              x="50"
              y="43"
              width="20"
              height="4"
              rx="1"
              fill="var(--color-chess-primary)"
            />
            {/* Tapering body */}
            <rect
              x="54"
              y="46"
              width="12"
              height="24"
              fill="var(--color-chess-text)"
            />
            {/* Collar */}
            <rect
              x="50"
              y="63"
              width="20"
              height="5"
              rx="1.5"
              fill="var(--color-chess-primary)"
            />
            {/* Plinth / base */}
            <rect
              x="42"
              y="78"
              width="36"
              height="5"
              rx="1"
              fill="var(--color-chess-text)"
            />
            <rect
              x="44"
              y="84"
              width="32"
              height="6"
              rx="3"
              fill="var(--color-chess-primary)"
            />
          </g>
        </svg>
      </div>

      <div className="flex flex-col items-center gap-2">
        <span className="text-xs font-black uppercase tracking-[0.3em] text-chess-text/80">
          {getSiteName()}
        </span>
        <span className="text-[10px] font-bold text-chess-text/40 tracking-widest">
          setting up the board…
        </span>

        {/* Slim progress hint */}
        <div className="w-28 h-1 mt-1 bg-chess-surface rounded-full overflow-hidden">
          <div className="h-full bg-chess-primary rounded-full animate-[loading-bar_0.9s_linear_infinite]" />
        </div>
      </div>
    </div>
  );
}
