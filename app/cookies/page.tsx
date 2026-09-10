import React from "react";
import { getPageTitle, getSiteName } from "../services/siteConfig";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: getPageTitle("Cookie Policy"),
  description: `What cookies are and how ${getSiteName()} uses them on its website.`,
};

export default function CookiePolicyPage() {
  const site = getSiteName();
  return (
    <div className="max-w-4xl mx-auto px-4 py-10 space-y-6 text-chess-text">
      {/* Header */}
      <section className="space-y-2">
        <h1 className="text-3xl sm:text-4xl font-black tracking-tight lowercase">
          cookie policy
        </h1>
        <p className="text-xs font-extrabold text-chess-primary">
          Effective Date: November 24, 2025
        </p>
        <p className="text-sm sm:text-base font-bold text-chess-text/60 leading-relaxed max-w-2xl">
          This Cookie Policy explains what cookies are and how we use them on
          the {site} website. You should read this policy to understand the
          types of cookies we use and how the information collected is utilized.
        </p>
      </section>

      {/* 1. How We Use Cookies */}
      <section className="bg-chess-surface p-6 sm:p-8 rounded-3xl space-y-3">
        <h2 className="text-lg font-black">1. How We Use Cookies</h2>
        <p className="text-xs sm:text-sm font-bold text-chess-text/70 leading-relaxed">
          We use cookies for the following purposes:
        </p>
        <ul className="space-y-2 text-xs sm:text-sm font-bold text-chess-text/70 leading-relaxed list-none">
          <li>
            <span className="text-chess-primary">Necessary Cookies:</span>{" "}
            Essential for the basic functionality of {site}.
          </li>
          <li>
            <span className="text-chess-primary">
              Analytical/Performance Cookies:
            </span>{" "}
            Used to measure and improve the site&apos;s performance.{" "}
            <strong>This data is crucial for project development and internal reporting.</strong>
          </li>
          <li>
            <span className="text-chess-primary">
              Targeting/Advertising Cookies:
            </span>{" "}
            Track browsing habits to deliver relevant advertising to support{" "}
            {site}&apos;s revenue generation.
          </li>
          <li>
            <span className="text-chess-primary">Functionality Cookies:</span>{" "}
            Used to remember your preferences (e.g., login status, language).
          </li>
        </ul>
      </section>

      {/* 2. Your Choices Regarding Cookies */}
      <section className="bg-chess-surface p-6 sm:p-8 rounded-3xl space-y-3">
        <h2 className="text-lg font-black">2. Your Choices Regarding Cookies</h2>
        <p className="text-xs sm:text-sm font-bold text-chess-text/70 leading-relaxed">
          If you wish to avoid the use of cookies on the {site} Service, you must
          first disable them in your browser settings and then delete the
          cookies saved in your browser associated with this website.
        </p>
      </section>
    </div>
  );
}
