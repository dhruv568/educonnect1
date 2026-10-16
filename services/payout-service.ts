import { prisma } from "@/lib/prisma";
import { cashfreePayoutClient, CashfreeTransferOptions } from "@/lib/cashfree-payout";
import { EventService } from "@/services/event-service";
import {
  PLATFORM_FEE_PERCENT,
  NET_PAYOUT_PERCENT,
  MIN_PAYOUT_RUPEES,
  MIN_PAYOUT_PAISE,
  PAYOUT_SCHEDULE_DAY_OF_MONTH,
} from "@/lib/withdrawal-config";

export interface PayoutCalculationResult {
  teacherId: string;
  totalEarningsPaise: number;
  totalEarningsRupees: number;
  thisMonthEarningsPaise: number;
  thisMonthEarningsRupees: number;
  settledPaidPaise: number;
  settledPaidRupees: number;
  settledFeePaise: number;
  settledFeeRupees: number;
  pendingPayoutPaise: number;
  pendingPayoutRupees: number;
  unsettledGrossPaise: number;
  unsettledGrossRupees: number;
  platformFeePercent: number;
  netPayoutPercent: number;
  currentFeePaise: number;
  currentFeeRupees: number;
  netEligibleBalancePaise: number;
  netEligibleBalance: number;
  minPayoutRequirementRupees: number;
  minPayoutRequirementPaise: number;
  isEligibleForPayout: boolean;
  nextScheduledPayoutDate: Date;
  nextPayoutDateFormatted: string;
  hasVerifiedBankDetails: boolean;
  bankDetails: {
    accountHolderName?: string | null;
    accountNumber?: string | null;
    bankName?: string | null;
    ifscCode?: string | null;
    upiId?: string | null;
  };
  lastPayout: {
    id: string;
    amountRupees: number;
    feeRupees: number;
    grossRupees: number;
    status: string;
    requestedAt: Date;
    completedAt?: Date | null;
    providerReferenceId?: string | null;
  } | null;
}

export interface MonthlyPayoutExecutionResult {
  cycle: string;
  cycleDate: Date;
  processedCount: number;
  successfulCount: number;
  failedCount: number;
  skippedBelowMinCount: number;
  skippedMissingBankCount: number;
  skippedAlreadyProcessedCount: number;
  totalDisbursedRupees: number;
  totalPlatformFeeRupees: number;
  details: Array<{
    teacherId: string;
    teacherName?: string;
    grossRupees: number;
    feeRupees: number;
    netRupees: number;
    status: "PAID" | "PROCESSING" | "FAILED" | "SKIPPED_BELOW_MIN" | "SKIPPED_MISSING_BANK" | "SKIPPED_ALREADY_PROCESSED";
    withdrawalId?: string;
    transferId?: string;
    referenceId?: string;
    reason?: string;
  }>;
}

export class PayoutService {
  /**
   * Calculate next scheduled payout date (10th of every month)
   */
  static getNextScheduledPayoutDate(fromDate: Date = new Date()): Date {
    const target = new Date(fromDate);
    target.setHours(0, 0, 0, 0);

    const currentYear = target.getFullYear();
    const currentMonth = target.getMonth();
    const currentDay = target.getDate();

    if (currentDay < PAYOUT_SCHEDULE_DAY_OF_MONTH) {
      // 10th of current month
      return new Date(currentYear, currentMonth, PAYOUT_SCHEDULE_DAY_OF_MONTH, 0, 0, 0, 0);
    } else {
      // 10th of next month
      return new Date(currentYear, currentMonth + 1, PAYOUT_SCHEDULE_DAY_OF_MONTH, 0, 0, 0, 0);
    }
  }

  /**
   * Format the next scheduled payout date for display
   */
  static formatNextPayoutDate(fromDate: Date = new Date()): string {
    const nextDate = this.getNextScheduledPayoutDate(fromDate);
    return nextDate.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  /**
   * Generate cycle identifier (e.g. "2026-10")
   */
  static getPayoutCycleId(date: Date = new Date()): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    return `${year}-${month}`;
  }

