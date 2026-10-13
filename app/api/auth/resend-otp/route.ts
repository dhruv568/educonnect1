export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { ResendVerificationSchema } from "@/schemas/auth-schemas";
import { AuthService } from "@/services/auth-service";
import { apiSuccess, apiBadRequest, apiError } from "@/lib/api-response";
import { checkRateLimit } from "@/lib/rate-limiter";

/**
 * POST /api/auth/resend-otp
 * Resends verification code enforcing cooldown and rate limiting.
 */
export async function POST(request: NextRequest) {
  const rateLimit = checkRateLimit(request, "resend-otp", { limit: 5, windowMs: 60 * 1000 });
  if (!rateLimit.allowed) {
    return apiError(`Too many resend requests. Please wait ${rateLimit.resetSeconds} seconds before trying again.`, 429);
  }

  try {
    const rawHost =
      request.headers.get("x-forwarded-host") ||
      request.headers.get("x-original-host") ||
      request.headers.get("host") ||
      undefined;

    const body = await request.json();
    const validated = ResendVerificationSchema.parse(body);

    const result = await AuthService.resendVerification(validated.email, rawHost);

    return apiSuccess(result, result.message);
  } catch (error: any) {
    if (error.name === "ZodError") {
      return apiBadRequest(error.errors[0]?.message || "Invalid email parameter.");
    }
    return apiError(error.message || "We couldn't send your verification code. Please try again.", 400);
  }
}
