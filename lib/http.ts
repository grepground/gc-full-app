import { NextResponse } from "next/server";
import type { ZodType } from "zod";
import { ServiceError } from "./errors";

/**
 * HTTP/transport helpers used only by controllers. Keep the service layer free
 * of these imports. Error bodies always carry a `.message` string because the
 * client-side `apiFetch` reads `errorData.message` when a request fails.
 */

export function jsonOk<T>(data: T, init?: number): NextResponse {
  return NextResponse.json(data, { status: init ?? 200 });
}

export function jsonMessage(
  message: string,
  status: number,
  extra?: Record<string, unknown>,
): NextResponse {
  return NextResponse.json({ message, ...extra }, { status });
}

export const badRequest = (msg = "Invalid request data") =>
  jsonMessage(msg, 400);
export const unauthorized = (msg = "You must be signed in to continue") =>
  jsonMessage(msg, 401);
export const forbidden = (msg = "You don't have permission to do that") =>
  jsonMessage(msg, 403);
export const notFound = (msg = "Not found") => jsonMessage(msg, 404);
export const conflict = (msg = "Conflict") => jsonMessage(msg, 409);

/** Read & JSON.parse a request body; returns null when empty or malformed. */
export async function readJson<T = Record<string, unknown>>(
  req: Request,
): Promise<T | null> {
  try {
    const text = await req.text();
    if (!text) return null;
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

export type ParsedBody<T> =
  { ok: true; data: T } | { ok: false; response: NextResponse };

/**
 * Parse a JSON body and validate it against a Zod schema. Controllers leverage
 * this so handlers stay short: they never hand-roll validation.
 */
export async function parseBody<T>(
  req: Request,
  schema: ZodType<T>,
): Promise<ParsedBody<T>> {
  const body = await readJson<unknown>(req);
  const result = schema.safeParse(body ?? {});
  if (!result.success) {
    const first = result.error.issues[0];
    const message = first
      ? `${first.path.join(".") || "body"}: ${first.message}`
      : "Invalid request data";
    return { ok: false, response: badRequest(message) };
  }
  return { ok: true, data: result.data };
}

/** Map a thrown ServiceError (or unknown) into a NextResponse. */
export function toApiError(error: unknown): NextResponse {
  if (error instanceof ServiceError) {
    return jsonMessage(error.message, error.status);
  }
  console.error("Unhandled service error:", error);
  return jsonMessage("Internal server error", 500);
}
