import React from "react";

export default function FeedLoading() {
  return (
    <div className="max-w-xl mx-auto space-y-4 py-6 animate-pulse text-chess-text">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="bg-chess-surface p-5 rounded-3xl space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-chess-bg"></div>
            <div className="h-4 w-32 bg-chess-text opacity-20 rounded-md"></div>
          </div>
          <div className="space-y-2">
            <div className="h-4 w-full bg-chess-text opacity-20 rounded-md"></div>
            <div className="h-4 w-5/6 bg-chess-text opacity-20 rounded-md"></div>
          </div>
        </div>
      ))}
    </div>
  );
}
