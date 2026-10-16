import { prisma } from "@/lib/prisma";
import { UserSession } from "@/types/auth";
import { ClassroomTokenPayload } from "@/types/classroom";
import { isLearnerRole, isEducatorRole } from "@/lib/auth/roles";
import { isClassEnded, isClassCancelled, expireEndedLiveClasses } from "@/lib/classroom/class-lifecycle";
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
  const sanitizedId = typeof sessionId === "string" ? decodeURIComponent(sessionId).trim() : "";
  if (!sanitizedId) {
    return { authorized: false, reason: "Classroom session not found." };
  }

  const currentUserId = session?.userId || session?.id;
  if (!session || !currentUserId) {
    return { authorized: false, reason: "Unauthenticated. Please log in." };
  }

  // 1. Fetch session and slot details (support lookup by session ID, slot ID, or room ID)
  let liveSession = await prisma.liveClassSession.findFirst({
    where: {
      OR: [
        { id: sanitizedId },
        { liveClassSlotId: sanitizedId },
        { roomId: sanitizedId },
      ],
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
    const slot = await prisma.liveClassSlot.findFirst({
      where: {
        OR: [
          { id: sanitizedId },
          { session: { roomId: sanitizedId } },
        ],
      },
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
      if (isClassEnded(slot)) {
        return {
          authorized: false,
          reason: "This live class has already ended.",
        };
      }

      if (slot.teacher?.isSeededProfile) {
        return {
          authorized: false,
          reason: "Seeded public profiles cannot host live classroom sessions.",
        };
      }

      const isSlotTeacherVerified =
        slot.teacher?.verificationStatus === "VERIFIED" ||
        slot.teacher?.verificationStatus === "APPROVED";

      if (!isSlotTeacherVerified) {
        return {
          authorized: false,
          reason: "Your educator account is pending verification. Teaching, live classes, course publishing, and content publishing will be available after verification.",
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

  if (isClassCancelled(liveSession)) {
    return { authorized: false, reason: "This classroom session has been cancelled.", liveSession };
  }

  if (isClassEnded(liveSession)) {
    expireEndedLiveClasses({ slotId: liveSession.liveClassSlotId }).catch(() => {});
    return { authorized: false, reason: "This classroom session has already ended.", liveSession };
  }

  // 2. Check Teacher Ownership
  const isTeacher =
    liveSession.teacher.userId === currentUserId ||
    liveSession.teacher.userId === session.id;
  if (isTeacher) {
    if (isClassEnded(liveSession)) {
      return {
        authorized: false,
        reason: "This classroom session has already ended.",
        liveSession,
      };
    }

    if (liveSession.teacher?.isSeededProfile) {
      return {
        authorized: false,
        reason: "Seeded public profiles cannot enter or host live sessions.",
        liveSession,
      };
    }

    const isTeacherVerified =
      liveSession.teacher?.verificationStatus === "VERIFIED" ||
      liveSession.teacher?.verificationStatus === "APPROVED";

    if (!isTeacherVerified) {
      return {
        authorized: false,
        reason: "Your educator account is pending verification. Teaching, live classes, course publishing, and content publishing will be available after verification.",
        liveSession,
      };
    }

    return { authorized: true, isTeacher: true, liveSession };
  }

  // 3. Check Student Booking Access
  if (isLearnerRole(session.role)) {
    const isTeacherVerified =
      liveSession.teacher?.verificationStatus === "VERIFIED" ||
      liveSession.teacher?.verificationStatus === "APPROVED";

    if (!isTeacherVerified) {
      return {
        authorized: false,
        reason: "This live class is currently locked because the educator account is pending verification.",
        liveSession,
      };
    }

    let booking = await prisma.booking.findFirst({
      where: {
        liveClassSlotId: liveSession.liveClassSlotId,
        studentId: currentUserId,
        status: { notIn: ["CANCELLED", "cancelled"] },
      },
    });

    if (!booking) {
      const slot = liveSession.liveClassSlot;
      // 1. One-to-one restriction: If this is a 1-to-1 session and already booked by another student, deny access.
      if (slot && slot.classType === "ONE_TO_ONE") {
        const otherBooking = await prisma.booking.findFirst({
          where: {
            liveClassSlotId: slot.id,
            status: { notIn: ["CANCELLED", "cancelled"] },
            studentId: { not: currentUserId },
          },
        });
        if (otherBooking) {
          return {
            authorized: false,
            reason: "This private 1-on-1 session is reserved for another learner.",
            liveSession,
          };
        }
      }

      // 2. Capacity check for group sessions
      if (slot) {
        const totalBookings = await prisma.booking.count({
          where: {
            liveClassSlotId: slot.id,
            status: { notIn: ["CANCELLED", "cancelled"] },
          },
        });
        if (totalBookings >= slot.maxCapacity) {
          return {
            authorized: false,
            reason: "This live class has reached maximum capacity.",
            liveSession,
          };
        }

        // 3. If class is free (price === 0 or null), auto-create confirmed booking for this authenticated student
        const slotPrice = Number(slot.price ?? 0);
        if (slotPrice <= 0) {
          booking = await prisma.booking.create({
            data: {
              liveClassSlotId: slot.id,
              studentId: currentUserId,
              status: "CONFIRMED",
            },
          });
        }
      }

      if (!booking) {
        return {
          authorized: false,
          reason: "You do not have a confirmed booking for this live class.",
          liveSession,
        };
      }
    }

    // Check Join Window: allow join if class is within joinBeforeMinutes window and has not ended
    const joinBeforeMinutes = liveSession.liveClassSlot?.joinBeforeMinutes ?? 15;
    const startTime = new Date(liveSession.scheduledStartAt || liveSession.liveClassSlot?.startTime).getTime();
    const endTime = new Date(liveSession.scheduledEndAt || liveSession.liveClassSlot?.endTime).getTime();
    const joinWindowStart = startTime - joinBeforeMinutes * 60 * 1000;
    const now = Date.now();

    if (now > endTime || isClassEnded(liveSession)) {
      return {
        authorized: false,
        reason: "This classroom session has already ended.",
        liveSession,
      };
    }

    const isClassLiveOrOpen =
      (liveSession.status === "LIVE" ||
      liveSession.status === "OPEN" ||
      liveSession.liveClassSlot?.status === "LIVE") && now <= endTime;

    if (!isClassLiveOrOpen && now < joinWindowStart) {
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
