/**
 * Centralized Educator Withdrawal Configuration
 *
 * ---------------------------------------------------------------------------
 * TEMPORARY TESTING CONFIGURATION:
 * The minimum educator withdrawal amount has been temporarily reduced from
 * ₹500 to ₹100 to allow verification and testing of the withdrawal workflow.
 *
 * To restore production settings later:
 * 1. Change DEFAULT_MIN_WITHDRAWAL_RUPEES from 100 back to 500
 * 2. Set IS_TEMPORARY_TEST_MINIMUM to false
 * ---------------------------------------------------------------------------
 */

/** Production baseline minimum amount in Rupees */
export const PRODUCTION_MIN_WITHDRAWAL_RUPEES = 500;

/** Flag indicating temporary test configuration is active */
export const IS_TEMPORARY_TEST_MINIMUM = true;

/**
 * Temporary test minimum withdrawal amount in Rupees (₹100).
 * Set to 500 when restoring production configuration.
 */
export const DEFAULT_MIN_WITHDRAWAL_RUPEES = 100;

/**
 * Minimum withdrawal amount in Rupees (evaluates env var or defaults to 100).
 */
export const MIN_WITHDRAWAL_RUPEES: number =
  typeof process !== "undefined" && process.env?.NEXT_PUBLIC_MIN_EDUCATOR_WITHDRAWAL_RUPEES
    ? parseInt(process.env.NEXT_PUBLIC_MIN_EDUCATOR_WITHDRAWAL_RUPEES, 10) || DEFAULT_MIN_WITHDRAWAL_RUPEES
    : DEFAULT_MIN_WITHDRAWAL_RUPEES;

/**
 * Minimum withdrawal amount in subunit paise (1 Rupee = 100 Paise).
 * For ₹100, this is 10,000 paise. (For ₹500, this is 50,000 paise).
 */
export const MIN_WITHDRAWAL_PAISE: number = MIN_WITHDRAWAL_RUPEES * 100;
