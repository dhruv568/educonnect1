import { NextRequest } from "next/server";
import { VerifyOTPSchema } from "@/schemas/auth-schemas";
import { AuthService } from "@/services/auth-service";
import { apiSuccess, apiBadRequest, apiError } from "@/lib/api-response";
import { getSession, setSessionCookie, encodeSession, getCookieDomain } from "@/lib/auth/session";
import { isEducatorRole, isLearnerRole } from "@/lib/auth/roles";
import { checkRateLimit } from "@/lib/rate-limiter";
import { extractOtpDigits } from "@/lib/auth/otp-utils";
import { isSafeRedirectPath, sanitizeRedirectUrl } from "@/lib/auth/redirect-validator";

/**
 * POST /api/auth/verify-email
 * Verifies email via 6-digit OTP code input with rate limiting and attempt limits.
 */
export async function POST(request: NextRequest) {
  const rateLimit = checkRateLimit(request, "verify-email", { limit: 10, windowMs: 60 * 1000 });
  if (!rateLimit.allowed) {
    return apiError(`Too many verification attempts. Please wait ${rateLimit.resetSeconds} seconds before trying again.`, 429);
  }

  try {
    const rawHost =
      request.headers.get("x-forwarded-host") ||
      request.headers.get("x-original-host") ||
      request.headers.get("host") ||
      undefined;

    const body = await request.json();
    if (body && typeof body.otp === "string") {
      body.otp = extractOtpDigits(body.otp);
    }
    const validated = VerifyOTPSchema.parse(body);

    const result = await AuthService.verifyOTP(validated.email, validated.otp);

    // Set or upgrade authenticated session upon successful verification
    if (result.user) {
      await setSessionCookie(result.user, rawHost);
    } else {
      const session = await getSession();
      if (session && session.email.toLowerCase() === validated.email.toLowerCase()) {
        await setSessionCookie({
          ...session,
          emailVerified: true,
        }, rawHost);
      }
    }

    // Determine canonical destination: prefer safe returnTo/redirectTo, otherwise fallback to database role dashboard
    const targetParam = validated.returnTo || validated.redirectTo;
    const safeReturn = targetParam && isSafeRedirectPath(targetParam) ? sanitizeRedirectUrl(targetParam) : null;

    let redirectPath = safeReturn || result.redirectPath || "/";
    if (!safeReturn && result.user) {
      if (result.user.role === "ADMIN") {
        redirectPath = "/admin";
      } else if (isEducatorRole(result.user.role)) {
        redirectPath = "/teacher/dashboard";
      } else if (isLearnerRole(result.user.role)) {
        redirectPath = "/student/dashboard";
      } else if (result.user.role === "STAFF") {
        redirectPath = "/staff/dashboard";
      }
    }

    const payload = {
      ...result,
      redirectPath,
    };

    const response = apiSuccess(payload, result.message);
    if (result.user) {
      const isProd = process.env.NODE_ENV === "production";
      const isEduconnects = Boolean(rawHost && rawHost.includes("educonnects.co.in"));
      const domain = getCookieDomain(rawHost);

      const cookieOptions: any = {
        httpOnly: true,
        secure: isProd || isEduconnects,
        sameSite: "lax",
        path: "/",
        maxAge: 7 * 24 * 60 * 60,
      };
      if (domain) {
        cookieOptions.domain = domain;
      }
      response.cookies.set("educonnects_session", encodeSession(result.user), cookieOptions);

      response.cookies.delete("admin_pending_otp");
      response.cookies.delete("educonnects_pending_otp");
      if (domain) {
        response.cookies.delete({ name: "admin_pending_otp", domain, path: "/" });
        response.cookies.delete({ name: "educonnects_pending_otp", domain, path: "/" });
      }
    }

    return response;
  } catch (error: any) {
    if (error.name === "ZodError") {
      return apiBadRequest(error.errors[0]?.message || "Invalid OTP code format.");
    }
    return apiError(error.message || "Failed to verify email.", 400);
  }
}

/**
 * GET /api/auth/verify-email?token=...&email=...
 * Verifies email via direct click link.
 */
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");
  const email = searchParams.get("email");

  const rawHost =
    request.headers.get("x-forwarded-host") ||
    request.headers.get("x-original-host") ||
    request.headers.get("host") ||
    undefined;

  if (!token || !email) {
    return apiBadRequest("Missing verification token or email parameter.");
  }

  try {
    const result = await AuthService.verifyToken(token, email);

    // Set or upgrade authenticated session upon successful verification link
    if (result.user) {
      await setSessionCookie(result.user, rawHost);
    } else {
      const session = await getSession();
      if (session && session.email.toLowerCase() === email.toLowerCase()) {
        await setSessionCookie({
          ...session,
          emailVerified: true,
        }, rawHost);
      }
    }

    const response = apiSuccess(result, result.message);
    response.cookies.delete("admin_pending_otp");
    response.cookies.delete("educonnects_pending_otp");
    const domain = getCookieDomain(rawHost);
    if (domain) {
      response.cookies.delete({ name: "admin_pending_otp", domain, path: "/" });
      response.cookies.delete({ name: "educonnects_pending_otp", domain, path: "/" });
    }
    return response;
  } catch (error: any) {
    return apiError(error.message || "Failed to verify email link.", 400);
  }
}
