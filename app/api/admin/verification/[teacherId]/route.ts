import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/permissions/permission-engine";
import { apiSuccess, apiError, handleApiError } from "@/lib/api-response";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: { teacherId: string } }
) {
  try {
    await requirePermission("verification.view");

    const targetId = params.teacherId;

    // Search by TeacherProfile ID or User ID
    const tp = await prisma.teacherProfile.findFirst({
      where: {
        OR: [
          { id: targetId },
          { userId: targetId },
        ],
      },
      include: {
        user: {
          include: { profile: true },
        },
        teacherQualifications: { orderBy: { year: "desc" } },
        teacherCertificates: { orderBy: { createdAt: "desc" } },
        teacherDocuments: { where: { status: "ACTIVE" }, orderBy: { uploadedAt: "desc" } },
        verificationHistories: {
          include: {
            admin: {
              include: { profile: true },
            },
          },
          orderBy: { createdAt: "desc" },
        },
        adminNotes: {
          include: {
            admin: {
              include: { profile: true },
            },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!tp) {
      return apiError("Teacher profile record not found", 404);
    }

    return apiSuccess({
      application: {
        teacherProfileId: tp.id,
        userId: tp.userId,
        user: {
          email: tp.user.email,
          emailVerified: tp.user.emailVerified,
          createdAt: tp.user.createdAt,
        },
        profile: {
          firstName: tp.user.profile?.firstName || "",
          lastName: tp.user.profile?.lastName || "",
          avatarUrl: tp.user.profile?.avatarUrl || null,
          phone: tp.contactPhone || tp.user.profile?.phone || null,
          bio: tp.bio || tp.user.profile?.bio || "",
          location: tp.location || "",
        },
        professional: {
          headline: tp.headline || "",
          subjects: tp.subjects ? tp.subjects.split(",").map((s) => s.trim()) : [],
          experienceYears: tp.experienceYears,
          hourlyRate: tp.hourlyRate || 40,
          languages: tp.languages ? tp.languages.split(",").map((s) => s.trim()) : ["English"],
          teachingMode: tp.teachingMode || "ONLINE",
        },
        bankDetails: {
          accountHolderName: tp.accountHolderName || "",
          accountNumber: tp.accountNumber || "",
          bankName: tp.bankName || "",
          ifscCode: tp.ifscCode || "",
          cancelledChequeUrl: tp.cancelledChequeUrl || null,
        },
        verificationStatus: tp.verificationStatus,
        submittedAt: tp.submittedAt,
        verifiedAt: tp.verifiedAt,
        rejectedAt: tp.rejectedAt,
        suspendedAt: tp.suspendedAt,
        rejectionReason: tp.rejectionReason,
        suspensionReason: tp.suspensionReason,
        qualifications: tp.teacherQualifications,
        certificates: tp.teacherCertificates,
        documents: tp.teacherDocuments,
        history: tp.verificationHistories.map((h) => ({
          id: h.id,
          previousStatus: h.previousStatus,
          newStatus: h.newStatus,
          reason: h.reason,
          adminName: h.admin ? `${h.admin.profile?.firstName || ""} ${h.admin.profile?.lastName || ""}`.trim() : "System",
          createdAt: h.createdAt,
        })),
        adminNotes: tp.adminNotes.map((n) => ({
          id: n.id,
          content: n.content,
          adminName: `${n.admin.profile?.firstName || ""} ${n.admin.profile?.lastName || ""}`.trim() || n.admin.email,
          createdAt: n.createdAt,
        })),
      },
    });
  } catch (error: any) {
    return handleApiError(error);
  }
}
