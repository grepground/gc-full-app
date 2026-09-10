// Central, type-safe API layer for the news/posts module.
// This module is separate from the feed module (see `./feed.ts`).
// Cookie-based authentication is handled inside `apiFetch` via `credentials: "include"`.

import { apiFetch } from "./api";

export interface DeletePostResult {
  success: boolean;
  message: string;
}

// --- API Methods ---

// DELETE /posts/:id — Soft delete (isActive: false). Owner/admin/mod.
// The record is never physically removed; it just becomes hidden everywhere.
export async function deletePost(id: number): Promise<DeletePostResult> {
  return apiFetch(`/posts/${id}`, { method: "DELETE" });
}

// POST /posts/:id/view — registers a genuine single visit (deduped server-side).
export async function recordPostView(
  id: number,
): Promise<{ id: number; views: number }> {
  return apiFetch(`/posts/${id}/view`, { method: "POST" });
}
