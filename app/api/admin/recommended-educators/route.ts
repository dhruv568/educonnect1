import { NextRequest } from "next/server";
import { requireRole } from "@/lib/auth/guards";
import { apiSuccess, handleApiError } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    await requireRole(["ADMIN", "STAFF"]);

    const config = await prisma.platformConfig.findUnique({
      where: { key: "recommended_educators" },
    });

    let recommendedIds: string[] = [];
    if (config?.value) {
      try {
        recommendedIds = JSON.parse(config.value);
      } catch {
        recommendedIds = [];
      }
    }

    const verifiedTeachers = await prisma.teacherProfile.findMany({
      where: { verificationStatus: "VERIFIED" },
      include: {
        user: { include: { profile: true } },
      },
      orderBy: { rating: "desc" },
    });

    const teachers = verifiedTeachers.map((t) => ({
      id: t.id,
      name: t.user.profile
        ? `${t.user.profile.firstName} ${t.user.profile.lastName}`.trim()
        : t.user.email,
      email: t.user.email,
      subjects: t.subjects ? t.subjects.split(",").map((s) => s.trim()) : [],
      headline: t.headline,
      rating: t.rating,
      hourlyRate: t.hourlyRate || 0,
      avatarUrl: t.user.profile?.avatarUrl || null,
      isRecommended: recommendedIds.includes(t.id),
    }));

    return apiSuccess({
      recommendedIds,
      teachers,
    });
  } catch (error: any) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireRole(["ADMIN", "STAFF"]);
    const body = await request.json();

    let teacherIds: string[] = [];
    if (Array.isArray(body.teacherIds)) {
      teacherIds = body.teacherIds.filter((id: any) => typeof id === "string");
    } else if (typeof body.teacherId === "string") {
      const config = await prisma.platformConfig.findUnique({
        where: { key: "recommended_educators" },
      });
      let currentIds: string[] = [];
      if (config?.value) {
        try {
          currentIds = JSON.parse(config.value);
        } catch {
          currentIds = [];
        }
      }
      if (body.isRecommended) {
        if (!currentIds.includes(body.teacherId)) {
          currentIds.push(body.teacherId);
        }
      } else {
        currentIds = currentIds.filter((id) => id !== body.teacherId);
      }
      teacherIds = currentIds;
    } else {
      return apiSuccess({ message: "Invalid payload" });
    }

    await prisma.platformConfig.upsert({
      where: { key: "recommended_educators" },
      update: { value: JSON.stringify(teacherIds) },
      create: { key: "recommended_educators", value: JSON.stringify(teacherIds) },
    });

    return apiSuccess({
      message: "Recommended educators updated successfully",
      recommendedIds: teacherIds,
    });
  } catch (error: any) {
    return handleApiError(error);
  }
}
