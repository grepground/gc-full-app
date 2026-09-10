"use client";

import React, { useState } from "react";
import { createFeed, FeedPost } from "../../services/feed";
import FeedEditor from "./FeedEditor";

// Temporarily disabled: users can't attach visual media to feed posts right
// now. Setting this to `true` re-enables the photo picker in the composer
// without any other changes.
const MEDIA_CREATION_ENABLED = false;

interface NewPostModalProps {
  onClose: () => void;
  onCreated: (post: FeedPost) => void;
}

export default function NewPostModal({
  onClose,
  onCreated,
}: NewPostModalProps) {
  const [body, setBody] = useState<string>("");
  const [media, setMedia] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const addMedia = (dataUrls: string[]) => {
    setMedia((prev) => [...prev, ...dataUrls].slice(0, 8));
  };

  const removeMedia = (index: number) => {
    setMedia((prev) => prev.filter((_, idx) => idx !== index));
  };

  const reset = () => {
    setBody("");
    setMedia([]);
    setError(null);
  };

  const handleSubmit = async () => {
    setError(null);
    setSubmitting(true);
    try {
      const post = await createFeed({
        body,
        images: media.length ? media : undefined,
      });
      reset();
      onCreated(post);
    } catch (err: any) {
      setError(err.message || "Failed to publish post.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div
        onClick={onClose}
        className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm animate-fade-in"
      />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div className="bg-chess-surface border border-chess-border/20 w-full max-w-lg p-6 rounded-2xl space-y-5 pointer-events-auto animate-scale-up">
          <div className="flex items-center justify-between border-b border-chess-border/10 pb-3">
            <h4 className="text-base font-bold text-chess-text tracking-tight">
              New feed post
            </h4>
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="w-7 h-7 rounded-full bg-chess-bg text-chess-text/60 font-black text-xs flex items-center justify-center hover:bg-red-500/10 hover:text-red-400 transition-colors cursor-pointer"
            >
              ✕
            </button>
          </div>

          {error && (
            <div className="bg-red-500/10 px-4 py-2.5 rounded-xl text-xs font-black text-red-400">
              {error}
            </div>
          )}

          <FeedEditor
            value={body}
            onChange={setBody}
            mediaPreview={media}
            onAddMedia={MEDIA_CREATION_ENABLED ? addMedia : undefined}
            onRemoveMedia={MEDIA_CREATION_ENABLED ? removeMedia : undefined}
            submitting={submitting}
            submitLabel={submitting ? "Publishing..." : "Publish post"}
            onCancel={onClose}
            onSubmit={handleSubmit}
            placeholder="Share a thought with the community..."
          />
        </div>
      </div>
    </>
  );
}
