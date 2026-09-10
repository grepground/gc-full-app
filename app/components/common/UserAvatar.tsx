"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";

interface UserAvatarProps {
  /** Bare avatar filename from the API, or null when the member has none. */
  avatar?: string | null;
  username: string;
  /** Rendered box size, e.g. `w-12 h-12 text-base`. */
  className?: string;
  /** `sizes` hint handed to next/image. Defaults to a single fixed width. */
  sizes?: string;
}

/**
 * Member avatar with the site's default profile icon as fallback. The icon is
 * used both when no avatar is set and when the stored image fails to load, so
 * a member is never shown as a blank/broken circle.
 */
export default function UserAvatar({
  avatar,
  username,
  className = "w-10 h-10 text-base",
  sizes = "48px",
}: UserAvatarProps) {
  const [broken, setBroken] = useState<boolean>(false);

  // A newly set (or re-uploaded) avatar should get a fresh chance to render
  // even if the previous one had failed.
  useEffect(() => {
    setBroken(false);
  }, [avatar]);

  const avatarSrc = avatar ? `/uploads/avatars/${avatar}` : null;

  return (
    <div
      className={`rounded-full bg-chess-primary/10 text-chess-primary flex items-center justify-center font-black overflow-hidden relative shrink-0 ${className}`}
    >
      {avatarSrc && !broken ? (
        <Image
          src={avatarSrc}
          alt={username}
          fill
          sizes={sizes}
          unoptimized
          onError={() => setBroken(true)}
          className="object-cover"
        />
      ) : (
        <svg
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden
          className="w-1/2 h-1/2"
        >
          <path d="M12 12a4 4 0 1 0 .001-8 4 4 0 0 0-.001 8Zm0 2.5C8.4 14.5 6 16 5 18.4c-.2.6.2 1.1.9 1.1h12.2c.7 0 1.1-.5.9-1.1-1-2.4-3.4-3.9-7-3.9Z" />
        </svg>
      )}
    </div>
  );
}
