import { NextRequest } from "next/server";
import { LiveClassService } from "@/services/live-class-service";
import { apiSuccess, handleApiError } from "@/lib/api-response";
import { getSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const teacherId = params.id;
    const { searchParams } = new URL(request.url);
    const daysAhead = parseInt(searchParams.get("days") || "14", 10);
    const startDate = searchParams.get("startDate") || undefined;
    const endDate = searchParams.get("endDate") || undefined;

    let studentUserId: string | undefined;
    try {
      const session = await getSession(request);
      if (session?.userId) {
        studentUserId = session.userId;
      }
    } catch {}

    const data = await LiveClassService.getPublicEducatorAvailability(
      teacherId,
      daysAhead,
      studentUserId,
      startDate,
      endDate
    );
    return apiSuccess(data);
  } catch (error: any) {
    return handleApiError(error);
  }
}
