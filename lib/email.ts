import { Resend } from "resend";

/**
 * Transactional email helper via Resend.
 *
 * RESEND_API_KEY is optional at runtime: when it is not set we fall back to a
 * no-op so local/dev flows (which don't need real email delivery) still work.
 * Callers should not assume delivery happened — always inspect the result.
 */

const appName = process.env.APP_NAME?.trim() || "App";
const configuredFrom = process.env.MAIL_FROM?.trim() || "onboarding@resend.dev";
const DEFAULT_SENDER = "onboarding@resend.dev";

let client: Resend | null = null;

function resendClient(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  if (!client) client = new Resend(key);
  return client;
}

/** Build a Resend-compatible `from` string ("Name <mail@example.com>"). */
function fromAddress(): string {
  // Accepts both "mail@example.com" and "Company <mail@example.com>" forms.
  const emailParts = configuredFrom.split("<");
  const email =
    emailParts[emailParts.length - 1].replace(/[<>]/g, "").trim() ||
    DEFAULT_SENDER;
  return `${appName} <${email}>`;
}

export type SendEmailInput = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

/**
 * Send an email through Resend. When no API key is configured the function
 * resolves with `{ ok: false, error: "..." }` unless running in development, in
 * which case it no-ops so local exploration is frictionless.
 */
export async function sendTransactionalEmail(
  input: SendEmailInput,
): Promise<{ ok: boolean; error?: string }> {
  const api = resendClient();
  if (!api) {
    if (process.env.NODE_ENV === "development") return { ok: true };
    return { ok: false, error: "Resend API key is not configured" };
  }

  try {
    const result = await api.emails.send({
      from: fromAddress(),
      to: input.to,
      subject: input.subject,
      text: input.text,
      html: input.html,
    });
    if (result.error) return { ok: false, error: result.error.message };
    return { ok: true };
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown email error";
    return { ok: false, error: msg };
  }
}

/** Shorthand for the human-friendly display name behind the "from" address. */
export function displayName(): string {
  return appName;
}
