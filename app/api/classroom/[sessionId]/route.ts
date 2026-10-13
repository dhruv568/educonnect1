import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { verifyRoomAccess } from "@/lib/classroom/classroom-token";
import { apiError, apiSuccess } from "@/lib/api-response";

export async function GET(
  req: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const session = await getSession();
    if (!session) {
      return apiError("Authentication required.", 401);
    }

    const { sessionId } = params;
    const accessCheck = await verifyRoomAccess(sessionId, session);

    if (!accessCheck.authorized || !accessCheck.liveSession) {
      if (accessCheck.liveSession) {
        const liveSession = accessCheck.liveSession;
        const teacherName = `${liveSession.teacher?.user?.profile?.firstName || ""} ${liveSession.teacher?.user?.profile?.lastName || ""}`.trim() || "Teacher";
        const teacherAvatarUrl = liveSession.teacher?.user?.profile?.avatarUrl || undefined;

        return NextResponse.json({
          success: false,
          error: accessCheck.reason || "Classroom access denied.",
          data: {
            authorized: false,
            reason: accessCheck.reason,
            requiresBooking: Boolean(
              accessCheck.reason?.includes("booking") ||
              accessCheck.reason?.includes("book")
            ),
            sessionDetails: {
              id: liveSession.id,
              liveClassSlotId: liveSession.liveClassSlotId,
              teacherId: liveSession.teacherId,
              roomId: liveSession.roomId,
              status: liveSession.status,
              scheduledStartAt: liveSession.scheduledStartAt.toISOString(),
              scheduledEndAt: liveSession.scheduledEndAt.toISOString(),
              actualStartAt: liveSession.actualStartAt?.toISOString() || null,
              actualEndAt: liveSession.actualEndAt?.toISOString() || null,
              durationMinutes: liveSession.durationMinutes || null,
              title: liveSession.liveClassSlot?.title || "Live Classroom",
              subject: liveSession.liveClassSlot?.subject || "Live Session",
              description: liveSession.liveClassSlot?.description || undefined,
              teacherName,
              teacherAvatarUrl,
              price: liveSession.liveClassSlot?.price ?? 0,
              maxCapacity: liveSession.liveClassSlot?.maxCapacity ?? 10,
              classType: liveSession.liveClassSlot?.classType || "GROUP",
            },
          },
        }, { status: 403 });
      }
      return apiError(accessCheck.reason || "Classroom session not found.", 404);
    }

    const liveSession = accessCheck.liveSession;
    const isTeacher = accessCheck.isTeacher || false;
    const isTeacherVerified =
      liveSession.teacher.verificationStatus === "VERIFIED" ||
      liveSession.teacher.verificationStatus === "APPROVED";

    const teacherName = `${liveSession.teacher.user.profile?.firstName || ""} ${liveSession.teacher.user.profile?.lastName || ""}`.trim() || "Teacher";
    const teacherAvatarUrl = liveSession.teacher.user.profile?.avatarUrl || undefined;

    return apiSuccess({
      sessionDetails: {
        id: liveSession.id,
        liveClassSlotId: liveSession.liveClassSlotId,
        teacherId: liveSession.teacherId,
        roomId: liveSession.roomId,
        status: liveSession.status,
        scheduledStartAt: liveSession.scheduledStartAt.toISOString(),
        scheduledEndAt: liveSession.scheduledEndAt.toISOString(),
        actualStartAt: liveSession.actualStartAt?.toISOString() || null,
        actualEndAt: liveSession.actualEndAt?.toISOString() || null,
        durationMinutes: liveSession.durationMinutes || null,
        studentCanDraw: liveSession.studentCanDraw,
        title: liveSession.liveClassSlot.title,
        subject: liveSession.liveClassSlot.subject,
        description: liveSession.liveClassSlot.description || undefined,
        teacherName,
        teacherAvatarUrl,
        price: liveSession.liveClassSlot.price,
        maxCapacity: liveSession.liveClassSlot.maxCapacity,
      },
      userPermissions: {
        isTeacher,
        canStartClass: isTeacher && isTeacherVerified && (liveSession.status === "SCHEDULED" || liveSession.status === "OPEN"),
        canEndClass: isTeacher && isTeacherVerified && (liveSession.status === "LIVE" || liveSession.status === "OPEN"),
        canShareScreen: isTeacher,
        canDrawWhiteboard: isTeacher || liveSession.studentCanDraw,
        canModerate: isTeacher,
      },
      authorized: accessCheck.authorized,
      reason: accessCheck.reason,
    });
  } catch (error: any) {
    console.error("[Classroom Details Error]:", error);
    return apiError("Failed to fetch classroom session details.", 500);
  }
}
