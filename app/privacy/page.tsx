import React from "react";
import { getPageTitle, getSiteName } from "../services/siteConfig";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: getPageTitle("Privacy Policy"),
  description: `How ${getSiteName()} collects, uses, and shares your personal information and content.`,
};

export default function PrivacyPolicyPage() {
  const site = getSiteName();
  return (
    <div className="max-w-4xl mx-auto px-4 py-10 space-y-6 text-chess-text">
      {/* Header */}
      <section className="space-y-2">
        <h1 className="text-3xl sm:text-4xl font-black tracking-tight lowercase">
          privacy policy
        </h1>
        <p className="text-xs font-extrabold text-chess-primary">
          Effective Date: November 24, 2025
        </p>
        <p className="text-sm sm:text-base font-bold text-chess-text/60 leading-relaxed max-w-2xl">
          This Privacy Policy describes how {site} (&quot;we,&quot; &quot;us&quot;, or &quot;our&quot;)
          collects, uses, and shares your personal information and content when
          you use our blog and services (the &quot;Service&quot;).
        </p>
      </section>

      {/* 1. Information We Collect */}
      <section className="bg-chess-surface p-6 sm:p-8 rounded-3xl space-y-3">
        <h2 className="text-lg font-black">1. Information We Collect</h2>
        <p className="text-xs sm:text-sm font-bold text-chess-text/70 leading-relaxed">
          We collect various types of information for different purposes to
          provide and improve our Service to you.
        </p>
        <ul className="space-y-2 text-xs sm:text-sm font-bold text-chess-text/70 leading-relaxed list-none">
          <li>
            <span className="text-chess-primary">Personal Data:</span> Your
            name, email address, and profile information.
          </li>
          <li>
            <span className="text-chess-primary">Usage Data:</span> IP address,
            browser type, pages visited, time spent, and diagnostic data.
          </li>
          <li>
            <span className="text-chess-primary">Content Data:</span> All
            content you share, post, upload, or submit to the Service
            (comments, articles, etc.).
          </li>
          <li>
            <span className="text-chess-primary">
              Tracking &amp; Cookies Data:
            </span>{" "}
            Used to track activity and hold certain information. (See{" "}
            <a href="/cookies" className="text-chess-primary hover:underline">
              Cookie Policy
            </a>{" "}
            for details).
          </li>
        </ul>
      </section>

      {/* 2. How We Use Your Data */}
      <section className="bg-chess-surface p-6 sm:p-8 rounded-3xl space-y-3">
        <h2 className="text-lg font-black">2. How We Use Your Data</h2>
        <p className="text-xs sm:text-sm font-bold text-chess-text/70 leading-relaxed">
          Your data is used for the following specific purposes, which you
          explicitly agree to by using the Service:
        </p>
        <ul className="space-y-2 text-xs sm:text-sm font-bold text-chess-text/70 leading-relaxed list-none">
          <li>
            <span className="text-chess-primary">
              For Project Development and Improvement:
            </span>{" "}
            To analyze usage patterns, test new features, troubleshoot, and
            continually enhance the functionality, user experience, and
            performance of the Service.
          </li>
          <li>
            <span className="text-chess-primary">
              For Personalization and Advertising:
            </span>{" "}
            To personalize the content and advertisements you see, both on our
            Service and third-party platforms. This includes using your browsing
            history, content interaction, and personal profile information for
            targeted advertising.
          </li>
          <li>
            <span className="text-chess-primary">
              For Internal Analysis and Reporting:
            </span>{" "}
            To generate aggregated, anonymized, and non-anonymized reports,
            conduct internal evaluations, and provide insights for business
            decisions related to the project&apos;s performance.
          </li>
          <li>
            <span className="text-chess-primary">
              To provide, operate, and maintain our Service.
            </span>
          </li>
        </ul>
      </section>
    </div>
  );
}
