import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPageTitle, getSiteName } from "@/app/services/siteConfig";
import { UsersService } from "@/lib/services/users.service";
import ProfileAvatar from "./_components/ProfileAvatar";

// Profile details mutate with account edits, so always render fresh.
export const dynamic = "force-dynamic";

interface PublicProfilePageProps {
  params: Promise<{ username: string }>;
}

export async function generateMetadata({
  params,
}: PublicProfilePageProps): Promise<Metadata> {
  const { username } = await params;
  const profile = await UsersService.getPublicByName(username).catch(
    () => null,
  );
  if (!profile) return { title: getPageTitle("Member Not Found") };
  return { title: getPageTitle(profile.username) };
}

export default async function PublicProfilePage({
  params,
}: PublicProfilePageProps) {
  const { username } = await params;
  const profile = await UsersService.getPublicByName(username).catch(
    () => null,
  );

  if (!profile) notFound();

  const fullName = [profile.firstName, profile.lastName]
    .filter(Boolean)
    .join(" ");

  return (
    <main className="max-w-2xl mx-auto px-4 py-8 text-chess-text space-y-6">
      <Link
        href="/feed"
        className="inline-flex items-center gap-2 text-xs font-black text-chess-text/60 hover:text-chess-primary transition-colors"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M10 19l-7-7m0 0l7-7m-7 7h18"
          />
        </svg>
        Back to the feed
      </Link>

      <div className="bg-chess-surface rounded-3xl p-6 md:p-8 space-y-6">
        {/* Identity header */}
        <div className="flex flex-col items-center text-center gap-4">
          <ProfileAvatar username={profile.username} avatar={profile.avatar} />
          <div className="space-y-1.5">
            <h1 className="text-2xl font-black tracking-tight">
              @{profile.username}
            </h1>
            {fullName && (
              <p className="text-sm font-bold text-chess-text/60">{fullName}</p>
            )}
            {profile.nickname && (
              <span className="inline-block text-[14px] font-black text-chess-primary bg-chess-primary/10 px-3 py-1 rounded-full">
                {profile.nickname}
              </span>
            )}
            {profile.bio && (
              <p className="text-md font-bold text-chess-text/70 whitespace-pre-line leading-relaxed max-w-md mx-auto">
                {profile.bio}
              </p>
            )}
          </div>
        </div>

        {/* No public contact / private info is ever shown here. */}
        <div className="border-t border-chess-border/10 pt-4 text-center text-xs font-bold text-chess-text/40">
          {getSiteName()} member profile · member since{" "}
          {new Date(profile.createdAt).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
          })}
        </div>
      </div>
    </main>
  );
}
