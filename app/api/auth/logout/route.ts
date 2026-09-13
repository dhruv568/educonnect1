export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { clearSessionCookie, applyLogoutCookies } from "@/lib/auth/session";

function performLogout(req: NextRequest) {
  const host =
    req.headers.get("x-forwarded-host") ||
    req.headers.get("host") ||
    undefined;

  const response = NextResponse.json(
    {
      success: true,
      data: { success: true },
      message: "Logged out successfully.",
    },
    { status: 200 }
  );

  return applyLogoutCookies(response, host);
}

export async function POST(req: NextRequest) {
  const host =
    req.headers.get("x-forwarded-host") ||
    req.headers.get("host") ||
    undefined;
  await clearSessionCookie(host);
  return performLogout(req);
}

export async function GET(req: NextRequest) {
  const host =
    req.headers.get("x-forwarded-host") ||
    req.headers.get("host") ||
    undefined;
  await clearSessionCookie(host);
  return performLogout(req);
}

