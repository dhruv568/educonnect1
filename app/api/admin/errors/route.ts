import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth/session";
import { isSuperAdmin, getUserAuthorization } from "@/lib/permissions/permission-engine";
import { apiSuccess, apiUnauthorized, apiForbidden, handleApiError } from "@/lib/api-response";
import { ErrorStore } from "@/lib/errors/error-store";
import { ErrorCategory, ErrorSeverity, ApplicationSource, ErrorInvestigationStatus } from "@/lib/errors/types";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return apiUnauthorized("Authentication required to access Admin Error Center.");
    }

    const userId = session.userId || session.id;
    const auth = await getUserAuthorization(userId);
    if (!auth.authorized || (!auth.isSuperAdmin && session.role !== "ADMIN" && session.role !== "STAFF")) {
      return apiForbidden("Forbidden: Administrator access required to inspect error logs.");
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || undefined;
    const category = (searchParams.get("category") || "ALL") as ErrorCategory | "ALL";
    const application = (searchParams.get("application") || "ALL") as ApplicationSource | "ALL";
    const severity = (searchParams.get("severity") || "ALL") as ErrorSeverity | "ALL";
    const status = (searchParams.get("status") || "ALL") as ErrorInvestigationStatus | "ALL";
    const page = Math.max(1, Number(searchParams.get("page") || 1));
    const limit = Math.max(1, Number(searchParams.get("limit") || 20));

    const result = await ErrorStore.getErrors({
      search,
      category,
      application,
      severity,
      status,
      page,
      limit,
    });

    return apiSuccess(result);
  } catch (error: any) {
    return handleApiError(error, "Failed to retrieve error logs.", 500, {
      route: "/api/admin/errors",
      application: "admin",
    });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return apiUnauthorized("Authentication required to update error status.");
    }

    const userId = session.userId || session.id;
    const auth = await getUserAuthorization(userId);
    if (!auth.authorized || (!auth.isSuperAdmin && session.role !== "ADMIN" && session.role !== "STAFF")) {
      return apiForbidden("Forbidden: Administrator access required.");
    }

    const body = await request.json();
    const { errorId, status, note } = body;

    if (!errorId || !status) {
      return handleApiError(
        new Error("VALIDATION_ERROR: errorId and status are required to update investigation."),
        undefined,
        400
      );
    }

    const updated = await ErrorStore.updateStatus(errorId, status, note, session.email || userId);
    return apiSuccess({
      message: `Error ${errorId} marked as ${status}.`,
      record: updated,
    });
  } catch (error: any) {
    return handleApiError(error, "Failed to update error status.", 500, {
      route: "/api/admin/errors",
      application: "admin",
    });
  }
}
