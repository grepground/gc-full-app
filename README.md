# gc-frontend

Project: gc-frontend
Copyright (C) 2026 grepground

**ATTRIBUTION NOTICE:**
If you use, redistribute, or modify this software, you must retain this attribution and provide a visible link to the original source code in your application's interface.

---

This is the frontend for a small community platform — chess reading, discussion
and game analysis — built with [Next.js](https://nextjs.org).

## License

This project is licensed under the **GNU Affero General Public License v3.0 (GNU AGPL-3.0)**.

See the [LICENSE](./LICENSE) file for the full license text.

In summary, you are free to use, modify, and redistribute this software, provided that:

- You keep this license and attribution notice intact.
- You disclose your source code when you offer this software over a network.
- Provided the terms of the GNU AGPL-3.0 are met. Please note the attribution notice above is an additional requirement applied to this project.

## Getting Started

### Environment files

The app reads configuration from the environment. There are three files, each
with a **different purpose** (later ones override earlier ones):

| File              | Used by                            | Contains                                            | Committed? |
| ----------------- | ---------------------------------- | --------------------------------------------------- | ---------- |
| `.env`            | `pnpm dev` (local development)     | Everything: secrets + public config                 | No         |
| `.env.production` | `next build` / `next start` (live) | Everything: secrets + public config                 | No         |
| `.env.local`      | Always, in addition to the above   | Dev conveniences only — **no secrets**              | No         |
| `.env.example`    | Nobody (it is a template)          | Variable names + explanations, **all values blank** | **Yes**    |

**Only `.env.production` is needed in production.** You do not need `.env` or
`.env.local` on the server — the build and start scripts read
`.env.production` on their own (verified: `next build` succeeds with `.env`
removed).

To get set up locally:

```bash
cp .env.example .env              # local development
cp .env.example .env.production   # live deployment
```

Then fill in the values. Generate the two secrets with:

```bash
openssl rand -base64 48
```

**Never set `NODE_ENV` in an env file.** Next.js manages it itself; overriding
it can silently disable production optimisations or security checks.

### What is secret, and what is not

- Variables **without** a `NEXT_PUBLIC_` prefix are server-only. They are never
  sent to the browser, whatever file they live in.
- Variables **with** the `NEXT_PUBLIC_` prefix are inlined into the JavaScript
  bundle at build time and are **public by definition**. Never put a key, token
  or password in one.

### Branding

Branding comes only from the environment — no display text is hardcoded in the
UI, and the code contains no real product name or domain (the fallbacks are
`site` / `example.com`, which are intentionally generic). Define once per
deployment:

```bash
NEXT_PUBLIC_SITE_NAME=""          # app/brand name shown in header/loader/meta
NEXT_PUBLIC_SITE_URL=""          # canonical origin, no trailing slash
NEXT_PUBLIC_SITE_DOMAIN=""       # root domain, no scheme
NEXT_PUBLIC_SUPPORT_EMAIL=""     # public contact inbox
NEXT_PUBLIC_SOCIAL_HANDLE=""     # @-handle used in footer/contact links
NEXT_PUBLIC_SITE_DESCRIPTION=""  # meta description for search engines
```

**Chess sync** — the chess page pulls recent games live:

- **Chess.com** is fetched server-side (public API).
- **Lichess** is fetched directly from the visitor's browser (Lichess is
  public and CORS-open). It needs no `LICHESS_API_TOKEN` — a server token
  cannot even read other users' games, and running it in the browser avoids
  the shared server-IP rate limits.

```bash
pnpm install
```

3. Create the database schema, then generate the Prisma client:

```bash
pnpm db:push   # or: pnpm db:migrate
pnpm db:generate
```

4. Run the development server:

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

## Scripts

- `pnpm dev` — start the development server.
- `pnpm build` — build the project for production.
- `pnpm lint` — run the linter.
- `pnpm start` — start the production server.
- `pnpm db:generate` / `pnpm db:migrate` / `pnpm db:push` — Prisma client/schema tooling.
- `pnpm db:studio` — open Prisma Studio.

## Architecture

This is a self-contained **Next.js (App Router) monolith**:

- **API** — every server API lives in Route Handlers under `app/api/...`.
- **Database** — PostgreSQL with Prisma (see `prisma/schema.prisma`; all models are
  sourced directly from the domain schema).
- **Auth** — session cookies (HttpOnly) backed by the `Session` table; passwords are
  hashed with bcrypt.
- **Storage** — user uploads (avatars + article covers) are stored under
  `public/uploads/avatars` and `public/uploads/news` and served at the matching
  `/uploads/...` paths.
- **Email** — transactional/password-reset mail via **Resend** (`RESEND_API_KEY`).

## Tech Stack

- **Next.js** (App Router) — React framework + Route Handlers.
- **React** — UI library.
- **PostgreSQL + Prisma** — storage and ORM.
- **bcryptjs** — password hashing.
- **Resend** — transactional email.
- **TypeScript** — typed JavaScript.
- **Tailwind CSS** — styling.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) — learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) — an interactive Next.js tutorial.

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out the [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
