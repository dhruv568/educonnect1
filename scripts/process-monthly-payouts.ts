/**
 * Automated Educator Monthly Payout Execution Script
 *
 * Runs on the 10th of every month to disburse educator earnings:
 * 1. Deducts 25% platform fee
 * 2. Checks ₹2,500 minimum net eligible balance requirement
 * 3. Carries forward balance if below ₹2,500
 * 4. Transfers to educator's verified bank account
 * 5. Uses cycle idempotency key to prevent duplicate payouts
 *
 * Usage:
 *   npx tsx scripts/process-monthly-payouts.ts
 *   npx tsx scripts/process-monthly-payouts.ts --dry-run
 */

import { PayoutService } from "../services/payout-service";
import { prisma } from "../lib/prisma";

async function main() {
  const isDryRun = process.argv.includes("--dry-run");

  console.log("\n=======================================================");
  console.log("💰 EDUCONNECTS AUTOMATED MONTHLY EDUCATOR PAYOUT JOB");
  console.log(`   Execution Time: ${new Date().toISOString()}`);
  console.log(`   Mode: ${isDryRun ? "DRY RUN (Preview Only)" : "LIVE EXECUTION"}`);
  console.log("=======================================================\n");

  try {
    const result = await PayoutService.processMonthlyPayouts({
      dryRun: isDryRun,
    });

    console.log(`Cycle: ${result.cycle}`);
    console.log(`Total Educators Processed: ${result.processedCount}`);
    console.log(`Successful Payouts: ${result.successfulCount}`);
    console.log(`Skipped (Below ₹2,500 Min): ${result.skippedBelowMinCount}`);
    console.log(`Skipped (Missing Verified Bank): ${result.skippedMissingBankCount}`);
    console.log(`Skipped (Already Processed): ${result.skippedAlreadyProcessedCount}`);
    console.log(`Failed Payouts: ${result.failedCount}`);
    console.log(`Total Disbursed: ₹${result.totalDisbursedRupees}`);
    console.log(`Total Platform Fee (25%): ₹${result.totalPlatformFeeRupees}`);

    console.log("\nDetails:");
    for (const d of result.details) {
      console.log(
        `  • [${d.status}] Educator ${d.teacherName || d.teacherId}: Gross ₹${d.grossRupees}, Fee (25%) ₹${d.feeRupees}, Net (75%) ₹${d.netRupees}${d.referenceId ? ` (Ref: ${d.referenceId})` : ""}${d.reason ? ` - ${d.reason}` : ""}`
      );
    }

    console.log("\n✅ Automated monthly payout execution completed.\n");
  } catch (err: any) {
    console.error("❌ Fatal error executing monthly payouts:", err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
