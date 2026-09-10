import { PrismaClient } from "@prisma/client";

/**
 * Prisma client singleton reused across the dev server/hot reloads.
 *
 * DATABASE_URL is resolved from the environment. Next.js already loads
 * `.env`, `.env.local`, etc. into `process.env` for server code at startup;
 * we additionally resolve here so a missing value fails fast with an
 * actionable message instead of an opaque Prisma validation error inside an
 * arbitrary route handler.
 */
function resolveDatabaseUrl(): string {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Copy .env.example to .env / .env.local and " +
        "point it at your PostgreSQL database, then run `pnpm db:push` and " +
        "`pnpm db:generate` before starting the dev server.",
    );
  }
  return url;
}

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasourceUrl: resolveDatabaseUrl(),
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
