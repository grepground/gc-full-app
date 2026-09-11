"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { getSiteName, getSupportEmail } from "../../services/siteConfig";
import { socialLinks } from "./SocialIcons";

const supportEmail = getSupportEmail();

function ThreadsIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M12.186 24c-3.15 0-5.833-.923-7.697-2.61C2.532 19.638 1.5 16.92 1.5 13.59c0-3.38 1.045-6.136 3.018-8.125C6.54 3.42 9.29 2.45 12.522 2.45c3.34 0 6.09.98 8.046 2.87 1.83 1.77 2.83 4.29 2.83 7.19 0 .84-.08 1.63-.24 2.37-.44 1.99-1.42 3.61-2.92 4.81-1.53 1.23-3.48 1.86-5.8 1.86-1.92 0-3.56-.47-4.88-1.39-1.32-.93-2.09-2.22-2.28-3.83-.06-.5-.03-.98.08-1.45.24-1.03.82-1.88 1.72-2.52 1.08-.77 2.43-1.16 4.02-1.16 1.12 0 2.15.2 3.06.59v-.36c0-.98-.28-1.76-.84-2.31-.56-.56-1.38-.84-2.45-.84-1.02 0-1.85.25-2.48.74-.63.5-.95 1.13-.95 1.89h-2.1c0-1.32.55-2.43 1.65-3.32 1.1-.89 2.53-1.34 4.3-1.34 1.76 0 3.12.45 4.09 1.35.97.9 1.45 2.18 1.45 3.84v5.3c0 1.09.28 1.92.83 2.48.55.56 1.3.84 2.25.84.18 0 .36-.01.55-.04.18-.03.36-.07.54-.12a.85.85 0 0 1 .46.06c.14.07.25.18.33.32l.74 1.3c-.3.25-.67.46-1.1.63-.43.17-.91.29-1.43.36-.52.07-1.07.1-1.65.1-1.65 0-2.98-.48-3.99-1.44-1.01-.96-1.52-2.32-1.52-4.08v-.29c-.77.58-1.65.98-2.63 1.21-.98.23-1.96.25-2.95.06-.99-.19-1.83-.61-2.52-1.26-.69-.65-1.04-1.51-1.04-2.58 0-1.22.45-2.22 1.35-3 .9-.78 2.12-1.17 3.66-1.17 1.45 0 2.68.32 3.68.96v-.32c0-1.29-.38-2.31-1.14-3.06-.76-.75-1.85-1.13-3.27-1.13-1.38 0-2.46.33-3.23.99-.77.66-1.19 1.53-1.26 2.61H2.76c.09-1.82.78-3.29 2.07-4.41C6.12 2.76 7.97 2.2 10.38 2.2c2.42 0 4.27.56 5.55 1.68 1.28 1.12 1.92 2.71 1.92 4.77v6.62c0 .91.18 1.59.54 2.04.36.45.89.68 1.59.68.83 0 1.53-.29 2.1-.87.57-.58.86-1.38.86-2.4 0-2.4-.8-4.44-2.4-6.12-1.6-1.68-3.82-2.52-6.66-2.52-2.73 0-4.99.84-6.78 2.52-1.79 1.68-2.68 3.82-2.68 6.42 0 2.7.88 4.88 2.64 6.54 1.76 1.66 3.98 2.49 6.66 2.49 1.83 0 3.42-.42 4.77-1.26 1.35-.84 2.34-2.01 2.97-3.51.15.06.31.11.48.15.17.04.34.06.51.06 1.1 0 2.01-.38 2.73-1.14.72-.76 1.08-1.78 1.08-3.06 0-3.32-1.18-6.14-3.54-8.46C20.46 1.28 17.15 0 12.52 0 7.82 0 4.45 1.28 2.41 3.84.37 6.4 0 9.7 0 13.74c0 3.98.39 7.23 2.48 9.75C4.57 26.01 7.83 27.27 12.26 27.27c2.25 0 4.22-.36 5.91-1.08 1.69-.72 3.03-1.77 4.02-3.15l-1.38-1.17c-.84 1.14-1.95 2.01-3.33 2.61-1.38.6-2.98.9-4.8.9-3.72 0-6.42-1.02-8.1-3.06-1.68-2.04-2.52-4.74-2.52-8.1 0-3.42.84-6.18 2.52-8.28 1.68-2.1 4.38-3.15 8.1-3.15 3.84 0 6.6 1.02 8.28 3.06 1.68 2.04 2.52 4.74 2.52 8.1 0 .6-.1 1.14-.3 1.62-.2.48-.51.87-.93 1.17-.42.3-.93.45-1.53.45-.69 0-1.26-.22-1.71-.66-.45-.44-.68-1.12-.68-2.04V8.4h-1.8v1.08z" />
    </svg>
  );
}

export default function Footer() {
  const pathname = usePathname();
  const currentYear = new Date().getFullYear();

  if (pathname === "/auth") return null;

  return (
    <footer className="w-full max-w-5xl mx-auto px-4 py-6 mt-auto border-t border-chess-text/10 text-xs text-chess-text/60">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Brand & Copyright */}
        <div className="flex flex-wrap items-center gap-2.5 justify-center sm:justify-start">
          <Link
            href="/"
            className="flex items-center gap-2 hover:opacity-80 transition-opacity shrink-0 select-none"
          >
            <div className="relative w-4 h-4">
              <Image
                src="/logo.png"
                alt={`${getSiteName()} logo`}
                fill
                sizes="16px"
                className="object-contain"
              />
            </div>
            <span className="lowercase font-bold text-chess-text tracking-tight">
              {getSiteName()}
            </span>
          </Link>
          <span className="text-chess-text/20">•</span>
          <span className="text-[11px]">
            © {currentYear} a{" "}
            <a
              href="https://grepground.org"
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold text-chess-text hover:text-chess-primary transition-colors"
            >
              grepground
            </a>{" "}
            project
          </span>
        </div>

        {/* Social Icons, Support Email & Legal Links */}
        <div className="flex flex-wrap items-center gap-x-5 gap-y-3 justify-center text-[11px] font-medium">
          {/* Social Icons - İkon boyutları w-4.5 h-4.5, aralarındaki mesafe gap-3.5 yapıldı */}
          <div className="flex items-center gap-3.5 text-chess-text/70">
            {socialLinks.map((social) => {
              const IconComponent = social.icon;
              return (
                <a
                  key={social.name}
                  href={social.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={social.name}
                  className="hover:text-chess-primary transition-colors p-0.5 hover:-translate-y-0.5 duration-150"
                >
                  <IconComponent className="w-4.5 h-4.5" />
                </a>
              );
            })}
          </div>

          <span className="text-chess-text/20">•</span>

          <a
            href={`mailto:${supportEmail}`}
            className="hover:text-chess-primary font-mono transition-colors"
          >
            {supportEmail}
          </a>

          <span className="text-chess-text/20">•</span>

          {/* Legal */}
          <div className="flex items-center gap-3 font-bold">
            <Link
              href="/privacy"
              className="hover:text-chess-primary transition-colors"
            >
              Privacy
            </Link>
            <Link
              href="/terms"
              className="hover:text-chess-primary transition-colors"
            >
              Terms
            </Link>
            <Link
              href="/cookies"
              className="hover:text-chess-primary transition-colors"
            >
              Cookies
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
