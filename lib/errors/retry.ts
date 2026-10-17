import { ErrorCategory, ExternalServiceOutcome } from "./types";

export type OperationType =
  | "QUERY"
  | "FETCH_RESOURCE"
  | "FORM_SUBMISSION"
  | "PAYMENT_INITIATION"
  | "PAYMENT_VERIFICATION"
  | "PAYOUT_TRANSFER"
  | "WITHDRAWAL_REQUEST"
  | "NOTIFICATION_DISPATCH"
  | "FILE_UPLOAD"
  | "COURSE_MODERATION";

export interface RetryGuidance {
  allowed: boolean;
  isIdempotent: boolean;
  outcomeExplanation: string;
  correctiveAction?: string;
  recommendedBackoffSeconds?: number;
}

/**
 * Determines whether an operation can be safely retried without risk
 * of duplicate debits, conflicting state, or data corruption.
 */
export function evaluateRetrySafety(
  operation: OperationType,
  category: ErrorCategory,
  outcome?: ExternalServiceOutcome,
  retryableFlag?: boolean
): RetryGuidance {
  // Financial operations have strict safety rules
  if (operation === "PAYMENT_VERIFICATION") {
    return {
      allowed: true,
      isIdempotent: true,
      outcomeExplanation:
        "Retrying verification will safely re-query the payment gateway to verify whether payment succeeded, without creating a new order or charging your account again.",
      recommendedBackoffSeconds: 3,
    };
  }

  if (operation === "PAYMENT_INITIATION") {
    if (outcome === "PENDING_UNKNOWN") {
      return {
        allowed: false,
        isIdempotent: false,
        outcomeExplanation:
          "The payment outcome is currently pending confirmation from your bank or gateway. Retrying immediately may result in duplicate charges.",
        correctiveAction:
          "Please check your bank statement or wait 2-3 minutes. If money was deducted, your enrollment will activate automatically once webhook confirmation is received.",
      };
    }
    return {
      allowed: true,
      isIdempotent: false,
      outcomeExplanation:
        "Retrying will initiate a fresh payment checkout session with a new unique gateway order ID.",
      recommendedBackoffSeconds: 1,
    };
  }

  if (operation === "PAYOUT_TRANSFER" || operation === "WITHDRAWAL_REQUEST") {
    if (outcome === "PENDING_UNKNOWN" || outcome === "DID_NOT_REACH") {
      return {
        allowed: false,
        isIdempotent: false,
        outcomeExplanation:
          "The payout transfer status is unverified. Automated re-submission is prevented to protect funds from double-debiting.",
        correctiveAction:
          "An administrator must verify the transfer status with Cashfree/bank before marking the withdrawal as completed or re-queuing.",
      };
    }
    return {
      allowed: false,
      isIdempotent: false,
      outcomeExplanation:
        "Payout requests cannot be blindly repeated.",
      correctiveAction:
        "Verify bank account/IFSC details and ensure sufficient educator balance before submitting a new payout request.",
    };
  }

  // Course moderation: Safe to retry after educator adds lessons
  if (operation === "COURSE_MODERATION") {
    return {
      allowed: true,
      isIdempotent: true,
      outcomeExplanation:
        "Clicking 'Retry Moderation' will re-inspect the course curriculum to verify whether the educator has added the required lessons.",
    };
  }

  // Transient network & external service errors: Safe with backoff
  if (category === "NETWORK_ERROR" || category === "RATE_LIMITED" || category === "DATABASE_ERROR") {
    return {
      allowed: true,
      isIdempotent: operation === "QUERY" || operation === "FETCH_RESOURCE",
      outcomeExplanation:
        "Retrying will attempt to re-establish connection with the service after a brief pause.",
      recommendedBackoffSeconds: category === "RATE_LIMITED" ? 30 : 2,
    };
  }

  // Non-recoverable client validation errors
  if (category === "VALIDATION_ERROR" || category === "AUTHENTICATION_ERROR" || category === "AUTHORIZATION_ERROR") {
    return {
      allowed: false,
      isIdempotent: true,
      outcomeExplanation:
        "Retrying the identical request without correcting inputs or credentials will fail with the same error.",
      correctiveAction:
        "Please update the invalid fields or authenticate with valid credentials before resubmitting.",
    };
  }

  return {
    allowed: retryableFlag ?? false,
    isIdempotent: operation === "QUERY",
    outcomeExplanation: retryableFlag
      ? "Retrying will re-execute the request."
      : "This operation cannot be automatically retried.",
    correctiveAction: retryableFlag ? undefined : "Please review the resolution steps above.",
  };
}
