import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { closeLiveKitRoom } from "@/lib/classroom/livekit-server";
import { apiError, apiSuccess } from "@/lib/api-response";

export async function POST(
  req: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const session = await getSession();
    if (!session) {
      return apiError("Authentication required.", 401);
    }

    const { sessionId } = params;
    const currentUserId = session.userId || session.id;

    // 1. Resolve session supporting session ID, slot ID, or room ID
    const liveSession = await prisma.liveClassSession.findFirst({
      where: {
        OR: [
          { id: sessionId },
          { liveClassSlotId: sessionId },
          { roomId: sessionId },
        ],
      },
      include: {
        teacher: true,
        liveClassSlot: {
          include: {
            bookings: true,
          },
        },
      },
    });

    if (!liveSession) {
      return apiError("Classroom session not found.", 404);
    }

    // Authorization check
    if (liveSession.teacher.userId !== currentUserId && (session as any).role !== "ADMIN") {
      return apiError("Only the assigned teacher can end this live class.", 403);
    }

    const canonicalSessionId = liveSession.id;
    const now = new Date();
    const startAt = liveSession.actualStartAt || liveSession.scheduledStartAt;
    const durationMs = Math.max(0, now.getTime() - startAt.getTime());
    const durationMinutes = Math.max(1, Math.round(durationMs / (1000 * 60)));

    // 2. Idempotent check: if already ended, calculate stats and return without failure
    let updatedSession = liveSession;
    if (liveSession.status !== "ENDED") {
      updatedSession = await prisma.liveClassSession.update({
        where: { id: canonicalSessionId },
        data: {
          status: "ENDED",
          actualEndAt: now,
          durationMinutes,
        },
        include: {
          teacher: true,
          liveClassSlot: {
            include: {
              bookings: true,
            },
          },
        },
      });

      // 3. Finalize attendance for booked students
      const bookings = liveSession.liveClassSlot.bookings;
      const requiredDurationSeconds = Math.max(60, durationMinutes * 60 * 0.75); // 75% threshold for PRESENT

      for (const booking of bookings) {
        const attendance = await prisma.classAttendance.findFirst({
          where: {
            sessionId: canonicalSessionId,
            studentId: booking.studentId,
          },
        });

        if (!attendance) {
          // Student never joined -> ABSENT
          await prisma.classAttendance.create({
            data: {
              sessionId: canonicalSessionId,
              studentId: booking.studentId,
              status: "ABSENT",
              duration: 0,
            },
          });
        } else {
          const studentDuration = attendance.duration || 0;
          let finalStatus = "ABSENT";
          if (studentDuration >= requiredDurationSeconds) {
            finalStatus = "PRESENT";
          } else if (studentDuration > 0) {
            finalStatus = "PARTIAL";
          }

          await prisma.classAttendance.update({
            where: { id: attendance.id },
            data: {
              status: finalStatus,
              leftAt: attendance.leftAt || now,
            },
          });
        }
      }

      // Synchronize liveClassSlot status to COMPLETED
      if (liveSession.liveClassSlotId) {
        await prisma.liveClassSlot.update({
          where: { id: liveSession.liveClassSlotId },
          data: { status: "COMPLETED" },
        }).catch(() => {});
      }
    }

    // 4. Broadcast reliable class-ended signal to all connected peers in signaling room
    const signalingStore = (global as any).__classroomSignaling;
    if (signalingStore) {
      const room = signalingStore.get(canonicalSessionId);
      if (room) {
        const nowMs = Date.now();
        (room as any).isEnded = true;
        (room as any).endedAt = nowMs;

        for (const destId of Array.from(room.peers.keys())) {
          const queue = room.signals.get(destId) || [];
          queue.push({
            id: Math.random().toString(36).substring(2),
            fromUserId: currentUserId,
            toUserId: destId,
            type: "class-ended",
            payload: {
              sessionId: canonicalSessionId,
              endedBy: currentUserId,
              endedAt: now.toISOString(),
              message: "The educator has ended this live class.",
            },
            timestamp: nowMs,
          });
          room.signals.set(destId, queue);
        }
      }
    }

    // 4b. Terminate LiveKit room if server credentials are configured
    await closeLiveKitRoom(canonicalSessionId).catch(() => {});

    // 5. Fetch summary stats
    const allAttendances = await prisma.classAttendance.findMany({
      where: { sessionId: canonicalSessionId },
      include: {
        student: {
          include: { profile: true },
        },
      },
    });

    const presentCount = allAttendances.filter((a) => a.status === "PRESENT").length;
    const partialCount = allAttendances.filter((a) => a.status === "PARTIAL").length;
    const absentCount = allAttendances.filter((a) => a.status === "ABSENT").length;

    return apiSuccess({
      status: "ENDED",
      actualStartAt: updatedSession.actualStartAt?.toISOString() || startAt.toISOString(),
      actualEndAt: updatedSession.actualEndAt?.toISOString() || now.toISOString(),
      durationMinutes: updatedSession.durationMinutes || durationMinutes,
      stats: {
        totalBooked: liveSession.liveClassSlot.bookings.length,
        present: presentCount,
        partial: partialCount,
        absent: absentCount,
      },
      attendances: allAttendances.map((a) => ({
        id: a.id,
        studentId: a.studentId,
        studentName: `${a.student.profile?.firstName || ""} ${a.student.profile?.lastName || ""}`.trim() || a.student.email,
        durationMinutes: Math.round(a.duration / 60),
        status: a.status,
      })),
    }, "Class ended successfully.");
  } catch (error: any) {
    console.error("[End Class Error]:", error);
    return apiError("Failed to end class session.", 500);
  }
}
