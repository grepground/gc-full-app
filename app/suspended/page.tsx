"use client";

import React from "react";
import { useAuth } from "../context/AuthContext";

export default function SuspendedPage() {
  const { logout } = useAuth();

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center text-chess-text max-w-md mx-auto space-y-6 animate-fade-in">
      {/* High-contrast Minimalist Warning Sign */}
      <div className="w-16 h-16 bg-red-500/10 text-red-400 border border-red-500/20 flex items-center justify-center rounded-2xl text-2xl font-bold select-none">
        ✕
      </div>

      <div className="space-y-2">
        <h1 className="text-2xl font-black tracking-tight">Illegal Move.</h1>
        <p className="text-sm font-medium text-chess-text/40 leading-relaxed">
          Your account has been suspended by the administrative core. You have
          committed too many tactical blunders or violated the system rules.
        </p>
      </div>

      {/* Soft informational status strip */}
      <div className="w-full bg-chess-surface border border-chess-border/10 p-4 rounded-xl text-xs font-mono text-left opacity-60">
        <span className="text-red-400 font-bold">STATUS:</span>{" "}
        flag_account_inactive
        <br />
        <span className="text-chess-primary font-bold">REASON:</span> Rule
        violation or engine usage detection.
      </div>

      <button
        type="button"
        onClick={() => logout()} // Safe button that signs the user out and sends them to the auth page
        className="px-6 py-3 bg-chess-surface border border-chess-border/30 hover:border-red-500/30 text-chess-text/80 hover:text-red-400 font-bold text-xs rounded-xl transition-all cursor-pointer uppercase tracking-wider"
      >
        Sign out and return to reality
      </button>
    </div>
  );
}
