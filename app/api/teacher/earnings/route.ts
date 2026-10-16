import { NextRequest } from "next/server";
import { requireRole } from "@/lib/auth/guards";
import { apiSuccess, handleApiError } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";
import { LedgerService } from "@/services/ledger-service";
import { RouteService } from "@/services/route-service";
import {
  MIN_PAYOUT_RUPEES,
  PLATFORM_FEE_PERCENT,
  NET_PAYOUT_PERCENT,
  PAYOUT_SCHEDULE_DAY_OF_MONTH,
} from "@/lib/withdrawal-config";

export async function GET(_request: NextRequest) {
  try {
    const session = await requireRole(["TEACHER"]);

    const teacherProfile = await prisma.teacherProfile.findUnique({
      where: { userId: session.userId },
    });

    if (!teacherProfile) {
      throw new Error("NOT_FOUND: Teacher profile not found.");
    }

    const summary = await LedgerService.getTeacherEarningsSummary(teacherProfile.id);
    const payoutAccount = await RouteService.getOrCreatePayoutAccount(teacherProfile.id);

    return apiSuccess({
      platformFeePercent: PLATFORM_FEE_PERCENT,
      netPayoutPercent: NET_PAYOUT_PERCENT,
      minPayoutRequirement: MIN_PAYOUT_RUPEES,
      payoutScheduleDayOfMonth: PAYOUT_SCHEDULE_DAY_OF_MONTH,
      payoutScheduleDescription: "10th of every month",
      summary,
      payoutAccount: {
        id: payoutAccount.id,
        providerAccountId: payoutAccount.providerAccountId,
        status: payoutAccount.status,
        kycStatus: payoutAccount.kycStatus,
        routeEnabled: RouteService.isRouteEnabled(),
      },
      payoutDetails: {
        accountHolderName: teacherProfile.accountHolderName,
        accountNumber: teacherProfile.accountNumber,
        bankName: teacherProfile.bankName,
        ifscCode: teacherProfile.ifscCode,
        upiId: teacherProfile.upiId,
      },
    });
  } catch (error: any) {
    return handleApiError(error);
  }
}
