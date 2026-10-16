import { NextRequest } from "next/server";
import { requireRole } from "@/lib/auth/guards";
import { apiSuccess, handleApiError } from "@/lib/api-response";
import { LiveClassService } from "@/services/live-class-service";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireRole(["STUDENT", "LEARNER"]);
    const body = await request.json();

    const { slots, offerCode } = body;
    if (!slots || !Array.isArray(slots) || slots.length === 0) {
      throw new Error("BAD_REQUEST: At least one slot must be selected.");
    }

    const result = await LiveClassService.bookEducatorSlots({
      studentUserId: session.userId,
      teacherId: params.id,
      slots,
      offerCode,
    });

    return apiSuccess(result);
  } catch (error: any) {
    return handleApiError(error);
  }
}
