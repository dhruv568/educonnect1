export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth/session";
import { PhoneAuthService } from "@/services/phone-auth-service";
import { apiSuccess, apiUnauthorized, apiError } from "@/lib/api-response";

/**
 * GET /api/auth/phone/status
 * Returns the authenticated user's current phone verification status
 * for learner and educator dashboard verification reminders.
 */
export async function GET(request: NextRequest) {
  const session = await getSession(request);
  if (!session) {
    return apiUnauthorized("Active session required.");
  }

  try {
    const status = await PhoneAuthService.getUserPhoneStatus(session.userId || session.id);
    return apiSuccess(status);
  } catch (err: any) {
    return apiError(err.message || "Failed to retrieve phone verification status.", 500);
  }
}
