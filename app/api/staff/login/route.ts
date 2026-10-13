import { NextRequest } from "next/server";
import { LoginSchema } from "@/schemas/auth-schemas";
import { AuthService } from "@/services/auth-service";
import { apiBadRequest, apiError, apiSuccess } from "@/lib/api-response";
import { setSessionCookie } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { logAuditEvent } from "@/lib/audit-logger";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = LoginSchema.parse(body);
    const normalizedEmail = validatedData.email.toLowerCase().trim();

    // 1. Verify user existence & account type
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: {
        profile: true,
        customRole: true,
      },
    });

    if (!user) {
      await logAuditEvent(null, "STAFF_LOGIN_FAILED", { email: normalizedEmail, reason: "NOT_FOUND" });
      return apiError("Invalid credentials or unauthorized account.", 401);
    }

    if (user.role !== "STAFF" && user.role !== "ADMIN") {
      await logAuditEvent(user.id, "STAFF_LOGIN_DENIED", { email: normalizedEmail, role: user.role });
      return apiError("Access restricted to authorized staff and administrators.", 403);
    }

    // 2. Verify account status
    if (user.status !== "ACTIVE") {
      await logAuditEvent(user.id, "STAFF_LOGIN_BLOCKED_INACTIVE", { email: normalizedEmail, status: user.status });
      return apiError("Your staff account has been deactivated or suspended. Please contact the Super Admin.", 403);
    }

    // 3. If STAFF role, verify custom role is active
    if (user.role === "STAFF" && (!user.customRole || user.customRole.status !== "ACTIVE")) {
      return apiError("Your assigned staff role is currently inactive. Please contact the Super Admin.", 403);
    }

    // 4. Validate credentials
    if (!validatedData.password) {
      return apiError("Password is required for staff login.", 400);
    }
    await AuthService.validateCredentials(normalizedEmail, validatedData.password);

    // 5. If OTP provided, verify and establish session
    if (validatedData.otp) {
      const result = await AuthService.verifyOTP(normalizedEmail, validatedData.otp);

      if (result.user) {
        const sessionPayload = {
          ...result.user,
          role: user.role as any,
          roleId: user.roleId,
          roleName: user.customRole?.name || (user.role === "ADMIN" ? "Super Administrator" : "Staff"),
          status: user.status,
        };
        await setSessionCookie(sessionPayload);
      }

      await logAuditEvent(user.id, "STAFF_LOGIN_SUCCESS", {
        email: user.email,
        role: user.role,
        roleName: user.customRole?.name || user.role,
      });

      return apiSuccess(
        {
          user: {
            id: user.id,
            email: user.email,
            role: user.role,
            roleId: user.roleId,
            roleName: user.customRole?.name || user.role,
            name: `${user.profile?.firstName || ""} ${user.profile?.lastName || ""}`.trim() || user.email,
          },
          redirectPath: "/staff/dashboard",
        },
        "Staff login successful!"
      );
    }

    // 6. Step 1: Credentials valid, dispatch OTP
    const rawHost =
      request.headers.get("x-forwarded-host") ||
      request.headers.get("x-original-host") ||
      request.headers.get("host") ||
      undefined;

    await AuthService.createAndSendVerification(
      user.id,
      user.email,
      user.profile?.firstName || "Staff",
      user.role === "ADMIN",
      user.role,
      rawHost
    );

    await logAuditEvent(user.id, "STAFF_LOGIN_OTP_DISPATCHED", { role: user.role });

    return apiSuccess(
      {
        email: user.email,
        requiresOtp: true,
        requiresVerification: true,
      },
      "Credentials verified. A 6-digit OTP has been dispatched to your registered email."
    );
  } catch (error: any) {
    if (error.name === "ZodError") {
      return apiBadRequest(error.errors[0]?.message || "Invalid credentials.");
    }
    return apiError(error.message || "Authentication failed.", 401);
  }
}
