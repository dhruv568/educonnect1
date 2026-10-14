import { cookies, headers } from "next/headers";
import { UserSession } from "@/types/auth";
import { encodeSession, decodeSession } from "./session-token";

export { encodeSession, decodeSession };

const SESSION_COOKIE_NAME = "educonnects_session";
const SESSION_DURATION_DAYS = 7;

export function getCookieDomain(host?: string): string | undefined {
  if (host) {
    const clean = host.split(":")[0].toLowerCase().trim();
    if (clean.endsWith("educonnects.co.in")) {
      return ".educonnects.co.in";
    }
    if (clean === "localhost" || clean === "127.0.0.1") {
      return undefined;
    }
  }
  if (process.env.NODE_ENV === "production") {
    return ".educonnects.co.in";
  }
  return undefined;
}

/**
 * Sets session cookie in Response headers or current cookie context.
 */
export async function setSessionCookie(session: UserSession, host?: string) {
  const encoded = encodeSession(session);
  let resolvedHost = host;
  if (!resolvedHost) {
    try {
      const h = await headers();
      resolvedHost = h.get("x-forwarded-host") || h.get("host") || undefined;
    } catch {}
  }
  const cleanHost = resolvedHost ? resolvedHost.split(":")[0].toLowerCase().trim() : "";
  const isProd = process.env.NODE_ENV === "production";
  const isEduconnects = cleanHost.endsWith("educonnects.co.in");

  const cookieOptions: any = {
    httpOnly: true,
    secure: isProd || isEduconnects,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DURATION_DAYS * 24 * 60 * 60,
  };
  const domain = getCookieDomain(resolvedHost);
  if (domain) {
    cookieOptions.domain = domain;
  }
  try {
    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE_NAME, encoded, cookieOptions);
  } catch {
    // Graceful fallback for non-request / test scopes
  }
}

/**
 * Gets current user session from request cookies.
 */
export async function getSession(): Promise<UserSession | null> {
  try {
    const cookieStore = await cookies();
    const cookie = cookieStore.get(SESSION_COOKIE_NAME);
    if (!cookie?.value) return null;
    return decodeSession(cookie.value);
  } catch {
    return null;
  }
}

/**
 * Removes session cookie on logout.
 */
export async function clearSessionCookie(host?: string) {
  const cookieStore = await cookies();
  let resolvedHost = host;
  if (!resolvedHost) {
    try {
      const h = await headers();
      resolvedHost = h.get("x-forwarded-host") || h.get("host") || undefined;
    } catch {}
  }
  const domain = getCookieDomain(resolvedHost);
  if (domain) {
    cookieStore.delete({ name: SESSION_COOKIE_NAME, path: "/", domain });
  }
  cookieStore.delete({ name: SESSION_COOKIE_NAME, path: "/" });
}

/**
 * Injects multi-domain cookie expiration and anti-cache headers directly
 * into a NextResponse or standard Response instance. Guarantees cross-subdomain logout invalidation.
 */
export function applyLogoutCookies<T extends Response>(response: T, host?: string): T {
  const cleanHost = host ? host.split(":")[0].toLowerCase().trim() : "";
  const isProd = process.env.NODE_ENV === "production";
  const isSecure = isProd || (cleanHost !== "" && cleanHost.endsWith("educonnects.co.in"));

  const domainVariants: (string | undefined)[] = [
    ".educonnects.co.in",
    "educonnects.co.in",
    ".learners.educonnects.co.in",
    "learners.educonnects.co.in",
    ".educators.educonnects.co.in",
    "educators.educonnects.co.in",
    undefined,
  ];

  if (cleanHost && !domainVariants.includes(cleanHost) && !domainVariants.includes(`.${cleanHost}`)) {
    domainVariants.push(cleanHost);
    domainVariants.push(`.${cleanHost}`);
  }

  const cookieNames = Array.from(
    new Set([
      SESSION_COOKIE_NAME,
      "educonnect_session",
      "educonnects_token",
      "token",
      "admin_pending_otp",
      "educonnects_pending_otp",
    ])
  );

  for (const name of cookieNames) {
    for (const domain of domainVariants) {
      const parts = [
        `${name}=`,
        "Path=/",
        "Expires=Thu, 01 Jan 1970 00:00:00 GMT",
        "Max-Age=0",
        "HttpOnly",
        "SameSite=Lax",
      ];
      if (domain) {
        parts.push(`Domain=${domain}`);
      }
      if (isSecure) {
        parts.push("Secure");
      }
      response.headers.append("Set-Cookie", parts.join("; "));
    }
  }

  // Anti-cache headers to prevent browser back button or bfcache restoring old state
  response.headers.set(
    "Cache-Control",
    "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0, post-check=0, pre-check=0"
  );
  response.headers.set("Pragma", "no-cache");
  response.headers.set("Expires", "0");

  return response;
}

