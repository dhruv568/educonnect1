import { NextRequest } from "next/server";
import { apiSuccess, apiError, apiUnauthorized } from "@/lib/api-response";
import { PayoutService } from "@/services/payout-service";

/**
 * Scheduled Cron Job: Automatic Monthly Educator Payouts
 *
 * Schedule: 10th of every month at 00:00 UTC (cron: 0 0 10 * *)
 *
 * Rules:
 * 1. Deducts 25% platform fee before calculating final payout
 * 2. Checks ₹2,500 minimum net eligible balance requirement
 * 3. Carries forward balance if below ₹2,500
 * 4. Disburses to educator's verified bank account via Cashfree Payout
 * 5. Uses cycle idempotency key to prevent duplicate payouts if executed repeatedly
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET || process.env.AUTH_SECRET;

    // Secure cron endpoint
    if (process.env.NODE_ENV === "production" && cronSecret) {
      const providedSecret = authHeader?.replace("Bearer ", "").trim();
      const customHeaderSecret = request.headers.get("x-cron-secret")?.trim();
      if (providedSecret !== cronSecret && customHeaderSecret !== cronSecret) {
        return apiUnauthorized("Unauthorized cron invocation");
      }
    }

    const body = await request.json().catch(() => ({}));
    const dryRun = Boolean(body.dryRun);
    const teacherId = body.teacherId;

    const result = await PayoutService.processMonthlyPayouts({
      dryRun,
      teacherId,
    });

    return apiSuccess({
      message: dryRun
        ? "Monthly payout preview completed successfully."
        : "Monthly payout schedule processed successfully.",
      result,
    });
  } catch (error: any) {
    console.error("[CRON /api/cron/payouts error]:", error);
    return apiError(error.message || "Failed to process monthly payouts", 500);
  }
}

export async function GET(request: NextRequest) {
  // Support GET invocation for Vercel Cron
  try {
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET || process.env.AUTH_SECRET;

    if (process.env.NODE_ENV === "production" && cronSecret) {
      const providedSecret = authHeader?.replace("Bearer ", "").trim();
      const customHeaderSecret = request.headers.get("x-cron-secret")?.trim();
      if (providedSecret !== cronSecret && customHeaderSecret !== cronSecret) {
        return apiUnauthorized("Unauthorized cron invocation");
      }
    }

    const result = await PayoutService.processMonthlyPayouts();

    return apiSuccess({
      message: "Monthly payout schedule processed successfully.",
      result,
    });
  } catch (error: any) {
    console.error("[CRON GET /api/cron/payouts error]:", error);
    return apiError(error.message || "Failed to process monthly payouts", 500);
  }
}
