"use client";

import React, { useState } from "react";
import { apiFetch } from "../../services/api";
import QuillEditor from "../_components/QuillEditor";

export default function CreatePostPage() {
  const [status, setStatus] = useState<{
    type: "success" | "error";
    msg: string;
  } | null>(null);
  const [content, setContent] = useState<string>("");
  const [coverImage, setCoverImage] = useState<string>("");

  const handleCoverImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setCoverImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handlePublishPost = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setStatus(null);

    const form = e.currentTarget;
    const formData = new FormData(form);
    const title = formData.get("title") as string;
    const category = formData.get("category") as string;
    const excerpt = formData.get("excerpt") as string;

    try {
      await apiFetch("/posts", {
        method: "POST",
        body: JSON.stringify({ title, category, excerpt, content, coverImage }),
      });

      setStatus({
        type: "success",
        msg: "Strategic column published cleanly.",
      });
      setContent("");
      setCoverImage("");
      form.reset();
    } catch (err: any) {
      setStatus({
        type: "error",
        msg: err.message || "Failed to publish article structure.",
      });
    }
  };

  return (
    <div className="bg-chess-surface p-8 rounded-2xl space-y-6 animate-fade-in text-chess-text">
      <div className="space-y-1 border-b border-chess-border border-opacity-20 pb-4">
        <h2 className="text-xl font-bold tracking-tight text-chess-text">
          Publish strategic column
        </h2>
        <p className="text-xs font-semibold text-chess-primary opacity-70">
          Commit fresh editorial markdown grids directly to production core
          records
        </p>
      </div>

      {status && (
        <div className="bg-chess-bg border border-chess-border border-opacity-30 px-4 py-3 rounded-xl font-semibold text-sm text-chess-primary">
          {status.msg}
        </div>
      )}

      <form onSubmit={handlePublishPost} className="space-y-5">
        <div className="grid md:grid-cols-4 gap-4">
          <div className="space-y-1.5 md:col-span-3">
            <label className="text-xs font-bold text-chess-text opacity-50 block">
              Article title
            </label>
            <input
              type="text"
              name="title"
              required
              className="w-full border border-chess-border border-opacity-30 bg-chess-bg px-4 py-3 rounded-xl font-semibold focus:outline-none focus:border-chess-primary text-sm transition-colors text-chess-text"
              placeholder="e.g., Deep positional mechanics in the Czech defense"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-chess-text opacity-50 block">
              Classification
            </label>
            <div className="relative">
              <select
                name="category"
                required
                className="w-full border border-chess-border border-opacity-30 bg-chess-bg px-4 py-3 rounded-xl font-semibold focus:outline-none focus:border-chess-primary text-sm cursor-pointer appearance-none text-chess-text"
              >
                <option value="News">News</option>
                <option value="Training">Training</option>
                <option value="Games & Tech">Games & Tech</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 font-bold text-[10px] opacity-40">
                ▼
              </div>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-4 gap-4 items-end">
          <div className="space-y-1.5 md:col-span-3">
            <label className="text-xs font-bold text-chess-text opacity-50 block">
              Cover image configuration
            </label>
            <label className="w-full border border-dashed border-chess-border border-opacity-40 bg-chess-bg px-4 py-3 rounded-xl font-semibold flex items-center justify-between text-sm cursor-pointer hover:border-chess-primary transition-colors">
              <span className="opacity-40 font-medium">
                {coverImage
                  ? "✓ Image stream bundle mapped"
                  : "Select image file from local filesystem..."}
              </span>
              <span className="bg-chess-surface border border-chess-border border-opacity-30 px-3 py-1 rounded-lg text-xs font-bold">
                Browse
              </span>
              <input
                type="file"
                accept="image/*"
                onChange={handleCoverImageChange}
                className="hidden"
              />
            </label>
          </div>
          {coverImage && (
            <div className="w-full h-[46px] border border-chess-border border-opacity-30 rounded-xl overflow-hidden bg-chess-bg relative">
              <img
                src={coverImage}
                alt="Cover Preview"
                className="w-full h-full object-cover filtering-none"
              />
            </div>
          )}
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-chess-text opacity-50 block">
            Short analytical excerpt (Summary)
          </label>
          <input
            type="text"
            name="excerpt"
            required
            className="w-full border border-chess-border border-opacity-30 bg-chess-bg px-4 py-3 rounded-xl font-semibold focus:outline-none focus:border-chess-primary text-sm transition-colors text-chess-text"
            placeholder="Provide a dense, two-sentence summary baseline..."
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-chess-text opacity-50 block">
            Column content body
          </label>
          <QuillEditor
            value={content}
            onChange={setContent}
            placeholder="Deploy beautiful markdown rich text streams here..."
          />
        </div>

        <button
          type="submit"
          className="w-full bg-chess-primary text-chess-surface font-semibold py-3.5 rounded-xl hover:opacity-90 transition-opacity text-sm mt-2 cursor-pointer"
        >
          Broadcast column configuration
        </button>
      </form>
    </div>
  );
}
