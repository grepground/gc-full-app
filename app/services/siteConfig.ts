// Global site configuration.
//
// Branding must never be hardcoded around components/pages — it is declared in
// the environment (`.env` / `.env.production`) and surfaced through these
// getters so every UI layer reads from a single source of truth.
//
// NOTE: every fallback below is deliberately GENERIC. A real brand name or
// domain must never appear here, because this file ships in the repository and
// its defaults would silently become the app's identity for anyone who runs it
// without filling in their env — leaking the original project's branding.
//
// Environment variables (NEXT_PUBLIC_* are inlined at build time):
//   NEXT_PUBLIC_SITE_NAME        → brand/product name
//   NEXT_PUBLIC_SITE_DOMAIN      → root domain
//   NEXT_PUBLIC_SITE_URL         → canonical origin
//   NEXT_PUBLIC_SOCIAL_HANDLE    → social handle (@...)
//   NEXT_PUBLIC_SUPPORT_EMAIL    → public contact address
//   NEXT_PUBLIC_SITE_DESCRIPTION → meta description

/** Placeholder used when no domain is configured. `example.com` is reserved
 *  by RFC 2606 for exactly this purpose, so it can never point at a real site. */
const PLACEHOLDER_DOMAIN = "example.com";

const domain = () =>
  (process.env.NEXT_PUBLIC_SITE_DOMAIN || PLACEHOLDER_DOMAIN)
    .replace(/^https?:\/\//, "")
    .replace(/\/$/, "");

/** Brand / product name shown to users. */
export const getSiteName = (): string =>
  process.env.NEXT_PUBLIC_SITE_NAME?.trim() || "site";

/** Canonical origin used for URLs/SEO (no trailing slash). */
export const getSiteOrigin = (): string => {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configured) return configured.replace(/\/$/, "");
  return `https://${domain()}`;
};

/** Root domain of the product (no scheme). */
export const getSiteDomain = (): string => domain();

/** Public support / contact inbox. */
export const getSupportEmail = (): string =>
  process.env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim() || `contact@${domain()}`;

/** Example inbox used in placeholder inputs (informative, not sent). */
export const getPlaceholderEmail = (): string => `player@${domain()}`;

/** Social handle (without the leading @ if present). */
export const getSocialHandle = (): string =>
  (process.env.NEXT_PUBLIC_SOCIAL_HANDLE?.trim() || getSiteName()).replace(
    /^@/,
    "",
  );

// Human-facing helpers for common formatting patterns.
export const getSiteTitle = (): string => getSiteName();

export const getSiteDescription = (): string =>
  process.env.NEXT_PUBLIC_SITE_DESCRIPTION?.trim() ||
  "A community platform for reading, discussing and sharing.";

// Appends the site name as a suffix, e.g. "About | {site}".
export const getPageTitle = (page: string): string =>
  `${page} | ${getSiteName()}`;

export const getFullTitle = (subtitle: string): string =>
  `${getSiteName()} — ${subtitle}`;