  /**
   * Calculate comprehensive educator payout breakdown:
   * 1. Total gross earnings
   * 2. Platform fee (25%)
   * 3. Net eligible balance (75%)
   * 4. Minimum threshold check (₹2,500 on net eligible balance)
   * 5. Previous payouts and pending balance holds
   */
  static async calculateEligiblePayout(teacherId: string): Promise<PayoutCalculationResult> {
    const teacher = await prisma.teacherProfile.findUnique({
      where: { id: teacherId },
      include: {
        user: { include: { profile: true } },
      },
    });

    if (!teacher) {
      throw new Error("NOT_FOUND: Educator profile not found.");
    }

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // 1. Fetch all financial ledger entries for teacher earnings and refunds
    const ledgerEntries = await prisma.financialLedgerEntry.findMany({
      where: { teacherId },
    });

    let totalEarningsPaise = 0;
    let thisMonthEarningsPaise = 0;

    for (const entry of ledgerEntries) {
      if (entry.type === "TEACHER_EARNING" && entry.status === "COMPLETED") {
        totalEarningsPaise += entry.amountPaise;
        if (entry.createdAt >= startOfMonth) {
          thisMonthEarningsPaise += entry.amountPaise;
        }
      } else if (entry.type === "REFUND_REVERSAL" && entry.status === "COMPLETED") {
        totalEarningsPaise -= entry.amountPaise;
        if (entry.createdAt >= startOfMonth) {
          thisMonthEarningsPaise -= entry.amountPaise;
        }
      }
    }
    totalEarningsPaise = Math.max(0, totalEarningsPaise);
    thisMonthEarningsPaise = Math.max(0, thisMonthEarningsPaise);

    // 2. Fetch all withdrawal / payout requests
    const withdrawals = await prisma.withdrawalRequest.findMany({
      where: { teacherId },
      orderBy: { requestedAt: "desc" },
    });

    let settledPaidPaise = 0;
    let settledFeePaise = 0;
    let pendingPayoutPaise = 0;
    let pendingFeePaise = 0;

    for (const wd of withdrawals) {
      if (wd.status === "COMPLETED" || wd.status === "PAID") {
        settledPaidPaise += wd.amountPaise;
        // Derive platform fee (amountPaise is 75% net, gross was amountPaise / 0.75, fee was gross * 0.25)
        const grossWdPaise = Math.round((wd.amountPaise * 100) / NET_PAYOUT_PERCENT);
        settledFeePaise += grossWdPaise - wd.amountPaise;
      } else if (wd.status === "PENDING" || wd.status === "APPROVED" || wd.status === "PROCESSING") {
        pendingPayoutPaise += wd.amountPaise;
        const grossPendingPaise = Math.round((wd.amountPaise * 100) / NET_PAYOUT_PERCENT);
        pendingFeePaise += grossPendingPaise - wd.amountPaise;
      }
      // Note: REJECTED or FAILED status are excluded, automatically restoring the balance!
    }

    // Also account for any legacy TeacherPayout records
    const legacyPayouts = await prisma.teacherPayout.findMany({
      where: { teacherId },
    });
    for (const p of legacyPayouts) {
      if (p.status === "PAID") {
        settledPaidPaise += p.amountPaise;
      } else if (p.status === "PENDING" || p.status === "PROCESSING") {
        pendingPayoutPaise += p.amountPaise;
      }
    }

    // 3. Unsettled gross earnings = Total gross earnings - (Settled gross) - (Pending gross holds)
    const settledGrossPaise = settledPaidPaise + settledFeePaise;
    const pendingGrossPaise = pendingPayoutPaise + pendingFeePaise;
    const unsettledGrossPaise = Math.max(0, totalEarningsPaise - settledGrossPaise - pendingGrossPaise);

    // 4. Calculate 25% Platform Fee & 75% Net Eligible Balance on unsettled gross
    const currentFeePaise = Math.round((unsettledGrossPaise * PLATFORM_FEE_PERCENT) / 100);
    const netEligibleBalancePaise = Math.max(0, unsettledGrossPaise - currentFeePaise);

    // 5. Minimum threshold check: must be >= ₹2,500 after applying the 25% platform fee
    const isEligibleForPayout = netEligibleBalancePaise >= MIN_PAYOUT_PAISE;

    // 6. Check verified bank details
    const hasVerifiedBankDetails = Boolean(
      teacher.accountNumber &&
      teacher.accountNumber.trim().length >= 6 &&
      teacher.ifscCode &&
      teacher.ifscCode.trim().length >= 4
    );

    // 7. Last payout summary
    const latestPayoutRecord = withdrawals[0] || null;
    let lastPayout = null;
    if (latestPayoutRecord) {
      const netPaise = latestPayoutRecord.amountPaise;
      const grossPaise = Math.round((netPaise * 100) / NET_PAYOUT_PERCENT);
      const feePaise = grossPaise - netPaise;
      lastPayout = {
        id: latestPayoutRecord.id,
        amountRupees: netPaise / 100,
        feeRupees: feePaise / 100,
        grossRupees: grossPaise / 100,
        status: latestPayoutRecord.status,
        requestedAt: latestPayoutRecord.requestedAt,
        completedAt: latestPayoutRecord.completedAt,
        providerReferenceId: latestPayoutRecord.providerReferenceId || latestPayoutRecord.providerTransferId,
      };
    }

    return {
      teacherId,
      totalEarningsPaise,
      totalEarningsRupees: totalEarningsPaise / 100,
      thisMonthEarningsPaise,
      thisMonthEarningsRupees: thisMonthEarningsPaise / 100,
      settledPaidPaise,
      settledPaidRupees: settledPaidPaise / 100,
      settledFeePaise,
      settledFeeRupees: settledFeePaise / 100,
      pendingPayoutPaise,
      pendingPayoutRupees: pendingPayoutPaise / 100,
      unsettledGrossPaise,
      unsettledGrossRupees: unsettledGrossPaise / 100,
      platformFeePercent: PLATFORM_FEE_PERCENT,
      netPayoutPercent: NET_PAYOUT_PERCENT,
      currentFeePaise,
      currentFeeRupees: currentFeePaise / 100,
      netEligibleBalancePaise,
      netEligibleBalance: netEligibleBalancePaise / 100,
      minPayoutRequirementRupees: MIN_PAYOUT_RUPEES,
      minPayoutRequirementPaise: MIN_PAYOUT_PAISE,
      isEligibleForPayout,
      nextScheduledPayoutDate: this.getNextScheduledPayoutDate(now),
      nextPayoutDateFormatted: this.formatNextPayoutDate(now),
      hasVerifiedBankDetails,
      bankDetails: {
        accountHolderName: teacher.accountHolderName,
        accountNumber: teacher.accountNumber,
        bankName: teacher.bankName,
        ifscCode: teacher.ifscCode,
        upiId: teacher.upiId,
      },
      lastPayout,
    };
  }

