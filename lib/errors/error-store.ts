import { prisma } from "@/lib/prisma";
import {
  ErrorCategory,
  ErrorInvestigationStatus,
  ErrorSeverity,
  ApplicationSource,
  StoredErrorRecord,
  StructuredErrorMetadata,
} from "./types";
import { redactSensitiveData } from "./redaction";

// Global ring buffer for fast query and fallback during database issues
const globalForErrorStore = globalThis as unknown as {
  __educonnect_error_buffer?: StoredErrorRecord[];
};

const ERROR_BUFFER_LIMIT = 500;
const memoryBuffer: StoredErrorRecord[] =
  globalForErrorStore.__educonnect_error_buffer || [];
globalForErrorStore.__educonnect_error_buffer = memoryBuffer;

let lastDbFailureTimestamp = 0;
const DB_COOLDOWN_MS = 30000;

function isDbCircuitOpen(): boolean {
  return Date.now() - lastDbFailureTimestamp < DB_COOLDOWN_MS;
}

function recordDbFailure() {
  lastDbFailureTimestamp = Date.now();
}

export interface ErrorFilterOptions {
  search?: string;
  category?: ErrorCategory | "ALL";
  application?: ApplicationSource | "ALL";
  severity?: ErrorSeverity | "ALL";
  status?: ErrorInvestigationStatus | "ALL";
  page?: number;
  limit?: number;
}

export class ErrorStore {
  /**
   * Save an error record to memory buffer and attempt persistence in AuditLog.
   */
  static async recordError(
    metadata: StructuredErrorMetadata,
    options?: {
      stack?: string;
      userId?: string;
      ipAddress?: string;
      route?: string;
    }
  ): Promise<StoredErrorRecord> {
    const now = new Date().toISOString();
    const cleanDetails = metadata.details ? redactSensitiveData(metadata.details) : undefined;

    const record: StoredErrorRecord = {
      id: metadata.errorId,
      ...metadata,
      details: cleanDetails,
      investigationStatus: "OPEN",
      investigationNotes: [],
      createdAt: now,
      updatedAt: now,
    };

    // Store in memory ring buffer (newest first)
    memoryBuffer.unshift(record);
    if (memoryBuffer.length > ERROR_BUFFER_LIMIT) {
      memoryBuffer.pop();
    }

    // Attempt persistence into existing AuditLog table if DB circuit is closed
    if (!isDbCircuitOpen()) {
      try {
        const auditPayload = {
          errorId: record.errorId,
          code: record.code,
          category: record.category,
          statusCode: record.statusCode,
          title: record.title,
          message: record.message,
          why: record.why,
          resolution: record.resolution,
          adminGuidance: record.adminGuidance,
          severity: record.severity,
          retryable: record.retryable,
          application: record.application,
          route: record.route,
          affectedResource: record.affectedResource,
          externalOutcome: record.externalOutcome,
          investigationStatus: record.investigationStatus,
          details: record.details,
          // Stack trace stored securely in server-side audit log only
          stack: options?.stack ? redactSensitiveData(options.stack) : undefined,
        };

        await prisma.auditLog.create({
          data: {
            userId: options?.userId || null,
            event: "SYSTEM_ERROR",
            metadata: JSON.stringify(auditPayload),
            ipAddress: options?.ipAddress || "127.0.0.1",
          },
        });
      } catch (err: any) {
        recordDbFailure();
        console.warn("⚠️ [ErrorStore]: Database error log write failed, saved in memory buffer only:", err?.message || err);
      }
    }

    return record;
  }

