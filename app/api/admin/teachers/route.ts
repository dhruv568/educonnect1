import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/permissions/permission-engine";
import { apiSuccess, apiError, handleApiError } from "@/lib/api-response";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    await requirePermission("teachers.view");

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status");
    const emailVerified = searchParams.get("emailVerified");
    const teachingMode = searchParams.get("teachingMode");
    const page = Math.max(1, Number(searchParams.get("page") || 1));
    const limit = Math.max(1, Number(searchParams.get("limit") || 10));
    const skip = (page - 1) * limit;

    const whereCondition: any = {};

    if (status && status !== "ALL") {
      whereCondition.verificationStatus = status;
    }

    if (teachingMode && teachingMode !== "ALL") {
      whereCondition.teachingMode = teachingMode;
    }

    if (emailVerified !== null && emailVerified !== undefined && emailVerified !== "ALL") {
      whereCondition.user = {
        emailVerified: emailVerified === "true",
      };
    }

    if (search.trim()) {
      const q = search.trim();
      whereCondition.OR = [
        { subjects: { contains: q, mode: "insensitive" } },
        { headline: { contains: q, mode: "insensitive" } },
        { user: { email: { contains: q, mode: "insensitive" } } },
        { user: { profile: { firstName: { contains: q, mode: "insensitive" } } } },
        { user: { profile: { lastName: { contains: q, mode: "insensitive" } } } },
      ];
    }

    const [teachers, totalCount] = await Promise.all([
      prisma.teacherProfile.findMany({
        where: whereCondition,
        include: {
          user: {
            include: { profile: true },
          },
          teacherQualifications: true,
          teacherDocuments: { select: { id: true, category: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.teacherProfile.count({ where: whereCondition }),
    ]);

    const formattedTeachers = teachers.map((tp) => ({
      id: tp.id,
      userId: tp.userId,
      name: `${tp.user.profile?.firstName || ""} ${tp.user.profile?.lastName || ""}`.trim() || tp.user.email,
      email: tp.user.email,
      emailVerified: tp.user.emailVerified,
      avatarUrl: tp.user.profile?.avatarUrl || null,
      headline: tp.headline || "Educator",
      subjects: tp.subjects ? tp.subjects.split(",").map((s) => s.trim()) : [],
      experienceYears: tp.experienceYears,
      hourlyRate: tp.hourlyRate,
      teachingMode: tp.teachingMode || "ONLINE",
      verificationStatus: tp.verificationStatus,
      submittedAt: tp.submittedAt,
      verifiedAt: tp.verifiedAt,
      documentCount: tp.teacherDocuments.length,
      qualificationCount: tp.teacherQualifications.length,
      createdAt: tp.createdAt,
    }));

    return apiSuccess({
      teachers: formattedTeachers,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error: any) {
    return handleApiError(error);
  }
}
