import { prisma } from "@/lib/prisma";
import { DEFAULT_CURRENCY } from "@/lib/currency";

export class LedgerService {
  /**
   * Get default system platform commission percentage (defaults to 10%)
   */
  static async getDefaultCommissionPercent(): Promise<number> {
    try {
      const config = await prisma.platformConfig.findUnique({
        where: { key: "DEFAULT_COMMISSION_PERCENT" },
      });
      if (config && config.value) {
        const val = parseFloat(config.value);
        if (!isNaN(val) && val >= 0 && val <= 100) return val;
      }
    } catch {
      // Fallback if table not ready
    }
    return 10.0; // 10% default
  }

  /**
   * Update default system platform commission percentage
   */
  static async updateDefaultCommissionPercent(percent: number): Promise<number> {
    if (isNaN(percent) || percent < 0 || percent > 100) {
      throw new Error("INVALID_INPUT: Commission percent must be between 0 and 100.");
    }
    await prisma.platformConfig.upsert({
      where: { key: "DEFAULT_COMMISSION_PERCENT" },
      update: { value: percent.toString() },
      create: { key: "DEFAULT_COMMISSION_PERCENT", value: percent.toString() },
    });
    return percent;
  }

  /**
   * Record double-entry financial ledger movements upon payment capture
   */
  static async recordCapturedPaymentLedger(params: {
    transactionId: string;
    teacherId: string;
    grossAmountPaise: number;
    currency?: string;
    description?: string;
  }) {
    const currency = params.currency || DEFAULT_CURRENCY;
    const commissionPercent = await this.getDefaultCommissionPercent();

    const commissionPaise = Math.round((params.grossAmountPaise * commissionPercent) / 100);
    const teacherSharePaise = params.grossAmountPaise - commissionPaise;

    // Create 3 ledger entries inside a Prisma transaction for auditability
    const [grossEntry, commissionEntry, teacherEntry] = await prisma.$transaction([
      prisma.financialLedgerEntry.create({
        data: {
          transactionId: params.transactionId,
          teacherId: params.teacherId,
          type: "PAYMENT",
          amountPaise: params.grossAmountPaise,
          currency,
          direction: "CREDIT",
          status: "COMPLETED",
          description: params.description || `Customer payment captured`,
        },
      }),
      prisma.financialLedgerEntry.create({
        data: {
          transactionId: params.transactionId,
          teacherId: params.teacherId,
          type: "PLATFORM_COMMISSION",
          amountPaise: commissionPaise,
          currency,
          direction: "CREDIT",
          status: "COMPLETED",
          description: `Platform commission (${commissionPercent}%)`,
        },
      }),
      prisma.financialLedgerEntry.create({
        data: {
          transactionId: params.transactionId,
          teacherId: params.teacherId,
          type: "TEACHER_EARNING",
          amountPaise: teacherSharePaise,
          currency,
          direction: "CREDIT",
          status: "COMPLETED",
          description: `Teacher net earning share (${100 - commissionPercent}%)`,
        },
      }),
    ]);

    return {
      commissionPercent,
      commissionPaise,
      teacherSharePaise,
      grossEntry,
      commissionEntry,
      teacherEntry,
    };
  }

  /**
   * Record refund ledger reversal
   */
  static async recordRefundLedger(params: {
    transactionId: string;
    teacherId: string;
    refundAmountPaise: number;
    currency?: string;
  }) {
    const currency = params.currency || DEFAULT_CURRENCY;
    const commissionPercent = await this.getDefaultCommissionPercent();
    const teacherRefundDeduction = Math.round(
      (params.refundAmountPaise * (100 - commissionPercent)) / 100
    );

    const [refundEntry, reversalEntry] = await prisma.$transaction([
      prisma.financialLedgerEntry.create({
        data: {
          transactionId: params.transactionId,
          teacherId: params.teacherId,
          type: "REFUND",
          amountPaise: params.refundAmountPaise,
          currency,
          direction: "DEBIT",
          status: "COMPLETED",
          description: `Customer refund processed`,
        },
      }),
      prisma.financialLedgerEntry.create({
        data: {
          transactionId: params.transactionId,
          teacherId: params.teacherId,
          type: "REFUND_REVERSAL",
          amountPaise: teacherRefundDeduction,
          currency,
          direction: "DEBIT",
          status: "COMPLETED",
          description: `Teacher earning adjustment for refund`,
        },
      }),
    ]);

    return { refundEntry, reversalEntry, teacherRefundDeduction };
  }

  /**
   * Get teacher earnings metrics breakdown with 25% platform fee & monthly payout schedule
   */
  static async getTeacherEarningsSummary(teacherId: string) {
    const { PayoutService } = await import("@/services/payout-service");
    const calc = await PayoutService.calculateEligiblePayout(teacherId);

    return {
      totalEarningsPaise: calc.totalEarningsPaise,
      totalEarnings: calc.totalEarningsRupees,
      thisMonthEarningsPaise: calc.thisMonthEarningsPaise,
      thisMonthEarnings: calc.thisMonthEarningsRupees,
      pendingPaise: calc.pendingPayoutPaise,
      pendingAmount: calc.pendingPayoutRupees,
      availablePaise: calc.netEligibleBalancePaise,
      availableAmount: calc.netEligibleBalance,
      refundedPaise: 0,
      refundedAmount: 0,

      // Platform Fee & Net Payout Breakdown (25% Platform Fee, 75% Net)
      platformFeePercent: calc.platformFeePercent,
      netPayoutPercent: calc.netPayoutPercent,
      platformFeeDeducted: calc.settledFeeRupees,
      platformFeeDeductedPaise: calc.settledFeePaise,
      currentPlatformFee: calc.currentFeeRupees,
      currentPlatformFeePaise: calc.currentFeePaise,
      netEligibleBalance: calc.netEligibleBalance,
      netEligibleBalancePaise: calc.netEligibleBalancePaise,
      netPayoutAmount: calc.netEligibleBalance,
      netPayoutAmountPaise: calc.netEligibleBalancePaise,
      unsettledGrossAmount: calc.unsettledGrossRupees,
      unsettledGrossPaise: calc.unsettledGrossPaise,

      // Minimum Balance Requirement (₹2,500)
      minPayoutRequirement: calc.minPayoutRequirementRupees,
      minPayoutRequirementPaise: calc.minPayoutRequirementPaise,
      isEligibleForPayout: calc.isEligibleForPayout,

      // Automatic Monthly Schedule (10th of every month)
      nextScheduledPayoutDate: calc.nextScheduledPayoutDate,
      nextPayoutDateFormatted: calc.nextPayoutDateFormatted,

      // Bank verification & Last payout snapshot
      hasVerifiedBankDetails: calc.hasVerifiedBankDetails,
      bankDetails: calc.bankDetails,
      lastPayout: calc.lastPayout,
    };
  }