  /**
   * Query errors with filtering, pagination, and search.
   */
  static async getErrors(options: ErrorFilterOptions = {}) {
    const page = Math.max(1, options.page || 1);
    const limit = Math.max(1, Math.min(100, options.limit || 20));
    const search = options.search?.toLowerCase().trim();

    // First try querying persisted errors from AuditLog if circuit is closed
    let records: StoredErrorRecord[] = [...memoryBuffer];

    if (!isDbCircuitOpen()) {
      try {
        const dbLogs = await prisma.auditLog.findMany({
          where: { event: "SYSTEM_ERROR" },
          orderBy: { createdAt: "desc" },
          take: 200,
        });

      if (dbLogs.length > 0) {
        const parsedDbRecords: StoredErrorRecord[] = [];
        for (const log of dbLogs) {
          if (!log.metadata) continue;
          try {
            const meta = JSON.parse(log.metadata);
            if (meta.errorId) {
              parsedDbRecords.push({
                id: meta.errorId,
                errorId: meta.errorId,
                code: meta.code || "INTERNAL_ERROR",
                category: meta.category || "INTERNAL_SERVER_ERROR",
                statusCode: meta.statusCode || 500,
                title: meta.title || "Server Error",
                message: meta.message || "An unexpected error occurred.",
                why: meta.why,
                resolution: meta.resolution,
                adminGuidance: meta.adminGuidance,
                severity: meta.severity || "error",
                retryable: meta.retryable ?? false,
                timestamp: log.createdAt.toISOString(),
                affectedResource: meta.affectedResource,
                externalOutcome: meta.externalOutcome,
                application: meta.application,
                route: meta.route,
                details: meta.details,
                investigationStatus: meta.investigationStatus || "OPEN",
                investigationNotes: meta.investigationNotes || [],
                investigatedBy: meta.investigatedBy,
                resolvedAt: meta.resolvedAt,
                createdAt: log.createdAt.toISOString(),
                updatedAt: log.createdAt.toISOString(),
              });
            }
          } catch {
            // Ignore malformed json
          }
        }

        // Merge DB records and memory buffer deduplicating by errorId
        const seen = new Set<string>();
        const merged: StoredErrorRecord[] = [];
        for (const item of [...memoryBuffer, ...parsedDbRecords]) {
          if (!seen.has(item.errorId)) {
            seen.add(item.errorId);
            merged.push(item);
          }
        }
        records = merged;
      }
    } catch {
      recordDbFailure();
      // Use in-memory buffer if DB is unavailable
    }
  }

    // Apply filters
    const filtered = records.filter((r) => {
      if (options.category && options.category !== "ALL" && r.category !== options.category) {
        return false;
      }
      if (options.application && options.application !== "ALL" && r.application !== options.application) {
        return false;
      }
      if (options.severity && options.severity !== "ALL" && r.severity !== options.severity) {
        return false;
      }
      if (options.status && options.status !== "ALL" && r.investigationStatus !== options.status) {
        return false;
      }
      if (search) {
        const matchesId = r.errorId.toLowerCase().includes(search);
        const matchesCode = r.code.toLowerCase().includes(search);
        const matchesMsg = r.message.toLowerCase().includes(search);
        const matchesRoute = (r.route || "").toLowerCase().includes(search);
        const matchesRes = (r.affectedResource?.id || "").toLowerCase().includes(search) ||
          (r.affectedResource?.name || "").toLowerCase().includes(search);
        if (!matchesId && !matchesCode && !matchesMsg && !matchesRoute && !matchesRes) {
          return false;
        }
      }
      return true;
    });

    const total = filtered.length;
    const startIndex = (page - 1) * limit;
    const paginated = filtered.slice(startIndex, startIndex + limit);

    return {
      errors: paginated,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
      metrics: this.computeMetrics(records),
    };
  }

