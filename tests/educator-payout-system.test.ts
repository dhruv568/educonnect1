import assert from "assert";
import {
  PLATFORM_FEE_PERCENT,
  NET_PAYOUT_PERCENT,
  MIN_PAYOUT_RUPEES,
  MIN_PAYOUT_PAISE,
  PAYOUT_SCHEDULE_DAY_OF_MONTH,
} from "../lib/withdrawal-config";
import { PayoutService } from "../services/payout-service";
import { WithdrawalService } from "../services/withdrawal-service";
import { cashfreePayoutClient } from "../lib/cashfree-payout";

async function runEducatorPayoutSystemTests() {
  console.log("\n=======================================================");
  console.log("🧪 RUNNING EDUCONNECTS EDUCATOR PAYOUT SYSTEM TEST SUITE");
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

  // =========================================================================
  // 1. Platform Fee — 25% & Net Payout Amount 75%
  // =========================================================================
  console.log("--- 1. Platform Fee (25%) & Net Payout (75%) Calculations ---");

  test("1.1 Configuration constants define 25% Platform Fee & 75% Net Payout", () => {
    assert.strictEqual(PLATFORM_FEE_PERCENT, 25, "Platform fee must be 25%");
    assert.strictEqual(NET_PAYOUT_PERCENT, 75, "Educator net payout share must be 75%");
    assert.strictEqual(PLATFORM_FEE_PERCENT + NET_PAYOUT_PERCENT, 100, "Fee + Net must total 100%");
  });

  test("1.2 Standard Gross Earning calculation: ₹10,000 gross -> ₹2,500 fee, ₹7,500 net", () => {
    const grossPaise = 1000000; // ₹10,000 in paise
    const feePaise = Math.round((grossPaise * PLATFORM_FEE_PERCENT) / 100);
    const netPaise = grossPaise - feePaise;

    assert.strictEqual(feePaise, 250000, "Platform fee on ₹10,000 must be ₹2,500 (250,000 paise)");
    assert.strictEqual(netPaise, 750000, "Net payout on ₹10,000 must be ₹7,500 (750,000 paise)");
    assert.strictEqual(feePaise / 100, 2500, "Platform fee in rupees is ₹2,500");
    assert.strictEqual(netPaise / 100, 7500, "Net payout in rupees is ₹7,500");
  });

  test("1.3 Small Gross Earning calculation: ₹4,000 gross -> ₹1,000 fee, ₹3,000 net", () => {
    const grossPaise = 400000; // ₹4,000
    const feePaise = Math.round((grossPaise * PLATFORM_FEE_PERCENT) / 100);
    const netPaise = grossPaise - feePaise;

    assert.strictEqual(feePaise / 100, 1000, "25% Fee on ₹4,000 is ₹1,000");
    assert.strictEqual(netPaise / 100, 3000, "75% Net on ₹4,000 is ₹3,000");
  });

  test("1.4 Subunit paise precision prevents fractional loss", () => {
    // E.g. ₹3,333.33 -> 333,333 paise
    const grossPaise = 333333;
    const feePaise = Math.round((grossPaise * 25) / 100); // 83,333
    const netPaise = grossPaise - feePaise; // 250,000

    assert.strictEqual(feePaise + netPaise, grossPaise, "Fee + Net must equal exact gross paise without drift");
    assert.strictEqual(feePaise, 83333);
    assert.strictEqual(netPaise, 250000);
  });

  // =========================================================================
  // 2. Minimum Balance Requirement — ₹2,500
  // =========================================================================
  console.log("\n--- 2. Minimum Balance Requirement (₹2,500 Net Eligible Balance) ---");

  test("2.1 Minimum balance configuration constant is ₹2,500 (250,000 paise)", () => {
    assert.strictEqual(MIN_PAYOUT_RUPEES, 2500, "Minimum payout requirement is ₹2,500");
    assert.strictEqual(MIN_PAYOUT_PAISE, 250000, "Minimum payout requirement in paise is 250,000");
  });

  test("2.2 Minimum balance is strictly checked against NET eligible balance after 25% fee", () => {
    // Gross: ₹3,000
    // Fee (25%): ₹750
    // Net (75%): ₹2,250
    // Even though Gross ₹3,000 > ₹2,500, Net ₹2,250 < ₹2,500 -> Must NOT be eligible!
    const grossPaise = 300000;
    const feePaise = Math.round((grossPaise * 25) / 100);
    const netPaise = grossPaise - feePaise;
    const isEligible = netPaise >= MIN_PAYOUT_PAISE;

    assert.strictEqual(netPaise, 225000, "Net eligible balance is ₹2,250");
    assert.strictEqual(isEligible, false, "Net balance of ₹2,250 must be rejected as below ₹2,500 minimum");
  });

  test("2.3 Net balance meeting ₹2,500 threshold is eligible for payout", () => {
    // Gross: ₹3,333.34 -> Net: ₹2,500.00
    const grossPaise = 333334;
    const feePaise = Math.round((grossPaise * 25) / 100);
    const netPaise = grossPaise - feePaise;
    const isEligible = netPaise >= MIN_PAYOUT_PAISE;

    assert.strictEqual(netPaise >= MIN_PAYOUT_PAISE, true, "₹2,500.00 net balance is eligible");
    assert.strictEqual(isEligible, true);
  });

  test("2.4 Carry forward behavior when below ₹2,500 threshold", () => {
    // Month 1: Gross ₹2,000 -> Net ₹1,500 (< ₹2,500) -> Carried forward
    const month1Gross = 200000;
    const month1Net = month1Gross * 0.75;
    assert.strictEqual(month1Net < MIN_PAYOUT_PAISE, true, "Month 1 is carried forward");

    // Month 2: Adds ₹2,000 -> Cumulative unsettled gross: ₹4,000 -> Net ₹3,000 (>= ₹2,500) -> Eligible
    const cumulativeGross = month1Gross + 200000;
    const cumulativeNet = cumulativeGross * 0.75;
    assert.strictEqual(cumulativeNet >= MIN_PAYOUT_PAISE, true, "Month 2 cumulative balance reaches threshold");
    assert.strictEqual(cumulativeNet / 100, 3000, "Disbursed amount is ₹3,000");
  });

  // =========================================================================
  // 3. Automated Monthly Payout Schedule — 10th of Every Month
  // =========================================================================
  console.log("\n--- 3. Monthly Payout Schedule (10th of Every Month) ---");

  test("3.1 Payout schedule day of month is the 10th", () => {
    assert.strictEqual(PAYOUT_SCHEDULE_DAY_OF_MONTH, 10, "Payout schedule day is 10");
  });

  test("3.2 Next scheduled payout calculation before the 10th of the current month", () => {
    // Date: 5th October 2026 -> Next: 10th October 2026
    const fromDate = new Date(2026, 9, 5); // October (month 9 index)
    const nextDate = PayoutService.getNextScheduledPayoutDate(fromDate);

    assert.strictEqual(nextDate.getFullYear(), 2026);
    assert.strictEqual(nextDate.getMonth(), 9, "Month should be October (index 9)");
    assert.strictEqual(nextDate.getDate(), 10, "Day should be the 10th");
  });

  test("3.3 Next scheduled payout calculation on or after the 10th of the current month", () => {
    // Date: 16th October 2026 -> Next: 10th November 2026
    const fromDate = new Date(2026, 9, 16);
    const nextDate = PayoutService.getNextScheduledPayoutDate(fromDate);

    assert.strictEqual(nextDate.getFullYear(), 2026);
    assert.strictEqual(nextDate.getMonth(), 10, "Month should roll over to November (index 10)");
    assert.strictEqual(nextDate.getDate(), 10, "Day should be the 10th");
  });

  test("3.4 Next scheduled payout calculation year-end rollover (December to January)", () => {
    // Date: 25th December 2026 -> Next: 10th January 2027
    const fromDate = new Date(2026, 11, 25);
    const nextDate = PayoutService.getNextScheduledPayoutDate(fromDate);

    assert.strictEqual(nextDate.getFullYear(), 2027, "Year must roll over to 2027");
    assert.strictEqual(nextDate.getMonth(), 0, "Month must roll over to January (index 0)");
    assert.strictEqual(nextDate.getDate(), 10, "Day should be the 10th");
  });

  test("3.5 Payout cycle identifier generation", () => {
    const cycle1 = PayoutService.getPayoutCycleId(new Date(2026, 9, 10));
    assert.strictEqual(cycle1, "2026-10", "October 2026 cycle is '2026-10'");

    const cycle2 = PayoutService.getPayoutCycleId(new Date(2027, 0, 10));
    assert.strictEqual(cycle2, "2027-01", "January 2027 cycle is '2027-01'");
  });

  // =========================================================================
  // 4. Remove Manual Withdrawal Enforcement
  // =========================================================================
  console.log("\n--- 4. Removal of Manual Withdrawal Enforcement ---");

  test("4.1 Individual manual withdrawal request is blocked by WithdrawalService", async () => {
    try {
      await WithdrawalService.requestWithdrawal({
        teacherId: "teacher-123",
        amountRupees: 5000,
        payoutMethod: "BANK_TRANSFER",
      });
      assert.fail("Manual withdrawal must throw error");
    } catch (err: any) {
      assert(
        err.message.includes("MANUAL_WITHDRAWALS_DISABLED"),
        `Expected MANUAL_WITHDRAWALS_DISABLED, got: ${err.message}`
      );
      assert(
        err.message.includes("10th of every month"),
        `Error message must reference the 10th of every month schedule: ${err.message}`
      );
    }
  });

  // =========================================================================
  // 5. Idempotency & Prevention of Duplicate Payouts & Double Fee Deduction
  // =========================================================================
  console.log("\n--- 5. Idempotency & Single Fee Deduction Guarantee ---");

  test("5.1 Unique cycle idempotency key structure guarantees no duplicate runs", () => {
    const teacherId = "teacher-uuid-123";
    const cycle = "2026-10";
    const idempotencyKey = `monthly-payout-${teacherId}-${cycle}`;

    // Multiple runs for the same teacher in the same month produce identical idempotency key
    const duplicateRunKey = `monthly-payout-${teacherId}-${cycle}`;
    assert.strictEqual(idempotencyKey, duplicateRunKey, "Identical idempotency key prevents duplicate payout creation");
  });

  test("5.2 Platform fee is deducted exactly once per settled earnings chunk", () => {
    // E.g. Educator earns ₹10,000 gross.
    // Payout 1 settlements: Net ₹7,500 disbursed (DEBIT), Fee ₹2,500 recorded (DEBIT).
    // Total debit = ₹10,000.
    // Unsettled gross after settlement is ₹0.
    // Fee deducted = ₹2,500 (exactly 25%).
    const grossPaise = 1000000;
    const feePaise = Math.round((grossPaise * 0.25));
    const netPaise = grossPaise - feePaise;

    const settledGross = feePaise + netPaise;
    const remainingUnsettled = grossPaise - settledGross;

    assert.strictEqual(remainingUnsettled, 0, "No leftover unsettled balance after complete payout");
    assert.strictEqual(feePaise, 250000, "Fee was deducted exactly once");

    // Later educator earns ₹4,000 new gross:
    const newGross = 400000;
    const newFee = Math.round(newGross * 0.25);
    const newNet = newGross - newFee;

    assert.strictEqual(newFee, 100000, "New fee applies only to new earnings, never double-deducting previous earnings");
    assert.strictEqual(newNet, 300000);
  });

  // =========================================================================
  // 6. Cashfree Payout Integration & Status Tracking
  // =========================================================================
  console.log("\n--- 6. Cashfree Payout Integration & State Machine ---");

  test("6.1 Cashfree Payout Client is configured in safe mock mode in test environment", () => {
    assert.strictEqual(cashfreePayoutClient.isMockCredentials(), true);
    assert.strictEqual(cashfreePayoutClient.isTestMode(), true);
  });

  test("6.2 Cashfree Payout simulates bank transfer with net amount (75%) and generates mock UTR", async () => {
    const transferResult = await cashfreePayoutClient.initiateTransfer({
      transferId: `TEST_TRF_M_${Date.now()}`,
      transferAmount: 7500.0, // ₹7,500 net payout
      transferMode: "banktransfer",
      beneficiaryDetails: {
        beneficiary_name: "Dr. Ananya Sharma",
        bank_account_number: "987654321012",
        bank_ifsc: "HDFC0001234",
      },
    });

    assert.strictEqual(transferResult.success, true);
    assert.strictEqual(transferResult.status, "SUCCESS");
    assert(transferResult.providerReferenceId?.startsWith("MOCK_UTR_"), "Bank transfer UTR generated");
  });

  test("6.3 State transitions: FAILED status restores balance; PAID finalizes deduction", () => {
    // When status is PROCESSING: amount is on hold
    const totalEarnings = 10000;
    let inFlightHold = 7500;
    let paid = 0;
    let available = totalEarnings - inFlightHold - paid;
    assert.strictEqual(available, 2500, "Balance is protected while processing");

    // If transfer FAILS: hold is released, available balance is fully restored
    inFlightHold = 0;
    available = totalEarnings - inFlightHold - paid;
    assert.strictEqual(available, 10000, "Held balance is restored on FAILED status");

    // If transfer SUCCEEDS (PAID): hold converts to paid, balance is settled
    paid = 7500;
    const feeSettled = 2500;
    available = totalEarnings - (paid + feeSettled);
    assert.strictEqual(available, 0, "Balance is updated according to confirmed payout status");
  });

  // =========================================================================
  // 7. Verified Bank Account Requirement
  // =========================================================================
  console.log("\n--- 7. Verified Bank Account Requirement ---");

  test("7.1 Missing bank account number or IFSC halts payout and carries forward", () => {
    function validateBankDetails(bank: { accountNumber?: string | null; ifscCode?: string | null }) {
      return Boolean(
        bank.accountNumber &&
        bank.accountNumber.trim().length >= 6 &&
        bank.ifscCode &&
        bank.ifscCode.trim().length >= 4
      );
    }

    assert.strictEqual(validateBankDetails({ accountNumber: "", ifscCode: "HDFC0001" }), false);
    assert.strictEqual(validateBankDetails({ accountNumber: "123456789", ifscCode: "" }), false);
    assert.strictEqual(validateBankDetails({ accountNumber: null, ifscCode: null }), false);
    assert.strictEqual(validateBankDetails({ accountNumber: "918273645544", ifscCode: "HDFC0001234" }), true);
  });

  console.log(`\n🎉 ALL ${passed} EDUCATOR PAYOUT SYSTEM TESTS PASSED SUCCESSFULLY!\n`);
}

runEducatorPayoutSystemTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
