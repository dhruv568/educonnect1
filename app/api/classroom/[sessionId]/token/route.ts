import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { verifyRoomAccess } from "@/lib/classroom/classroom-token";
import { generateLiveKitRoomToken } from "@/lib/classroom/livekit-server";
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
    const accessCheck = await verifyRoomAccess(sessionId, session);

    if (!accessCheck.authorized || !accessCheck.liveSession) {
      return apiError(accessCheck.reason || "Classroom access denied.", 403);
    }

    const liveSession = accessCheck.liveSession;
    const isTeacher = accessCheck.isTeacher || false;
    const currentUserId = session.userId || session.id;
    const userName = `${session.firstName || ""} ${session.lastName || ""}`.trim() || session.email;
    const roomName = `edu-session-${liveSession.id}`;

    const token = await generateLiveKitRoomToken({
      sessionId: liveSession.id,
      roomId: liveSession.roomId,
      userId: currentUserId,
      userName,
      userRole: session.role,
      isTeacher,
    });

    const serverUrl = process.env.LIVEKIT_URL || "wss://demo.livekit.cloud";

    return apiSuccess({
      token,
      serverUrl,
      roomName,
      roomId: liveSession.roomId,
      sessionId: liveSession.id,
      userId: currentUserId,
      userName,
      isTeacher,
      status: liveSession.status,
    });
  } catch (error: any) {
    console.error("[Classroom Token Error]:", error);
    return apiError("Failed to issue classroom token.", 500);
  }
}
