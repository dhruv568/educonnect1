import { NextRequest } from "next/server";
import { LiveClassService } from "@/services/live-class-service";
import { requireRole, requireVerifiedEducator } from "@/lib/auth/guards";
import { apiSuccess, handleApiError } from "@/lib/api-response";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const session = await requireRole(["TEACHER"]);
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "ALL";

    const [stats, slots] = await Promise.all([
      LiveClassService.getLiveClassStats(session.userId),
      LiveClassService.getTeacherLiveClasses(session.userId, status),
    ]);

    return apiSuccess({ stats, slots });
  } catch (error: any) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireVerifiedEducator();
    const body = await request.json();

    const slot = await LiveClassService.createLiveClass(session.userId, body);

    return apiSuccess({
      message: "Live class slot created successfully!",
      slot,
    }, 201);
  } catch (error: any) {
    return handleApiError(error);
  }
}
