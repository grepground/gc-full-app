import React from "react";
import { getSocialHandle, getSupportEmail } from "../services/siteConfig";
import {
  InstagramIcon,
  MailIcon,
  PinterestIcon,
  ThreadsIcon,
  TiktokIcon,
  XIcon,
  YoutubeIcon,
} from "../components/common/SocialIcons";

const handle = getSocialHandle();
const supportEmail = getSupportEmail();

const socialLinks = [
  { name: "YouTube", url: `https://youtube.com/@${handle}`, icon: YoutubeIcon },
  {
    name: "Instagram",
    url: `https://instagram.com/${handle}`,
    icon: InstagramIcon,
  },
  { name: "Threads", url: `https://threads.net/@${handle}`, icon: ThreadsIcon },
  { name: "TikTok", url: `https://tiktok.com/@${handle}`, icon: TiktokIcon },
  { name: "X (Twitter)", url: `https://x.com/${handle}`, icon: XIcon },
  {
    name: "Pinterest",
    url: `https://pinterest.com/${handle}`,
    icon: PinterestIcon,
  },
];

export default function ContactPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-8 py-10 px-4">
      {/* Header Section */}
      <section className="space-y-2">
        <h1 className="text-3xl sm:text-4xl font-black text-chess-text tracking-tight lowercase">
          contact us
        </h1>
        <p className="text-sm sm:text-base font-bold text-chess-text/60 leading-relaxed max-w-2xl">
          Have questions or feedback? We&apos;d love to hear from you. Reach out
          via email or follow us on social media.
        </p>
      </section>

      {/* Main Grid */}
      <section className="grid md:grid-cols-2 gap-4">
        {/* Email Card */}
        <div className="bg-chess-surface p-6 sm:p-8 rounded-3xl flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-chess-primary/10 text-chess-primary flex items-center justify-center font-black">
              <MailIcon className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black text-chess-text">Email</h2>
              <p className="text-xs font-bold text-chess-text/50 mt-1">
                Drop us a line anytime at:
              </p>
            </div>
          </div>
          <a
            href={`mailto:${supportEmail}`}
            className="text-base sm:text-lg font-mono font-black text-chess-primary hover:opacity-80 transition-opacity break-all block"
          >
            {supportEmail}
          </a>
        </div>

        {/* Socials Card */}
        <div className="bg-chess-surface p-6 sm:p-8 rounded-3xl space-y-5">
          <h2 className="text-xl font-black text-chess-text">Social Media</h2>
          <div className="grid grid-cols-2 gap-2.5">
            {socialLinks.map((social) => {
              const IconComponent = social.icon;
              return (
                <a
                  key={social.name}
                  href={social.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3 rounded-2xl bg-chess-bg text-chess-text hover:bg-chess-surface-hover transition-colors group"
                >
                  <IconComponent className="w-5 h-5 text-chess-primary shrink-0 transition-transform group-hover:scale-105" />
                  <span className="text-xs font-black text-chess-text/80 group-hover:text-chess-text transition-colors truncate">
                    {social.name}
                  </span>
                </a>
              );
            })}
          </div>
        </div>
      </section>

      {/* Community Support Section */}
      <section className="bg-chess-surface p-6 sm:p-8 rounded-3xl text-center space-y-2">
        <h2 className="text-lg font-black text-chess-text">
          Community Support
        </h2>
        <p className="text-xs font-bold text-chess-text/60 max-w-xl mx-auto leading-relaxed">
          For bug reports or feature requests, you can also reach out to our
          team directly. We usually respond within 24-48 hours.
        </p>
      </section>
    </div>
  );
}
