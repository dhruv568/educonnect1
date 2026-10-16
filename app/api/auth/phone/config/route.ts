export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { Msg91Client } from "@/lib/auth/msg91";

/**
 * GET /api/auth/phone/config
 * Returns public MSG91 widget configuration safely for client initialization.
 * Exposes the widgetId and public widget tokenAuth required by MSG91's Web SDK.
 * Master authkey remains strictly protected on the server.
 */
export async function GET() {
  const config = Msg91Client.getConfig();

  return NextResponse.json({
    success: true,
    data: {
      widgetId: config.widgetId || "",
      tokenAuth: config.tokenAuth || "",
      isConfigured: config.isConfigured,
      tokenAuthEnabled: Boolean(config.tokenAuth),
    },
  });
}
