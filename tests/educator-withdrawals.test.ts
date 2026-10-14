import { prisma } from "../lib/prisma";
import { WithdrawalService, MIN_WITHDRAWAL_RUPEES } from "../services/withdrawal-service";
import { LedgerService } from "../services/ledger-service";
import { cashfreePayoutClient } from "../lib/cashfree-payout";
import crypto from "crypto";

async function runEducatorWithdrawalTests() {
  console.log("\n=======================================================");
  console.log("🧪 STARTING EDUCATOR WITHDRAWAL & CASHFREE PAYOUT TESTS");
  console.log("=======================================================\n");

  const originalEnv = { ...process.env };
  process.env.EMAIL_PROVIDER = "console";
  let passedCount = 0;

  function assert(condition: boolean, message: string) {
    if (!condition) {
      console.error(`❌ Assertion Failed: ${message}`);
      throw new Error(`Assertion failed: ${message}`);
    }
    console.log(`   ✅ ${message}`);
    passedCount++;
  }

  const timestamp = Date.now();
  const randomSuffix = crypto.randomBytes(4).toString("hex");

  // Connect to DB
  for (let attempt = 1; attempt <= 5; attempt++) {
    try {
      await prisma.$connect();
      break;
    } catch (connErr) {
      if (attempt === 5) throw connErr;
      await new Promise((r) => setTimeout(r, 2000));
    }
  }

  let testTeacherUser: any;
  let testTeacherProfile: any;
  let adminUser: any;

  try {
    // -------------------------------------------------------------
    // Setup: Create Test Educator & Test Admin
    // -------------------------------------------------------------
    console.log("🛠️ Setting up test educator and ledger records...");

    adminUser = await prisma.user.create({
      data: {
        email: `admin_wd_${randomSuffix}@test.educonnects.com`,
        passwordHash: "hash_admin_123",
        role: "ADMIN",
        status: "ACTIVE",
        emailVerified: true,
      },
    });

    testTeacherUser = await prisma.user.create({
      data: {
        email: `teacher_wd_${randomSuffix}@test.educonnects.com`,
        passwordHash: "hash_teacher_123",
        role: "TEACHER",
        status: "ACTIVE",
        emailVerified: true,
        profile: {
          create: {
            firstName: "Suresh",
            lastName: "Menon",
            phone: "9876543210",
          },
        },
      },
      include: { profile: true },
    });

    testTeacherProfile = await prisma.teacherProfile.create({
      data: {
        userId: testTeacherUser.id,
        bio: "Senior Physics Educator",
        headline: "Physics & Engineering",
        verificationStatus: "VERIFIED",
        accountHolderName: "Suresh Menon",
        accountNumber: "918273645544",
        bankName: "HDFC Bank",
        ifscCode: "HDFC0001234",
        upiId: `suresh_${randomSuffix}@okhdfcbank`,
      },
    });

    // Credit ₹10,000 (1,000,000 paise) earnings to educator ledger
    await prisma.financialLedgerEntry.create({
      data: {
        teacherId: testTeacherProfile.id,
        type: "TEACHER_EARNING",
        amountPaise: 1000000, // ₹10,000
        currency: "INR",
        direction: "CREDIT",
        status: "COMPLETED",
        description: "Initial Test Course Sales Revenue",
      },
    });

    const initialSummary = await LedgerService.getTeacherEarningsSummary(testTeacherProfile.id);
    assert(initialSummary.totalEarnings === 10000, "Initial gross earnings are ₹10,000");
    assert(initialSummary.availableAmount === 10000, "Initial available balance is ₹10,000");
    assert(initialSummary.pendingAmount === 0, "Initial pending amount is ₹0");

    // -------------------------------------------------------------
    // Test 1: Minimum Limit & Over-Withdrawal Validation
    // -------------------------------------------------------------
    console.log("\n🛡️ 1. Testing Minimum Limit & Balance Validation...");

    // Amount below minimum limit should fail
    try {
      await WithdrawalService.requestWithdrawal({
        teacherId: testTeacherProfile.id,
        amountRupees: Math.max(1, MIN_WITHDRAWAL_RUPEES - 50),
        payoutMethod: "BANK_TRANSFER",
      });
      assert(false, `Should have rejected withdrawal below ₹${MIN_WITHDRAWAL_RUPEES}`);
    } catch (err: any) {
      assert(
        err.message.includes(`Minimum withdrawal amount is ₹${MIN_WITHDRAWAL_RUPEES}`),
        `Rejected amount below minimum limit (₹${MIN_WITHDRAWAL_RUPEES})`
      );
    }

    // Amount exceeding available balance should fail
    try {
      await WithdrawalService.requestWithdrawal({
        teacherId: testTeacherProfile.id,
        amountRupees: 15000,
        payoutMethod: "BANK_TRANSFER",
      });
      assert(false, "Should have rejected withdrawal exceeding available balance");
    } catch (err: any) {
      assert(err.message.includes("INSUFFICIENT_BALANCE"), "Rejected amount exceeding available balance");
    }

    // -------------------------------------------------------------
    // Test 2: Withdrawal Request Submission & Balance Hold
    // -------------------------------------------------------------
    console.log("\n💰 2. Testing Withdrawal Submission & Escrow Balance Hold...");

    const req1 = await WithdrawalService.requestWithdrawal({
      teacherId: testTeacherProfile.id,
      amountRupees: 2000,
      payoutMethod: "BANK_TRANSFER",
      idempotencyKey: `idem_1_${randomSuffix}`,
    });

    assert(req1.withdrawal.status === "PENDING", "Withdrawal request created with status PENDING");
    assert(req1.withdrawal.amountPaise === 200000, "Amount stored in canonical paise (200000 paise = ₹2,000)");
    assert(req1.withdrawal.accountNumber === "918273645544", "Snapshot of educator bank account recorded");

    // Check balance hold
    const holdSummary = await LedgerService.getTeacherEarningsSummary(testTeacherProfile.id);
    assert(holdSummary.pendingAmount === 2000, "Pending amount increased to ₹2,000 (Escrow hold)");
    assert(holdSummary.availableAmount === 8000, "Available balance reduced by exact withdrawal amount (₹8,000)");

    // -------------------------------------------------------------
    // Test 3: Duplicate & Overlapping Request Prevention
    // -------------------------------------------------------------
    console.log("\n🔒 3. Testing Duplicate / Overlapping Withdrawal Prevention...");

    try {
      await WithdrawalService.requestWithdrawal({
        teacherId: testTeacherProfile.id,
        amountRupees: 1000,
        payoutMethod: "BANK_TRANSFER",
      });
      assert(false, "Should have rejected overlapping withdrawal request");
    } catch (err: any) {
      assert(err.message.includes("ACTIVE_WITHDRAWAL_EXISTS"), "Prevented duplicate overlapping withdrawal while another is in progress");
    }

    // Idempotent retry with same idempotency key returns existing request
    const retryReq = await WithdrawalService.requestWithdrawal({
      teacherId: testTeacherProfile.id,
      amountRupees: 2000,
      payoutMethod: "BANK_TRANSFER",
      idempotencyKey: `idem_1_${randomSuffix}`,
    });
    assert(retryReq.withdrawal.id === req1.withdrawal.id, "Idempotent submission returns existing request without double deduction");

    // -------------------------------------------------------------
    // Test 4: Admin Rejection & Automatic Balance Restoration
    // -------------------------------------------------------------
    console.log("\n↩️ 4. Testing Admin Rejection & Balance Release Guarantee...");

    const rejectedWd = await WithdrawalService.rejectWithdrawal({
      withdrawalId: req1.withdrawal.id,
      adminUserId: adminUser.id,
      rejectionReason: "Bank IFSC code under maintenance. Please update details.",
    });

    assert(rejectedWd.status === "REJECTED", "Withdrawal status updated to REJECTED");
    assert(Boolean(rejectedWd.rejectionReason?.includes("maintenance")), "Rejection reason saved");

    // Verify balance is completely restored
    const restoredSummary = await LedgerService.getTeacherEarningsSummary(testTeacherProfile.id);
    assert(restoredSummary.pendingAmount === 0, "Pending escrow hold cleared to ₹0");
    assert(restoredSummary.availableAmount === 10000, "Available balance completely restored to ₹10,000");

    // -------------------------------------------------------------
    // Test 5: UPI Withdrawal, Admin Approval & Cashfree Payout
    // -------------------------------------------------------------
    console.log("\n⚡ 5. Testing UPI Payout Flow via Cashfree Payouts...");

    const req2 = await WithdrawalService.requestWithdrawal({
      teacherId: testTeacherProfile.id,
      amountRupees: 3000,
      payoutMethod: "UPI",
      upiId: `suresh_upi_${randomSuffix}@okhdfcbank`,
    });

    assert(req2.withdrawal.status === "PENDING", "UPI Withdrawal request created");
    assert(req2.withdrawal.payoutMethod === "UPI", "Payout method marked UPI");
    assert(req2.withdrawal.upiId === `suresh_upi_${randomSuffix}@okhdfcbank`, "UPI ID snapshotted accurately");

    // Admin approves with automated Cashfree Payout disburse
    const approveResult = await WithdrawalService.approveWithdrawal({
      withdrawalId: req2.withdrawal.id,
      adminUserId: adminUser.id,
      adminNotes: "Approved for regular weekly payout",
      autoDisburse: true,
    });

    assert(approveResult.success === true, "Cashfree Payout transfer executed successfully");
    assert(approveResult.withdrawal?.status === "COMPLETED", "Withdrawal transitioned to COMPLETED");
    assert(Boolean(approveResult.withdrawal?.providerReferenceId), "Provider reference ID / UTR saved");

    // Verify double-entry ledger debit
    const ledgerDebit = await prisma.financialLedgerEntry.findFirst({
      where: {
        teacherId: testTeacherProfile.id,
        type: "TRANSFER",
        direction: "DEBIT",
      },
    });

    assert(ledgerDebit !== null, "Double-entry FinancialLedgerEntry DEBIT created for disbursement");
    assert(ledgerDebit!.amountPaise === 300000, "Ledger debited exact withdrawal amount (₹3,000)");

    // Verify balance metrics after completion
    const postCompleteSummary = await LedgerService.getTeacherEarningsSummary(testTeacherProfile.id);
    assert(postCompleteSummary.availableAmount === 7000, "Available balance accurately reduced to ₹7,000");
    assert(postCompleteSummary.pendingAmount === 0, "Pending amount is ₹0 after completion");

    // -------------------------------------------------------------
    // Test 6: Failed Payout Webhook & Balance Restoration
    // -------------------------------------------------------------
    console.log("\n🔄 6. Testing Payout Webhook & Failure Balance Restoration...");

    const req3 = await WithdrawalService.requestWithdrawal({
      teacherId: testTeacherProfile.id,
      amountRupees: 2500,
      payoutMethod: "BANK_TRANSFER",
    });

    // Manually mark as PROCESSING to simulate gateway transfer in flight
    const mockTransferId = `TRF_MOCK_${randomSuffix}`;
    await prisma.withdrawalRequest.update({
      where: { id: req3.withdrawal.id },
      data: {
        status: "PROCESSING",
        providerTransferId: mockTransferId,
      },
    });

    const midSummary = await LedgerService.getTeacherEarningsSummary(testTeacherProfile.id);
    assert(midSummary.availableAmount === 4500, "Available balance reduced by held ₹2,500 to ₹4,500");

    // Simulate Cashfree Webhook callback: TRANSFER_FAILED
    const webhookPayload = {
      event_type: "TRANSFER_FAILED",
      transfer_id: mockTransferId,
      data: {
        transfer: {
          transfer_id: mockTransferId,
          failure_reason: "Beneficiary bank account blocked or frozen",
        },
      },
    };

    const webhookResult = await WithdrawalService.processPayoutWebhook(webhookPayload);
    assert(webhookResult.processed === true, "Cashfree Payout webhook processed");
    assert(webhookResult.status === "FAILED", "Withdrawal transitioned to FAILED state");

    // Verify balance is automatically restored to ₹7,000!
    const failedSummary = await LedgerService.getTeacherEarningsSummary(testTeacherProfile.id);
    assert(failedSummary.availableAmount === 7000, "Failed transfer automatically restored ₹2,500 to available balance (₹7,000)");
    assert(failedSummary.pendingAmount === 0, "Pending balance cleared back to ₹0");

    // -------------------------------------------------------------
    // Test 7: Admin Manual Settlement
    // -------------------------------------------------------------
    console.log("\n🏦 7. Testing Admin Manual Settlement Flow...");

    const req4 = await WithdrawalService.requestWithdrawal({
      teacherId: testTeacherProfile.id,
      amountRupees: 1000,
      payoutMethod: "BANK_TRANSFER",
    });

    const manualCompleteResult = await WithdrawalService.manualCompleteWithdrawal({
      withdrawalId: req4.withdrawal.id,
      adminUserId: adminUser.id,
      referenceId: `HDFC_NEFT_${randomSuffix}`,
      adminNotes: "Manually transferred via HDFC Corporate Portal",
    });

    assert(manualCompleteResult.status === "COMPLETED", "Withdrawal marked as COMPLETED manually");
    assert(manualCompleteResult.providerReferenceId === `HDFC_NEFT_${randomSuffix}`, "Bank UTR / IMPS ref saved");

    const finalSummary = await LedgerService.getTeacherEarningsSummary(testTeacherProfile.id);
    assert(finalSummary.availableAmount === 6000, "Final available balance is ₹6,000");

    console.log(`\n🎉 ALL ${passedCount} EDUCATOR WITHDRAWAL & PAYOUT TESTS PASSED!\n`);
  } finally {
    // Cleanup test records
    console.log("🧹 Cleaning up test database records...");
    if (testTeacherProfile) {
      await prisma.withdrawalRequest.deleteMany({ where: { teacherId: testTeacherProfile.id } });
      await prisma.financialLedgerEntry.deleteMany({ where: { teacherId: testTeacherProfile.id } });
      await prisma.teacherProfile.delete({ where: { id: testTeacherProfile.id } }).catch(() => {});
    }
    if (testTeacherUser) {
      await prisma.profile.deleteMany({ where: { userId: testTeacherUser.id } });
      await prisma.user.delete({ where: { id: testTeacherUser.id } }).catch(() => {});
    }
    if (adminUser) {
      await prisma.user.delete({ where: { id: adminUser.id } }).catch(() => {});
    }
    await prisma.$disconnect();
    process.env = originalEnv;
  }
}

runEducatorWithdrawalTests().catch((err) => {
  console.error("❌ Test suite encountered fatal error:", err);
  process.exit(1);
});