  /**
   * Execute Automatic Monthly Payout Schedule
   *
   * Scheduled for the 10th of every month.
   * Can also be triggered via API endpoint or CLI script.
   *
   * Safety features:
   * - Deducts 25% platform fee before calculating final payout
   * - Enforces ₹2,500 minimum net eligible balance requirement
   * - Carry forward if below ₹2,500
   * - Automatic transfer to educator's verified bank account via Cashfree Payout
   * - Prevents duplicate payouts via cycle-level idempotency key: `monthly-payout-${teacherId}-${cycle}`
   * - Full transactional and double-entry ledger safety
   */
  static async processMonthlyPayouts(options: {
    cycleDate?: Date;
    dryRun?: boolean;
    teacherId?: string;
  } = {}): Promise<MonthlyPayoutExecutionResult> {
    const cycleDate = options.cycleDate || new Date();
    const cycle = this.getPayoutCycleId(cycleDate);
    const dryRun = options.dryRun || false;

    // Fetch verified educators
    const teacherFilter: any = {
      verificationStatus: "VERIFIED",
    };
    if (options.teacherId) {
      teacherFilter.id = options.teacherId;
    }

    const educators = await prisma.teacherProfile.findMany({
      where: teacherFilter,
      include: {
        user: { include: { profile: true } },
      },
    });

    const result: MonthlyPayoutExecutionResult = {
      cycle,
      cycleDate,
      processedCount: 0,
      successfulCount: 0,
      failedCount: 0,
      skippedBelowMinCount: 0,
      skippedMissingBankCount: 0,
      skippedAlreadyProcessedCount: 0,
      totalDisbursedRupees: 0,
      totalPlatformFeeRupees: 0,
      details: [],
    };

    for (const educator of educators) {
      result.processedCount++;
      const educatorName = educator.accountHolderName ||
        `${educator.user.profile?.firstName || ""} ${educator.user.profile?.lastName || ""}`.trim() ||
        "Educator";

      // 1. Idempotency Check: Prevent duplicate payouts if scheduled job runs more than once
      const idempotencyKey = `monthly-payout-${educator.id}-${cycle}`;
      const existingPayout = await prisma.withdrawalRequest.findUnique({
        where: { idempotencyKey },
      });

      if (existingPayout && ["PENDING", "APPROVED", "PROCESSING", "COMPLETED", "PAID"].includes(existingPayout.status)) {
        result.skippedAlreadyProcessedCount++;
        result.details.push({
          teacherId: educator.id,
          teacherName: educatorName,
          grossRupees: Math.round((existingPayout.amountPaise * 100) / NET_PAYOUT_PERCENT) / 100,
          feeRupees: (Math.round((existingPayout.amountPaise * 100) / NET_PAYOUT_PERCENT) - existingPayout.amountPaise) / 100,
          netRupees: existingPayout.amountPaise / 100,
          status: "SKIPPED_ALREADY_PROCESSED",
          withdrawalId: existingPayout.id,
          reason: `Payout for cycle ${cycle} already processed (Status: ${existingPayout.status})`,
        });
        continue;
      }

      // 2. Calculate eligible payout
      const calc = await this.calculateEligiblePayout(educator.id);

      // 3. Minimum Balance Requirement: ₹2,500 minimum net eligible balance
      if (!calc.isEligibleForPayout) {
        result.skippedBelowMinCount++;
        result.details.push({
          teacherId: educator.id,
          teacherName: educatorName,
          grossRupees: calc.unsettledGrossRupees,
          feeRupees: calc.currentFeeRupees,
          netRupees: calc.netEligibleBalance,
          status: "SKIPPED_BELOW_MIN",
          reason: `Net eligible balance (₹${calc.netEligibleBalance}) is below minimum requirement of ₹${MIN_PAYOUT_RUPEES}. Balance carried forward to next cycle.`,
        });
        continue;
      }

      // 4. Verified Bank Details Requirement
      if (!calc.hasVerifiedBankDetails || !educator.accountNumber || !educator.ifscCode) {
        result.skippedMissingBankCount++;
        result.details.push({
          teacherId: educator.id,
          teacherName: educatorName,
          grossRupees: calc.unsettledGrossRupees,
          feeRupees: calc.currentFeeRupees,
          netRupees: calc.netEligibleBalance,
          status: "SKIPPED_MISSING_BANK",
          reason: "Educator is missing verified bank account number or IFSC code.",
        });
        continue;
      }

      if (dryRun) {
        result.successfulCount++;
        result.totalDisbursedRupees += calc.netEligibleBalance;
        result.totalPlatformFeeRupees += calc.currentFeeRupees;
        result.details.push({
          teacherId: educator.id,
          teacherName: educatorName,
          grossRupees: calc.unsettledGrossRupees,
          feeRupees: calc.currentFeeRupees,
          netRupees: calc.netEligibleBalance,
          status: "PAID",
          reason: "Dry run preview: payout eligible and ready for automated disbursement.",
        });
        continue;
      }

      // 5. Transactional Payout Creation & Idempotent Hold
      const withdrawal = await prisma.$transaction(async (tx) => {
        // Double check conflict inside transaction
        const conflict = await tx.withdrawalRequest.findFirst({
          where: {
            teacherId: educator.id,
            status: { in: ["PENDING", "APPROVED", "PROCESSING"] },
          },
        });

        if (conflict) {
          throw new Error(`CONCURRENT_PAYOUT_EXISTS: Payout ${conflict.id} is already in progress.`);
        }

        return await tx.withdrawalRequest.create({
          data: {
            teacherId: educator.id,
            amountPaise: calc.netEligibleBalancePaise, // 75% net payout
            currency: "INR",
            status: "PROCESSING",
            payoutMethod: "BANK_TRANSFER",
            accountHolderName: educator.accountHolderName || educatorName,
            accountNumber: educator.accountNumber,
            bankName: educator.bankName,
            ifscCode: educator.ifscCode,
            upiId: educator.upiId || undefined,
            idempotencyKey,
            adminNotes: `Monthly automated payout for cycle ${cycle}. Gross: ₹${calc.unsettledGrossRupees}, Platform Fee (${PLATFORM_FEE_PERCENT}%): ₹${calc.currentFeeRupees}, Net Payout (${NET_PAYOUT_PERCENT}%): ₹${calc.netEligibleBalance}`,
            requestedAt: new Date(),
            approvedAt: new Date(),
            approvedBy: "SYSTEM_SCHEDULED_JOB",
          },
        });
      });

      // 6. Initiate Automated Transfer via Cashfree Payout
      const transferId = `TRF_MONTHLY_${cycle.replace("-", "")}_${educator.id.replace(/-/g, "").slice(0, 8)}_${Date.now()}`;

      await prisma.withdrawalRequest.update({
        where: { id: withdrawal.id },
        data: { providerTransferId: transferId, processedAt: new Date() },
      });

      const transferOpts: CashfreeTransferOptions = {
        transferId,
        transferAmount: calc.netEligibleBalance,
        transferMode: "banktransfer",
        transferRemarks: `EduConnects Monthly Payout ${cycle}`,
        beneficiaryDetails: {
          beneficiary_name: educatorName,
          beneficiary_email: educator.user.email,
          beneficiary_phone: educator.user.profile?.phone || "9999999999",
          bank_account_number: educator.accountNumber,
          bank_ifsc: educator.ifscCode,
        },
      };

      const payoutResult = await cashfreePayoutClient.initiateTransfer(transferOpts);

      if (payoutResult.success && payoutResult.status === "SUCCESS") {
        // Synchronous Success / Mock completion
        await this.finalizePayoutSuccess({
          withdrawalId: withdrawal.id,
          teacherId: educator.id,
          netPaise: calc.netEligibleBalancePaise,
          feePaise: calc.currentFeePaise,
          referenceId: payoutResult.providerReferenceId || `REF_${Date.now()}`,
          cycle,
        });

        result.successfulCount++;
        result.totalDisbursedRupees += calc.netEligibleBalance;
        result.totalPlatformFeeRupees += calc.currentFeeRupees;
        result.details.push({
          teacherId: educator.id,
          teacherName: educatorName,
          grossRupees: calc.unsettledGrossRupees,
          feeRupees: calc.currentFeeRupees,
          netRupees: calc.netEligibleBalance,
          status: "PAID",
          withdrawalId: withdrawal.id,
          transferId,
          referenceId: payoutResult.providerReferenceId,
        });

        if (educator.userId) {
          await EventService.emit("payout.processed" as any, {
            userId: educator.userId,
            data: {
              title: "Monthly Payout Processed 🎉",
              message: `Your monthly payout of ₹${calc.netEligibleBalance} for cycle ${cycle} has been disbursed to your bank account (Ref: ${payoutResult.providerReferenceId}).`,
              actionUrl: "/teacher/earnings",
              withdrawalId: withdrawal.id,
              referenceId: payoutResult.providerReferenceId,
            },
          }).catch(() => {});
        }
      } else if (payoutResult.status === "PENDING" || payoutResult.status === "RECEIVED") {
        // Asynchronous processing: wait for Cashfree Payout Webhook
        result.details.push({
          teacherId: educator.id,
          teacherName: educatorName,
          grossRupees: calc.unsettledGrossRupees,
          feeRupees: calc.currentFeeRupees,
          netRupees: calc.netEligibleBalance,
          status: "PROCESSING",
          withdrawalId: withdrawal.id,
          transferId,
          reason: "Transfer initiated with Cashfree. Awaiting gateway confirmation via webhook.",
        });
      } else {
        // Transfer failed at gateway: release held balance immediately
        await prisma.withdrawalRequest.update({
          where: { id: withdrawal.id },
          data: {
            status: "FAILED",
            failedAt: new Date(),
            failureReason: payoutResult.failureReason || "Gateway transfer rejected",
          },
        });

        result.failedCount++;
        result.details.push({
          teacherId: educator.id,
          teacherName: educatorName,
          grossRupees: calc.unsettledGrossRupees,
          feeRupees: calc.currentFeeRupees,
          netRupees: calc.netEligibleBalance,
          status: "FAILED",
          withdrawalId: withdrawal.id,
          reason: payoutResult.failureReason || "Cashfree transfer failed",
        });

        if (educator.userId) {
          await EventService.emit("payout.processed" as any, {
            userId: educator.userId,
            data: {
              title: "Monthly Payout Transfer Issue ⚠️",
              message: `Your monthly payout of ₹${calc.netEligibleBalance} could not be processed: ${payoutResult.failureReason}. Funds have been preserved and carried forward.`,
              actionUrl: "/teacher/earnings",
              withdrawalId: withdrawal.id,
              reason: payoutResult.failureReason,
            },
          }).catch(() => {});
        }
      }
    }

    return result;
  }

