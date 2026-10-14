import { prisma } from "@/lib/prisma";
import { LedgerService } from "@/services/ledger-service";
import { cashfreePayoutClient, CashfreeTransferOptions } from "@/lib/cashfree-payout";
import { EventService } from "@/services/event-service";
import {
  MIN_WITHDRAWAL_PAISE,
  MIN_WITHDRAWAL_RUPEES,
} from "@/lib/withdrawal-config";

export { MIN_WITHDRAWAL_PAISE, MIN_WITHDRAWAL_RUPEES };

export interface RequestWithdrawalParams {
  teacherId: string;
  amountRupees: number;
  payoutMethod: "BANK_TRANSFER" | "UPI";
  upiId?: string;
  idempotencyKey?: string;
}

export interface AdminWithdrawalFilters {
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export class WithdrawalService {
  /**
   * Request a new educator withdrawal
   */
  static async requestWithdrawal(params: RequestWithdrawalParams) {
    const { teacherId, amountRupees, payoutMethod, idempotencyKey } = params;

    const amountPaise = Math.round(amountRupees * 100);

    // 1. Minimum limit check
    if (isNaN(amountPaise) || amountPaise < MIN_WITHDRAWAL_PAISE) {
      throw new Error(
        `INVALID_AMOUNT: Minimum withdrawal amount is ₹${MIN_WITHDRAWAL_RUPEES}.`
      );
    }

    // 2. Fetch educator profile and user
    const teacher = await prisma.teacherProfile.findUnique({
      where: { id: teacherId },
      include: { user: { include: { profile: true } } },
    });

    if (!teacher) {
      throw new Error("NOT_FOUND: Educator profile not found.");
    }

    // 3. Check idempotency first before checking active request
    if (idempotencyKey) {
      const existing = await prisma.withdrawalRequest.findUnique({
        where: { idempotencyKey },
      });
      if (existing) {
        const currentSummary = await LedgerService.getTeacherEarningsSummary(teacherId);
        return { withdrawal: existing, summary: currentSummary };
      }
    }

    // 4. Prevent duplicate active/overlapping requests
    const activeWithdrawal = await prisma.withdrawalRequest.findFirst({
      where: {
        teacherId,
        status: { in: ["PENDING", "APPROVED", "PROCESSING"] },
      },
    });

    if (activeWithdrawal) {
      throw new Error(
        "ACTIVE_WITHDRAWAL_EXISTS: You already have a withdrawal request in progress. Please wait until it completes or is processed."
      );
    }

    // 5. Validate & Snapshot Payout Details
    let upiId = params.upiId?.trim() || teacher.upiId?.trim();
    if (payoutMethod === "UPI") {
      if (!upiId) {
        throw new Error(
          "MISSING_PAYOUT_DETAILS: A valid UPI ID is required for UPI withdrawals."
        );
      }
      const upiRegex = /^[\w.\-_]{2,256}@[a-zA-Z]{2,64}$/;
      if (!upiRegex.test(upiId)) {
        throw new Error("INVALID_UPI: Please provide a valid UPI ID (e.g. yourname@okaxis).");
      }

      // Save/update upiId on teacher profile if not set
      if (teacher.upiId !== upiId) {
        await prisma.teacherProfile.update({
          where: { id: teacherId },
          data: { upiId },
        });
      }
    } else {
      if (!teacher.accountNumber || !teacher.ifscCode) {
        throw new Error(
          "MISSING_PAYOUT_DETAILS: Bank account number and IFSC code are required. Please configure your bank details in settings."
        );
      }
    }

    // 6. Balance Validation
    const summary = await LedgerService.getTeacherEarningsSummary(teacherId);
    if (amountPaise > summary.availablePaise) {
      throw new Error(
        `INSUFFICIENT_BALANCE: Requested amount (₹${amountRupees}) exceeds your available balance (₹${summary.availableAmount}).`
      );
    }

    // 7. Transactional Hold Creation with Concurrency Conflict Check
    const withdrawal = await prisma.$transaction(
      async (tx) => {
        const activeConflict = await tx.withdrawalRequest.findFirst({
          where: {
            teacherId,
            status: { in: ["PENDING", "APPROVED", "PROCESSING"] },
          },
        });

        if (activeConflict) {
          throw new Error(
            "ACTIVE_WITHDRAWAL_EXISTS: You already have a withdrawal request in progress. Please wait until it completes or is processed."
          );
        }

        return await tx.withdrawalRequest.create({
          data: {
            teacherId,
            amountPaise,
            currency: "INR",
            status: "PENDING",
            payoutMethod,
            accountHolderName: teacher.accountHolderName || undefined,
            accountNumber: teacher.accountNumber || undefined,
            bankName: teacher.bankName || undefined,
            ifscCode: teacher.ifscCode || undefined,
            upiId: payoutMethod === "UPI" ? upiId : undefined,
            idempotencyKey: idempotencyKey || undefined,
          },
        });
      },
      { timeout: 15000, maxWait: 5000 }
    );

    // Emit event
    if (teacher.userId) {
      await EventService.emit("payout.processed" as any, {
        userId: teacher.userId,
        data: {
          title: "Withdrawal Requested ⏳",
          message: `Your withdrawal request for ₹${amountRupees} has been placed.`,
          actionUrl: "/teacher/earnings",
          withdrawalId: withdrawal.id,
          amountPaise,
        },
      }).catch(() => {});
    }

    const updatedSummary = await LedgerService.getTeacherEarningsSummary(teacherId);
    return { withdrawal, summary: updatedSummary };
  }

  /**
   * Get educator's withdrawal history
   */
  static async getTeacherWithdrawals(teacherId: string) {
    return await prisma.withdrawalRequest.findMany({
      where: { teacherId },
      orderBy: { requestedAt: "desc" },
    });
  }

  /**
   * Admin: List all withdrawal requests with filters
   */
  static async getAdminWithdrawals(filters: AdminWithdrawalFilters = {}) {
    const { status, search, page = 1, limit = 20 } = filters;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (status && status !== "ALL") {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { id: { contains: search, mode: "insensitive" } },
        { providerTransferId: { contains: search, mode: "insensitive" } },
        { providerReferenceId: { contains: search, mode: "insensitive" } },
        {
          teacher: {
            user: {
              OR: [
                { email: { contains: search, mode: "insensitive" } },
                { profile: { firstName: { contains: search, mode: "insensitive" } } },
                { profile: { lastName: { contains: search, mode: "insensitive" } } },
              ],
            },
          },
        },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.withdrawalRequest.findMany({
        where,
        include: {
          teacher: {
            include: {
              user: {
                select: {
                  id: true,
                  email: true,
                  profile: {
                    select: {
                      firstName: true,
                      lastName: true,
                      phone: true,
                    },
                  },
                },
              },
            },
          },
        },
        orderBy: { requestedAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.withdrawalRequest.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Admin: Approve a withdrawal request & optionally auto-disburse via Cashfree Payout
   */
  static async approveWithdrawal(params: {
    withdrawalId: string;
    adminUserId: string;
    adminNotes?: string;
    autoDisburse?: boolean;
  }) {
    const { withdrawalId, adminUserId, adminNotes, autoDisburse = true } = params;

    const withdrawal = await prisma.withdrawalRequest.findUnique({
      where: { id: withdrawalId },
      include: {
        teacher: {
          include: {
            user: { select: { email: true, profile: true } },
          },
        },
      },
    });

    if (!withdrawal) {
      throw new Error("NOT_FOUND: Withdrawal request not found.");
    }

    if (withdrawal.status !== "PENDING") {
      throw new Error(
        `INVALID_STATE: Cannot approve a withdrawal with status "${withdrawal.status}".`
      );
    }

    // Transition to APPROVED
    await prisma.withdrawalRequest.update({
      where: { id: withdrawalId },
      data: {
        status: "APPROVED",
        approvedAt: new Date(),
        approvedBy: adminUserId,
        adminNotes: adminNotes || withdrawal.adminNotes,
      },
    });

    // If auto-disburse is requested, initiate Cashfree Payout
    if (autoDisburse) {
      return await this.executeCashfreePayout(withdrawalId);
    }

    const updated = await prisma.withdrawalRequest.findUnique({
      where: { id: withdrawalId },
    });
    return { success: true, withdrawal: updated };
  }

  /**
   * Execute Cashfree Payout transfer for an approved withdrawal
   */
  static async executeCashfreePayout(withdrawalId: string) {
    const withdrawal = await prisma.withdrawalRequest.findUnique({
      where: { id: withdrawalId },
      include: {
        teacher: {
          include: {
            user: { select: { email: true, profile: true } },
          },
        },
      },
    });

    if (!withdrawal) throw new Error("NOT_FOUND: Withdrawal request not found.");

    const transferId = `TRF_WD_${withdrawal.id.replace(/-/g, "").slice(0, 14)}_${Date.now()}`;
    const educatorName =
      withdrawal.accountHolderName ||
      `${withdrawal.teacher.user.profile?.firstName || ""} ${withdrawal.teacher.user.profile?.lastName || ""}`.trim() ||
      "Educator";

    // Mark as PROCESSING
    await prisma.withdrawalRequest.update({
      where: { id: withdrawalId },
      data: {
        status: "PROCESSING",
        processedAt: new Date(),
        providerTransferId: transferId,
      },
    });

    const transferOpts: CashfreeTransferOptions = {
      transferId,
      transferAmount: withdrawal.amountPaise / 100,
      transferMode: withdrawal.payoutMethod === "UPI" ? "upi" : "banktransfer",
      transferRemarks: `EduConnects Payout for Withdrawal ${withdrawal.id.slice(0, 8)}`,
      beneficiaryDetails: {
        beneficiary_name: educatorName,
        beneficiary_email: withdrawal.teacher.user.email,
        beneficiary_phone: withdrawal.teacher.user.profile?.phone || "9999999999",
        bank_account_number: withdrawal.accountNumber || undefined,
        bank_ifsc: withdrawal.ifscCode || undefined,
        vpa: withdrawal.upiId || undefined,
      },
    };

    const payoutResult = await cashfreePayoutClient.initiateTransfer(transferOpts);

    if (payoutResult.success && payoutResult.status === "SUCCESS") {
      // Completed synchronously (or in mock test mode)
      await LedgerService.recordWithdrawalDisbursementLedger({
        withdrawalId,
        teacherId: withdrawal.teacherId,
        amountPaise: withdrawal.amountPaise,
        referenceId: payoutResult.providerReferenceId,
      });

      const updated = await prisma.withdrawalRequest.findUnique({
        where: { id: withdrawalId },
      });

      if (withdrawal.teacher.userId) {
        await EventService.emit("payout.processed" as any, {
          userId: withdrawal.teacher.userId,
          data: {
            title: "Withdrawal Settled & Paid 🎉",
            message: `Your payout of ₹${withdrawal.amountPaise / 100} has been disbursed.`,
            actionUrl: "/teacher/earnings",
            withdrawalId,
            referenceId: payoutResult.providerReferenceId,
          },
        }).catch(() => {});
      }

      return {
        success: true,
        status: "COMPLETED",
        withdrawal: updated,
        referenceId: payoutResult.providerReferenceId,
      };
    } else if (payoutResult.status === "PENDING" || payoutResult.status === "RECEIVED") {
      // Processing asynchronously, waiting for Cashfree Webhook
      const updated = await prisma.withdrawalRequest.findUnique({
        where: { id: withdrawalId },
      });
      return {
        success: true,
        status: "PROCESSING",
        withdrawal: updated,
        message: "Payout transfer initiated. Awaiting gateway confirmation via webhook.",
      };
    } else {
      // Transfer failed - restore held balance by setting status to FAILED
      await prisma.withdrawalRequest.update({
        where: { id: withdrawalId },
        data: {
          status: "FAILED",
          failedAt: new Date(),
          failureReason: payoutResult.failureReason || "Cashfree Payout transfer failed",
        },
      });

      const updated = await prisma.withdrawalRequest.findUnique({
        where: { id: withdrawalId },
      });

      if (withdrawal.teacher.userId) {
        await EventService.emit("payout.processed" as any, {
          userId: withdrawal.teacher.userId,
          data: {
            title: "Withdrawal Failed ⚠️",
            message: `Your withdrawal of ₹${withdrawal.amountPaise / 100} could not be processed: ${payoutResult.failureReason}. Held balance has been restored.`,
            actionUrl: "/teacher/earnings",
            withdrawalId,
            reason: payoutResult.failureReason,
          },
        }).catch(() => {});
      }

      return {
        success: false,
        status: "FAILED",
        withdrawal: updated,
        failureReason: payoutResult.failureReason,
      };
    }
  }

  /**
   * Admin: Reject a withdrawal request
   * Releases the escrow hold immediately, restoring the balance to the educator.
   */
  static async rejectWithdrawal(params: {
    withdrawalId: string;
    adminUserId: string;
    rejectionReason: string;
  }) {
    const { withdrawalId, adminUserId, rejectionReason } = params;

    const withdrawal = await prisma.withdrawalRequest.findUnique({
      where: { id: withdrawalId },
      include: { teacher: true },
    });

    if (!withdrawal) {
      throw new Error("NOT_FOUND: Withdrawal request not found.");
    }

    if (withdrawal.status !== "PENDING" && withdrawal.status !== "APPROVED") {
      throw new Error(
        `INVALID_STATE: Cannot reject a withdrawal with status "${withdrawal.status}".`
      );
    }

    // Setting status to REJECTED automatically restores the balance
    // because getTeacherEarningsSummary excludes REJECTED from pending and paid.
    const updated = await prisma.withdrawalRequest.update({
      where: { id: withdrawalId },
      data: {
        status: "REJECTED",
        rejectedAt: new Date(),
        rejectedBy: adminUserId,
        rejectionReason: rejectionReason || "Rejected by administrator",
      },
    });

    if (withdrawal.teacher.userId) {
      await EventService.emit("payout.processed" as any, {
        userId: withdrawal.teacher.userId,
        data: {
          title: "Withdrawal Request Rejected ❌",
          message: `Your withdrawal request was rejected: ${rejectionReason}. Held funds have been released back to your balance.`,
          actionUrl: "/teacher/earnings",
          withdrawalId,
          reason: rejectionReason,
        },
      }).catch(() => {});
    }

    return updated;
  }

  /**
   * Admin: Manually mark a withdrawal as completed with external bank/UPI reference
   */
  static async manualCompleteWithdrawal(params: {
    withdrawalId: string;
    adminUserId: string;
    referenceId: string;
    adminNotes?: string;
  }) {
    const { withdrawalId, adminUserId, referenceId, adminNotes } = params;

    if (!referenceId || !referenceId.trim()) {
      throw new Error("VALIDATION_ERROR: Bank reference / UTR is required.");
    }

    const withdrawal = await prisma.withdrawalRequest.findUnique({
      where: { id: withdrawalId },
      include: { teacher: true },
    });

    if (!withdrawal) {
      throw new Error("NOT_FOUND: Withdrawal request not found.");
    }

    if (withdrawal.status === "COMPLETED") {
      throw new Error("INVALID_STATE: This withdrawal is already marked as COMPLETED.");
    }

    // Record immutable ledger entry and transition to COMPLETED
    await LedgerService.recordWithdrawalDisbursementLedger({
      withdrawalId,
      teacherId: withdrawal.teacherId,
      amountPaise: withdrawal.amountPaise,
      referenceId: referenceId.trim(),
      description: adminNotes || `Manual withdrawal settlement by Admin ${adminUserId}`,
    });

    const updated = await prisma.withdrawalRequest.update({
      where: { id: withdrawalId },
      data: {
        approvedBy: withdrawal.approvedBy || adminUserId,
        approvedAt: withdrawal.approvedAt || new Date(),
        adminNotes: adminNotes
          ? `${withdrawal.adminNotes || ""}\n${adminNotes}`.trim()
          : withdrawal.adminNotes,
      },
    });

    if (withdrawal.teacher.userId) {
      await EventService.emit("payout.processed" as any, {
        userId: withdrawal.teacher.userId,
        data: {
          title: "Withdrawal Settled & Paid 🎉",
          message: `Your payout of ₹${withdrawal.amountPaise / 100} has been settled (Ref: ${referenceId}).`,
          actionUrl: "/teacher/earnings",
          withdrawalId,
          referenceId,
        },
      }).catch(() => {});
    }

    return updated;
  }

  /**
   * Process Cashfree Payout Webhook events (TRANSFER_SUCCESS, TRANSFER_FAILED, TRANSFER_REVERSED)
   */
  static async processPayoutWebhook(payload: any) {
    const eventType = payload.event_type || payload.type || "";
    const transferData = payload.data?.transfer || payload.data || payload;
    const transferId =
      transferData.transfer_id ||
      payload.transfer_id ||
      payload.transferId;

    if (!transferId) {
      return { processed: false, reason: "MISSING_TRANSFER_ID" };
    }

    const withdrawal = await prisma.withdrawalRequest.findUnique({
      where: { providerTransferId: transferId },
      include: { teacher: true },
    });

    if (!withdrawal) {
      return { processed: false, reason: "WITHDRAWAL_NOT_FOUND" };
    }

    // Idempotency: if already COMPLETED and success webhook arrives, skip
    if (withdrawal.status === "COMPLETED" && (eventType.includes("SUCCESS") || payload.status === "SUCCESS")) {
      return { processed: true, idempotent: true };
    }

    const utr = transferData.utr || payload.utr || transferData.reference_id;
    const failureReason =
      transferData.failure_reason ||
      payload.failure_reason ||
      payload.reason ||
      "Transfer failed at gateway";

    if (
      eventType === "TRANSFER_SUCCESS" ||
      payload.status === "SUCCESS" ||
      eventType.includes("SUCCESS")
    ) {
      await LedgerService.recordWithdrawalDisbursementLedger({
        withdrawalId: withdrawal.id,
        teacherId: withdrawal.teacherId,
        amountPaise: withdrawal.amountPaise,
        referenceId: utr,
      });

      if (withdrawal.teacher.userId) {
        await EventService.emit("payout.processed" as any, {
          userId: withdrawal.teacher.userId,
          data: {
            title: "Withdrawal Settled & Paid 🎉",
            message: `Your payout of ₹${withdrawal.amountPaise / 100} has been disbursed (Ref: ${utr}).`,
            actionUrl: "/teacher/earnings",
            withdrawalId: withdrawal.id,
            referenceId: utr,
          },
        }).catch(() => {});
      }

      return { processed: true, status: "COMPLETED", withdrawalId: withdrawal.id };
    } else if (
      eventType === "TRANSFER_FAILED" ||
      eventType === "TRANSFER_REVERSED" ||
      payload.status === "FAILED" ||
      payload.status === "REVERSED" ||
      eventType.includes("FAILED") ||
      eventType.includes("REVERSED")
    ) {
      // Releasing the hold automatically by setting status to FAILED
      await prisma.withdrawalRequest.update({
        where: { id: withdrawal.id },
        data: {
          status: "FAILED",
          failedAt: new Date(),
          failureReason,
        },
      });

      if (withdrawal.teacher.userId) {
        await EventService.emit("payout.processed" as any, {
          userId: withdrawal.teacher.userId,
          data: {
            title: "Withdrawal Failed ⚠️",
            message: `Your withdrawal of ₹${withdrawal.amountPaise / 100} could not be completed: ${failureReason}. Funds have been restored to your balance.`,
            actionUrl: "/teacher/earnings",
            withdrawalId: withdrawal.id,
            reason: failureReason,
          },
        }).catch(() => {});
      }

      return { processed: true, status: "FAILED", withdrawalId: withdrawal.id };
    }

    return { processed: false, reason: `UNHANDLED_EVENT_${eventType}` };
  }
}
