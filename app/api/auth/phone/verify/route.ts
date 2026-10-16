export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { VerifyPhoneOTPSchema } from "@/schemas/auth-schemas";
import { PhoneAuthService } from "@/services/phone-auth-service";
import { apiSuccess, apiBadRequest, apiError } from "@/lib/api-response";
import { checkRateLimit } from "@/lib/rate-limiter";
import { getSession } from "@/lib/auth/session";

/**
 * POST /api/auth/phone/verify
 * Verifies phone OTP during registration or profile update.
 *
 * Enforces:
 * - Server-side security verification via MSG91
 * - Duplicate phone association prevention
 * - Separate phone verification status from email verification
 */
export async function POST(request: NextRequest) {
  // IP-level rate limiting: 10 attempts per minute per IP
  const rateLimit = checkRateLimit(request, "phone-verify", { limit: 10, windowMs: 60 * 1000 });
  if (!rateLimit.allowed) {
    return apiError(
      `Too many verification attempts. Please wait ${rateLimit.resetSeconds} seconds before trying again.`,
      429
    );
  }

  try {
    const body = await request.json();
    const validated = VerifyPhoneOTPSchema.parse(body);

    // Optional: detect current user session if already signed in
    const currentSession = await getSession();

    const result = await PhoneAuthService.verifyPhoneOtpSignup({
      phone: validated.phone,
      email: validated.email,
      otp: validated.otp,
      reqId: validated.reqId,
      accessToken: validated.accessToken,
      userId: currentSession?.id,
    });

    return apiSuccess(result, result.message);
  } catch (err: any) {
    if (err.name === "ZodError") {
      return apiBadRequest(err.errors[0]?.message || "Invalid input format.");
    }
    const message = err.message || "Failed to verify phone number.";
    const isConflict = message.includes("already registered with another account");
    return apiError(message, isConflict ? 409 : 400);
  }
}
