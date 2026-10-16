import { NextRequest } from "next/server";
import { requireRole } from "@/lib/auth/guards";
import { apiSuccess, handleApiError } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";
import { PayoutService } from "@/services/payout-service";
import {
  PLATFORM_FEE_PERCENT,
  NET_PAYOUT_PERCENT,
  MIN_PAYOUT_RUPEES,
  PAYOUT_SCHEDULE_DAY_OF_MONTH,
} from "@/lib/withdrawal-config";

/**
 * GET /api/admin/payments/payouts/monthly
 *
 * Previews upcoming monthly payout cycle for all verified educators:
 * - Gross eligible earnings
 * - Platform fee (25%)
 * - Net payout amount (75%)
 * - Eligibility status (>= ₹2,500)
 * - Bank verification status
 */
export async function GET(request: NextRequest) {
  try {
    await requireRole(["ADMIN"]);

    const now = new Date();
    const cycle = PayoutService.getPayoutCycleId(now);
    const nextDate = PayoutService.getNextScheduledPayoutDate(now);

    const verifiedEducators = await prisma.teacherProfile.findMany({
      where: { verificationStatus: "VERIFIED" },
      include: {
        user: { include: { profile: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const previews = [];
    let totalGrossPaise = 0;
    let totalFeePaise = 0;
    let totalNetPaise = 0;
    let eligibleCount = 0;
    let carryForwardCount = 0;

    for (const educator of verifiedEducators) {
      const calc = await PayoutService.calculateEligiblePayout(educator.id);
      const educatorName = educator.accountHolderName ||
        `${educator.user.profile?.firstName || ""} ${educator.user.profile?.lastName || ""}`.trim() ||
        "Educator";

      if (calc.isEligibleForPayout && calc.hasVerifiedBankDetails) {
        eligibleCount++;
        totalGrossPaise += calc.unsettledGrossPaise;
        totalFeePaise += calc.currentFeePaise;
        totalNetPaise += calc.netEligibleBalancePaise;
      } else if (calc.unsettledGrossPaise > 0) {
        carryForwardCount++;
      }

      previews.push({
        teacherId: educator.id,
        educatorName,
        email: educator.user.email,
        phone: educator.user.profile?.phone,
        unsettledGrossRupees: calc.unsettledGrossRupees,
        platformFeeRupees: calc.currentFeeRupees,
        netEligibleBalance: calc.netEligibleBalance,
        isEligible: calc.isEligibleForPayout,
        hasVerifiedBank: calc.hasVerifiedBankDetails,
        bankDetails: calc.bankDetails,
        lastPayout: calc.lastPayout,
      });
    }

    return apiSuccess({
      cycle,
      nextScheduledPayoutDate: nextDate,
      payoutScheduleDescription: `Scheduled for the ${PAYOUT_SCHEDULE_DAY_OF_MONTH}th of every month`,
      platformFeePercent: PLATFORM_FEE_PERCENT,
      netPayoutPercent: NET_PAYOUT_PERCENT,
      minPayoutRequirementRupees: MIN_PAYOUT_RUPEES,
      stats: {
        totalVerifiedEducators: verifiedEducators.length,
        eligibleForPayoutCount: eligibleCount,
        carryForwardCount,
        totalGrossRupees: totalGrossPaise / 100,
        totalPlatformFeeRupees: totalFeePaise / 100,
        totalNetPayoutRupees: totalNetPaise / 100,
      },
      educators: previews,
    });
  } catch (error: any) {
    return handleApiError(error);
  }
}

/**
 * POST /api/admin/payments/payouts/monthly
 *
 * Admin trigger to run the automated monthly payout job.
 */
export async function POST(request: NextRequest) {
  try {
    await requireRole(["ADMIN"]);
    const body = await request.json().catch(() => ({}));
    const dryRun = Boolean(body.dryRun);
    const teacherId = body.teacherId;

    const result = await PayoutService.processMonthlyPayouts({
      dryRun,
      teacherId,
    });

    return apiSuccess({
      message: dryRun
        ? "Monthly payout preview completed."
        : "Monthly payout job executed successfully.",
      result,
    });
  } catch (error: any) {
    return handleApiError(error);
  }
}