  /**
   * Record double-entry financial ledger entry for a completed withdrawal disbursement
   */
  static async recordWithdrawalDisbursementLedger(params: {
    withdrawalId: string;
    teacherId: string;
    amountPaise: number;
    referenceId?: string;
    description?: string;
  }) {
    return await prisma.$transaction(async (tx) => {
      const entry = await tx.financialLedgerEntry.create({
        data: {
          teacherId: params.teacherId,
          type: "TRANSFER",
          amountPaise: params.amountPaise,
          currency: "INR",
          direction: "DEBIT",
          status: "COMPLETED",
          description:
            params.description ||
            `Withdrawal payout transfer disbursed (Ref: ${params.referenceId || params.withdrawalId})`,
        },
      });

      await tx.withdrawalRequest.update({
        where: { id: params.withdrawalId },
        data: {
          ledgerEntryId: entry.id,
          status: "COMPLETED",
          completedAt: new Date(),
          ...(params.referenceId ? { providerReferenceId: params.referenceId } : {}),
        },
      });

      return entry;
    });
  }

  /**
   * Get teacher transaction ledger details
   */
  static async getTeacherLedgerTransactions(teacherId: string) {
    const transactions = await prisma.paymentTransaction.findMany({
      where: {
        status: { in: ["CAPTURED", "REFUNDED", "PARTIALLY_REFUNDED"] },
        OR: [
          { course: { teacherId } },
          { liveClassSlot: { teacherId } },
        ],
      },
      include: {
        user: { include: { profile: true } },
        course: true,
        liveClassSlot: true,
        ledgerEntries: true,
      },
      orderBy: { createdAt: "desc" },
    });

    const commissionPercent = await this.getDefaultCommissionPercent();

    return transactions.map((t) => {
      const grossPaise = t.amountPaise;
      const commissionPaise = Math.round((grossPaise * commissionPercent) / 100);
      const teacherEarningPaise = grossPaise - commissionPaise;
      const productName = t.course?.title || t.liveClassSlot?.title || "EduConnects Product";
      const studentName = t.user?.profile
        ? `${t.user.profile.firstName} ${t.user.profile.lastName}`
        : t.user.email;

      return {
        id: t.id,
        internalReference: t.internalReference,
        providerPaymentId: t.providerPaymentId,
        productName,
        productType: t.type,
        studentName,
        studentEmail: t.user.email,
        grossPaise,
        grossAmount: grossPaise / 100,
        commissionPaise,
        commissionAmount: commissionPaise / 100,
        teacherEarningPaise,
        teacherEarningAmount: teacherEarningPaise / 100,
        status: t.status,
        createdAt: t.createdAt,
      };
    });
  }

  /**
   * Get Admin System Financial Dashboard Analytics
   */
  static async getAdminFinancialSummary() {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const allCaptured = await prisma.paymentTransaction.findMany({
      where: { status: { in: ["CAPTURED", "REFUNDED", "PARTIALLY_REFUNDED"] } },
      include: { ledgerEntries: true, user: { include: { profile: true } }, course: true, liveClassSlot: true },
    });

    let totalRevenuePaise = 0;
    let todayRevenuePaise = 0;
    let totalCommissionPaise = 0;
    let totalTeacherEarningsPaise = 0;
    let totalRefundedPaise = 0;

    for (const t of allCaptured) {
      totalRevenuePaise += t.amountPaise;
      if (t.createdAt >= startOfToday) {
        todayRevenuePaise += t.amountPaise;
      }
      if (t.status === "REFUNDED" || t.status === "PARTIALLY_REFUNDED") {
        totalRefundedPaise += t.amountPaise;
      }

      for (const entry of t.ledgerEntries) {
        if (entry.type === "PLATFORM_COMMISSION") {
          totalCommissionPaise += entry.amountPaise;
        } else if (entry.type === "TEACHER_EARNING") {
          totalTeacherEarningsPaise += entry.amountPaise;
        }
      }
    }

    const pendingCount = await prisma.paymentTransaction.count({
      where: { status: "PENDING" },
    });

    return {
      totalRevenuePaise,
      todayRevenuePaise,
      totalCommissionPaise,
      totalTeacherEarningsPaise,
      totalRefundedPaise,
      totalRevenue: totalRevenuePaise / 100,
      todayRevenue: todayRevenuePaise / 100,
      totalCommission: totalCommissionPaise / 100,
      totalTeacherEarnings: totalTeacherEarningsPaise / 100,
      totalRefunded: totalRefundedPaise / 100,
      pendingCount,
      totalTransactionsCount: allCaptured.length,
    };
  }
}
