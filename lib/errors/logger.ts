import { AppError } from "./app-error";
import { ErrorStore } from "./error-store";
import { redactSensitiveData } from "./redaction";
import { ApplicationSource, StructuredErrorMetadata } from "./types";

export interface LogContext {
  application?: ApplicationSource;
  route?: string;
  method?: string;
  userId?: string | null;
  ipAddress?: string;
  params?: Record<string, any>;
  componentStack?: string;
}

export class ErrorLogger {
  private static isProd = process.env.NODE_ENV === "production";

  /**
   * Log an error in structured format, record in ErrorStore, and output to server console.
   */
  static async log(
    error: AppError | Error | unknown,
    context?: LogContext
  ): Promise<StructuredErrorMetadata> {
    const appError = error instanceof AppError ? error : AppError.prototype.constructor === error?.constructor
      ? (error as AppError)
      : (await import("./app-error")).AppErrors.fromAny(error, {
          route: context?.route,
          application: context?.application,
        });

    const metadata = appError.toMetadata();
    if (context?.application && !metadata.application) {
      metadata.application = context.application;
    }
    if (context?.route && !metadata.route) {
      metadata.route = context.route;
    }

    const cleanStack = (error as any)?.stack
      ? redactSensitiveData(String((error as any).stack))
      : undefined;

    // Record in ErrorStore (ring-buffer & AuditLog table)
    await ErrorStore.recordError(metadata, {
      stack: cleanStack,
      userId: context?.userId || undefined,
      ipAddress: context?.ipAddress,
    });

    // Protected structured server console output
    const logPayload = {
      timestamp: metadata.timestamp,
      errorId: metadata.errorId,
      code: metadata.code,
      category: metadata.category,
      severity: metadata.severity,
      application: metadata.application || "api",
      route: metadata.route || context?.route || "unknown",
      message: metadata.message,
      why: metadata.why,
      affectedResource: metadata.affectedResource,
      externalOutcome: metadata.externalOutcome,
      // Stack trace included in server logs only
      stack: cleanStack,
    };

    const prefix = `[EduConnects:${metadata.severity.toUpperCase()}] [${metadata.errorId}]`;
    if (metadata.severity === "critical" || metadata.severity === "error") {
      console.error(`🚨 ${prefix} ${metadata.category} on ${logPayload.route}:`, logPayload);
    } else if (metadata.severity === "warning") {
      console.warn(`⚠️ ${prefix} ${metadata.category}:`, logPayload);
    } else {
      console.info(`ℹ️ ${prefix} ${metadata.category}:`, logPayload);
    }

    return metadata;
  }
}
