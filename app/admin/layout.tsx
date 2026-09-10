"use client";

import React, { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "../context/AuthContext";
import Link from "next/link";

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname(); // FIX: Track the dynamic nested client sub-paths cleanly

  useEffect(() => {
    // If the authentication process finishes and the identity is invalid, boot the client
    if (!loading && (!user || user.role !== "admin")) {
      router.push("/auth?callbackUrl=/admin");
    }
  }, [user, loading, router]);

  // Show our seamless, non-glare loading state during validation execution
  if (loading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center space-y-4 animate-fade-in">
        <div className="w-48 h-2 border-2 border-chess-text bg-chess-surface rounded-full overflow-hidden">
          <div className="h-full bg-chess-primary w-1/2 rounded-full animate-[loading-bar_1.5s_infinite_ease-in-out]" />
        </div>
        <span className="text-xs font-black uppercase tracking-widest text-chess-text opacity-70 animate-pulse">
          Verifying Clearance...
        </span>
      </div>
    );
  }

  // Prevent layout leakage before the hook triggers the routing redirection
  if (!user || user.role !== "admin") {
    return null;
  }

  // Configuration for our decoupled server modules navigation links
  const navItems = [
    { href: "/admin/create-post", label: "Create post" },
    { href: "/admin/posts", label: "Manage posts" },
    { href: "/admin/users", label: "Manage users" },
  ];

  // If confirmed as an administrator, cleanly unlock the administrative viewport layout
  return (
    <div className="space-y-10 py-4 text-chess-text max-w-5xl mx-auto">
      {/* Editorial Dashboard Header Area */}
      <section className="space-y-1.5 border-b border-chess-border border-opacity-20 pb-6">
        <h1 className="text-3xl font-bold tracking-tight text-chess-text">
          Control center
        </h1>
        <p className="text-sm font-medium text-chess-primary opacity-80">
          Welcome back, {user.username}. Managing system infrastructure.
        </p>
      </section>

      <div className="grid md:grid-cols-12 gap-8 items-start">
        {/* Navigation Sidebar Panel */}
        <div className="md:col-span-3 bg-chess-surface p-5 rounded-2xl space-y-4">
          <div className="text-[10px] font-bold uppercase tracking-wider opacity-40 px-2">
            System modules
          </div>
          <nav className="flex flex-col space-y-1 text-sm font-medium">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`text-left px-3 py-2.5 rounded-xl transition-all ${
                    isActive
                      ? "bg-chess-bg text-chess-text font-bold border border-chess-border border-opacity-20"
                      : "text-chess-text/70 hover:bg-chess-surface-hover hover:text-chess-text"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Workspace Viewport Block for Routing Sub-nodes */}
        <div className="md:col-span-9">{children}</div>
      </div>
    </div>
  );
}
