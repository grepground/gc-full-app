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
  const currentYear = new Date().getFullYear();

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

        {/* Copyright & grepground Branding */}
        <div className="flex flex-wrap items-center justify-center gap-2 text-chess-text/50 shrink-0 text-[11px]">
          <span>© {currentYear}</span>
          <span>•</span>
          <span className="flex items-center gap-1">
            a
            <a
              href="https://grepground.org"
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold text-chess-text hover:text-chess-primary transition-colors bg-chess-bg px-2 py-0.5 rounded-md border border-chess-text/10"
            >
              grepground
            </a>
            project
          </span>
        </div>
      </div>

      {/* Legal Links & Tagline */}
      <div className="mt-3 flex flex-col sm:flex-row justify-between items-center gap-y-2 px-2 text-[11px] font-medium text-chess-text/40">
        <div className="flex items-center gap-1.5">
          <span>read, solve & improve</span>
          <span>🧩</span>
        </div>

        <div className="flex items-center gap-x-3 font-bold">
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
      </div>
    </footer>
  );
}
