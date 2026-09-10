"use client";

import React, { useRef } from "react";

const MAX_IMAGES = 8;

interface FeedEditorProps {
  value: string;
  onChange: (body: string) => void;
  placeholder?: string;
  isActive?: boolean;
  onActiveChange?: (isActive: boolean) => void;
  submitting?: boolean;
  submitLabel: string;
  onCancel?: () => void;
  onSubmit: () => void;
  /** Optional local data-URLs currently staged for upload. */
  mediaPreview?: string[];
  /** Required to enable the media composer. Receives newly picked data-URLs. */
  onAddMedia?: (dataUrls: string[]) => void;
  onRemoveMedia?: (index: number) => void;
}

// Shared Threads/Instagram-style compose editor reused by the create modal and
// the inline edit form. A presentational component: it never reads server
// `post.images` — media in/out is fully managed by the caller via
// `mediaPreview` / `onAddMedia` / `onRemoveMedia`. When `onAddMedia` is not
// passed, the whole media block is omitted so legacy inline callers keep their
// current behavior.
export default function FeedEditor({
  value,
  onChange,
  placeholder,
  isActive,
  onActiveChange,
  submitting = false,
  submitLabel,
  onCancel,
  onSubmit,
  mediaPreview = [],
  onAddMedia,
  onRemoveMedia,
}: FeedEditorProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const mediaEnabled = typeof onAddMedia === "function";
  const remaining = MAX_IMAGES - mediaPreview.length;

  const pickFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length || !onAddMedia) return;

    // Basic: read the earliest files we still have room for. Each successful
    // read resolves to a data-URL immediately and hands it up one at a time
    // (the caller caps the running total at 8 on its side).
    const room = Math.max(MAX_IMAGES - mediaPreview.length, 0);
    const chosen = files.slice(0, room);

    chosen.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") onAddMedia([reader.result]);
      };
      reader.readAsDataURL(file);
    });

    // Reset so selecting the same file again re-triggers the change event.
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    onSubmit();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Composer body + media block */}
      <div className="border border-chess-border/15 rounded-2xl overflow-hidden bg-chess-bg/40 focus-within:border-chess-primary/60 transition-colors">
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required
          rows={6}
          placeholder={placeholder || "Share a thought with the community..."}
          className="w-full bg-transparent px-4 py-3 min-h-[120px] font-semibold focus:outline-none text-sm transition-colors text-chess-text resize-none placeholder:text-chess-text/30"
        />

        {mediaEnabled && (
          <>
            <div className="px-4 pb-3 pt-1">
              <div className="flex flex-wrap items-center gap-2.5">
                {mediaPreview.map((src, index) => (
                  <div
                    key={index}
                    className="relative w-8 h-8 rounded-lg overflow-hidden bg-chess-bg shadow-sm group/thumb"
                  >
                    <img
                      src={src}
                      alt={`Selected image ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                    {onRemoveMedia && (
                      <button
                        type="button"
                        aria-label={`Remove selected image ${index + 1}`}
                        onClick={() => onRemoveMedia(index)}
                        className="absolute inset-0 flex items-center justify-center bg-black/0 text-white opacity-0 group-hover/thumb:bg-red-500/70 group-hover/thumb:opacity-100 transition-colors cursor-pointer focus:opacity-100 focus:bg-red-500/70"
                      >
                        <svg
                          className="w-3.5 h-3.5"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth={2.5}
                          viewBox="0 0 24 24"
                          aria-hidden
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M6 6l12 12M18 6L6 18"
                          />
                        </svg>
                      </button>
                    )}
                  </div>
                ))}

                {remaining > 0 && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    aria-label="Add photo"
                    className="w-8 h-8 rounded-full bg-chess-bg/70 border border-dashed border-chess-border/50 text-chess-text/50 hover:text-chess-primary hover:border-chess-primary/60 flex items-center justify-center transition-colors cursor-pointer"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                      viewBox="0 0 24 24"
                      aria-hidden
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 4v16m8-8H4"
                      />
                    </svg>
                  </button>
                )}
              </div>
              <div className="mt-1.5 text-right">
                <span className="text-[10px] font-bold text-chess-text/35">
                  Up to {MAX_IMAGES} photos
                </span>
              </div>
            </div>

            {/* Hidden picker (enabled with the composer) */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={pickFiles}
              className="hidden"
              tabIndex={-1}
            />
          </>
        )}
      </div>

      {/* Visibility toggle — only present in edit mode */}
      {typeof isActive === "boolean" && onActiveChange && (
        <label className="flex items-center justify-between gap-4 border border-chess-border border-opacity-20 bg-chess-bg px-4 py-3 rounded-xl cursor-pointer">
          <div className="space-y-0.5">
            <span className="block text-xs font-bold text-chess-text">
              Visible to everyone
            </span>
            <span className="block text-[11px] font-semibold text-chess-text/50">
              Turn off to hide this post from the feed (soft hide).
            </span>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={isActive}
            onClick={() => onActiveChange(!isActive)}
            className={`w-12 h-7 rounded-full transition-colors cursor-pointer relative shrink-0 ${
              isActive
                ? "bg-chess-primary"
                : "bg-chess-bg border border-chess-border/40"
            }`}
          >
            <span
              className={`absolute top-0.5 w-6 h-6 rounded-full bg-chess-surface shadow transition-transform ${
                isActive ? "translate-x-[22px]" : "translate-x-0.5"
              }`}
            />
          </button>
        </label>
      )}

      <div className="flex items-center gap-3">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={submitting}
            className="bg-chess-bg/60 border border-chess-border/10 text-chess-text/70 py-3 px-5 rounded-xl text-xs font-black hover:bg-chess-surface-hover transition-colors cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-chess-primary text-chess-surface font-semibold py-3 rounded-xl hover:opacity-90 transition-opacity text-sm cursor-pointer disabled:opacity-50"
        >
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
