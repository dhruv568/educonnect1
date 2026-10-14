export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/guards";
import { apiSuccess, apiError, handleApiError } from "@/lib/api-response";

export async function POST(
  request: NextRequest,
  { params }: { params: { teacherId: string } }
) {
  try {
    const adminSession = await requireRole(["ADMIN"]);
    const body = await request.json();
    const content = body.content;

    if (!content || content.trim().length === 0) {
      return apiError("Admin note content cannot be empty", 400);
    }

    const tp = await prisma.teacherProfile.findFirst({
      where: {
        OR: [{ id: params.teacherId }, { userId: params.teacherId }],
      },
    });

    if (!tp) {
      return apiError("Teacher profile record not found", 404);
    }

    const note = await prisma.adminNote.create({
      data: {
        teacherId: tp.id,
        adminId: adminSession.userId || adminSession.id,
        content: content.trim(),
      },
      include: {
        admin: {
          include: { profile: true },
        },
      },
    });

    return apiSuccess(
      {
        note: {
          id: note.id,
          content: note.content,
          adminName: `${note.admin.profile?.firstName || ""} ${note.admin.profile?.lastName || ""}`.trim() || note.admin.email,
          createdAt: note.createdAt,
        },
      },
      "Admin note added successfully",
      201
    );
  } catch (error: any) {
    return handleApiError(error);
  }
}
