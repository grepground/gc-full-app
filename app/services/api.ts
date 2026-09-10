// Same-origin API root for the Next.js App Router monolith. All clients talk to
// our own route handlers (app/api/...). No external backend is used anymore.
const BACKEND_URL = "/api";

// Error classification: a custom error that carries the HTTP status code.
// Stays fully compatible with existing `err.message` usage, just adds `status`.
export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

/** Extract a safe, human-readable message from an unknown thrown value. */
export function errorMessage(err: unknown, fallback = "Something went wrong") {
  if (err instanceof Error && err.message) return err.message;
  if (typeof err === "string" && err) return err;
  return fallback;
}

export async function apiFetch(endpoint: string, options: RequestInit = {}) {
  const url = `${BACKEND_URL}${endpoint}`;
  const isFormData = options.body instanceof FormData;

  // Remove the Content-Type header entirely when sending FormData so the
  // browser automatically adds the 'multipart/form-data; boundary=...' part.
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  if (!isFormData) {
    headers["Content-Type"] = "application/json";
  } else {
    delete headers["Content-Type"];
  }

  const config: RequestInit = {
    ...options,
    headers,
    credentials: "include",
  };

  const response = await fetch(url, config);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    // Produce a readable fallback message based on the status code (401/403/404 etc.)
    const fallbackMessage =
      {
        400: "Invalid request data",
        401: "You must be signed in to continue",
        403: "You don't have permission to do that",
        404: "Not found",
      }[response.status] || "API request failed";

    throw new ApiError(response.status, errorData.message || fallbackMessage);
  }

  if (response.status === 204) return null;
  return response.json();
}
