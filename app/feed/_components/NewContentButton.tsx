"use client";

import React from "react";

interface NewContentButtonProps {
  /** Number of unseen items. When 0 the button is not rendered at all. */
  count: number;
  onClick: () => void;
  /** Wording below the count, e.g. "new posts" / "new replies". */
  label?: string;
  /** Disable interaction while the refresh is in flight. */
  loading?: boolean;
  /**
   * Hide the numeric prefix and show only `label`.
   *
   * Used where the probe can confirm *that* something arrived but not *how
   * many* (e.g. replies, where counting would mean downloading the tree) —
   * showing a fabricated "1" there would be misleading.
   */
  hideCount?: boolean;
}

/**
 * Floating "new content" pill (Instagram/X pattern).
 *
 * Renders **nothing** when `count` is 0, so the page carries no extra chrome
 * unless there is genuinely something waiting.
 */
export default function NewContentButton({
  count,
  onClick,
  label = "new posts",
  loading = false,
  hideCount = false,
}: NewContentButtonProps) {
  if (count <= 0) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-24 z-40 flex justify-center px-4">
      <button
        type="button"
        onClick={onClick}
        disabled={loading}
        className="pointer-events-auto inline-flex items-center gap-2 bg-chess-primary text-chess-surface font-black text-xs px-4 py-2.5 rounded-full shadow-lg shadow-black/20 hover:opacity-90 active:scale-95 transition-all duration-200 cursor-pointer disabled:opacity-60 animate-[fade-up_0.3s_ease-out] focus:outline-none focus-visible:ring-2 focus-visible:ring-chess-surface"
      >
        {loading ? (
          <>
            <span className="w-3.5 h-3.5 rounded-full border-2 border-chess-surface/40 border-t-chess-surface animate-spin" />
            <span>Loading…</span>
          </>
        ) : (
          <>
            {/* Upward chevron, echoing the "pull up for new" affordance */}
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.5}
              viewBox="0 0 24 24"
              aria-hidden
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 15l7-7 7 7"
              />
            </svg>
            <span>{hideCount ? label : `${count} ${label}`}</span>
          </>
        )}
      </button>
    </div>
  );
}
