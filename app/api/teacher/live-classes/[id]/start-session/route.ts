import { NextRequest } from "next/server";
import { LiveClassService } from "@/services/live-class-service";
import { requireVerifiedEducator } from "@/lib/auth/guards";
import { apiSuccess, handleApiError } from "@/lib/api-response";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireVerifiedEducator();
    const { id } = await params;

    const liveSession = await LiveClassService.startOrGetClassroomSession(session.userId, id);

    return apiSuccess({
      message: "Classroom session initialized!",
      sessionId: liveSession.id,
      roomId: liveSession.roomId,
      session: liveSession,
    });
  } catch (error: any) {
    return handleApiError(error);
  }
}
