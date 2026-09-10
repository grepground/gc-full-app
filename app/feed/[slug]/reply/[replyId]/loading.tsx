import React from "react";

export default function FeedReplyDetailLoading() {
  return (
    <div className="max-w-3xl mx-auto space-y-6 py-8 px-4 animate-pulse text-chess-text">
      <div className="w-40 h-9 bg-chess-surface rounded-xl opacity-30" />
      <div className="bg-chess-surface p-6 rounded-3xl space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-chess-bg" />
          <div className="space-y-2">
            <div className="h-4 w-32 bg-chess-text opacity-20 rounded-md" />
            <div className="h-3 w-24 bg-chess-text opacity-20 rounded-md" />
          </div>
        </div>
        <div className="h-4 w-full bg-chess-text opacity-20 rounded-md" />
        <div className="h-4 w-5/6 bg-chess-text opacity-20 rounded-md" />
      </div>
      <div className="bg-chess-surface p-6 rounded-3xl space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-chess-bg" />
          <div className="h-4 w-32 bg-chess-text opacity-20 rounded-md" />
        </div>
        <div className="h-3 w-full bg-chess-text opacity-20 rounded-md" />
        <div className="h-3 w-2/3 bg-chess-text opacity-20 rounded-md" />
      </div>
    </div>
  );
}