  /**
   * Finalize confirmed payout in double-entry financial ledger:
   * 1. TRANSFER (DEBIT): Net payout amount disbursed to teacher bank
   * 2. PLATFORM_COMMISSION (DEBIT): 25% platform fee deducted on payout
   * 3. Update WithdrawalRequest status to COMPLETED
   */
  static async finalizePayoutSuccess(params: {
    withdrawalId: string;
    teacherId: string;
    netPaise: number;
    feePaise: number;
    referenceId?: string;
    cycle?: string;
  }) {
    const { withdrawalId, teacherId, netPaise, feePaise, referenceId, cycle = "monthly" } = params;

    return await prisma.$transaction(async (tx) => {
      // 1. Double-entry ledger entry for net payout disbursement
      const transferEntry = await tx.financialLedgerEntry.create({
        data: {
          teacherId,
          type: "TRANSFER",
          amountPaise: netPaise,
          currency: "INR",
          direction: "DEBIT",
          status: "COMPLETED",
          description: `Monthly payout disbursed to verified bank account (Ref: ${referenceId || withdrawalId})`,
        },
      });

      // 2. Double-entry ledger entry for 25% platform fee deduction (deducted once at payout)
      if (feePaise > 0) {
        await tx.financialLedgerEntry.create({
          data: {
            teacherId,
            type: "PLATFORM_COMMISSION",
            amountPaise: feePaise,
            currency: "INR",
            direction: "DEBIT",
            status: "COMPLETED",
            description: `Platform fee (${PLATFORM_FEE_PERCENT}%) deducted for ${cycle} payout`,
          },
        });
      }

      // 3. Mark withdrawal request as COMPLETED
      const updatedWd = await tx.withdrawalRequest.update({
        where: { id: withdrawalId },
        data: {
          ledgerEntryId: transferEntry.id,
          status: "COMPLETED",
          completedAt: new Date(),
          ...(referenceId ? { providerReferenceId: referenceId } : {}),
        },
      });

      return { transferEntry, updatedWd };
    });
  }

