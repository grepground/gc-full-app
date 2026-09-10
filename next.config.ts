import type { NextConfig } from "next";

/**
 * Baseline security headers applied to every response.
 *
 * - `X-Content-Type-Options: nosniff` stops browsers from re-interpreting an
 *   uploaded file's content type, which is what turns a stray HTML/SVG payload
 *   served from `/uploads/...` into executable script.
 * - `X-Frame-Options` prevents clickjacking.
 * - `Referrer-Policy` keeps full URLs (which may embed numeric ids) off third
 *   party origins.
 * - `Permissions-Policy` disables device APIs the app never uses.
 */
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=()",
  },
];

/**
 * Hosts `next/image` is allowed to fetch from.
 *
 * Derived from the environment rather than hardcoding the project's own domain,
 * so the repository carries no real branding and each deployment decides its
 * own. Subdomains of the configured domain are allowed too (the wildcard
 * pattern covers e.g. an assets/CDN host).
 */
function remoteHosts(): { protocol: "http" | "https"; hostname: string }[] {
  const configured = process.env.NEXT_PUBLIC_SITE_DOMAIN?.trim().replace(
    /^https?:\/\//,
    "",
  );

  const patterns: { protocol: "http" | "https"; hostname: string }[] = [
    { protocol: "https", hostname: "localhost" },
  ];

  if (!configured) return patterns;

  const hostname = configured.replace(/\/$/, "");
  if (!hostname || hostname === "localhost") return patterns;

  patterns.push({ protocol: "https", hostname });
  // The bare wildcard is only meaningful for a real dotted domain.
  if (hostname.includes(".")) {
    patterns.push({ protocol: "https", hostname: `*.${hostname}` });
  }
  return patterns;
}

const nextConfig: NextConfig = {
  images: {
    remotePatterns: remoteHosts().map((entry) => ({
      ...entry,
      pathname: "/**",
    })),
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
