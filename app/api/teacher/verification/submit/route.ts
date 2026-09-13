export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/guards";
import { apiSuccess, apiError, handleApiError } from "@/lib/api-response";
import { logAuditEvent } from "@/lib/audit-logger";
import { getEmailProvider } from "@/lib/email/email-service";
import { getPublicAppUrl } from "@/lib/app-url";

export async function POST(request: NextRequest) {
  try {
    const session = await requireRole(["TEACHER"]);

    const user = await prisma.user.findUnique({
      where: { id: session.id },
      include: {
        profile: true,
        teacherProfile: {
          include: {
            teacherQualifications: true,
            teacherDocuments: { where: { status: "ACTIVE" } },
          },
        },
      },
    });

    if (!user || !user.teacherProfile) {
      return apiError("Teacher profile not found", 404);
    }

    const tp = user.teacherProfile;
    const p = user.profile;

    let body: any = {};
    try {
      body = await request.json();
    } catch (_) {}

    const accountHolderName = body.accountHolderName ?? tp.accountHolderName;
    const accountNumber = body.accountNumber ?? tp.accountNumber;
    const bankName = body.bankName ?? tp.bankName;
    const ifscCode = (body.ifscCode ?? tp.ifscCode)?.toString()?.toUpperCase()?.trim();
    const cancelledChequeUrl = body.cancelledChequeUrl ?? tp.cancelledChequeUrl;

    // Check email verification status rule
    if (!user.emailVerified) {
      return apiError("Email verification required before submitting teacher application", 400);
    }

    // Readiness Checklist Check
    const missingItems: string[] = [];
    if (!p?.firstName || !p?.lastName) missingItems.push("Full Name");
    if (!tp.bio && !p?.bio) missingItems.push("Teacher Biography");
    if (!tp.subjects || tp.subjects.trim().length === 0) missingItems.push("Teaching Subjects");
    if (!tp.teachingMode) missingItems.push("Preferred Teaching Mode");
    if (tp.teacherQualifications.length === 0) missingItems.push("At least 1 Qualification");

    const hasIdentityDoc = tp.teacherDocuments.some((d) => d.category === "IDENTITY");
    if (!hasIdentityDoc) missingItems.push("Identity Document");

    if (!accountHolderName || !accountNumber || !bankName || !ifscCode) {
      missingItems.push("Complete Bank Account Details (Account Name, Account Number, Bank Name, IFSC)");
    }

    const hasCancelledCheque = !!cancelledChequeUrl || tp.teacherDocuments.some((d) => d.category === "CANCELLED_CHEQUE");
    if (!hasCancelledCheque) {
      missingItems.push("Cancelled Cheque Document (JPG, PNG, or PDF <= 10MB)");
    }

    if (missingItems.length > 0) {
      return apiError(
        `Profile incomplete. Please complete missing items before submitting: ${missingItems.join(", ")}`,
        400
      );
    }

    const previousStatus = tp.verificationStatus;
    const now = new Date();

    // Transition state to PENDING
    const updatedTp = await prisma.teacherProfile.update({
      where: { id: tp.id },
      data: {
        verificationStatus: "PENDING",
        submittedAt: now,
        ...(accountHolderName && { accountHolderName }),
        ...(accountNumber && { accountNumber }),
        ...(bankName && { bankName }),
        ...(ifscCode && { ifscCode }),
        ...(cancelledChequeUrl && { cancelledChequeUrl }),
      },
    });

    // Record verification audit history
    await prisma.teacherVerificationHistory.create({
      data: {
        teacherId: tp.id,
        previousStatus: previousStatus,
        newStatus: "PENDING",
        reason: "Application submitted by teacher for administrative verification review",
      },
    });

    await logAuditEvent(session.id, "TEACHER_VERIFICATION_SUBMITTED", {
      teacherProfileId: tp.id,
      submittedAt: now,
    });

    // Send email notification
    try {
      const emailProvider = getEmailProvider();
      await emailProvider.sendNotificationEmail({
        email: user.email,
        recipientName: `${p?.firstName || "Teacher"}`,
        subject: "Application Submitted for Teacher Verification - EduConnects",
        headline: "Application Under Review 🎓",
        statusBadgeText: "PENDING REVIEW",
        statusBadgeVariant: "pending",
        bodyText: "Your teacher profile and uploaded credentials have been successfully submitted to EduConnects Administration. Our verification team will review your application shortly.",
        actionUrl: `${getPublicAppUrl()}/teacher/verification`,
        actionText: "View Verification Status",
      });
    } catch (emailErr) {
      console.error("Failed to send verification submission email notification:", emailErr);
    }

    const confirmationMessage =
      "Thank You for applying. We shall verify your documents, and if they meet our policy requirements, the next round will proceed. You will be informed through our official email, WhatsApp, or via call.";

    return apiSuccess({
      message: confirmationMessage,
      confirmationMessage,
      verificationStatus: updatedTp.verificationStatus,
      submittedAt: updatedTp.submittedAt,
    });
  } catch (error: any) {
    return handleApiError(error);
  }
}
