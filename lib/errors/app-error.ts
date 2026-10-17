import {
  ErrorCategory,
  ErrorSeverity,
  StructuredErrorMetadata,
  AffectedResource,
  ExternalServiceOutcome,
  ApplicationSource,
} from "./types";
import { redactSensitiveData } from "./redaction";

/**
 * Generate a cryptographically random, human-readable Error Reference ID.
 * Format: ERR-YYYYMMDD-XXXXXX (e.g. ERR-20261017-A8B9C1)
 */
export function generateErrorId(prefix = "ERR"): string {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  const day = String(now.getUTCDate()).padStart(2, "0");
  const randomChars = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${prefix}-${year}${month}${day}-${randomChars}`;
}

export interface AppErrorOptions {
  code: string;
  category: ErrorCategory;
  statusCode?: number;
  title?: string;
  message: string;
  why?: string;
  resolution?: string[];
  adminGuidance?: string[];
  severity?: ErrorSeverity;
  retryable?: boolean;
  retryAfterSeconds?: number;
  affectedResource?: AffectedResource;
  externalOutcome?: ExternalServiceOutcome;
  application?: ApplicationSource;
  route?: string;
  details?: Record<string, any>;
  cause?: Error | unknown;
  errorId?: string;
}

/**
 * Central Base Application Error.
 * Preserves category prefix in `message` so existing codebase regexes/checks
 * (e.g. `err.message.includes("VALIDATION_ERROR")`) continue to pass seamlessly!
 */
export class AppError extends Error {
  public readonly isAppError = true;
  public readonly errorId: string;
  public readonly code: string;
  public readonly category: ErrorCategory;
  public readonly statusCode: number;
  public readonly title: string;
  public readonly why?: string;
  public readonly resolution: string[];
  public readonly adminGuidance: string[];
  public readonly severity: ErrorSeverity;
  public readonly retryable: boolean;
  public readonly retryAfterSeconds?: number;
  public readonly timestamp: string;
  public readonly affectedResource?: AffectedResource;
  public readonly externalOutcome?: ExternalServiceOutcome;
  public readonly application?: ApplicationSource;
  public readonly route?: string;
  public readonly details?: Record<string, any>;

  constructor(options: AppErrorOptions) {
    // Ensure message carries category prefix for backward compatibility if not already present
    const categoryPrefix = `${options.category}: `;
    const cleanMessage = options.message.startsWith(categoryPrefix)
      ? options.message.slice(categoryPrefix.length)
      : options.message;
    const formattedMessage = `${options.category}: ${cleanMessage}`;

    super(formattedMessage);
    this.name = this.constructor.name;

    this.errorId = options.errorId || generateErrorId();
    this.code = options.code;
    this.category = options.category;
    this.statusCode = options.statusCode || getDefaultStatusCode(options.category);
    this.title = options.title || getDefaultTitle(options.category);
    this.why = options.why;
    this.resolution = options.resolution || [];
    this.adminGuidance = options.adminGuidance || [];
    this.severity = options.severity || getDefaultSeverity(options.category);
    this.retryable = options.retryable ?? getDefaultRetryability(options.category);
    this.retryAfterSeconds = options.retryAfterSeconds;
    this.timestamp = new Date().toISOString();
    this.affectedResource = options.affectedResource;
    this.externalOutcome = options.externalOutcome;
    this.application = options.application;
    this.route = options.route;
    this.details = options.details ? redactSensitiveData(options.details) : undefined;

    if (options.cause && options.cause instanceof Error) {
      this.cause = options.cause;
    }

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Safe JSON representation for user-facing API responses.
   * Strips out raw stack traces and internal pointers.
   */
  public toMetadata(): StructuredErrorMetadata {
    return {
      errorId: this.errorId,
      code: this.code,
      category: this.category,
      statusCode: this.statusCode,
      title: this.title,
      message: this.message.replace(`${this.category}: `, ""),
      why: this.why,
      resolution: this.resolution,
      adminGuidance: this.adminGuidance,
      severity: this.severity,
      retryable: this.retryable,
      retryAfterSeconds: this.retryAfterSeconds,
      timestamp: this.timestamp,
      affectedResource: this.affectedResource,
      externalOutcome: this.externalOutcome,
      application: this.application,
      route: this.route,
      details: this.details,
    };
  }
}

function getDefaultStatusCode(cat: ErrorCategory): number {
  switch (cat) {
    case "VALIDATION_ERROR":
      return 400;
    case "AUTHENTICATION_ERROR":
      return 401;
    case "AUTHORIZATION_ERROR":
      return 403;
    case "NOT_FOUND":
      return 404;
    case "CONFLICT":
      return 409;
    case "RATE_LIMITED":
      return 429;
    case "NETWORK_ERROR":
      return 502;
    case "DATABASE_ERROR":
      return 503;
    case "PAYMENT_ERROR":
      return 400;
    case "PAYOUT_ERROR":
      return 422;
    case "OTP_ERROR":
      return 400;
    case "NOTIFICATION_ERROR":
      return 502;
    case "FILE_UPLOAD_ERROR":
      return 400;
    case "EXTERNAL_SERVICE_ERROR":
      return 502;
    case "INTERNAL_SERVER_ERROR":
    default:
      return 500;
  }
}

function getDefaultTitle(cat: ErrorCategory): string {
  switch (cat) {
    case "VALIDATION_ERROR":
      return "Validation Error";
    case "AUTHENTICATION_ERROR":
      return "Authentication Required";
    case "AUTHORIZATION_ERROR":
      return "Access Restricted";
    case "NOT_FOUND":
      return "Resource Not Found";
    case "CONFLICT":
      return "Conflict Encountered";
    case "RATE_LIMITED":
      return "Too Many Requests";
    case "NETWORK_ERROR":
      return "Network Connection Issue";
    case "DATABASE_ERROR":
      return "Database Service Unavailable";
    case "PAYMENT_ERROR":
      return "Payment Processing Failed";
    case "PAYOUT_ERROR":
      return "Payout Transfer Failed";
    case "OTP_ERROR":
      return "Verification Code Error";
    case "NOTIFICATION_ERROR":
      return "Notification Delivery Failed";
    case "FILE_UPLOAD_ERROR":
      return "File Upload Failed";
    case "EXTERNAL_SERVICE_ERROR":
      return "External Service Unavailable";
    case "INTERNAL_SERVER_ERROR":
    default:
      return "Internal Server Error";
  }
}

function getDefaultSeverity(cat: ErrorCategory): ErrorSeverity {
  switch (cat) {
    case "VALIDATION_ERROR":
    case "NOT_FOUND":
    case "OTP_ERROR":
      return "warning";
    case "AUTHENTICATION_ERROR":
    case "RATE_LIMITED":
      return "info";
    case "AUTHORIZATION_ERROR":
    case "CONFLICT":
    case "PAYMENT_ERROR":
    case "PAYOUT_ERROR":
    case "NOTIFICATION_ERROR":
    case "FILE_UPLOAD_ERROR":
    case "EXTERNAL_SERVICE_ERROR":
      return "error";
    case "DATABASE_ERROR":
    case "INTERNAL_SERVER_ERROR":
    default:
      return "critical";
  }
}

function getDefaultRetryability(cat: ErrorCategory): boolean {
  switch (cat) {
    case "RATE_LIMITED":
    case "NETWORK_ERROR":
    case "DATABASE_ERROR":
    case "EXTERNAL_SERVICE_ERROR":
    case "NOTIFICATION_ERROR":
      return true;
    case "VALIDATION_ERROR":
    case "AUTHENTICATION_ERROR":
    case "AUTHORIZATION_ERROR":
    case "NOT_FOUND":
    case "CONFLICT":
    case "PAYMENT_ERROR": // Payments need re-checkout or state check, not blind retry
    case "PAYOUT_ERROR":
    case "FILE_UPLOAD_ERROR":
    case "OTP_ERROR":
    default:
      return false;
  }
}

// -------------------------------------------------------------
// Specialized Subclasses
// -------------------------------------------------------------

export class ValidationError extends AppError {
  constructor(options: Omit<AppErrorOptions, "category">) {
    super({ ...options, category: "VALIDATION_ERROR" });
  }
}

export class AuthenticationError extends AppError {
  constructor(options: Omit<AppErrorOptions, "category">) {
    super({ ...options, category: "AUTHENTICATION_ERROR", statusCode: options.statusCode || 401 });
  }
}

export class AuthorizationError extends AppError {
  constructor(options: Omit<AppErrorOptions, "category">) {
    super({ ...options, category: "AUTHORIZATION_ERROR", statusCode: options.statusCode || 403 });
  }
}

export class NotFoundError extends AppError {
  constructor(options: Omit<AppErrorOptions, "category">) {
    super({ ...options, category: "NOT_FOUND", statusCode: options.statusCode || 404 });
  }
}

export class ConflictError extends AppError {
  constructor(options: Omit<AppErrorOptions, "category">) {
    super({ ...options, category: "CONFLICT", statusCode: options.statusCode || 409 });
  }
}

export class RateLimitedError extends AppError {
  constructor(options: Omit<AppErrorOptions, "category">) {
    super({ ...options, category: "RATE_LIMITED", statusCode: options.statusCode || 429, retryable: true });
  }
}

export class NetworkError extends AppError {
  constructor(options: Omit<AppErrorOptions, "category">) {
    super({ ...options, category: "NETWORK_ERROR", statusCode: options.statusCode || 502, retryable: true });
  }
}

export class DatabaseError extends AppError {
  constructor(options: Omit<AppErrorOptions, "category">) {
    super({ ...options, category: "DATABASE_ERROR", statusCode: options.statusCode || 503, retryable: true, severity: "critical" });
  }
}

export class PaymentError extends AppError {
  constructor(options: Omit<AppErrorOptions, "category">) {
    super({ ...options, category: "PAYMENT_ERROR", statusCode: options.statusCode || 400 });
  }
}

export class PayoutError extends AppError {
  constructor(options: Omit<AppErrorOptions, "category">) {
    super({ ...options, category: "PAYOUT_ERROR", statusCode: options.statusCode || 422 });
  }
}

export class OtpError extends AppError {
  constructor(options: Omit<AppErrorOptions, "category">) {
    super({ ...options, category: "OTP_ERROR", statusCode: options.statusCode || 400 });
  }
}

export class NotificationError extends AppError {
  constructor(options: Omit<AppErrorOptions, "category">) {
    super({ ...options, category: "NOTIFICATION_ERROR", statusCode: options.statusCode || 502, retryable: true });
  }
}

export class FileUploadError extends AppError {
  constructor(options: Omit<AppErrorOptions, "category">) {
    super({ ...options, category: "FILE_UPLOAD_ERROR", statusCode: options.statusCode || 400 });
  }
}

export class ExternalServiceError extends AppError {
  constructor(options: Omit<AppErrorOptions, "category">) {
    super({ ...options, category: "EXTERNAL_SERVICE_ERROR", statusCode: options.statusCode || 502, retryable: true });
  }
}

export class InternalServerError extends AppError {
  constructor(options: Omit<AppErrorOptions, "category">) {
    super({ ...options, category: "INTERNAL_SERVER_ERROR", statusCode: options.statusCode || 500, severity: "critical" });
  }
}

// -------------------------------------------------------------
// Concrete Factories
// -------------------------------------------------------------

export const AppErrors = {
  /**
   * Phase 4: Course moderation validation when course has no lessons
   */
  courseNoLessons(courseId: string, courseTitle?: string) {
    return new ValidationError({
      code: "COURSE_NO_LESSONS",
      title: "Course Requires At Least One Lesson",
      message: "Cannot approve/publish a course without any lessons.",
      why: "A published course must contain at least one section with at least one saved lesson for learners to access. Empty sections do not constitute a valid curriculum.",
      resolution: [
        "Educator must add and save at least one lesson under a section in the course curriculum editor.",
        "Ensure lesson content (video or text) has uploaded and saved successfully.",
        "Once a lesson is present, resubmit or request re-approval.",
      ],
      adminGuidance: [
        "Verify the course curriculum in the Course Preview or Curriculum Viewer.",
        "Notify the educator to inform them that lessons must be added before publication.",
        "Dismiss this banner if taking no action; the course will remain in DRAFT status.",
        "Once the educator adds a lesson, click 'Approve & Publish' again to publish the course.",
      ],
      severity: "warning",
      retryable: true,
      affectedResource: {
        type: "course",
        id: courseId,
        name: courseTitle,
      },
    });
  },

  unauthorized(reason = "Authentication session expired or invalid.") {
    return new AuthenticationError({
      code: "SESSION_EXPIRED",
      title: "Authentication Required",
      message: reason,
      why: "Your security session has expired or is no longer valid.",
      resolution: [
        "Please sign in again to verify your identity.",
        "Ensure your browser cookies are enabled for EduConnects.",
      ],
      adminGuidance: [
        "No administrator intervention required for standard session expiration.",
        "Verify user account status if user reports recurring login issues.",
      ],
      severity: "info",
      retryable: false,
    });
  },

  forbidden(reason = "Insufficient permissions or account not active.") {
    return new AuthorizationError({
      code: "ACCESS_DENIED",
      title: "Access Restricted",
      message: reason,
      why: "Your user account does not hold the permissions required to access this resource or feature.",
      resolution: [
        "Check that you are signed into the correct account.",
        "If your account is pending verification, check your verification status tab.",
      ],
      adminGuidance: [
        "Review the user's role assignments in Admin > People > Staff Management or Role Management.",
        "If the user is an educator, check educator verification status in Admin > Educator Verifications.",
      ],
      severity: "error",
      retryable: false,
    });
  },

  notFound(resourceName: string, identifier?: string) {
    return new NotFoundError({
      code: "NOT_FOUND",
      title: `${resourceName} Not Found`,
      message: `${resourceName} not found or no longer available.`,
      why: `The requested ${resourceName.toLowerCase()} could not be located in our records. It may have been deleted, moved, or unpublished.`,
      resolution: [
        "Verify the link or ID you are attempting to access.",
        "Return to the dashboard or catalog to browse active items.",
      ],
      adminGuidance: [
        "Check database records to verify whether the record was archived or permanently deleted.",
        "Review activity logs for recent deletion or deactivation events.",
      ],
      severity: "warning",
      retryable: false,
      affectedResource: identifier ? { type: resourceName.toLowerCase(), id: identifier } : undefined,
    });
  },

  conflict(message: string, why?: string, resolution?: string[]) {
    return new ConflictError({
      code: "STATE_CONFLICT",
      title: "Conflict Encountered",
      message,
      why: why || "The requested operation conflicts with the current state of the resource.",
      resolution: resolution || [
        "Refresh your page to view the latest state.",
        "Check if another user or process already updated this record.",
      ],
      adminGuidance: [
        "Inspect the current resource status in the admin console to reconcile conflicts.",
      ],
      severity: "warning",
      retryable: false,
    });
  },

  rateLimited(retryAfterSeconds = 60) {
    return new RateLimitedError({
      code: "RATE_LIMITED",
      title: "Too Many Requests",
      message: `Too many requests. Please wait ${retryAfterSeconds} seconds before trying again.`,
      why: "Automated rate limiting was triggered to protect platform stability and security.",
      resolution: [
        `Wait ${retryAfterSeconds} seconds before repeating this action.`,
        "Avoid rapid repeated clicks or automated requests.",
      ],
      adminGuidance: [
        "Review IP rate limiting logs if legitimate users report persistent blocks.",
      ],
      severity: "info",
      retryable: true,
      retryAfterSeconds,
    });
  },

  paymentFailed(options: {
    message: string;
    why?: string;
    outcome?: ExternalServiceOutcome;
    orderId?: string;
    resolution?: string[];
  }) {
    return new PaymentError({
      code: "PAYMENT_FAILED",
      title: "Payment Unsuccessful",
      message: options.message,
      why: options.why || "The payment gateway reported that the transaction could not be completed.",
      externalOutcome: options.outcome || "CONFIRMED_FAILURE",
      resolution: options.resolution || [
        "Verify that your card or UPI account has sufficient funds.",
        "Check with your issuing bank if international/online transactions are enabled.",
        "Try an alternative payment method (e.g. UPI vs Card).",
      ],
      adminGuidance: [
        "Check Cashfree gateway dashboard for the specific decline code or reason.",
        "Never capture or refund an order without confirming its status in Cashfree.",
      ],
      severity: "error",
      retryable: false,
      affectedResource: options.orderId ? { type: "order", id: options.orderId } : undefined,
    });
  },

  payoutFailed(options: {
    message: string;
    why?: string;
    payoutId?: string;
    educatorId?: string;
  }) {
    return new PayoutError({
      code: "PAYOUT_TRANSFER_FAILED",
      title: "Payout Transfer Issue",
      message: options.message,
      why: options.why || "Bank transfer or payout dispatch encountered an error.",
      resolution: [
        "Verify your bank account number and IFSC code in Educator Settings > Payouts.",
        "Ensure your bank account is active and accepts incoming NEFT/IMPS transfers.",
      ],
      adminGuidance: [
        "Check Admin > Finance > Financial Ledger & Payouts for transfer failure response.",
        "Verify educator payout account details and manual transfer options.",
        "Do not retry automatically without verifying whether the bank processed the transfer.",
      ],
      severity: "error",
      retryable: false,
      affectedResource: options.payoutId ? { type: "payout", id: options.payoutId } : undefined,
    });
  },

  databaseUnavailable(cause?: unknown) {
    return new DatabaseError({
      code: "DATABASE_UNAVAILABLE",
      title: "Database Service Temporarily Unavailable",
      message: "Database connection could not be established. Please try again shortly.",
      why: "The server encountered a temporary connection interruption with the database service.",
      resolution: [
        "Wait a few moments and refresh the page.",
        "If the issue persists, our technical operations team has been notified.",
      ],
      adminGuidance: [
        "Verify database health in Admin > Security & Operations > System Health.",
        "Check PostgreSQL host status, connection pool limits, and Render/Neon metrics.",
        "Inspect server-side logs using the error reference ID.",
      ],
      severity: "critical",
      retryable: true,
      retryAfterSeconds: 5,
      cause,
    });
  },

  externalServiceTimeout(serviceName: string, cause?: unknown) {
    return new ExternalServiceError({
      code: "EXTERNAL_SERVICE_TIMEOUT",
      title: `${serviceName} Service Timeout`,
      message: `Connection to ${serviceName} timed out. The operation may still be processing.`,
      why: `The third-party service (${serviceName}) did not respond within the allocated time window.`,
      externalOutcome: "PENDING_UNKNOWN",
      resolution: [
        "Do not repeat financial or irreversible operations immediately.",
        "Check your transaction history or wait 2-3 minutes before trying again.",
      ],
      adminGuidance: [
        `Check ${serviceName} operational status page and API gateway health.`,
        "Verify webhook logs to see if an asynchronous callback was delivered.",
      ],
      severity: "error",
      retryable: false,
      cause,
    });
  },

  /**
   * Parse any thrown error (string, Error, Prisma, Zod, etc.) into a safe structured AppError.
   */
  fromAny(err: any, context?: { route?: string; application?: ApplicationSource }): AppError {
    if (err instanceof AppError) {
      if (context) {
        return new AppError({
          ...err.toMetadata(),
          application: context.application || err.application,
          route: context.route || err.route,
          cause: err.cause,
        });
      }
      return err;
    }

    const rawMessage = typeof err === "string" ? err : err?.message || "An unexpected error occurred.";

    // Handle known category prefixes
    if (rawMessage.startsWith("VALIDATION_ERROR:") || rawMessage.startsWith("VALIDATION_FAILED:")) {
      const msg = rawMessage.replace(/^VALIDATION_(ERROR|FAILED):\s*/, "");
      if (msg.includes("Cannot approve/publish a course without any lessons")) {
        return AppErrors.courseNoLessons("unknown");
      }
      return new ValidationError({
        code: "VALIDATION_ERROR",
        title: "Validation Error",
        message: msg,
        why: "One or more submitted fields failed validation requirements.",
        resolution: ["Please review the highlighted fields and correct the inputs."],
        adminGuidance: ["Check request validation payload and schema rules."],
        route: context?.route,
        application: context?.application,
      });
    }

    if (rawMessage.startsWith("UNAUTHORIZED:")) {
      return AppErrors.unauthorized(rawMessage.replace(/^UNAUTHORIZED:\s*/, ""));
    }

    if (rawMessage.startsWith("FORBIDDEN:") || rawMessage.startsWith("UNVERIFIED:")) {
      return AppErrors.forbidden(rawMessage.replace(/^(FORBIDDEN|UNVERIFIED):\s*/, ""));
    }

    if (rawMessage.startsWith("NOT_FOUND:")) {
      return new NotFoundError({
        code: "NOT_FOUND",
        title: "Resource Not Found",
        message: rawMessage.replace(/^NOT_FOUND:\s*/, ""),
        why: "The requested item does not exist or has been removed.",
        resolution: ["Check the resource URL or ID and try again."],
        route: context?.route,
        application: context?.application,
      });
    }

    if (rawMessage.startsWith("CONFLICT:") || rawMessage.includes("already exists")) {
      return new ConflictError({
        code: "CONFLICT",
        title: "Conflict Encountered",
        message: rawMessage.replace(/^CONFLICT:\s*/, ""),
        why: "A record with this identifier already exists or conflicts with the current operation.",
        resolution: ["Ensure unique fields (e.g. email, slug) are not already registered."],
        route: context?.route,
        application: context?.application,
      });
    }

    // Prisma-specific errors
    if (err?.code === "P2002") {
      const target = Array.isArray(err?.meta?.target) ? err.meta.target.join(", ") : "field";
      return new ConflictError({
        code: "UNIQUE_CONSTRAINT_VIOLATION",
        title: "Duplicate Record",
        message: `A record with this ${target} already exists.`,
        why: "A unique database constraint was violated.",
        resolution: [`Please provide a different value for ${target}.`],
        adminGuidance: ["Inspect unique constraints on the affected table."],
        route: context?.route,
        application: context?.application,
      });
    }

    if (err?.code === "P2025") {
      return new NotFoundError({
        code: "RECORD_NOT_FOUND",
        title: "Record Not Found",
        message: "The requested database record does not exist.",
        why: "Prisma operation expected a record that was not found.",
        resolution: ["Verify that the record was not deleted by another user."],
        route: context?.route,
        application: context?.application,
      });
    }

    // Database connection errors
    if (
      rawMessage.includes("PrismaClientInitializationError") ||
      rawMessage.includes("Server has closed the connection") ||
      rawMessage.includes("Can't reach database server") ||
      rawMessage.includes("Connection terminated unexpectedly")
    ) {
      return AppErrors.databaseUnavailable(err);
    }

    // Network / fetch errors
    if (rawMessage.includes("fetch failed") || rawMessage.includes("ECONNREFUSED") || rawMessage.includes("ETIMEDOUT")) {
      return new NetworkError({
        code: "NETWORK_FAILURE",
        title: "Network Connection Error",
        message: "Failed to connect to required external service or network endpoint.",
        why: "Network connection was refused or timed out.",
        resolution: ["Check your internet connection and try again in a few moments."],
        adminGuidance: ["Check egress connectivity and third-party service status."],
        route: context?.route,
        application: context?.application,
        cause: err,
      });
    }

    // Safe fallback internal server error — never exposes stack trace or raw SQL!
    return new InternalServerError({
      code: "INTERNAL_ERROR",
      title: "Unexpected Server Error",
      message: "An unexpected error occurred. Our security controls prevented data exposure.",
      why: "An unexpected condition was encountered by the server.",
      resolution: [
        "Please try again in a few moments.",
        "If the problem persists, contact EduConnects support with your Error Reference ID.",
      ],
      adminGuidance: [
        "Locate the corresponding log entry using the Error Reference ID in Admin > Error Center.",
        "Review server diagnostics in a protected admin environment.",
      ],
      route: context?.route,
      application: context?.application,
      cause: err,
    });
  },
};
