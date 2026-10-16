export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { PhoneLoginSchema } from "@/schemas/auth-schemas";
import { PhoneAuthService } from "@/services/phone-auth-service";
import { apiSuccess, apiBadRequest, apiError } from "@/lib/api-response";
import { setSessionCookie, getCookieDomain } from "@/lib/auth/session";
import { checkRateLimit } from "@/lib/rate-limiter";

/**
 * POST /api/auth/phone/login
 * Authenticates an existing user via MSG91 Phone OTP or Access Token.
 *
 * Enforces:
 * - Server-side security verification
 * - Unknown numbers are strictly rejected (never automatically creates accounts)
 * - Separate phone verification status from email verification
 * - Preserves existing session lifecycle, cookies, and protected routes
 */
export async function POST(request: NextRequest) {
  // IP-level rate limiting: 10 login requests per minute per IP
  const rateLimit = checkRateLimit(request, "phone-login", { limit: 10, windowMs: 60 * 1000 });
  if (!rateLimit.allowed) {
    return apiError(
      `Too many login attempts. Please wait ${rateLimit.resetSeconds} seconds before trying again.`,
      429
    );
  }

  try {
    const rawHost =
      request.headers.get("x-forwarded-host") ||
      request.headers.get("x-original-host") ||
      request.headers.get("host") ||
      undefined;

    const body = await request.json();
    const validated = PhoneLoginSchema.parse(body);

    const result = await PhoneAuthService.verifyPhoneOtpLogin({
      phone: validated.phone,
      otp: validated.otp,
      reqId: validated.reqId,
      accessToken: validated.accessToken,
      roleContext: validated.role,
      rawHost,
      returnTo: validated.returnTo,
      redirectTo: validated.redirectTo,
    });

    const response = apiSuccess(
      {
        user: result.user,
        requiresVerification: false,
        requiresOtp: false,
        redirectPath: result.redirectPath,
      },
      result.message
    );

    // Set signed session cookie
    if (result.user) {
      await setSessionCookie(result.user, rawHost, response);
    }

    // Clean up any pending email OTP cookies
    const domain = getCookieDomain(rawHost);
    response.cookies.delete("admin_pending_otp");
    response.cookies.delete("educonnects_pending_otp");
    if (domain) {
      response.cookies.delete({ name: "admin_pending_otp", domain, path: "/" });
      response.cookies.delete({ name: "educonnects_pending_otp", domain, path: "/" });
    }

    return response;
  } catch (err: any) {
    if (err.name === "ZodError") {
      return apiBadRequest(err.errors[0]?.message || "Invalid input format.");
    }
    const message = err.message || "Failed to authenticate via phone OTP.";
    const lower = message.toLowerCase();

    // 1. Unregistered phone number (404 Not Found)
    if (lower.includes("no account is registered")) {
      return apiError(message, 404);
    }

    // 2. Suspended account / role mismatch (403 Forbidden)
    if (
      lower.includes("suspended") ||
      lower.includes("deactivated") ||
      lower.includes("access denied") ||
      lower.includes("registered with an educator account") ||
      lower.includes("registered with a learner account")
    ) {
      return apiError(message, 403);
    }

    // 3. Rate limiting (429 Too Many Requests)
    if (lower.includes("please wait") || lower.includes("too many")) {
      return apiError(message, 429);
    }

    // 4. Provider failure / SMS service temporarily unavailable (503 Service Unavailable)
    if (
      lower.includes("temporarily unavailable") ||
      lower.includes("network error") ||
      lower.includes("authenticationfailure")
    ) {
      return apiError(
        "SMS verification service is temporarily unavailable. Please try again or sign in with Email & Password.",
        503
      );
    }

    // 5. Invalid OTP / expired token / validation error (400 Bad Request)
    return apiError(message, 400);
  }
}