  /**
   * Get educator's full payout history with 25% fee breakdown
   */
  static async getTeacherPayoutHistory(teacherId: string) {
    const list = await prisma.withdrawalRequest.findMany({
      where: { teacherId },
      orderBy: { requestedAt: "desc" },
    });

    return list.map((item) => {
      const netRupees = item.amountPaise / 100;
      const grossPaise = Math.round((item.amountPaise * 100) / NET_PAYOUT_PERCENT);
      const grossRupees = grossPaise / 100;
      const feeRupees = grossRupees - netRupees;

      return {
        id: item.id,
        grossAmount: grossRupees,
        platformFeeAmount: feeRupees,
        netPayoutAmount: netRupees,
        status: item.status,
        payoutMethod: item.payoutMethod,
        accountHolderName: item.accountHolderName,
        accountNumber: item.accountNumber,
        bankName: item.bankName,
        ifscCode: item.ifscCode,
        upiId: item.upiId,
        providerTransferId: item.providerTransferId,
        providerReferenceId: item.providerReferenceId,
        requestedAt: item.requestedAt,
        processedAt: item.processedAt,
        completedAt: item.completedAt,
        failedAt: item.failedAt,
        adminNotes: item.adminNotes,
        rejectionReason: item.rejectionReason,
        failureReason: item.failureReason,
      };
    });
  }
}
