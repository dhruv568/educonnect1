import { NextRequest } from "next/server";
import { requireRole } from "@/lib/auth/guards";
import { apiSuccess, handleApiError } from "@/lib/api-response";
import { PaymentService } from "@/services/payment-service";
import { LiveClassService } from "@/services/live-class-service";

export async function POST(request: NextRequest) {
  try {
    const session = await requireRole(["STUDENT", "LEARNER"]);
    const body = await request.json();

    const {
      type,
      courseId,
      liveClassSlotId,
      teacherId,
      educatorId,
      selectedDate,
      selectedSlotTime,
      offerCode,
      slots,
    } = body;

    // Direct multi-slot booking delegation
    if (slots && Array.isArray(slots) && slots.length > 0 && (teacherId || educatorId)) {
      const result = await LiveClassService.bookEducatorSlots({
        studentUserId: session.userId,
        teacherId: teacherId || educatorId,
        slots,
        offerCode,
      });
      return apiSuccess(result);
    }

    const result = await PaymentService.createPaymentOrder({
      userId: session.userId,
      type,
      courseId,
      liveClassSlotId,
      teacherId: teacherId || educatorId,
      selectedDate,
      selectedSlotTime,
      offerCode,
    });

    return apiSuccess(result);
  } catch (error: any) {
    return handleApiError(error);
  }
}
