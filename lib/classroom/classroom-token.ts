import { prisma } from "@/lib/prisma";
import { UserSession } from "@/types/auth";
import { ClassroomTokenPayload } from "@/types/classroom";
import crypto from "crypto";

const TOKEN_SECRET = process.env.CLASSROOM_TOKEN_SECRET || "educonnects_classroom_secret_key_2026";
const TOKEN_TTL_SECONDS = 3600; // 1 hour token lifespan

/**
 * Validates whether the user is authorized to enter the specified classroom session.
 */
export async function verifyRoomAccess(
  sessionId: string,
  session: UserSession
): Promise<{
  authorized: boolean;
  reason?: string;
  isTeacher?: boolean;
  liveSession?: any;
}> {
  if (!session || !session.id) {
    return { authorized: false, reason: "Unauthenticated. Please log in." };
  }

  // 1. Fetch session and slot details (support lookup by session ID or slot ID)
  let liveSession = await prisma.liveClassSession.findFirst({
    where: {
      OR: [{ id: sessionId }, { liveClassSlotId: sessionId }],
    },
    include: {
      liveClassSlot: true,
      teacher: {
        include: {
          user: {
            include: { profile: true },
          },
        },
      },
    },
  });

  // If session record does not exist yet but valid slot exists, auto-create it
  if (!liveSession) {
    const slot = await prisma.liveClassSlot.findUnique({
      where: { id: sessionId },
      include: {
        teacher: {
          include: {
            user: {
              include: { profile: true },
            },
          },
        },
      },
    });

    if (slot && slot.status !== "CANCELLED") {
      const isSlotTeacherVerified =
        slot.teacher?.verificationStatus === "VERIFIED" ||
        slot.teacher?.verificationStatus === "APPROVED";

      if (!isSlotTeacherVerified) {
        return {
          authorized: false,
          reason: "Educator verification is required before live classroom sessions can be hosted.",
        };
      }

      const roomId = `room-${slot.id.substring(0, 8)}`;
      liveSession = await prisma.liveClassSession.create({
        data: {
          liveClassSlotId: slot.id,
          teacherId: slot.teacherId,
          roomId,
          status: "OPEN",
          scheduledStartAt: slot.startTime,
          scheduledEndAt: slot.endTime,
          studentCanDraw: slot.whiteboardAllowed,
        },
        include: {
          liveClassSlot: true,
          teacher: {
            include: {
              user: {
                include: { profile: true },
              },
            },
          },
        },
      });
    }
  }

  if (!liveSession) {
    return { authorized: false, reason: "Classroom session not found." };
  }

  if (liveSession.status === "ENDED") {
    return { authorized: false, reason: "This classroom session has already ended.", liveSession };
  }

  if (liveSession.status === "CANCELLED") {
    return { authorized: false, reason: "This classroom session has been cancelled.", liveSession };
  }

  // 2. Check Teacher Ownership
  const isTeacher = liveSession.teacher.userId === session.id;
  if (isTeacher) {
    const isTeacherVerified =
      liveSession.teacher?.verificationStatus === "VERIFIED" ||
      liveSession.teacher?.verificationStatus === "APPROVED";

    if (!isTeacherVerified) {
      return {
        authorized: false,
        reason: "Educator verification is required before entering or hosting live sessions.",
        liveSession,
      };
    }

    return { authorized: true, isTeacher: true, liveSession };
  }

  // 3. Check Student Booking Access
  if (session.role === "STUDENT") {
    const booking = await prisma.booking.findFirst({
      where: {
        liveClassSlotId: liveSession.liveClassSlotId,
        studentId: session.id,
        status: { in: ["CONFIRMED", "ATTENDED"] },
      },
    });

    if (!booking) {
      return {
        authorized: false,
        reason: "You do not have a confirmed booking for this live class.",
        liveSession,
      };
    }

    // Check Join Window (Default 10 minutes prior to scheduled start)
    const joinBeforeMinutes = liveSession.liveClassSlot?.joinBeforeMinutes ?? 10;
    const startTime = new Date(liveSession.scheduledStartAt || liveSession.liveClassSlot?.startTime).getTime();
    const joinWindowStart = startTime - joinBeforeMinutes * 60 * 1000;
    const now = Date.now();

    if (liveSession.status !== "LIVE" && now < joinWindowStart) {
      const minutesLeft = Math.ceil((joinWindowStart - now) / (60 * 1000));
      return {
        authorized: false,
        reason: `Classroom join window opens ${minutesLeft} minute(s) before class start time.`,
        liveSession,
      };
    }

    return { authorized: true, isTeacher: false, liveSession };
  }

  // 4. Check Admin Operational Access
  if (session.role === "ADMIN") {
    return { authorized: true, isTeacher: false, liveSession };
  }

  return { authorized: false, reason: "Role unauthorized to enter classroom." };
}

/**
 * Generates a signed, short-lived room token for frontend classroom connection.
 */
export function generateRoomToken(payload: Omit<ClassroomTokenPayload, "expiresAt">): string {
  const expiresAt = Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS;
  const fullPayload: ClassroomTokenPayload = {
    ...payload,
    expiresAt,
  };

  const jsonStr = JSON.stringify(fullPayload);
  const base64Data = Buffer.from(jsonStr).toString("base64url");
  const signature = crypto
    .createHmac("sha256", TOKEN_SECRET)
    .update(base64Data)
    .digest("base64url");

  return `${base64Data}.${signature}`;
}

/**
 * Verifies and decodes a signed room token.
 */
export function decodeRoomToken(token: string): ClassroomTokenPayload | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 2) return null;

    const [base64Data, signature] = parts;
    const expectedSig = crypto
      .createHmac("sha256", TOKEN_SECRET)
      .update(base64Data)
      .digest("base64url");

    if (signature !== expectedSig) {
      return null;
    }

    const jsonStr = Buffer.from(base64Data, "base64url").toString("utf-8");
    const payload = JSON.parse(jsonStr) as ClassroomTokenPayload;

    if (Math.floor(Date.now() / 1000) > payload.expiresAt) {
      return null; // Expired token
    }

    return payload;
  } catch {
    return null;
  }
}
