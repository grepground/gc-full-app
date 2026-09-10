"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  getSiteName,
  getSocialHandle,
  getSupportEmail,
} from "../../services/siteConfig";
import {
  InstagramIcon,
  PinterestIcon,
  ThreadsIcon,
  TiktokIcon,
  XIcon,
  YoutubeIcon,
} from "./SocialIcons";

const handle = getSocialHandle();

const socialLinks = [
  { name: "YouTube", url: `https://youtube.com/@${handle}`, icon: YoutubeIcon },
  {
    name: "Instagram",
    url: `https://instagram.com/${handle}`,
    icon: InstagramIcon,
  },
  { name: "Threads", url: `https://threads.net/@${handle}`, icon: ThreadsIcon },
  { name: "TikTok", url: `https://tiktok.com/@${handle}`, icon: TiktokIcon },
  { name: "X", url: `https://x.com/${handle}`, icon: XIcon },
  {
    name: "Pinterest",
    url: `https://pinterest.com/${handle}`,
    icon: PinterestIcon,
  },
];

const supportEmail = getSupportEmail();

export default function Footer() {
  const pathname = usePathname();

  if (pathname === "/auth") return null;

  return (
    <footer className="w-full max-w-5xl mx-auto px-3 sm:px-6 py-6 mt-auto">
      <div className="w-full bg-chess-surface rounded-3xl sm:rounded-full px-6 py-4 sm:py-3 flex flex-col md:flex-row items-center justify-between gap-4 text-xs font-black animate-[fade-up_0.6s_ease-out_0.15s]">
        {/* Brand */}
        <Link
          href="/"
          className="flex items-center gap-2.5 hover:opacity-80 transition-opacity shrink-0 select-none"
        >
          <div className="relative w-5 h-5">
            <Image
              src="/logo.png"
              alt={`${getSiteName()} logo`}
              fill
              sizes="20px"
              className="object-contain"
            />
          </div>
          <span className="lowercase font-black text-sm text-chess-text tracking-tight">
            {getSiteName()}
          </span>
        </Link>

        {/* Social Icons & Mail */}
        <div className="flex flex-wrap justify-center items-center gap-2 text-chess-text/70">
          {socialLinks.map((social) => {
            const IconComponent = social.icon;
            return (
              <a
                key={social.name}
                href={social.url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={social.name}
                className="w-8 h-8 rounded-full bg-chess-bg flex items-center justify-center hover:bg-chess-surface-hover hover:text-chess-primary hover:-translate-y-0.5 transition-all duration-200 active:scale-90"
              >
                <IconComponent className="w-4 h-4" />
              </a>
            );
          })}
          <a
            href={`mailto:${supportEmail}`}
            className="px-3 py-1.5 rounded-full bg-chess-bg hover:bg-chess-surface-hover text-chess-primary font-mono lowercase transition-all duration-200 active:scale-95 text-[11px]"
          >
            {supportEmail}
          </a>
        </div>

        {/* Copyright */}
        <div className="flex items-center gap-1.5 text-chess-text/40 shrink-0 text-[11px]">
          <span>© 2026</span>
          <span>•</span>
          <span>read, solve & improve 🧩</span>
        </div>
      </div>

      {/* Legal Links */}
      <div className="mt-2 flex flex-wrap justify-center items-center gap-x-4 gap-y-1 text-[11px] font-black text-chess-text/40">
        <Link
          href="/privacy"
          className="hover:text-chess-primary transition-colors"
        >
          Privacy Policy
        </Link>
        <span className="text-chess-text/20">•</span>
        <Link
          href="/terms"
          className="hover:text-chess-primary transition-colors"
        >
          Terms of Use
        </Link>
        <span className="text-chess-text/20">•</span>
        <Link
          href="/cookies"
          className="hover:text-chess-primary transition-colors"
        >
          Cookie Policy
        </Link>
      </div>
    </footer>
  );
}
