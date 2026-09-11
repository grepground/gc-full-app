import React from "react";
import {
  SiYoutube,
  SiInstagram,
  SiThreads,
  SiTiktok,
  SiX,
  SiPinterest,
} from "react-icons/si";
import { getSocialHandle } from "../../services/siteConfig";

/**
 * Shared social brand marks using react-icons/si (Simple Icons).
 * Single source of truth for the site's social links.
 */

export const YoutubeIcon = SiYoutube;
export const InstagramIcon = SiInstagram;
export const ThreadsIcon = SiThreads;
export const TiktokIcon = SiTiktok;
export const XIcon = SiX;
export const PinterestIcon = SiPinterest;

export function MailIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <rect width="20" height="16" x="2" y="4" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  );
}

/** One entry of the shared social link list rendered by the footer and pages. */
export interface SocialLink {
  name: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
}

const handle = getSocialHandle();

/**
 * Canonical social links for the whole app, in display order.
 */
export const socialLinks: SocialLink[] = [
  { name: "YouTube", url: `https://youtube.com/@${handle}`, icon: YoutubeIcon },
  {
    name: "Instagram",
    url: `https://instagram.com/${handle}`,
    icon: InstagramIcon,
  },
  { name: "Threads", url: `https://threads.net/@${handle}`, icon: ThreadsIcon },
  { name: "TikTok", url: `https://tiktok.com/@${handle}`, icon: TiktokIcon },
  { name: "X (Twitter)", url: `https://x.com/${handle}`, icon: XIcon },
  {
    name: "Pinterest",
    url: `https://pinterest.com/${handle}`,
    icon: PinterestIcon,
  },
];
