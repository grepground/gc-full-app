"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "../../context/AuthContext";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { getSiteName } from "../../services/siteConfig";

export default function Header() {
  const pathname = usePathname();
  const { user, loading, logout } = useAuth();

  const [mounted, setMounted] = useState<boolean>(false);
  const [isOpen, setIsOpen] = useState<boolean>(false); // User Dropdown
  const [menuOpen, setMenuOpen] = useState<boolean>(false); // Modal Menu

  // Scroll State
  const [showHeader, setShowHeader] = useState<boolean>(true);
  const [showScrollTop, setShowScrollTop] = useState<boolean>(false);
  const [avatarBroken, setAvatarBroken] = useState<boolean>(false);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Close menus when the page changes
  useEffect(() => {
    setMenuOpen(false);
    setIsOpen(false);
  }, [pathname]);

  // Start from a clean state whenever the active avatar path changes so a new
  // (or re-uploaded) image can render even if the previous one had failed.
  useEffect(() => {
    setAvatarBroken(false);
  }, [user?.avatar]);

  // Scroll Logic — coalesced into a single rAF pass per frame so we only ever
  // update React state when the derived UI flags actually change (avoids the
  // repeated setState->re-render churn on every scroll event that can cause
  // visible stutter/freezing while scrolling).
  useEffect(() => {
    let rafId = 0;
    let lastY = window.scrollY;
    let showedTop = false; // scroll-to-top button visible?
    let showedHeader = true;

    const handle = () => {
      rafId = 0;
      const current = window.scrollY;

      // 1) Scroll-to-top visibility (threshold-only boundary updates).
      const nextTop = current > 300;
      if (nextTop !== showedTop) {
        showedTop = nextTop;
        setShowScrollTop(nextTop);
      }

      // 2) Header hide/show driven by dominant scroll *direction*.
      // Default to the current visible state (so fast-touch scrolling that
      // triggers small deltas doesn't keep blinking the header back on.
      let nextHeader = showedHeader;
      if (current < 10) {
        nextHeader = true; // pinned back to top => always show
      } else {
        const diff = current - lastY;
        if (diff > 10)
          nextHeader = false; // scrolling down  -> hide
        else if (diff < -10) nextHeader = true; // scrolling up -> show
      }
      if (nextHeader !== showedHeader) {
        showedHeader = nextHeader;
        setShowHeader(nextHeader);
        if (!nextHeader) {
          setIsOpen(false);
          setMenuOpen(false);
        }
      }
      lastY = current;
    };

    const onScroll = () => {
      if (rafId) return;
      rafId = requestAnimationFrame(handle);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, []);

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    if (isOpen || menuOpen)
      document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, menuOpen]);

  if (pathname === "/auth") return null;

  const avatarSrc = user?.avatar ? `/uploads/avatars/${user.avatar}` : null;

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <>
      <header
        className={`sticky top-4 z-50 w-full max-w-5xl mx-auto px-3 sm:px-6 transition-transform duration-300 ease-in-out ${
          showHeader ? "translate-y-0" : "-translate-y-24"
        }`}
      >
        <div className="w-full bg-chess-surface rounded-full px-4 sm:px-6 h-16 flex items-center justify-between animate-[header-entrance_0.6s_ease-out]">
          {/* Brand */}
          <Link
            href="/"
            className="group flex items-center gap-2 sm:gap-3 select-none shrink-0"
          >
            <div className="relative w-10 h-10">
              <Image
                src="/logo.png"
                alt={`${getSiteName()} logo`}
                sizes="40px"
                fill
                className="object-contain"
                priority
              />
            </div>
            <span className="font-black text-lg sm:text-xl text-chess-text tracking-tight lowercase transition-colors duration-300 group-hover:text-chess-primary">
              {getSiteName()}
            </span>
            <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-gradient-to-r from-violet-500 to-fuzzy-pink text-white shadow-sm shadow-violet-500/30 self-center">
              beta
            </span>
          </Link>

          {/* Right Area: Only Sign in / Profile and the 3-line Menu Button */}
          <div className="flex items-center gap-2 sm:gap-3">
            {!mounted || loading ? (
              <div className="w-20 h-9 rounded-full bg-chess-bg/60 animate-pulse" />
            ) : user ? (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => {
                    setIsOpen(!isOpen);
                    setMenuOpen(false);
                  }}
                  type="button"
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-chess-bg text-chess-text font-bold text-xs cursor-pointer hover:bg-chess-surface-hover transition-all duration-200 active:scale-95 active:bg-chess-surface-hover"
                >
                  <div className="w-7 h-7 min-w-[28px] min-h-[28px] rounded-full bg-chess-primary/10 text-chess-primary flex items-center justify-center font-black overflow-hidden relative shrink-0">
                    {avatarSrc && !avatarBroken ? (
                      <Image
                        src={avatarSrc}
                        alt={user.username}
                        fill
                        sizes="28px"
                        unoptimized
                        onError={() => setAvatarBroken(true)}
                        className="object-cover"
                      />
                    ) : (
                      <svg
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        aria-hidden
                        className="w-4 h-4"
                      >
                        <path d="M12 12a4 4 0 1 0 .001-8 4 4 0 0 0-.001 8Zm0 2.5C8.4 14.5 6 16 5 18.4c-.2.6.2 1.1.9 1.1h12.2c.7 0 1.1-.5.9-1.1-1-2.4-3.4-3.9-7-3.9Z" />
                      </svg>
                    )}
                  </div>
                  <span className="hidden sm:inline">{user.username}</span>
                </button>

                {/* User Dropdown (Borderless & Flat) */}
                {isOpen && (
                  <div className="absolute right-0 mt-3 w-56 bg-chess-surface rounded-3xl p-2.5 z-50 space-y-1 text-xs animate-[menu-pop_0.25s_ease-out] origin-top-right">
                    {/* Profile Title Card */}
                    <div className="px-3 py-2.5 bg-chess-bg rounded-2xl mb-1 flex items-center justify-between animate-[menu-item-slide_0.25s_ease-out]">
                      <div className="font-black text-chess-text truncate">
                        {user.username}
                      </div>
                      <span className="text-[10px] font-mono font-black uppercase px-2 py-0.5 rounded-full bg-chess-primary/10 text-chess-primary shrink-0">
                        {user?.role || "player"}
                      </span>
                    </div>

                    {/* Menu Options */}
                    <Link
                      href="/profile"
                      onClick={() => setIsOpen(false)}
                      className="block px-3 py-2 rounded-xl hover:bg-chess-bg hover:translate-x-0.5 font-black text-chess-text/80 hover:text-chess-text transition-all duration-200 animate-[menu-item-slide_0.25s_ease-out]"
                    >
                      Profile
                    </Link>

                    <Link
                      href="/chess"
                      onClick={() => setIsOpen(false)}
                      className="block px-3 py-2 rounded-xl hover:bg-chess-bg hover:translate-x-0.5 font-black text-chess-text/80 hover:text-chess-text transition-all duration-200 animate-[menu-item-slide_0.26s_ease-out]"
                    >
                      My Games
                    </Link>

                    <Link
                      href="/chess/pgn"
                      onClick={() => setIsOpen(false)}
                      className="block px-3 py-2 rounded-xl hover:bg-chess-bg hover:translate-x-0.5 font-black text-chess-text/80 hover:text-chess-text transition-all duration-200 animate-[menu-item-slide_0.27s_ease-out]"
                    >
                      Analyze PGN
                    </Link>

                    {user?.role === "admin" && (
                      <Link
                        href="/admin"
                        onClick={() => setIsOpen(false)}
                        className="block px-3 py-2 rounded-xl hover:bg-chess-bg hover:translate-x-0.5 font-black text-chess-text/80 hover:text-chess-text transition-all duration-200 animate-[menu-item-slide_0.25s_ease-out]"
                      >
                        Admin Settings
                      </Link>
                    )}

                    <button
                      onClick={() => {
                        setIsOpen(false);
                        logout();
                      }}
                      className="w-full text-left px-3 py-2 rounded-xl hover:bg-red-500/10 hover:translate-x-0.5 hover:text-red-400 font-black text-chess-text/60 transition-all duration-200 cursor-pointer animate-[menu-item-slide_0.25s_ease-out]"
                    >
                      Sign out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link
                href="/auth"
                className="bg-chess-primary text-chess-surface font-black px-5 py-2 rounded-full hover:opacity-90 transition-all duration-200 active:scale-95 text-xs whitespace-nowrap"
              >
                Sign in
              </Link>
            )}

            {/* Hamburger Menu Button at the Far Right */}
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => {
                  setMenuOpen(!menuOpen);
                  setIsOpen(false);
                }}
                type="button"
                className={`w-10 h-10 rounded-full bg-chess-bg text-chess-text font-black text-base flex items-center justify-center hover:bg-chess-surface-hover transition-all duration-200 active:scale-90 cursor-pointer ${
                  menuOpen ? "rotate-90" : "rotate-0"
                }`}
                aria-label="Toggle Navigation Menu"
              >
                {menuOpen ? "✕" : "☰"}
              </button>

              {/* Borderless, Totally Flat Dropdown Menu Modal */}
              {menuOpen && (
                <div className="absolute right-0 mt-3 w-56 bg-chess-surface rounded-3xl p-3 z-50 space-y-1 text-xs font-black animate-[menu-pop_0.25s_ease-out] origin-top-right">
                  <Link
                    href="/news"
                    onClick={() => setMenuOpen(false)}
                    className="block px-4 py-3 rounded-2xl hover:bg-chess-bg hover:translate-x-1 text-chess-text/80 transition-all duration-200 animate-[menu-item-slide_0.28s_ease-out]"
                  >
                    News
                  </Link>
                  <Link
                    href="/feed"
                    onClick={() => setMenuOpen(false)}
                    className="block px-4 py-3 rounded-2xl hover:bg-chess-bg hover:translate-x-1 text-chess-text/80 transition-all duration-200 animate-[menu-item-slide_0.3s_ease-out]"
                  >
                    Feed
                  </Link>
                  <Link
                    href="/chess"
                    onClick={() => setMenuOpen(false)}
                    className="block px-4 py-3 rounded-2xl hover:bg-chess-bg hover:translate-x-1 text-chess-text/80 transition-all duration-200 animate-[menu-item-slide_0.3s_ease-out]"
                  >
                    Games
                  </Link>
                  <Link
                    href="/chess/pgn"
                    onClick={() => setMenuOpen(false)}
                    className="block px-4 py-3 rounded-2xl hover:bg-chess-bg hover:translate-x-1 text-chess-text/80 transition-all duration-200 animate-[menu-item-slide_0.31s_ease-out]"
                  >
                    Analyze PGN
                  </Link>
                  <Link
                    href="/about"
                    onClick={() => setMenuOpen(false)}
                    className="block px-4 py-3 rounded-2xl hover:bg-chess-bg hover:translate-x-1 text-chess-text/80 transition-all duration-200 animate-[menu-item-slide_0.3s_ease-out]"
                  >
                    About
                  </Link>
                  <Link
                    href="/contact"
                    onClick={() => setMenuOpen(false)}
                    className="block px-4 py-3 rounded-2xl hover:bg-chess-bg hover:translate-x-1 text-chess-text/80 transition-all duration-200 animate-[menu-item-slide_0.32s_ease-out]"
                  >
                    Contact
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Round "Scroll to Top" Button at the Bottom Right */}
      <button
        type="button"
        onClick={scrollToTop}
        aria-label="Scroll to top"
        className={`fixed bottom-6 right-6 z-40 w-12 h-12 rounded-full bg-chess-surface text-chess-primary flex items-center justify-center hover:bg-chess-primary hover:text-chess-surface transition-colors duration-300 cursor-pointer ${
          showScrollTop
            ? "opacity-100 scale-100 pointer-events-auto animate-[scroll-top-pop_0.4s_ease-out] group"
            : "opacity-0 scale-75 pointer-events-none"
        }`}
      >
        <span className="text-lg font-black transition-transform duration-300 group-hover:-translate-y-1">
          ↑
        </span>
      </button>
    </>
  );
}
