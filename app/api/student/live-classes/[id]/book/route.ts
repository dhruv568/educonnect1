import { NextRequest } from "next/server";
import { requireRole } from "@/lib/auth/guards";
import { apiSuccess, handleApiError } from "@/lib/api-response";
import { PaymentService } from "@/services/payment-service";

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await requireRole(["STUDENT", "LEARNER"]);

    const result = await PaymentService.createPaymentOrder({
      userId: session.userId,
      type: "LIVE_CLASS_BOOKING",
      liveClassSlotId: params.id,
    });

    return apiSuccess({
      message: result.isFree
        ? "Live class booked successfully!"
        : "Payment order initialized for live class booking.",
      ...result,
    });
  } catch (error: any) {
    return handleApiError(error);
  }
}
