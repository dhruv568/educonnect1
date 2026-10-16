import { NextRequest } from "next/server";
import {
  getSession,
  applyLogoutCookies,
  shouldRenewSession,
  renewSession,
  getSessionCookieOptions,
  SESSION_COOKIE_NAME,
} from "@/lib/auth/session";
import { apiSuccess, apiUnauthorized } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const session = await getSession(request);
  const rawHost =
    request.headers.get("x-forwarded-host") ||
    request.headers.get("x-original-host") ||
    request.headers.get("host") ||
    undefined;

  const rawCookie =
    request.cookies.get(SESSION_COOKIE_NAME)?.value ||
    (request.headers.get("cookie")?.includes(SESSION_COOKIE_NAME) ? true : false);
  const hasSessionCookie = Boolean(rawCookie);

  if (!session) {
    const res = apiUnauthorized("No active session.");
    res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0");
    res.headers.set("Pragma", "no-cache");
    // Only emit multi-domain cookie purge if the client actually provided an invalid or expired cookie
    // Guests or anonymous callers without cookies must never have credentials purged across subdomains
    if (hasSessionCookie) {
      return applyLogoutCookies(res, rawHost);
    }
    return res;
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.userId || session.id },
      include: { profile: true },
    });

    if (!user || user.status !== "ACTIVE") {
      const res = apiUnauthorized("User account inactive or not found.");
      return applyLogoutCookies(res, rawHost);
    }

    const firstName = user?.profile?.firstName || session.firstName || "";
    const lastName = user?.profile?.lastName || session.lastName || "";
    const fullName = [firstName, lastName].filter(Boolean).join(" ").trim();
    let resolvedName = fullName || (user.email ? user.email.split("@")[0] : "");

    let roleName = user.role === "ADMIN" ? "System Administrator" : user.role === "TEACHER" ? "Educator" : "Student";
    let features: string[] = [];
    let permissions: string[] = [];
    let navigation: any[] = [];

    if (user.role === "ADMIN" || user.role === "STAFF") {
      const { getUserAuthorization, getDynamicNavigation } = await import("@/lib/permissions/permission-engine");
      const auth = await getUserAuthorization(user.id);
      roleName = auth.roleName;
      features = auth.features;
      permissions = auth.permissions;
      navigation = getDynamicNavigation(auth);
    }

    if (!resolvedName) {
      resolvedName = roleName;
    }

    const response = apiSuccess({
      user: {
        ...session,
        id: user.id,
        userId: user.id,
        email: user.email,
        role: user.role,
        roleId: user.roleId,
        roleName,
        status: user.status,
        firstName,
        lastName,
        name: resolvedName,
        avatarUrl: user?.profile?.avatarUrl || null,
        features,
        permissions,
        navigation,
      },
    });

    // Sliding Expiration: Automatically renew active sessions before expiry (within max lifetime)
    if (shouldRenewSession(session)) {
      const renewed = renewSession(session);
      if (renewed) {
        const cookieOptions = getSessionCookieOptions(rawHost);
        response.cookies.set(SESSION_COOKIE_NAME, renewed, cookieOptions);
      }
    }

    response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0");
    response.headers.set("Pragma", "no-cache");
    return response;
  } catch {
    const fullName = [session.firstName, session.lastName].filter(Boolean).join(" ").trim();
    const fallbackRes = apiSuccess({
      user: {
        ...session,
        name: fullName || session.email?.split("@")[0] || "User",
      },
    });
    fallbackRes.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0");
    fallbackRes.headers.set("Pragma", "no-cache");
    return fallbackRes;
  }
}