  /**
   * Find a specific error by reference ID.
   */
  static async getErrorById(errorId: string): Promise<StoredErrorRecord | null> {
    const inMem = memoryBuffer.find((e) => e.errorId === errorId);
    if (inMem) return inMem;

    if (!isDbCircuitOpen()) {
      try {
        const log = await prisma.auditLog.findFirst({
          where: {
            event: "SYSTEM_ERROR",
            metadata: { contains: errorId },
          },
        });
        if (log && log.metadata) {
          const meta = JSON.parse(log.metadata);
          if (meta.errorId === errorId) {
            return {
              id: meta.errorId,
              errorId: meta.errorId,
              code: meta.code,
              category: meta.category,
              statusCode: meta.statusCode,
              title: meta.title,
              message: meta.message,
              why: meta.why,
              resolution: meta.resolution,
              adminGuidance: meta.adminGuidance,
              severity: meta.severity,
              retryable: meta.retryable,
              timestamp: log.createdAt.toISOString(),
              affectedResource: meta.affectedResource,
              externalOutcome: meta.externalOutcome,
              application: meta.application,
              route: meta.route,
              details: meta.details,
              investigationStatus: meta.investigationStatus || "OPEN",
              investigationNotes: meta.investigationNotes || [],
              investigatedBy: meta.investigatedBy,
              resolvedAt: meta.resolvedAt,
              createdAt: log.createdAt.toISOString(),
              updatedAt: log.createdAt.toISOString(),
            };
          }
        }
      } catch {
        recordDbFailure();
      }
    }

    return null;
  }

  /**
   * Update investigation status and attach administrator notes.
   */
  static async updateStatus(
    errorId: string,
    status: ErrorInvestigationStatus,
    note?: string,
    adminId?: string
  ): Promise<StoredErrorRecord | null> {
    const item = memoryBuffer.find((e) => e.errorId === errorId);
    const now = new Date().toISOString();

    if (item) {
      item.investigationStatus = status;
      item.updatedAt = now;
      if (adminId) item.investigatedBy = adminId;
      if (status === "RESOLVED") item.resolvedAt = now;
      if (note && note.trim()) {
        if (!item.investigationNotes) item.investigationNotes = [];
        item.investigationNotes.push(`[${now}] ${adminId ? adminId + ": " : ""}${note.trim()}`);
      }
    }

    // Persist updated status in AuditLog if circuit is closed
    if (!isDbCircuitOpen()) {
      try {
        const existing = await prisma.auditLog.findFirst({
          where: {
            event: "SYSTEM_ERROR",
            metadata: { contains: errorId },
          },
        });

        if (existing && existing.metadata) {
          const meta = JSON.parse(existing.metadata);
          meta.investigationStatus = status;
          meta.updatedAt = now;
          if (adminId) meta.investigatedBy = adminId;
          if (status === "RESOLVED") meta.resolvedAt = now;
          if (note && note.trim()) {
            if (!meta.investigationNotes) meta.investigationNotes = [];
            meta.investigationNotes.push(`[${now}] ${adminId ? adminId + ": " : ""}${note.trim()}`);
          }

          await prisma.auditLog.update({
            where: { id: existing.id },
            data: { metadata: JSON.stringify(meta) },
          });
        }
      } catch (err: any) {
        recordDbFailure();
        console.warn("⚠️ [ErrorStore]: Failed to update AuditLog status in DB:", err?.message || err);
      }
    }

    return item || null;
  }

  private static computeMetrics(records: StoredErrorRecord[]) {
    const counts = {
      total: records.length,
      open: 0,
      investigating: 0,
      resolved: 0,
      ignored: 0,
      byCategory: {} as Record<string, number>,
      bySeverity: { info: 0, warning: 0, error: 0, critical: 0 },
      byApplication: {} as Record<string, number>,
    };

    for (const r of records) {
      if (r.investigationStatus === "OPEN") counts.open++;
      else if (r.investigationStatus === "INVESTIGATING") counts.investigating++;
      else if (r.investigationStatus === "RESOLVED") counts.resolved++;
      else if (r.investigationStatus === "IGNORED") counts.ignored++;

      counts.byCategory[r.category] = (counts.byCategory[r.category] || 0) + 1;
      if (r.severity in counts.bySeverity) {
        counts.bySeverity[r.severity]++;
      }
      const app = r.application || "api";
      counts.byApplication[app] = (counts.byApplication[app] || 0) + 1;
    }

    return counts;
  }
}
