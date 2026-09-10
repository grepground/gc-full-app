"use client";

import DOMPurify from "isomorphic-dompurify";

interface MarkdownRenderProps {
  source: string; // The property string accepting clean HTML rich text payloads
}

export default function MarkdownRender({ source }: MarkdownRenderProps) {
  const injectPublicImagePaths = (htmlContent: string) => {
    if (!htmlContent) return "";

    // Legacy editors occasionally persisted plain image names like `news-abc…`
    // instead of a data URL. Rewrite those raw filenames to the local
    // `/uploads/news/…` route that Next serves from this process.
    return htmlContent.replace(
      /src=["'](news-[^"']+)["']/g,
      `src="/uploads/news/$1"`,
    );
  };

  // Sanitize the HTML before injecting it into the DOM so that any malicious
  // content (script tags, event handlers, javascript: URLs, etc.) is stripped
  // out and never executed in our readers' browsers.
  const sanitizedHtml = DOMPurify.sanitize(injectPublicImagePaths(source));

  return (
    <div
      // FIX: Upgraded layout scale to text-lg and amplified spacing parameters to optimize comfortable reading
      className="normal-case tracking-normal leading-relaxed text-lg font-bold prose max-w-none bg-transparent text-chess-text
                 [&_p]:whitespace-pre-wrap [&_p]:break-words [&_p]:mb-6 [&_p]:opacity-90
                 [&_h3]:text-2xl [&_h3]:font-black [&_h3]:tracking-tight [&_h3]:text-chess-text [&_h3]:mt-8 [&_h3]:mb-4
                 [&_img]:w-full [&_img]:h-auto [&_img]:block [&_img]:rounded-xl [&_img]:border [&_img]:border-chess-border [&_img]:my-8
                 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:mb-6 [&_ul]:opacity-90
                 [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:mb-6 [&_ol]:opacity-90
                 [&_li]:mb-2"
      dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
    />
  );
}
