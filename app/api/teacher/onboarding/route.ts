import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/guards";
import { apiSuccess, apiError } from "@/lib/api-response";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const session = await requireRole(["TEACHER"]);

    const user = await prisma.user.findUnique({
      where: { id: session.id },
      include: {
        profile: true,
        teacherProfile: {
          include: {
            teacherQualifications: { orderBy: { year: "desc" } },
            teacherCertificates: { orderBy: { createdAt: "desc" } },
            teacherDocuments: { where: { status: "ACTIVE" }, orderBy: { uploadedAt: "desc" } },
            verificationHistories: { orderBy: { createdAt: "desc" } },
          },
        },
      },
    });

    if (!user || !user.teacherProfile) {
      return apiError("Teacher profile not found", 404);
    }

    const tp = user.teacherProfile;
    const p = user.profile;

    // Calculate Verification Readiness Checklist
    const missingItems: string[] = [];

    if (!p?.firstName || !p?.lastName) {
      missingItems.push("Full Name in Personal Profile");
    }
    if (!tp.bio && !p?.bio) {
      missingItems.push("Teacher Biography");
    }
    if (!tp.subjects || tp.subjects.trim().length === 0) {
      missingItems.push("Teaching Subjects");
    }
    if (!tp.teachingMode) {
      missingItems.push("Preferred Teaching Mode");
    }
    if (tp.teacherQualifications.length === 0) {
      missingItems.push("At least one Educational Qualification");
    }

    const hasIdentityDoc = tp.teacherDocuments.some((d) => d.category === "IDENTITY");
    if (!hasIdentityDoc) {
      missingItems.push("Identity Document (Passport, Driving License, or National ID)");
    }

    if (!tp.accountHolderName || !tp.accountNumber || !tp.bankName || !tp.ifscCode) {
      missingItems.push("Bank Account Details (Account Holder Name, Account Number, Bank Name, IFSC Code)");
    }

    const hasCancelledCheque = !!tp.cancelledChequeUrl || tp.teacherDocuments.some((d) => d.category === "CANCELLED_CHEQUE");
    if (!hasCancelledCheque) {
      missingItems.push("Cancelled Cheque Document (JPG, PNG, or PDF <= 10MB)");
    }

    const totalChecklistItems = 8;
    const completedItems = totalChecklistItems - missingItems.length;
    const completionPercentage = Math.round((completedItems / totalChecklistItems) * 100);
    const isReady = missingItems.length === 0;

    return apiSuccess({
      user: {
        id: user.id,
        email: user.email,
        emailVerified: user.emailVerified,
        role: user.role,
      },
      profile: {
        firstName: p?.firstName || "",
        lastName: p?.lastName || "",
        avatarUrl: p?.avatarUrl || null,
        phone: p?.phone || tp.contactPhone || null,
        bio: tp.bio || p?.bio || "",
        location: tp.location || "",
      },
      teacherProfile: {
        id: tp.id,
        headline: tp.headline || "",
        subjects: tp.subjects ? tp.subjects.split(",").map((s) => s.trim()) : [],
        experienceYears: tp.experienceYears,
        hourlyRate: tp.hourlyRate || 40,
        languages: tp.languages ? tp.languages.split(",").map((s) => s.trim()) : ["English"],
        teachingMode: tp.teachingMode || "ONLINE",
        accountHolderName: tp.accountHolderName || "",
        accountNumber: tp.accountNumber || "",
        bankName: tp.bankName || "",
        ifscCode: tp.ifscCode || "",
        cancelledChequeUrl: tp.cancelledChequeUrl || null,
        verificationStatus: tp.verificationStatus,
        submittedAt: tp.submittedAt,
        verifiedAt: tp.verifiedAt,
        rejectedAt: tp.rejectedAt,
        suspendedAt: tp.suspendedAt,
        rejectionReason: tp.rejectionReason,
        suspensionReason: tp.suspensionReason,
      },
      qualifications: tp.teacherQualifications,
      certificates: tp.teacherCertificates,
      documents: tp.teacherDocuments,
      readiness: {
        isReady,
        completionPercentage,
        missingItems,
      },
    });
  } catch (error: any) {
    return apiError(error.message || "Failed to fetch onboarding data", error.message?.includes("UNAUTHORIZED") ? 401 : 500);
  }
}
