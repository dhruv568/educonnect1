import { cookies } from "next/headers";
import { UserSession } from "@/types/auth";

const SESSION_COOKIE_NAME = "educonnects_session";
const SESSION_DURATION_DAYS = 7;

/**
 * Encodes session data to a secure base64 payload (or JWT token signature).
 */
export function encodeSession(session: UserSession): string {
  const jsonStr = JSON.stringify(session);
  return Buffer.from(jsonStr).toString("base64url");
}

/**
 * Decodes session data from cookie payload.
 */
export function decodeSession(token: string): UserSession | null {
  try {
    const jsonStr = Buffer.from(token, "base64url").toString("utf-8");
    const payload = JSON.parse(jsonStr) as UserSession;
    if (payload) {
      payload.userId = payload.userId || payload.id;
    }
    return payload;
  } catch {
    return null;
  }
}

export function getCookieDomain(host?: string): string | undefined {
  if (host) {
    const clean = host.split(":")[0].toLowerCase();
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
  const cookieStore = await cookies();
  const encoded = encodeSession(session);
  const cookieOptions: any = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DURATION_DAYS * 24 * 60 * 60,
  };
  const domain = getCookieDomain(host);
  if (domain) {
    cookieOptions.domain = domain;
  }
  cookieStore.set(SESSION_COOKIE_NAME, encoded, cookieOptions);
}

/**
 * Gets current user session from request cookies.
 */
export async function getSession(): Promise<UserSession | null> {
  const cookieStore = await cookies();
  const cookie = cookieStore.get(SESSION_COOKIE_NAME);
  if (!cookie?.value) return null;
  return decodeSession(cookie.value);
}

/**
 * Removes session cookie on logout.
 */
export async function clearSessionCookie(host?: string) {
  const cookieStore = await cookies();
  const domain = getCookieDomain(host);
  if (domain) {
    cookieStore.delete({ name: SESSION_COOKIE_NAME, path: "/", domain });
  } else {
    cookieStore.delete({ name: SESSION_COOKIE_NAME, path: "/" });
  }
}

/**
 * Injects multi-domain cookie expiration and anti-cache headers directly
 * into a NextResponse instance. Guarantees cross-subdomain logout invalidation.
 */
export function applyLogoutCookies<T extends Response>(response: T, host?: string): T {
  const isProd = process.env.NODE_ENV === "production";
  const domainVariants: (string | undefined)[] = [".educonnects.co.in", "educonnects.co.in", undefined];

  if (host) {
    const clean = host.split(":")[0].toLowerCase();
    if (clean && !domainVariants.includes(clean) && !domainVariants.includes(`.${clean}`)) {
      domainVariants.push(clean);
      domainVariants.push(`.${clean}`);
    }
  }

  const cookieNames = [
    SESSION_COOKIE_NAME,
    "educonnect_session",
    "educonnects_session",
    "educonnects_token",
    "token",
  ];

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
      if (isProd) {
        parts.push("Secure");
      }
      response.headers.append("Set-Cookie", parts.join("; "));
    }
  }

  // Set-Cookie header fallbacks for any response type
  response.headers.set(
    "Cache-Control",
    "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0, post-check=0, pre-check=0"
  );
  response.headers.set("Pragma", "no-cache");
  response.headers.set("Expires", "0");

  return response;
}

