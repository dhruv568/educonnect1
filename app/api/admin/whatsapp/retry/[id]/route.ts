import { NextRequest } from "next/server";
import { requireRole } from "@/lib/auth/guards";
import { apiSuccess, handleApiError } from "@/lib/api-response";
import { WhatsAppService } from "@/services/whatsapp-service";
import { logAuditEvent } from "@/lib/audit-logger";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireRole(["ADMIN", "STAFF"]);
    const messageId = params.id;

    const result = await WhatsAppService.retryMessage(messageId);

    await logAuditEvent(session.userId || session.id, "ADMIN_WHATSAPP_RETRY", {
      messageId,
      success: result.success,
      status: result.status,
      error: result.error,
    });

    if (!result.success) {
      return apiSuccess({
        success: false,
        message: result.error || "Retry attempted but message delivery failed.",
        result,
      });
    }

    return apiSuccess({
      success: true,
      message: "WhatsApp message retried successfully.",
      result,
    });
  } catch (error: any) {
    return handleApiError(error);
  }
}
