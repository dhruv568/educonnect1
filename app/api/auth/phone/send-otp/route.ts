export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { SendPhoneOTPSchema } from "@/schemas/auth-schemas";
import { PhoneAuthService } from "@/services/phone-auth-service";
import { apiSuccess, apiBadRequest, apiError } from "@/lib/api-response";
import { checkRateLimit } from "@/lib/rate-limiter";

/**
 * POST /api/auth/phone/send-otp
 * Dispatches an OTP to the user's mobile number via MSG91 OTP Widget API.
 */
export async function POST(request: NextRequest) {
  // IP-level rate limiting: 10 requests per minute per IP
  const rateLimit = checkRateLimit(request, "phone-send-otp", { limit: 10, windowMs: 60 * 1000 });
  if (!rateLimit.allowed) {
    return apiError(
      `Too many OTP requests. Please wait ${rateLimit.resetSeconds} seconds before trying again.`,
      429
    );
  }

  try {
    const body = await request.json();
    const validated = SendPhoneOTPSchema.parse(body);

    if (validated.checkOnly) {
      const checkResult = await PhoneAuthService.checkPhoneForOtp({
        phone: validated.phone,
        purpose: validated.purpose,
        roleContext: validated.role,
      });
      return apiSuccess(checkResult, "Phone verified for OTP delivery.");
    }

    const result = await PhoneAuthService.initiatePhoneOtp({
      phone: validated.phone,
      purpose: validated.purpose,
      roleContext: validated.role,
      captchaToken: validated.captchaToken,
    });

    return apiSuccess(result, result.message);
  } catch (err: any) {
    if (err.name === "ZodError") {
      return apiBadRequest(err.errors[0]?.message || "Invalid phone number input.");
    }
    const message = err.message || "Failed to dispatch verification code.";
    const lower = message.toLowerCase();

    // 1. Unregistered phone on login (404 Not Found)
    if (lower.includes("no account is registered")) {
      return apiError(message, 404);
    }

    // 2. Suspended account or role mismatch (403 Forbidden)
    if (
      lower.includes("suspended") ||
      lower.includes("deactivated") ||
      lower.includes("access denied") ||
      lower.includes("registered with an educator account") ||
      lower.includes("registered with a learner account")
    ) {
      return apiError(message, 403);
    }

    // 3. Duplicate phone on signup (409 Conflict)
    if (lower.includes("already registered with another account")) {
      return apiError(message, 409);
    }

    // 4. Rate limiting cooldown or window limit (429 Too Many Requests)
    if (lower.includes("please wait") || lower.includes("too many")) {
      return apiError(message, 429);
    }

    // 5. Provider failure / SMS service temporarily unavailable (503 Service Unavailable)
    if (
      lower.includes("temporarily unavailable") ||
      lower.includes("network error") ||
      lower.includes("authenticationfailure")
    ) {
      return apiError(
        "SMS service is temporarily unavailable. Please try again in a few moments or sign in with Email & Password.",
        503
      );
    }

    return apiError(message, 400);
  }
}
