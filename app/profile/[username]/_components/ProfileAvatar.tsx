"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";

interface ProfileAvatarProps {
  username: string;
  /** Bare avatar filename, or null when the member has no picture. */
  avatar: string | null;
}

/**
 * Member avatar with a click-to-enlarge lightbox.
 *
 * Interaction rules (deliberate, to keep members in control of their photo):
 * - The photo is **not** draggable and its context menu is suppressed; only a
 *   plain left click opens the enlarged view.
 * - The enlarged view is just the avatar itself — no chrome, no close button;
 *   it is inert too (no context menu, no drag).
 * - Closing is explicit (backdrop click or Escape).
 *
 * Right-click/drag suppression is a UX deterrent, not a security boundary:
 * the underlying file is still a public URL (as it must be to render at all).
 * It stops casual "save image as" and accidental drags, nothing more.
 */
export default function ProfileAvatar({
  username,
  avatar,
}: ProfileAvatarProps) {
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);

  const src = avatar ? `/uploads/avatars/${avatar}` : null;

  const close = useCallback(() => setOpen(false), []);

  // Escape closes the lightbox; focus moves onto the dialog while it is open so
  // keyboard users are never stranded behind the overlay.
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKeyDown);
    dialogRef.current?.focus();
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, close]);

  // Lock background scrolling while the lightbox is open.
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  // Suppress the context menu across the thumbnail + modal subtree.
  const blockContextMenu = (e: React.MouseEvent) => e.preventDefault();

  // `draggable={false}` covers the native drag; onDragStart is a belt-and-braces
  // guard for engines that still fire it.
  const blockDrag = (e: React.DragEvent) => e.preventDefault();

  return (
    <>
      {src ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          onContextMenu={blockContextMenu}
          aria-label={`View ${username}'s profile picture`}
          className="w-20 h-20 rounded-full overflow-hidden select-none cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-chess-primary focus-visible:ring-offset-2 focus-visible:ring-offset-chess-surface"
        >
          <Image
            src={src}
            alt={username}
            width={80}
            height={80}
            unoptimized
            draggable={false}
            onDragStart={blockDrag}
            onContextMenu={blockContextMenu}
            className="rounded-full object-cover w-20 h-20 select-none pointer-events-none"
          />
        </button>
      ) : (
        <div className="w-20 h-20 rounded-full bg-chess-primary/10 text-chess-primary flex items-center justify-center text-3xl font-black select-none">
          {username.charAt(0).toUpperCase()}
        </div>
      )}

      {open && src && (
        <div
          ref={dialogRef}
          tabIndex={-1}
          role="dialog"
          aria-modal="true"
          aria-label={`${username}'s profile picture`}
          onClick={(e) => {
            // Only a click on the backdrop (not the panel) dismisses.
            if (e.target === e.currentTarget) close();
          }}
          onContextMenu={blockContextMenu}
          className="fixed inset-0 z-[70] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 cursor-pointer focus:outline-none"
        >
          <div
            className="w-56 h-56 md:w-72 md:h-72 relative rounded-full overflow-hidden bg-chess-bg/40 ring-4 ring-chess-surface/40 shadow-2xl cursor-default"
            onContextMenu={blockContextMenu}
          >
            <Image
              src={src}
              alt={username}
              fill
              sizes="288px"
              unoptimized
              draggable={false}
              onDragStart={blockDrag}
              onContextMenu={blockContextMenu}
              className="object-cover select-none pointer-events-none"
            />
          </div>
        </div>
      )}
    </>
  );
}
