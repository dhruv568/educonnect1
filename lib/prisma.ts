import { PrismaClient } from "@prisma/client";

function getEnrichedDatabaseUrl(): string | undefined {
  const url = process.env.DATABASE_URL;
  if (!url) return undefined;
  let enriched = url;
  if (!enriched.includes(":5432") && !enriched.includes("@localhost")) {
    const parts = enriched.split("@");
    if (parts.length === 2) {
      const hostAndRest = parts[1];
      const slashIdx = hostAndRest.indexOf("/");
      if (slashIdx !== -1) {
        const host = hostAndRest.slice(0, slashIdx);
        if (!host.includes(":")) {
          const rest = hostAndRest.slice(slashIdx);
          enriched = `${parts[0]}@${host}:5432${rest}`;
        }
      }
    }
  }
  if (!enriched.includes("connect_timeout")) {
    const separator = enriched.includes("?") ? "&" : "?";
    enriched = `${enriched}${separator}connect_timeout=30&pool_timeout=30`;
  }
  return enriched;
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const enrichedUrl = getEnrichedDatabaseUrl();

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ["error"],
    ...(enrichedUrl ? { datasources: { db: { url: enrichedUrl } } } : {}),
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
