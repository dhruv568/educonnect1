import assert from "assert";
import {
  MIN_WITHDRAWAL_RUPEES,
  MIN_WITHDRAWAL_PAISE,
  DEFAULT_MIN_WITHDRAWAL_RUPEES,
  PRODUCTION_MIN_WITHDRAWAL_RUPEES,
  IS_TEMPORARY_TEST_MINIMUM,
} from "../lib/withdrawal-config";
import { WithdrawalService } from "../services/withdrawal-service";

async function runWithdrawalMinValidationTests() {
  console.log("\n=======================================================");
  console.log("🧪 RUNNING EDUCATOR WITHDRAWAL MINIMUM VALIDATION TESTS");
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

  // 1. Verify Configuration Constants
  test("Configuration constants reflect temporary ₹100 testing minimum", () => {
    assert.strictEqual(MIN_WITHDRAWAL_RUPEES, 100, "MIN_WITHDRAWAL_RUPEES is 100");
    assert.strictEqual(MIN_WITHDRAWAL_PAISE, 10000, "MIN_WITHDRAWAL_PAISE is 10,000 paise (₹100)");
    assert.strictEqual(DEFAULT_MIN_WITHDRAWAL_RUPEES, 100, "DEFAULT_MIN_WITHDRAWAL_RUPEES is 100");
    assert.strictEqual(PRODUCTION_MIN_WITHDRAWAL_RUPEES, 500, "PRODUCTION_MIN_WITHDRAWAL_RUPEES baseline is 500");
    assert.strictEqual(IS_TEMPORARY_TEST_MINIMUM, true, "IS_TEMPORARY_TEST_MINIMUM flag is active");
  });

  // 2. Amounts below ₹100 must fail minimum check
  for (const invalidAmt of [0, 25, 50, 99, 99.99]) {
    await test(`Reject withdrawal amount of ₹${invalidAmt} below ₹100 minimum`, async () => {
      try {
        await WithdrawalService.requestWithdrawal({
          teacherId: "dummy-teacher-id",
          amountRupees: invalidAmt,
          payoutMethod: "BANK_TRANSFER",
        });
        assert.fail(`Should have thrown for ₹${invalidAmt}`);
      } catch (err: any) {
        assert(
          err.message.includes(`Minimum withdrawal amount is ₹100.`),
          `Expected error message containing 'Minimum withdrawal amount is ₹100.', got: ${err.message}`
        );
      }
    });
  }

  // 3. Negative and NaN amounts must fail
  test("Reject negative and NaN withdrawal amounts", async () => {
    for (const badAmt of [-10, -100, NaN]) {
      try {
        await WithdrawalService.requestWithdrawal({
          teacherId: "dummy-teacher-id",
          amountRupees: badAmt,
          payoutMethod: "BANK_TRANSFER",
        });
        assert.fail(`Should have thrown for ${badAmt}`);
      } catch (err: any) {
        assert(
          err.message.includes("Minimum withdrawal amount is ₹100."),
          `Expected minimum withdrawal error for ${badAmt}, got: ${err.message}`
        );
      }
    }
  });

  // 4. Amounts between ₹100 and ₹499 MUST PASS the minimum check (and proceed to teacher lookup)
  for (const validAmt of [100, 150, 250, 399, 499]) {
    await test(`Amount ₹${validAmt} (between ₹100 and ₹499) passes minimum check`, async () => {
      try {
        await WithdrawalService.requestWithdrawal({
          teacherId: "nonexistent-test-teacher-id",
          amountRupees: validAmt,
          payoutMethod: "BANK_TRANSFER",
        });
        // If teacher doesn't exist, it should throw NOT_FOUND or DB connection error, NOT INVALID_AMOUNT
      } catch (err: any) {
        assert(
          !err.message.includes("INVALID_AMOUNT"),
          `Amount ₹${validAmt} should NOT trigger INVALID_AMOUNT. Received: ${err.message}`
        );
        // It successfully passed step 1 (minimum check) and moved to step 2 (teacher lookup)
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
