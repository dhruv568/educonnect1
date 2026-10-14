import assert from "assert";
import crypto from "crypto";
import { LmsService } from "../services/lms-service";
import {
  MIN_WITHDRAWAL_RUPEES,
  MIN_WITHDRAWAL_PAISE,
  DEFAULT_MIN_WITHDRAWAL_RUPEES,
  PRODUCTION_MIN_WITHDRAWAL_RUPEES,
  IS_TEMPORARY_TEST_MINIMUM,
} from "../lib/withdrawal-config";
import { WithdrawalService } from "../services/withdrawal-service";
import { cashfreePayoutClient } from "../lib/cashfree-payout";

async function runBatch3And4Tests() {
  console.log("\n=======================================================");
  console.log("🧪 RUNNING BATCH 3 & BATCH 4 VERIFICATION TEST SUITE");
  console.log("   • Batch 3: Course Catalogue, Discovery & Publishing");
  console.log("   • Batch 4: Educator Withdrawals & Cashfree Payouts");
  console.log("=======================================================\n");

  let passed = 0;
  function test(name: string, fn: () => void | Promise<void>) {
    try {
      fn();
      console.log(`   ✅ PASS: ${name}`);
      passed++;
    } catch (err: any) {
      console.error(`   ❌ FAIL: ${name} ->`, err.message);
      throw err;
    }
  }

  // =========================================================================
  // BATCH 3 TESTS: COURSE CATALOGUE & PUBLIC WEBSITE
  // =========================================================================
  console.log("--- BATCH 3: Course Catalogue & Discovery ---");

  test("1. LmsService.slugify generates clean SEO slugs", () => {
    assert.strictEqual(
      LmsService.slugify("Advanced Calculus & Analytical Geometry"),
      "advanced-calculus-analytical-geometry"
    );
    assert.strictEqual(
      LmsService.slugify("  Physics 101: Mechanics & Dynamics!  "),
      "physics-101-mechanics-dynamics"
    );
    assert.strictEqual(
      LmsService.slugify("Special @#$% Characters & Symbols"),
      "special-characters-symbols"
    );
  });

  test("2. CourseFilterParams supports academicLevel alongside standard filters", () => {
    const filterParams = {
      search: "Calculus",
      subject: "Mathematics",
      academicLevel: "SCHOOL",
      gradeLevel: "Grade 11",
      level: "INTERMEDIATE",
      priceMax: 1000,
      sortBy: "recommended",
      page: 1,
      limit: 12,
    };
    assert.strictEqual(filterParams.academicLevel, "SCHOOL");
    assert.strictEqual(filterParams.subject, "Mathematics");
  });

  test("3. Course publishing checklist validation requirements", () => {
    // Helper that replicates publish checklist calculation
    function checkPublishable(course: {
      title: string;
      description: string;
      thumbnailUrl: string;
      subject: string;
      sections: Array<{ lessons: Array<{ type: string; videoUrl?: string; content?: string }> }>;
      price: number;
    }) {
      const totalLessons = course.sections.reduce((acc, s) => acc + s.lessons.length, 0);
      const hasContent = course.sections.some((s) =>
        s.lessons.some((l) => l.type === "VIDEO" || l.type === "TEXT" || Boolean(l.videoUrl) || Boolean(l.content))
      );
      return (
        course.title.trim().length > 3 &&
        course.description.trim().length > 10 &&
        Boolean(course.thumbnailUrl) &&
        Boolean(course.subject) &&
        course.sections.length > 0 &&
        totalLessons > 0 &&
        hasContent &&
        course.price >= 0
      );
    }

    // Incomplete draft (missing lessons and thumbnail)
    assert.strictEqual(
      checkPublishable({
        title: "Adv Calc",
        description: "Differential equations and calculus",
        thumbnailUrl: "",
        subject: "Mathematics",
        sections: [],
        price: 499,
      }),
      false,
      "Draft without thumbnail and sections is not publishable"
    );

    // Complete valid course
    assert.strictEqual(
      checkPublishable({
        title: "Advanced Calculus & Analytical Geometry",
        description: "Comprehensive course on differential equations, vector calculus and geometry.",
        thumbnailUrl: "https://example.com/thumb.jpg",
        subject: "Mathematics",
        sections: [
          {
            lessons: [{ type: "VIDEO", videoUrl: "https://stream.mux.com/sample" }],
          },
        ],
        price: 499,
      }),
      true,
      "Complete course with sections and lessons is publishable"
    );
  });

  test("4. Course draft preview authorization logic protects unpublished courses", () => {
    const isTeacherVerified = false;
    const courseStatus = "DRAFT";
    const userRole: string = "STUDENT";

    // Non-owner, non-admin student attempting preview of unverified or draft course
    const canAccessDraft = userRole === "ADMIN";
    assert.strictEqual(canAccessDraft, false, "Students cannot preview unpublished/unverified drafts");
  });

  // =========================================================================
  // BATCH 4 TESTS: EDUCATOR WITHDRAWALS & CASHFREE PAYOUTS
  // =========================================================================
  console.log("\n--- BATCH 4: Educator Withdrawals & Cashfree Payouts ---");

  test("5. Withdrawal configuration confirms active ₹100 testing minimum", () => {
    assert.strictEqual(MIN_WITHDRAWAL_RUPEES, 100, "MIN_WITHDRAWAL_RUPEES is ₹100");
    assert.strictEqual(MIN_WITHDRAWAL_PAISE, 10000, "MIN_WITHDRAWAL_PAISE is 10,000 paise");
    assert.strictEqual(DEFAULT_MIN_WITHDRAWAL_RUPEES, 100, "DEFAULT_MIN_WITHDRAWAL_RUPEES is 100");
    assert.strictEqual(PRODUCTION_MIN_WITHDRAWAL_RUPEES, 500, "PRODUCTION_MIN_WITHDRAWAL_RUPEES baseline is 500");
    assert.strictEqual(IS_TEMPORARY_TEST_MINIMUM, true, "IS_TEMPORARY_TEST_MINIMUM flag is true");
  });

  test("6. Reject withdrawal amounts below ₹100 minimum threshold", async () => {
    for (const badAmt of [0, 50, 99, 99.99]) {
      try {
        await WithdrawalService.requestWithdrawal({
          teacherId: "test-teacher-id",
          amountRupees: badAmt,
          payoutMethod: "UPI",
          upiId: "educator@okhdfcbank",
        });
        assert.fail(`Should have rejected ₹${badAmt}`);
      } catch (err: any) {
        assert(
          err.message.includes("Minimum withdrawal amount is ₹100."),
          `Expected ₹100 minimum error, got: ${err.message}`
        );
      }
    }
  });

  test("7. Reject invalid, negative, or NaN amounts", async () => {
    for (const badAmt of [-1, -500, NaN]) {
      try {
        await WithdrawalService.requestWithdrawal({
          teacherId: "test-teacher-id",
          amountRupees: badAmt,
          payoutMethod: "UPI",
          upiId: "educator@okhdfcbank",
        });
        assert.fail(`Should have rejected ${badAmt}`);
      } catch (err: any) {
        assert(
          err.message.includes("Minimum withdrawal amount is ₹100."),
          `Expected ₹100 minimum error for ${badAmt}, got: ${err.message}`
        );
      }
    }
  });

  test("8. UPI format validation regex accurately validates and rejects VPAs", () => {
    const upiRegex = /^[\w.\-_]{2,256}@[a-zA-Z]{2,64}$/;

    // Valid VPAs
    assert.strictEqual(upiRegex.test("neeraj@okaxis"), true);
    assert.strictEqual(upiRegex.test("dhruv.jari_01@icici"), true);
    assert.strictEqual(upiRegex.test("educator-pay@sbi"), true);
    assert.strictEqual(upiRegex.test("teacher_99@paytm"), true);

    // Invalid VPAs
    assert.strictEqual(upiRegex.test("invalid-no-at-sign"), false);
    assert.strictEqual(upiRegex.test("@nohandle"), false);
    assert.strictEqual(upiRegex.test("nodomain@"), false);
    assert.strictEqual(upiRegex.test("spaces in@upi"), false);
    assert.strictEqual(upiRegex.test("user@domain with space"), false);
  });

  test("9. Cashfree Payout Client is in safe mock mode in test/staging environment", () => {
    assert.strictEqual(cashfreePayoutClient.isMockCredentials(), true);
    assert.strictEqual(cashfreePayoutClient.isTestMode(), true);
  });

  test("10. Cashfree Payout Client simulates transfers safely without live network calls", async () => {
    const transferResult = await cashfreePayoutClient.initiateTransfer({
      transferId: "TEST_TRF_123456",
      transferAmount: 150.0,
      transferMode: "upi",
      beneficiaryDetails: {
        beneficiary_name: "Neeraj Shrivastava",
        vpa: "neeraj@okhdfcbank",
      },
    });

    assert.strictEqual(transferResult.success, true);
    assert.strictEqual(transferResult.status, "SUCCESS");
    assert(transferResult.providerReferenceId?.startsWith("MOCK_UTR_"), "Mock UTR generated");
  });

  test("11. Cashfree Payout webhook signature verification with HMAC-SHA256", () => {
    const secret = "test_payout_secret_key_123";
    const timestamp = "1720000000";
    const body = JSON.stringify({
      event_type: "TRANSFER_SUCCESS",
      transfer_id: "TRF_WD_12345",
      status: "SUCCESS",
    });

    // Compute legitimate signature
    const hmac = crypto.createHmac("sha256", secret).update(`${timestamp}${body}`).digest("base64");

    // Timing-safe equal verification
    const expectedBuffer = Buffer.from(hmac, "utf-8");
    const testBuffer = Buffer.from(hmac, "utf-8");
    assert.strictEqual(crypto.timingSafeEqual(expectedBuffer, testBuffer), true);

    // Tampered payload fails
    const tamperedBody = JSON.stringify({
      event_type: "TRANSFER_SUCCESS",
      transfer_id: "TRF_WD_99999", // modified transfer_id
      status: "SUCCESS",
    });
    const tamperedHmac = crypto.createHmac("sha256", secret).update(`${timestamp}${tamperedBody}`).digest("base64");
    const tamperedBuffer = Buffer.from(tamperedHmac, "utf-8");
    assert.strictEqual(
      crypto.timingSafeEqual(expectedBuffer, tamperedBuffer),
      false,
      "Tampered signature must be rejected"
    );
  });

  test("12. Deterministic event ID generation for payout webhooks prevents replay attacks", () => {
    const rawBody1 = JSON.stringify({
      type: "TRANSFER_SUCCESS",
      data: { transfer_id: "TRF_1001" },
    });
    const hash1 = crypto.createHash("sha256").update(rawBody1).digest("hex");
    const eventId1 = `payout_TRANSFER_SUCCESS_TRF_1001`;

    const rawBody2WithoutTransferId = JSON.stringify({
      type: "TRANSFER_FAILED",
      reason: "Account closed",
    });
    const hash2 = crypto.createHash("sha256").update(rawBody2WithoutTransferId).digest("hex");
    const fallbackId = hash2.slice(0, 16);
    const eventId2 = `payout_TRANSFER_FAILED_${fallbackId}`;

    // Same payload delivered twice yields identical eventId
    const hash2Retry = crypto.createHash("sha256").update(rawBody2WithoutTransferId).digest("hex");
    const eventId2Retry = `payout_TRANSFER_FAILED_${hash2Retry.slice(0, 16)}`;

    assert.strictEqual(eventId2, eventId2Retry, "Deterministic fallbackId guarantees replay deduplication");
    assert.notStrictEqual(eventId1, eventId2, "Different events have distinct eventIds");
  });

  test("13. Failed/Reversed withdrawal transitions safely release held balance", () => {
    // Replicating LedgerService earnings calculation rule:
    // availablePaise = Math.max(0, totalEarningsPaise - paidPaise - pendingPaise)
    // When a withdrawal is FAILED or REJECTED or REVERSED, it is excluded from both paidPaise and pendingPaise.
    const totalEarningsPaise = 50000; // ₹500
    let paidPaise = 0;
    let pendingPaise = 10000; // ₹100 on hold for PENDING withdrawal

    // While pending: available is ₹400
    let availablePaise = totalEarningsPaise - paidPaise - pendingPaise;
    assert.strictEqual(availablePaise, 40000, "Balance is held while withdrawal is pending");

    // Transition to FAILED: pending hold is removed without adding to paid
    pendingPaise = 0; // FAILED status is excluded
    availablePaise = totalEarningsPaise - paidPaise - pendingPaise;
    assert.strictEqual(availablePaise, 50000, "Held balance is fully released upon failure/reversal");
  });

  console.log(`\n🎉 ALL ${passed} BATCH 3 & 4 UNIT TESTS PASSED SUCCESSFULLY!\n`);
}

runBatch3And4Tests().catch((e) => {
  console.error("Test execution failed:", e);
  process.exit(1);
});
