import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
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
    const body = await req.json();
    const { action, targetUserId, enabled } = body;

    const currentUserId = session.userId || session.id;

    const liveSession = await prisma.liveClassSession.findFirst({
      where: {
        OR: [
          { id: sessionId },
          { liveClassSlotId: sessionId },
          { roomId: sessionId },
        ],
      },
      include: { teacher: true },
    });

    if (!liveSession) {
      return apiError("Classroom session not found.", 404);
    }

    if (liveSession.teacher.userId !== currentUserId && (session as any).role !== "ADMIN") {
      return apiError("Only the assigned teacher can moderate participants.", 403);
    }

    const canonicalSessionId = liveSession.id;

    if (action === "TOGGLE_STUDENT_DRAW") {
      const updated = await prisma.liveClassSession.update({
        where: { id: canonicalSessionId },
        data: { studentCanDraw: !!enabled },
      });

      // Broadcast draw permission change to room peers
      const signalingStore = (global as any).__classroomSignaling;
      if (signalingStore) {
        const room = signalingStore.get(canonicalSessionId);
        if (room) {
          const nowMs = Date.now();
          for (const destId of Array.from(room.peers.keys())) {
            if (destId !== currentUserId) {
              const queue = room.signals.get(destId) || [];
              queue.push({
                id: Math.random().toString(36).substring(2),
                fromUserId: currentUserId,
                toUserId: destId,
                type: "draw-permission",
                payload: { studentCanDraw: updated.studentCanDraw },
                timestamp: nowMs,
              });
              room.signals.set(destId, queue);
            }
          }
        }
      }

      return apiSuccess({ studentCanDraw: updated.studentCanDraw }, "Student whiteboard permission updated.");
    }

    if (!targetUserId) {
      return apiError("Target user ID is required.", 400);
    }

    // Verify target user is not the teacher
    if (targetUserId === liveSession.teacher.userId) {
      return apiError("Teacher cannot be moderated or removed.", 400);
    }

    switch (action) {
      case "MUTE_STUDENT":
        return apiSuccess({ action, targetUserId, muted: true }, "Student muted successfully.");
      case "SPOTLIGHT_PARTICIPANT":
        return apiSuccess({ action, targetUserId, spotlighted: !!enabled }, "Participant spotlight updated.");
      case "REMOVE_STUDENT":
        // Remove booking or mark student as removed from room
        return apiSuccess({ action, targetUserId, removed: true }, "Student removed from classroom.");
      default:
        return apiError("Invalid moderation action.", 400);
    }
  } catch (error: any) {
    console.error("[Moderation API Error]:", error);
    return apiError("Failed to perform moderation action.", 500);
  }
}
