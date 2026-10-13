export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { RegisterSchema } from "@/schemas/auth-schemas";
import { AuthService } from "@/services/auth-service";
import { apiSuccess, apiBadRequest, apiError } from "@/lib/api-response";
import { verifyCaptchaSolution } from "@/lib/auth/captcha";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Verify CAPTCHA for Learner registration
    if (!body.role || body.role === "STUDENT") {
      const { captchaToken, captchaAnswer } = body;
      const captchaResult = verifyCaptchaSolution(captchaToken, captchaAnswer);
      if (!captchaResult.valid) {
        return apiBadRequest(captchaResult.error || "Security verification failed. Please complete the CAPTCHA.");
      }
    }

    const rawHost =
      request.headers.get("x-forwarded-host") ||
      request.headers.get("x-original-host") ||
      request.headers.get("host") ||
      undefined;

    const validatedData = RegisterSchema.parse(body);

    const user = await AuthService.registerUser(validatedData, rawHost);

    return apiSuccess(
      {
        user,
        requiresVerification: true,
        requiresOtp: true,
        redirectPath: `/verify-email?email=${encodeURIComponent(user.email)}`,
      },
      "Registration successful! Please check your email for the verification code.",
      201
    );
  } catch (error: any) {
    if (error.name === "ZodError") {
      return apiBadRequest(error.errors[0]?.message || "Invalid registration form input.");
    }
    return apiError(error.message || "Failed to complete registration.", 400);
  }
}
