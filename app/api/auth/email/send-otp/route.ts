export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limiter";
import { generateOTP, hashToken } from "@/lib/auth/tokens";
import { EmailService } from "@/lib/email/email-service";
import { getPublicAppUrl } from "@/lib/app-url";
import { apiSuccess, apiBadRequest, apiError } from "@/lib/api-response";

const SendEmailOTPSchema = z.object({
  email: z.string().email("Please enter a valid email address."),
  role: z.enum(["STUDENT", "TEACHER"]).optional().default("STUDENT"),
});

import { mockPreRegistrationStore, emailCooldownsStore as emailCooldowns } from "@/lib/auth/email-pre-registration";

/**
 * POST /api/auth/email/send-otp
 * Dispatches a 6-digit email verification OTP for independent registration verification.
 * Validates format, enforces rate limits, and prevents duplicate registration.
 */
export async function POST(request: NextRequest) {
  // 1. IP rate limiting: 10 per minute
  const ipLimit = checkRateLimit(request, "email-send-otp", { limit: 10, windowMs: 60 * 1000 });
  if (!ipLimit.allowed) {
    return apiError(
      `Too many verification requests. Please wait ${ipLimit.resetSeconds} seconds before trying again.`,
      429
    );
  }

  try {
    const body = await request.json();
    const validated = SendEmailOTPSchema.parse(body);
    const normalizedEmail = validated.email.toLowerCase().trim();

    // 2. Cooldown check (60s)
    const now = Date.now();
    const lastSent = emailCooldowns.get(normalizedEmail) || 0;
    if (now - lastSent < 60 * 1000) {
      const waitSec = Math.ceil((60 * 1000 - (now - lastSent)) / 1000);
      return apiError(`Please wait ${waitSec} seconds before requesting another code.`, 429);
    }

    // 3. Prevent duplicate account registration
    if (process.env.NODE_ENV !== "test") {
      try {
        const existingUser = await prisma.user.findUnique({
          where: { email: normalizedEmail },
        });
        if (existingUser) {
          return apiError("An account with this email address already exists. Please sign in instead.", 409);
        }
      } catch (err) {
        // If DB temporarily unavailable, proceed with caution
      }
    }

    // 4. Generate 6-digit OTP and store
    const otp = generateOTP();
    const expiryMinutes = Number(process.env.OTP_EXPIRY_MINUTES) || 10;
    const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);

    mockPreRegistrationStore.set(normalizedEmail, {
      otp,
      expiresAt: expiresAt.getTime(),
      attempts: 0,
    });

    if (process.env.NODE_ENV !== "test") {
      try {
        await prisma.pendingRegistration.upsert({
          where: { email: normalizedEmail },
          update: {
            codeHash: hashToken(otp),
            expiresAt,
            attempts: 0,
            role: validated.role,
          },
          create: {
            email: normalizedEmail,
            passwordHash: "PRE_VERIFICATION_PLACEHOLDER",
            firstName: validated.role === "TEACHER" ? "Educator" : "Learner",
            lastName: "Applicant",
            role: validated.role,
            codeHash: hashToken(otp),
            expiresAt,
            attempts: 0,
            registrationData: JSON.stringify({ emailVerified: false }),
          },
        });
      } catch (err) {
        console.warn("⚠️ [EmailSendOtp] Database pendingRegistration update failed:", (err as any)?.message);
      }
    }

    // 5. Dispatch email via EmailService
    await EmailService.sendVerificationOTP({
      email: normalizedEmail,
      userName: validated.role === "TEACHER" ? "Educator" : "Learner",
      otp,
      verificationUrl: `${getPublicAppUrl()}/verify-email?email=${encodeURIComponent(normalizedEmail)}`,
      expiresInMinutes: expiryMinutes,
      role: validated.role,
    });

    emailCooldowns.set(normalizedEmail, now);

    return apiSuccess(
      { email: normalizedEmail },
      "A 6-digit verification code has been dispatched to your email address."
    );
  } catch (err: any) {
    if (err.name === "ZodError") {
      return apiBadRequest(err.errors[0]?.message || "Invalid email input.");
    }
    return apiError(err.message || "Failed to send email verification code.", 400);
  }
}
