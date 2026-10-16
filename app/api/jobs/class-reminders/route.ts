import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { EventService } from "@/services/event-service";
import { expireEndedLiveClasses } from "@/lib/classroom/class-lifecycle";

export async function GET(req: NextRequest) {
  return handleReminders(req);
}

export async function POST(req: NextRequest) {
  return handleReminders(req);
}

async function handleReminders(req: NextRequest) {
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

    // Expire any ended classes and finalize their rooms/attendance
    await expireEndedLiveClasses({ now }).catch((err) => {
      console.warn("[class-reminders] Background class expiration check error:", err);
    });
    const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const in1Hour = new Date(now.getTime() + 60 * 60 * 1000);
    const in10Mins = new Date(now.getTime() + 10 * 60 * 1000);

    let sentCount = 0;

    // 1. Fetch upcoming scheduled live class slots
    const slots = await prisma.liveClassSlot.findMany({
      where: {
        startTime: { gte: now, lte: in24Hours },
        status: { in: ["SCHEDULED", "OPEN", "FULL"] },
      },
      include: {
        bookings: { where: { status: { notIn: ["CANCELLED"] } } },
        teacher: { include: { user: { include: { profile: true } } } },
      },
    });

    for (const slot of slots) {
      const diffMs = slot.startTime.getTime() - now.getTime();
      const diffMins = Math.round(diffMs / (60 * 1000));

      let reminderType: "24h" | "1h" | "10m" | null = null;
      let timeLabel = "";

      if (diffMins >= 1430 && diffMins <= 1450) {
        reminderType = "24h";
        timeLabel = "24 hours";
      } else if (diffMins >= 50 && diffMins <= 70) {
        reminderType = "1h";
        timeLabel = "1 hour";
      } else if (diffMins >= 5 && diffMins <= 15) {
        reminderType = "10m";
        timeLabel = "10 minutes";
      }

      if (reminderType) {
        for (const booking of slot.bookings) {
          const idempotencyKey = `reminder-${reminderType}-${slot.id}-${booking.studentId}`;
          await EventService.emit("class.starting_soon", {
            userId: booking.studentId,
            data: {
              slotId: slot.id,
              classTitle: slot.title,
              startTime: slot.startTime.toISOString(),
              timeLabel,
              joinUrl: `/classroom/${slot.id}`,
            },
            idempotencyKey,
          });
          sentCount++;
        }
      }
    }

    return NextResponse.json({
      success: true,
      sentCount,
      timestamp: now.toISOString(),
    });
  } catch (error: any) {
    console.error("[class-reminders job error]:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
