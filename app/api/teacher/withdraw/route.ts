import { NextRequest } from "next/server";
import { requireRole } from "@/lib/auth/guards";
import { apiSuccess, apiBadRequest, handleApiError } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";
import { PayoutService } from "@/services/payout-service";

/**
 * POST /api/teacher/withdraw
 *
 * Manual withdrawals are disabled. Payouts are processed automatically
 * on the 10th of every month.
 */
export async function POST(_request: NextRequest) {
  return apiBadRequest(
    "MANUAL_WITHDRAWALS_DISABLED: Manual withdrawals are disabled. Educator payouts are processed automatically on the 10th of every month according to the monthly payout schedule."
  );
}

/**
 * GET /api/teacher/withdraw
 *
 * Returns educator's payout history with gross, 25% platform fee, net payout, and status.
 */
export async function GET(_request: NextRequest) {
  try {
    const session = await requireRole(["TEACHER"]);

    const teacher = await prisma.teacherProfile.findUnique({
      where: { userId: session.userId || session.id },
    });

    if (!teacher) {
      return apiBadRequest("Educator profile not found.");
    }

    const withdrawals = await PayoutService.getTeacherPayoutHistory(teacher.id);

    return apiSuccess({
      withdrawals,
    });
  } catch (error: any) {
    return handleApiError(error);
  }
}
