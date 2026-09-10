import { Metadata } from "next";
import { notFound } from "next/navigation";
import React from "react";
import FeedPostDetail from "../_components/FeedPostDetail";
import { FeedService } from "@/lib/services/feed.service";
import { getSiteName, getSiteOrigin } from "../../services/siteConfig";

// FIX: Force dynamic execution so the page reflects the freshest post data.
export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ slug: string }>;
}

const excerpt = (text: string, length = 160) =>
  text.length > length ? `${text.slice(0, length)}…` : text;

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await FeedService.getByIdent(slug).catch(() => null);

  if (!post) {
    return {
      title: `${getSiteName()} — Post not found`,
      description: "This feed post could not be found.",
    };
  }

  return {
    title: `${excerpt(post.body)} | ${getSiteName()}`,
    description: excerpt(post.body),
    openGraph: {
      title: excerpt(post.body),
      description: excerpt(post.body),
      url: `${getSiteOrigin()}/feed/${post.slug}`,
      siteName: getSiteName(),
      type: "article",
      publishedTime: post.createdAt,
    },
  };
}

export default async function FeedPostPage({ params }: PageProps) {
  const { slug } = await params;
  const post = await FeedService.getByIdent(slug).catch(() => null);

  if (!post) {
    notFound();
  }

  return <FeedPostDetail initialPost={post} />;
}
