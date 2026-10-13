import { NextRequest } from "next/server";
import { apiBadRequest, apiError, apiSuccess } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";
import { generateOTP, hashToken } from "@/lib/auth/tokens";
import { EmailService } from "@/lib/email/email-service";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email } = body;

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return apiBadRequest("A valid email address is required.");
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Verify there is an active PENDING staff invitation for this email
    const invitation = await prisma.staffInvitation.findFirst({
      where: {
        email: normalizedEmail,
        status: "PENDING",
      },
      include: {
        role: true,
      },
    });

    if (!invitation) {
      return apiError(
        "No active staff invitation was found for this email address. Please contact your platform administrator.",
        404
      );
    }

    if (invitation.expiresAt && new Date() > invitation.expiresAt) {
      return apiError(
        "This staff invitation has expired. Please contact your platform administrator to request a new invitation.",
        410
      );
    }

    // Check if user is already an active staff/admin
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser && (existingUser.role === "STAFF" || existingUser.role === "ADMIN")) {
      return apiBadRequest("An active staff account with this email already exists. Please log in directly.");
    }

    // Generate 6-digit OTP
    const otp = generateOTP();
    const codeHash = hashToken(otp);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    const firstName = invitation.fullName?.split(" ")[0] || "Staff";
    const lastName = invitation.fullName?.split(" ").slice(1).join(" ") || "Member";

    await prisma.pendingRegistration.upsert({
      where: { email: normalizedEmail },
      create: {
        email: normalizedEmail,
        passwordHash: "pending_password_setup",
        role: "STAFF",
        firstName,
        lastName,
        codeHash,
        tokenHash: codeHash,
        expiresAt,
        attempts: 0,
      },
      update: {
        role: "STAFF",
        firstName,
        lastName,
        codeHash,
        tokenHash: codeHash,
        expiresAt,
        attempts: 0,
      },
    });

    await EmailService.sendVerificationOTP({
      email: normalizedEmail,
      userName: firstName,
      otp,
      expiresInMinutes: 10,
      role: "STAFF",
    });

    return apiSuccess(
      {
        email: normalizedEmail,
        roleName: invitation.role.name,
        fullName: invitation.fullName,
        requiresOtp: true,
      },
      "Verification code dispatched to your email."
    );
  } catch (error: any) {
    return apiError(error.message || "Failed to process staff registration request.", 500);
  }
}
