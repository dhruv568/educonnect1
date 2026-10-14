export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/guards";
import { apiSuccess, apiError, handleApiError } from "@/lib/api-response";
import { logAuditEvent } from "@/lib/audit-logger";
import { getEmailProvider } from "@/lib/email/email-service";
import { getPublicAppUrl } from "@/lib/app-url";

export async function POST(
  request: NextRequest,
  { params }: { params: { teacherId: string } }
) {
  try {
    const adminSession = await requireRole(["ADMIN"]);
    const body = await request.json().catch(() => ({}));
    const note = body.note || "Teacher account reactivated by administrator";

    const tp = await prisma.teacherProfile.findFirst({
      where: {
        OR: [{ id: params.teacherId }, { userId: params.teacherId }],
      },
      include: { user: { include: { profile: true } } },
    });

    if (!tp) {
      return apiError("Teacher profile record not found", 404);
    }

    const previousStatus = tp.verificationStatus;
    const now = new Date();

    const updated = await prisma.teacherProfile.update({
      where: { id: tp.id },
      data: {
        verificationStatus: "VERIFIED",
        verifiedAt: now,
        suspensionReason: null,
      },
    });

    const adminId = adminSession.userId || adminSession.id;

    await prisma.teacherVerificationHistory.create({
      data: {
        teacherId: tp.id,
        adminId,
        previousStatus,
        newStatus: "VERIFIED",
        reason: note,
      },
    });

    await logAuditEvent(adminId, "TEACHER_REACTIVATED", {
      teacherProfileId: tp.id,
      teacherUserId: tp.userId,
      previousStatus,
    });

    // Send email notification
    try {
      const emailProvider = getEmailProvider();
      await emailProvider.sendNotificationEmail({
        email: tp.user.email,
        recipientName: tp.user.profile?.firstName || "Teacher",
        subject: "Account Reactivated - EduConnects Teacher Portal",
        headline: "Teacher Profile Reactivated 🎉",
        statusBadgeText: "VERIFIED EDUCATOR",
        statusBadgeVariant: "success",
        bodyText: "Your teacher account has been successfully reactivated by EduConnects Administration. Full access to teacher portal tools, live classes, and platform listings has been restored.",
        actionUrl: `${getPublicAppUrl()}/teacher`,
        actionText: "Go to Teacher Portal",
      });
    } catch (emailErr) {
      console.error("Failed to send reactivation email notification:", emailErr);
    }

    return apiSuccess({
      message: "Teacher account reactivated successfully",
      verificationStatus: updated.verificationStatus,
    });
  } catch (error: any) {
    return handleApiError(error);
  }
}
