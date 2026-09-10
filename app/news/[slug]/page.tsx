import { Metadata } from "next";
import { notFound } from "next/navigation";
import React from "react";
import ArticleDetailClient from "../_components/ArticleDetailClient";
import {
  getPageTitle,
  getSiteName,
  getSiteOrigin,
} from "../../services/siteConfig";
import { PostsService } from "@/lib/services/posts.service";

// FIX: Force dynamic execution to bypass static route generation whenever slugs
// or visibility state mutate.
export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ slug: string }>;
}

function absoluteAssetUnder(urlPath: string): string {
  const origin = getSiteOrigin();
  return `${origin}${urlPath.startsWith("/") ? "" : "/"}${urlPath}`;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await PostsService.getByIdent(slug).catch(() => null);

  if (!post) {
    return { title: getPageTitle("Article Not Found") };
  }

  const coverSrc = post.coverImage
    ? `/uploads/news/${post.coverImage}`
    : "/uploads/news/default-cover.jpg";

  const cleanTitle = `${post.title.toLowerCase()} | ${getSiteName()}`;

  return {
    title: cleanTitle,
    description: post.excerpt,
    openGraph: {
      title: post.title,
      description: post.excerpt,
      url: `${getSiteOrigin()}/news/${post.slug}`,
      siteName: getSiteName(),
      images: [
        {
          url: absoluteAssetUnder(coverSrc),
          width: 1200,
          height: 630,
          alt: post.title,
        },
      ],
      type: "article",
      publishedTime: post.createdAt,
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.excerpt,
      images: [absoluteAssetUnder(coverSrc)],
    },
  };
}

export default async function ArticleDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const post = await PostsService.getByIdent(slug).catch(() => null);

  if (!post) {
    notFound();
  }

  return <ArticleDetailClient initialPost={post} />;
}
