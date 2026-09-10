import React from "react";

/**
 * Route-loading fallback shown while a new page segment streams.
 *
 * A lightweight skeleton (rather than `null`) gives instant visual feedback on
 * navigation: the layout stops "jumping" from a blank frame straight to fully
 * rendered content, which was reading as a stutter. It is intentionally cheap —
 * pure CSS, no images, no data.
 */
export default function GlobalLoading() {
  return (
    <div className="max-w-5xl mx-auto space-y-6 py-8 px-4 animate-pulse text-chess-text">
      <div className="space-y-2">
        <div className="h-3 w-32 bg-chess-surface rounded-full" />
        <div className="h-8 w-64 bg-chess-surface rounded-2xl" />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="bg-chess-surface p-6 rounded-3xl space-y-4 min-h-40"
          >
            <div className="h-4 w-1/3 bg-chess-bg rounded-md" />
            <div className="h-3 w-full bg-chess-bg rounded-md" />
            <div className="h-3 w-5/6 bg-chess-bg rounded-md" />
          </div>
        ))}
      </div>
    </div>
  );
}
