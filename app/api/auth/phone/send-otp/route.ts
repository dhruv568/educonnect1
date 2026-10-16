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

    const result = await PhoneAuthService.initiatePhoneOtp({
      phone: validated.phone,
      purpose: validated.purpose,
      roleContext: validated.role,
    });

    return apiSuccess(result, result.message);
  } catch (err: any) {
    if (err.name === "ZodError") {
      return apiBadRequest(err.errors[0]?.message || "Invalid phone number input.");
    }
    const message = err.message || "Failed to dispatch verification code.";
    // If rate limit error from phone cooldown, return 429
    const isRateLimit = message.includes("Please wait") || message.includes("Too many OTP requests");
    return apiError(message, isRateLimit ? 429 : 400);
  }
}
