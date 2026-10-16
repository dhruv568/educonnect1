import { NextRequest, NextResponse } from "next/server";
import { expireEndedLiveClasses } from "@/lib/classroom/class-lifecycle";

export async function GET(req: NextRequest) {
  return handleExpiration(req);
}

export async function POST(req: NextRequest) {
  return handleExpiration(req);
}

async function handleExpiration(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      // Allow local development testing if CRON_SECRET is not enforcing
      if (process.env.NODE_ENV === "production") {
        return new NextResponse("Unauthorized", { status: 401 });
      }
    }

    const now = new Date();
    const result = await expireEndedLiveClasses({ now });

    return NextResponse.json({
      success: true,
      expiredSlotsCount: result.expiredSlotsCount,
      expiredSessionsCount: result.expiredSessionsCount,
      timestamp: now.toISOString(),
    });
  } catch (error: any) {
    console.error("[expire-classes job error]:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
