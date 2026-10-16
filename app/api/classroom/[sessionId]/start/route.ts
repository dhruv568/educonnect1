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

    const liveSession = await prisma.liveClassSession.findUnique({
      where: { id: sessionId },
      include: {
        teacher: true,
      },
    });

    if (!liveSession) {
      return apiError("Classroom session not found.", 404);
    }

    if (liveSession.teacher.userId !== session.id) {
      return apiError("Only the assigned teacher can start this live class.", 403);
    }

    const isTeacherVerified =
      liveSession.teacher.verificationStatus === "VERIFIED" ||
      liveSession.teacher.verificationStatus === "APPROVED";

    if (!isTeacherVerified) {
      return apiError(
        "Your educator account is pending verification. Teaching, live classes, course publishing, and content publishing will be available after verification.",
        403
      );
    }

    if (liveSession.status === "LIVE") {
      return apiSuccess({ status: "LIVE", actualStartAt: liveSession.actualStartAt }, "Class is already LIVE.");
    }

    if (liveSession.status === "ENDED" || liveSession.status === "CANCELLED") {
      return apiError(`Cannot start class with status ${liveSession.status}.`, 400);
    }

    if (new Date(liveSession.scheduledEndAt).getTime() <= Date.now()) {
      return apiError("Cannot start a live class whose scheduled end time has passed.", 400);
    }

    const now = new Date();
    const updated = await prisma.liveClassSession.update({
      where: { id: sessionId },
      data: {
        status: "LIVE",
        actualStartAt: liveSession.actualStartAt || now,
      },
    });

    return apiSuccess({
      status: updated.status,
      actualStartAt: updated.actualStartAt?.toISOString(),
    }, "Class successfully started!");
  } catch (error: any) {
    console.error("[Start Class Error]:", error);
    return apiError("Failed to start class session.", 500);
  }
}
