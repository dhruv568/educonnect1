import assert from "assert";
import {
  MIN_WITHDRAWAL_RUPEES,
  MIN_WITHDRAWAL_PAISE,
  DEFAULT_MIN_WITHDRAWAL_RUPEES,
  PRODUCTION_MIN_WITHDRAWAL_RUPEES,
  MIN_PAYOUT_RUPEES,
  MIN_PAYOUT_PAISE,
} from "../lib/withdrawal-config";
import { WithdrawalService } from "../services/withdrawal-service";

async function runWithdrawalMinValidationTests() {
  console.log("\n=======================================================");
  console.log("🧪 RUNNING EDUCATOR PAYOUT MINIMUM VALIDATION TESTS");
  console.log("=======================================================\n");

  let passed = 0;
  function test(name: string, fn: () => void | Promise<void>) {
    try {
      const res = fn();
      if (res && typeof (res as any).then === "function") {
        return (res as Promise<void>).then(() => {
          console.log(`   ✅ PASS: ${name}`);
          passed++;
        });
      }
      console.log(`   ✅ PASS: ${name}`);
      passed++;
    } catch (err: any) {
      console.error(`   ❌ FAIL: ${name} ->`, err.message);
      throw err;
    }
  }

  // 1. Verify Configuration Constants reflect ₹2,500 requirement
  test("Configuration constants reflect ₹2,500 minimum payout requirement", () => {
    assert.strictEqual(MIN_WITHDRAWAL_RUPEES, 2500, "MIN_WITHDRAWAL_RUPEES is 2,500");
    assert.strictEqual(MIN_WITHDRAWAL_PAISE, 250000, "MIN_WITHDRAWAL_PAISE is 250,000 paise (₹2,500)");
    assert.strictEqual(DEFAULT_MIN_WITHDRAWAL_RUPEES, 2500, "DEFAULT_MIN_WITHDRAWAL_RUPEES is 2,500");
    assert.strictEqual(PRODUCTION_MIN_WITHDRAWAL_RUPEES, 2500, "PRODUCTION_MIN_WITHDRAWAL_RUPEES baseline is 2,500");
    assert.strictEqual(MIN_PAYOUT_RUPEES, 2500, "MIN_PAYOUT_RUPEES is 2,500");
    assert.strictEqual(MIN_PAYOUT_PAISE, 250000, "MIN_PAYOUT_PAISE is 250,000 paise");
  });

  // 2. Manual withdrawal requests are blocked
  test("Reject manual withdrawal requests when manual withdrawals are removed", async () => {
    try {
      await WithdrawalService.requestWithdrawal({
        teacherId: "dummy-teacher-id",
        amountRupees: 5000,
        payoutMethod: "BANK_TRANSFER",
      });
      assert.fail("Should have thrown MANUAL_WITHDRAWALS_DISABLED");
    } catch (err: any) {
      assert(
        err.message.includes("MANUAL_WITHDRAWALS_DISABLED"),
        `Expected MANUAL_WITHDRAWALS_DISABLED, got: ${err.message}`
      );
    }
  });

  // 3. Amounts below ₹2,500 fail minimum check when override is provided
  for (const invalidAmt of [0, 25, 100, 500, 1500, 2499]) {
    await test(`Reject withdrawal amount of ₹${invalidAmt} below ₹2,500 minimum`, async () => {
      try {
        await WithdrawalService.requestWithdrawal({
          teacherId: "dummy-teacher-id",
          amountRupees: invalidAmt,
          payoutMethod: "BANK_TRANSFER",
          allowManualOverride: true,
        });
        assert.fail(`Should have thrown for ₹${invalidAmt}`);
      } catch (err: any) {
        assert(
          err.message.includes(`Minimum withdrawal amount is ₹2500.`),
          `Expected error message containing 'Minimum withdrawal amount is ₹2500.', got: ${err.message}`
        );
      }
    });
  }

  // 4. Negative and NaN amounts fail
  test("Reject negative and NaN withdrawal amounts", async () => {
    for (const badAmt of [-10, -500, NaN]) {
      try {
        await WithdrawalService.requestWithdrawal({
          teacherId: "dummy-teacher-id",
          amountRupees: badAmt,
          payoutMethod: "BANK_TRANSFER",
          allowManualOverride: true,
        });
        assert.fail(`Should have thrown for ${badAmt}`);
      } catch (err: any) {
        assert(
          err.message.includes("Minimum withdrawal amount is ₹2500."),
          `Expected minimum withdrawal error for ${badAmt}, got: ${err.message}`
        );
      }
    }
  });

  // 5. Amounts >= ₹2,500 pass minimum check and proceed to teacher lookup
  for (const validAmt of [2500, 3000, 5000, 10000]) {
    await test(`Amount ₹${validAmt} (>= ₹2,500) passes minimum check`, async () => {
      try {
        await WithdrawalService.requestWithdrawal({
          teacherId: "nonexistent-test-teacher-id",
          amountRupees: validAmt,
          payoutMethod: "BANK_TRANSFER",
          allowManualOverride: true,
        });
      } catch (err: any) {
        assert(
          !err.message.includes("INVALID_AMOUNT"),
          `Amount ₹${validAmt} should NOT trigger INVALID_AMOUNT. Received: ${err.message}`
        );
        assert(
          err.message.includes("NOT_FOUND") || err.message.includes("Prisma") || err.message.includes("connection"),
          `Expected NOT_FOUND or DB error, got: ${err.message}`
        );
      }
    });
  }

  console.log(`\n🎉 ALL ${passed} MINIMUM VALIDATION TESTS PASSED!\n`);
}

runWithdrawalMinValidationTests().catch((e) => {
  console.error("Test execution failed:", e);
  process.exit(1);
});
