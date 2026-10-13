export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { LoginSchema } from "@/schemas/auth-schemas";
import { AuthService } from "@/services/auth-service";
import { apiSuccess, apiBadRequest, apiError } from "@/lib/api-response";
import { setSessionCookie } from "@/lib/auth/session";
import { isEducatorRole, isLearnerRole } from "@/lib/auth/guards";
import { UserRole, UserSession } from "@/types/auth";

import { checkRateLimit } from "@/lib/rate-limiter";
import { prisma } from "@/lib/prisma";
import { getResendCooldownSeconds } from "@/lib/auth/tokens";
import { logAuditEvent } from "@/lib/audit-logger";
import { isSafeRedirectPath, sanitizeRedirectUrl } from "@/lib/auth/redirect-validator";

export async function POST(request: NextRequest) {
  // Rate limit: 10 login requests per minute per IP
  const rateLimit = checkRateLimit(request, "login", { limit: 10, windowMs: 60 * 1000 });
  if (!rateLimit.allowed) {
    return apiError(`Too many login attempts. Please wait ${rateLimit.resetSeconds} seconds before trying again.`, 429);
  }

  try {
    const rawHost =
      request.headers.get("x-forwarded-host") ||
      request.headers.get("x-original-host") ||
      request.headers.get("host") ||
      undefined;
    const body = await request.json();
    const validatedData = LoginSchema.parse(body);

    // If OTP is provided in the login payload, validate credentials and OTP atomically
    if (validatedData.otp) {
      if (!validatedData.password) {
        return apiBadRequest("Password is required to authenticate.");
      }
      await AuthService.validateCredentials(validatedData.email, validatedData.password);
      const result = await AuthService.verifyOTP(validatedData.email, validatedData.otp);

      if (result.user) {
        await setSessionCookie(result.user, rawHost);
      }

      const targetParam = validatedData.returnTo || validatedData.redirectTo;
      const safeCustomReturn = targetParam && isSafeRedirectPath(targetParam) ? sanitizeRedirectUrl(targetParam) : null;

      let redirectPath = safeCustomReturn || result.redirectPath || "/";
      if (!safeCustomReturn && result.user) {
        if (isEducatorRole(result.user.role)) {
          redirectPath = "/teacher/dashboard";
        } else if (isLearnerRole(result.user.role)) {
          redirectPath = "/student/dashboard";
        } else if (result.user.role === "ADMIN") {
          redirectPath = "/admin";
        } else if (result.user.role === "STAFF") {
          redirectPath = "/staff/dashboard";
        }
      }

      const response = apiSuccess(
        {
          user: result.user,
          requiresVerification: false,
          requiresOtp: false,
          redirectPath,
        },
        "Login successful!"
      );
      response.cookies.delete("admin_pending_otp");
      response.cookies.delete("educonnects_pending_otp");
      return response;
    }

    // Step 1: Validate email & password credentials
    if (!validatedData.password) {
      return apiBadRequest("Password is required to sign in.");
    }

    const user = await AuthService.validateCredentials(validatedData.email, validatedData.password);

    if (user.status !== "ACTIVE") {
      return apiError("Account is suspended or deactivated. Access denied.", 403);
    }

    // Step 2: Cooldown check across all users to prevent OTP spamming
    const cooldownSeconds = getResendCooldownSeconds();
    const latestVerification = await prisma.emailVerification.findFirst({
      where: { userId: user.id, verifiedAt: null },
      orderBy: { createdAt: "desc" },
    });

    if (latestVerification) {
      const secondsSinceLast = Math.floor((Date.now() - latestVerification.createdAt.getTime()) / 1000);
      if (secondsSinceLast < cooldownSeconds) {
        const waitTime = cooldownSeconds - secondsSinceLast;
        return apiError(`Please wait ${waitTime} seconds before requesting another code.`, 429);
      }
    }

    // Step 3: MANDATORY TWO-STAGE OTP AUTHENTICATION FOR ALL REGISTERED USERS
    // (Learners, Educators, Admin, Staff)
    // Password verification alone MUST NEVER grant session or dashboard access.
    // Generates a cryptographically secure dynamic 6-digit OTP dispatched to user's registered email via Resend.
    const isAdmin = user.role === "ADMIN";
    const displayName =
      user.profile?.firstName ||
      (isAdmin ? "System Administrator" : isEducatorRole(user.role) ? "Educator" : "Learner");

    await AuthService.createAndSendVerification(
      user.id,
      user.email,
      displayName,
      isAdmin
    );

    await logAuditEvent(user.id, "LOGIN_OTP_DISPATCHED", { role: user.role });

    // Step 4: Determine canonical redirect path for OTP verification page based strictly on server/database role
    const customTargetParam = validatedData.returnTo || validatedData.redirectTo;
    const safeOtpReturn = customTargetParam && isSafeRedirectPath(customTargetParam)
      ? sanitizeRedirectUrl(customTargetParam)
      : null;

    let redirectPath = `/verify-email?email=${encodeURIComponent(user.email)}`;
    if (safeOtpReturn) {
      redirectPath += `&returnTo=${encodeURIComponent(safeOtpReturn)}&redirectTo=${encodeURIComponent(safeOtpReturn)}`;
    } else if (isAdmin) {
      redirectPath = `/verify-email?email=${encodeURIComponent(user.email)}&redirectTo=%2Fadmin`;
    } else if (isEducatorRole(user.role)) {
      redirectPath = `/verify-email?email=${encodeURIComponent(user.email)}&redirectTo=%2Fteacher%2Fdashboard`;
    } else if (isLearnerRole(user.role)) {
      redirectPath = `/verify-email?email=${encodeURIComponent(user.email)}&redirectTo=%2Fstudent%2Fdashboard`;
    } else if (user.role === "STAFF") {
      redirectPath = `/verify-email?email=${encodeURIComponent(user.email)}&redirectTo=%2Fstaff%2Fdashboard`;
    }

    // DO NOT create authenticated session cookie here. Only temporary OTP verification state is returned.
    const response = apiSuccess(
      {
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          emailVerified: false,
        },
        requiresVerification: true,
        requiresOtp: true,
        redirectPath,
      },
      isAdmin
        ? "Credentials verified. A 6-digit verification code has been dispatched to your authorized admin email."
        : "Credentials verified. A 6-digit verification code has been dispatched to your registered email."
    );

    // Set temporary state cookies (10 minutes) indicating user is waiting for OTP verification
    const isProd = process.env.NODE_ENV === "production";
    const isEduconnects = Boolean(rawHost && rawHost.includes("educonnects.co.in"));
    const { getCookieDomain } = await import("@/lib/auth/session");
    const domain = getCookieDomain(rawHost);

    const pendingCookieOptions: any = {
      httpOnly: true,
      secure: isProd || isEduconnects,
      sameSite: "lax",
      path: "/",
      maxAge: 10 * 60,
    };
    if (domain) {
      pendingCookieOptions.domain = domain;
    }

    response.cookies.set("educonnects_pending_otp", encodeURIComponent(user.email), pendingCookieOptions);
    if (isAdmin) {
      response.cookies.set("admin_pending_otp", encodeURIComponent(user.email), pendingCookieOptions);
    }

    return response;
  } catch (error: any) {
    if (error.name === "ZodError") {
      return apiBadRequest(error.errors[0]?.message || "Invalid login credentials.");
    }
    return apiError(error.message || "Invalid credentials.", 401);
  }
}
