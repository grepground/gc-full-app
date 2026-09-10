import { Metadata } from "next";
import { notFound } from "next/navigation";
import React from "react";
import ReplyDetailClient from "../../../_components/ReplyDetailClient";
import { FeedService } from "@/lib/services/feed.service";
import { getSiteName, getSiteOrigin } from "../../../../services/siteConfig";

// Replies change as the conversation grows, so always render fresh.
export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ slug: string; replyId: string }>;
}

const excerpt = (text: string, length = 160) =>
  text.length > length ? `${text.slice(0, length)}…` : text;

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug, replyId } = await params;
  if (!/^\d+$/.test(replyId)) {
    return {
      title: `${getSiteName()} — Reply not found`,
      description: "This reply could not be found.",
    };
  }

  const post = await FeedService.getByIdent(slug).catch(() => null);
  if (!post) {
    return {
      title: `${getSiteName()} — Reply not found`,
      description: "This reply could not be found.",
    };
  }

  const context = await FeedService.getReplyContext(
    String(post.id),
    Number(replyId),
  ).catch(() => null);

  if (!context) {
    return {
      title: `${getSiteName()} — Reply not found`,
      description: "This reply could not be found.",
    };
  }

  const title = excerpt(context.reply.content);

  return {
    title: `${title} | ${getSiteName()}`,
    description: title,
    openGraph: {
      title: `Reply by ${context.reply.author.username}`,
      description: title,
      url: `${getSiteOrigin()}/feed/${post.slug}/reply/${replyId}`,
      siteName: getSiteName(),
      type: "article",
      publishedTime: context.reply.createdAt,
    },
  };
}

export default async function FeedReplyPage({ params }: PageProps) {
  const { slug, replyId } = await params;

  if (!/^\d+$/.test(replyId)) notFound();

  const post = await FeedService.getByIdent(slug).catch(() => null);
  if (!post) notFound();

  const context = await FeedService.getReplyContext(
    String(post.id),
    Number(replyId),
  ).catch(() => null);

  if (!context) notFound();

  return (
    <ReplyDetailClient replyId={Number(replyId)} initialContext={context} />
  );
}
