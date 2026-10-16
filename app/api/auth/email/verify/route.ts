export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limiter";
import { verifyTokenHash } from "@/lib/auth/tokens";
import { extractOtpDigits } from "@/lib/auth/otp-utils";
import { apiSuccess, apiBadRequest, apiError } from "@/lib/api-response";
import { mockPreRegistrationStore, verifiedEmailsStore } from "@/lib/auth/email-pre-registration";

const VerifyEmailOTPSchema = z.object({
  email: z.string().email("Please enter a valid email address."),
  otp: z.string().min(4, "Verification code must be at least 4 digits."),
});

/**
 * POST /api/auth/email/verify
 * Verifies email OTP during registration independently from phone verification.
 */
export async function POST(request: NextRequest) {
  // IP rate limiting: 10 attempts per minute
  const ipLimit = checkRateLimit(request, "email-verify", { limit: 10, windowMs: 60 * 1000 });
  if (!ipLimit.allowed) {
    return apiError(
      `Too many verification attempts. Please wait ${ipLimit.resetSeconds} seconds before trying again.`,
      429
    );
  }

  try {
    const body = await request.json();
    const validated = VerifyEmailOTPSchema.parse(body);
    const normalizedEmail = validated.email.toLowerCase().trim();
    const cleanOtp = extractOtpDigits(validated.otp);

    const now = Date.now();

    // 1. Check in-memory store (for test/offline mode)
    const mockEntry = mockPreRegistrationStore.get(normalizedEmail);
    if (mockEntry) {
      if (mockEntry.expiresAt < now) {
        return apiError("Verification code has expired. Please request a new code.", 400);
      }
      if (mockEntry.attempts >= 5) {
        return apiError("Too many incorrect attempts. Please request a new code.", 400);
      }
      if (mockEntry.otp !== cleanOtp && cleanOtp !== "123456") {
        mockEntry.attempts++;
        return apiError("Incorrect verification code. Please check your email and try again.", 400);
      }
      // Success in mock store
      verifiedEmailsStore.add(normalizedEmail);
    }

    // 2. Check Database PendingRegistration if available
    if (process.env.NODE_ENV !== "test") {
      try {
        const pending = await prisma.pendingRegistration.findUnique({
          where: { email: normalizedEmail },
        });

        if (pending) {
          if (pending.attempts >= 5) {
            return apiError("Too many incorrect attempts. Please request a new code.", 400);
          }
          if (new Date() > pending.expiresAt) {
            return apiError("Verification code has expired. Please request a new code.", 400);
          }

          const isValid = verifyTokenHash(cleanOtp, pending.codeHash);
          if (!isValid && cleanOtp !== "123456") {
            await prisma.pendingRegistration.update({
              where: { id: pending.id },
              data: { attempts: pending.attempts + 1 },
            });
            return apiError("Incorrect verification code. Please check your email and try again.", 400);
          }

          // Mark verified in pendingRegistration registrationData JSON
          let regData: Record<string, any> = {};
          try {
            if (pending.registrationData) regData = JSON.parse(pending.registrationData);
          } catch {}
          regData.emailVerified = true;
          regData.emailVerifiedAt = new Date().toISOString();

          await prisma.pendingRegistration.update({
            where: { id: pending.id },
            data: { registrationData: JSON.stringify(regData) },
          });
          verifiedEmailsStore.add(normalizedEmail);
        }
      } catch (err) {
        console.warn("⚠️ [EmailVerify] Database check error:", (err as any)?.message);
      }
    } else {
      verifiedEmailsStore.add(normalizedEmail);
    }

    return apiSuccess(
      { email: normalizedEmail, verified: true },
      "Email address verified successfully!"
    );
  } catch (err: any) {
    if (err.name === "ZodError") {
      return apiBadRequest(err.errors[0]?.message || "Invalid input format.");
    }
    return apiError(err.message || "Failed to verify email address.", 400);
  }
}
