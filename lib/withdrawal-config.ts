/**
 * Centralized Educator Payout & Withdrawal Configuration
 *
 * Requirements:
 * 1. Platform Fee: 25% deducted from educator eligible earnings before final payout.
 * 2. Automatic Monthly Payout: Scheduled for the 10th of every month.
 * 3. Minimum Balance Requirement: Each educator must maintain a minimum eligible
 *    balance of ₹2,500 (checked after applying the 25% platform fee).
 * 4. Manual withdrawals are disabled.
 */

/** Platform commission fee percentage (25%) */
export const PLATFORM_FEE_PERCENT = 25;

/** Educator net payout percentage (75%) */
export const NET_PAYOUT_PERCENT = 75;

/** Day of month when automatic educator payouts are scheduled (10th of every month) */
export const PAYOUT_SCHEDULE_DAY_OF_MONTH = 10;

/** Minimum required eligible balance in Rupees for automated payout processing (₹2,500) */
export const MIN_PAYOUT_RUPEES = 2500;

/** Minimum required eligible balance in subunit paise (250,000 paise = ₹2,500) */
export const MIN_PAYOUT_PAISE = MIN_PAYOUT_RUPEES * 100;

/** Default baseline minimum amount in Rupees */
export const PRODUCTION_MIN_WITHDRAWAL_RUPEES = 2500;

/** Default minimum payout amount in Rupees */
export const DEFAULT_MIN_WITHDRAWAL_RUPEES = 2500;

/** Minimum payout amount in Rupees (evaluates env var or defaults to 2500) */
export const MIN_WITHDRAWAL_RUPEES: number =
  typeof process !== "undefined" && process.env?.NEXT_PUBLIC_MIN_EDUCATOR_WITHDRAWAL_RUPEES
    ? parseInt(process.env.NEXT_PUBLIC_MIN_EDUCATOR_WITHDRAWAL_RUPEES, 10) || DEFAULT_MIN_WITHDRAWAL_RUPEES
    : DEFAULT_MIN_WITHDRAWAL_RUPEES;

/** Minimum payout amount in subunit paise */
export const MIN_WITHDRAWAL_PAISE: number = MIN_WITHDRAWAL_RUPEES * 100;

/** Flag indicating whether temporary testing minimum is active */
export const IS_TEMPORARY_TEST_MINIMUM = false;
