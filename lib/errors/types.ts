export type ErrorCategory =
  | "VALIDATION_ERROR"
  | "AUTHENTICATION_ERROR"
  | "AUTHORIZATION_ERROR"
  | "NOT_FOUND"
  | "CONFLICT"
  | "RATE_LIMITED"
  | "NETWORK_ERROR"
  | "DATABASE_ERROR"
  | "PAYMENT_ERROR"
  | "PAYOUT_ERROR"
  | "OTP_ERROR"
  | "NOTIFICATION_ERROR"
  | "FILE_UPLOAD_ERROR"
  | "EXTERNAL_SERVICE_ERROR"
  | "INTERNAL_SERVER_ERROR";

export type ErrorSeverity = "info" | "warning" | "error" | "critical";

export type ErrorInvestigationStatus = "OPEN" | "INVESTIGATING" | "RESOLVED" | "IGNORED";

export type ExternalServiceOutcome =
  | "DID_NOT_REACH"
  | "PROVIDER_REJECTED"
  | "PENDING_UNKNOWN"
  | "CONFIRMED_FAILURE";

export type ApplicationSource =
  | "main"
  | "learner"
  | "educator"
  | "admin"
  | "api"
  | "worker";

export interface AffectedResource {
  type: string; // e.g. "course", "lesson", "transaction", "payout", "user", "slot"
  id?: string;
  name?: string;
  identifier?: string;
}

export interface StructuredErrorMetadata {
  /** Unique traceable reference ID, e.g. ERR-20261017-A1B2C3D4 */
  errorId: string;
  /** Granular error code, e.g. COURSE_NO_LESSONS, SESSION_EXPIRED */
  code: string;
  /** High-level classification category */
  category: ErrorCategory;
  /** Appropriate HTTP status code */
  statusCode: number;
  /** Safe user-facing title */
  title: string;
  /** What happened: clear description of the failure */
  message: string;
  /** Why did it happen (when known) */
  why?: string;
  /** Recommended resolution steps for the user */
  resolution?: string[];
  /** Recommended resolution steps for platform administrators */
  adminGuidance?: string[];
  /** Severity level */
  severity: ErrorSeverity;
  /** Whether this operation can be safely retried */
  retryable: boolean;
  /** Optional delay before retrying (in seconds) */
  retryAfterSeconds?: number;
  /** ISO timestamp when the error occurred */
  timestamp: string;
  /** Safe resource identifier */
  affectedResource?: AffectedResource;
  /** For external services: status classification */
  externalOutcome?: ExternalServiceOutcome;
  /** Origin application */
  application?: ApplicationSource;
  /** Request path or route name */
  route?: string;
  /** Non-sensitive additional details */
  details?: Record<string, any>;
}

export interface StoredErrorRecord extends StructuredErrorMetadata {
  id: string;
  investigationStatus: ErrorInvestigationStatus;
  investigationNotes?: string[];
  investigatedBy?: string;
  resolvedAt?: string;
  createdAt: string;
  updatedAt: string;
}
