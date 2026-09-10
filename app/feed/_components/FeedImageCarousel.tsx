"use client";

import React, { useCallback, useState } from "react";

interface FeedImageCarouselProps {
  /** Bare feed filenames (already serialized from the server). */
  images: string[];
  alt?: string;
  /** Tailwind aspect utility that sizes the media box (e.g. `aspect-[16/10]`). */
  aspectClass?: string;
}

const FEED_MEDIA_URL = (name: string) => `/uploads/feed/${name}`;

// Clean, accessible carousel for a feed post's ordered media. Self-contained:
// prev/next chevrons + clickable dots + keyboard (Left/Right) when focused.
// Interactive controls stop propagation so a wrapping whole-card onClick
// (e.g. the feed's open-post behavior) is never triggered by them.
export default function FeedImageCarousel({
  images,
  alt,
  aspectClass = "aspect-[4/3]",
}: FeedImageCarouselProps) {
  const [active, setActive] = useState<number>(0);

  // A media item that fails to load is dropped from the layout instead of
  // leaving a broken/blank box that would skew the carousel.
  const [broken, setBroken] = useState<Record<number, boolean>>({});

  const list = images
    .map((image, index) => ({ image, index }))
    .filter(({ index }) => !broken[index]);

  // Keep the active slide in bounds as failed items drop off or props shrink.
  const safeActive = Math.min(active, list.length - 1);

  // Hooks must run unconditionally (before any early return) so React sees the
  // same hook order on every render, even when there are no slides left.
  const goTo = useCallback(
    (next: number) => {
      const target = Math.min(Math.max(next, 0), list.length - 1);
      setActive(target);
    },
    [list.length],
  );

  if (list.length === 0) return null;

  const visible = list[safeActive];
  const imageCount = list.length;

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      goTo(safeActive - 1);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      goTo(safeActive + 1);
    }
  };

  return (
    <div className="space-y-2">
      <div
        tabIndex={imageCount > 1 ? 0 : undefined}
        role="group"
        aria-label={alt ? `${alt} — image carousel` : "Image carousel"}
        onKeyDown={onKeyDown}
        className="relative focus:outline-none"
      >
        {visible && (
          <img
            src={FEED_MEDIA_URL(visible.image)}
            alt={
              alt
                ? `${alt} (image ${visible.index + 1} of ${imageCount})`
                : `Media ${visible.index + 1} of ${imageCount}`
            }
            loading="lazy"
            onError={() =>
              setBroken((prev) => ({ ...prev, [visible.index]: true }))
            }
            className={`block w-full h-full object-cover rounded-2xl bg-chess-bg ${aspectClass}`}
          />
        )}

        {imageCount > 1 && (
          <>
            <button
              type="button"
              aria-label="Previous image"
              onClick={(e) => {
                e.stopPropagation();
                goTo(safeActive - 1);
              }}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/45 text-white backdrop-blur-sm flex items-center justify-center hover:bg-black/65 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                strokeWidth={2.5}
                viewBox="0 0 24 24"
                aria-hidden
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>
            <button
              type="button"
              aria-label="Next image"
              onClick={(e) => {
                e.stopPropagation();
                goTo(safeActive + 1);
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/45 text-white backdrop-blur-sm flex items-center justify-center hover:bg-black/65 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                strokeWidth={2.5}
                viewBox="0 0 24 24"
                aria-hidden
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>

            {/* Slide counter pill */}
            <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-black/45 text-white text-[10px] font-black backdrop-blur-sm select-none pointer-events-none">
              {visible.index + 1} / {imageCount}
            </span>
          </>
        )}
      </div>

      {imageCount > 1 && (
        <div className="flex items-center justify-center gap-1.5">
          {list.map(({ index }) => (
            <button
              key={index}
              type="button"
              aria-label={`Go to image ${index + 1}`}
              aria-current={index === visible.index}
              onClick={(e) => {
                e.stopPropagation();
                setActive(index);
              }}
              className={`h-1.5 rounded-full transition-all duration-200 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-chess-primary ${
                index === safeActive
                  ? "w-5 bg-chess-primary"
                  : "w-1.5 bg-chess-text/20 hover:bg-chess-text/40"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
