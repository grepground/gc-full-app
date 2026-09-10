import React from "react";
import { getPageTitle, getSiteName } from "../services/siteConfig";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: getPageTitle("Terms of Use"),
  description: `The terms under which you may use the ${getSiteName()} website and its services.`,
};

export default function TermsOfUsePage() {
  const site = getSiteName();
  return (
    <div className="max-w-4xl mx-auto px-4 py-10 space-y-6 text-chess-text">
      {/* Header */}
      <section className="space-y-2">
        <h1 className="text-3xl sm:text-4xl font-black tracking-tight lowercase">
          terms of use
        </h1>
        <p className="text-xs font-extrabold text-chess-primary">
          Last updated: November 24, 2025
        </p>
        <p className="text-sm sm:text-base font-bold text-chess-text/60 leading-relaxed max-w-2xl">
          Please read these Terms of Use (&quot;Terms&quot;) carefully before using the{" "}
          {site} website and the Service operated by {site}.
        </p>
      </section>

      {/* 1. User Content and License Grant */}
      <section className="bg-chess-surface p-6 sm:p-8 rounded-3xl space-y-3">
        <h2 className="text-lg font-black">1. User Content and License Grant</h2>
        <p className="text-xs sm:text-sm font-bold text-chess-text/70 leading-relaxed">
          <strong>
            Crucially, by posting, uploading, inputting, providing or
            submitting your Content, you grant {site} a worldwide, non-exclusive,
            perpetual, irrevocable, royalty-free, sublicensable, and
            transferable license to use, reproduce, modify, adapt, publish,
            translate, create derivative works from, distribute, publicly
            perform, and publicly display your Content
          </strong>{" "}
          for any purpose,{" "}
          <strong>
            including but not limited to advertising, product development, and
            internal analysis for project evaluation.
          </strong>
        </p>
        <p className="text-xs sm:text-sm font-bold text-chess-text/70 leading-relaxed">
          You represent and warrant that you own or otherwise control all of the
          rights to the Content that you post.
        </p>
      </section>

      {/* 2. User Obligations and Prohibited Uses */}
      <section className="bg-chess-surface p-6 sm:p-8 rounded-3xl space-y-3">
        <h2 className="text-lg font-black">
          2. User Obligations and Prohibited Uses
        </h2>
        <ul className="space-y-2 text-xs sm:text-sm font-bold text-chess-text/70 leading-relaxed list-none">
          <li>Violating any applicable law or regulation.</li>
          <li>Sending unauthorized advertising or promotional material.</li>
          <li>Impersonating another person or entity.</li>
        </ul>
      </section>

      {/* 3. Content Restrictions */}
      <section className="bg-chess-surface p-6 sm:p-8 rounded-3xl space-y-3">
        <h2 className="text-lg font-black">3. Content Restrictions</h2>
        <p className="text-xs sm:text-sm font-bold text-chess-text/70 leading-relaxed">
          {site} is a platform dedicated to technology, software, and knowledge
          sharing, and aims to maintain a neutral and respectful environment. To
          achieve this, we enforce a strict policy regarding the following
          topics:
        </p>
        <ul className="space-y-2 text-xs sm:text-sm font-bold text-chess-text/70 leading-relaxed list-none">
          <li>
            <span className="text-chess-primary">Political Content:</span> Any
            form of political propaganda, political debates, or partisan content
            is strictly prohibited.
          </li>
          <li>
            <span className="text-chess-primary">Religious Content:</span>{" "}
            Discussions, promotions, or debates regarding religious beliefs,
            ideologies, or practices are strictly prohibited.
          </li>
          <li>
            <span className="text-chess-primary">Hate Speech:</span> Content
            that promotes discrimination or hatred based on race, gender, or any
            other identity is strictly forbidden.
          </li>
        </ul>
      </section>

      {/* 4. User Responsibility and Liability */}
      <section className="bg-chess-surface p-6 sm:p-8 rounded-3xl space-y-3">
        <h2 className="text-lg font-black">
          4. User Responsibility and Liability
        </h2>
        <p className="text-xs sm:text-sm font-bold text-chess-text/70 leading-relaxed">
          All content posted on {site}—including posts, comments, and profile
          information—is the sole responsibility of the user who created it.
        </p>
        <ul className="space-y-2 text-xs sm:text-sm font-bold text-chess-text/70 leading-relaxed list-none">
          <li>
            <span className="text-chess-primary">Individual Liability:</span>{" "}
            You, as the user, are exclusively liable for any legal, social, or
            personal consequences arising from your posts.
          </li>
          <li>
            <span className="text-chess-primary">Indemnification:</span> You
            agree to indemnify and hold {site} and its operators harmless from
            any claims, damages, or legal fees resulting from your violation of
            these terms.
          </li>
        </ul>
      </section>

      {/* 5. Monitoring and Enforcement */}
      <section className="bg-chess-surface p-6 sm:p-8 rounded-3xl space-y-3">
        <h2 className="text-lg font-black">5. Monitoring and Enforcement</h2>
        <p className="text-xs sm:text-sm font-bold text-chess-text/70 leading-relaxed">
          We reserve the right, but do not assume the obligation, to monitor and
          remove any content that violates the &quot;No Politics and No
          Religion&quot; policy.
        </p>
        <ul className="space-y-2 text-xs sm:text-sm font-bold text-chess-text/70 leading-relaxed list-none">
          <li>
            <span className="text-chess-primary">Right to Remove:</span> Any
            content deemed political or religious in nature will be removed
            without prior notice.
          </li>
          <li>
            <span className="text-chess-primary">Account Termination:</span>{" "}
            Repeated or severe violations of these community standards will lead
            to permanent suspension or termination of your account.
          </li>
        </ul>
      </section>

      {/* 6. Legal Disclaimer */}
      <section className="bg-chess-surface p-6 sm:p-8 rounded-3xl space-y-3">
        <h2 className="text-lg font-black">6. Legal Disclaimer</h2>
        <p className="text-xs sm:text-sm font-bold text-chess-text/70 leading-relaxed">
          {site} does not endorse, support, or guarantee the completeness,
          truthfulness, or reliability of any content posted by users. Use of
          any content on this platform is at your own risk.
        </p>
        <p className="text-xs sm:text-sm font-bold text-chess-text/70 leading-relaxed">
          The Service is provided on an &quot;AS IS&quot; and
          &quot;AS AVAILABLE&quot; basis. {site} makes no warranties, expressed
          or implied, regarding the reliability or availability of the service.
        </p>
        <p className="text-xs sm:text-sm font-bold text-chess-text/70 leading-relaxed">
          Your privacy is important to us. Please review our{" "}
          <a href="/privacy" className="text-chess-primary hover:underline">
            Privacy Policy
          </a>{" "}
          to understand how we collect, use, and share your personal data.
        </p>
      </section>

      {/* 7. License */}
      <section className="bg-chess-surface p-6 sm:p-8 rounded-3xl space-y-3">
        <h2 className="text-lg font-black">7. License</h2>
        <p className="text-xs sm:text-sm font-bold text-chess-text/70 leading-relaxed">
          The {site} platform is licensed under the GNU Affero General Public
          License v3.0 (AGPL-3.0).
        </p>
      </section>
    </div>
  );
}
