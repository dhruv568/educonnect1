import { NextRequest } from "next/server";
import { requireRole } from "@/lib/auth/guards";
import { AnalyticsService } from "@/services/analytics-service";
import { apiError, apiSuccess } from "@/lib/api-response";
import { applyLogoutCookies } from "@/lib/auth/session";

export async function GET(req: NextRequest) {
  const rawHost =
    req.headers.get("x-forwarded-host") ||
    req.headers.get("x-original-host") ||
    req.headers.get("host") ||
    undefined;

  const rawCookie =
    req.cookies.get("educonnects_session")?.value ||
    (req.headers.get("cookie")?.includes("educonnects_session") ? true : false);
  const hasSessionCookie = Boolean(rawCookie);

  try {
    const session = await requireRole(["EDUCATOR", "TEACHER"]);
    const dashboardData = await AnalyticsService.getTeacherDashboardData(session.userId);

    return apiSuccess(dashboardData);
  } catch (error: any) {
    if (error.message?.startsWith("UNAUTHORIZED")) {
      const res = apiError(error.message, 401);
      if (hasSessionCookie) {
        return applyLogoutCookies(res, rawHost);
      }
      return res;
    }
    if (error.message?.startsWith("UNVERIFIED") || error.message?.startsWith("FORBIDDEN")) {
      return apiError(error.message, 403);
    }
    console.error("[GET /api/teacher/dashboard error]:", error);
    return apiError(error.message || "Failed to fetch teacher dashboard.", 500);
  }
}
