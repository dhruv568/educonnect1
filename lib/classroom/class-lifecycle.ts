import { prisma } from "@/lib/prisma";
import { closeLiveKitRoom } from "@/lib/classroom/livekit-server";

export interface ClassSlotEntity {
  id: string;
  startTime: Date | string;
  endTime: Date | string;
  status: string;
  joinBeforeMinutes?: number | null;
  durationMinutes?: number | null;
  session?: {
    id?: string;
    status?: string | null;
    scheduledEndAt?: Date | string | null;
  } | null;
}

export type ClassLifecycleStatus = "UPCOMING" | "LIVE" | "COMPLETED" | "CANCELLED";

/**
 * Checks whether a class has been explicitly cancelled.
 */
export function isClassCancelled(slot: {
  status?: string | null;
  session?: { status?: string | null } | null;
  liveClassSlot?: { status?: string | null } | null;
}): boolean {
  return (
    slot.status === "CANCELLED" ||
    slot.session?.status === "CANCELLED" ||
    slot.liveClassSlot?.status === "CANCELLED"
  );
}

/**
 * Authoritatively determines whether a class has completed or expired based on:
 * 1. Explicit COMPLETED / ENDED database status
 * 2. Authoritative scheduled end timestamp having passed (now >= endTime)
 */
export function isClassEnded(
  slot: {
    endTime?: Date | string | null;
    scheduledEndAt?: Date | string | null;
    status?: string | null;
    session?: { status?: string | null; scheduledEndAt?: Date | string | null } | null;
    liveClassSlot?: { endTime?: Date | string | null; status?: string | null } | null;
  },
  now: Date = new Date()
): boolean {
  if (isClassCancelled(slot)) {
    return false; // Cancellation takes precedence over completion
  }

  if (
    slot.status === "COMPLETED" ||
    slot.status === "ENDED" ||
    slot.session?.status === "ENDED" ||
    slot.session?.status === "COMPLETED" ||
    slot.liveClassSlot?.status === "COMPLETED"
  ) {
    return true;
  }

  const rawEnd =
    slot.session?.scheduledEndAt ||
    slot.scheduledEndAt ||
    slot.endTime ||
    slot.liveClassSlot?.endTime;

  if (!rawEnd) return false;

  const endMs = new Date(rawEnd).getTime();
  if (isNaN(endMs)) return false;

  return now.getTime() >= endMs;
}

/**
 * Computes the accurate, authoritative lifecycle status of a live class.
 * Lifecycle:
 * 1. CANCELLED: Explicitly cancelled.
 * 2. COMPLETED: Scheduled end time has passed or status is COMPLETED/ENDED.
 * 3. LIVE: Within permitted session window and not ended.
 * 4. UPCOMING: Start time has not arrived and not live.
 */
export function getEffectiveClassStatus(
  slot: {
    startTime: Date | string;
    endTime: Date | string;
    status: string;
    session?: { status?: string | null; scheduledEndAt?: Date | string | null } | null;
    joinBeforeMinutes?: number | null;
  },
  now: Date = new Date()
): ClassLifecycleStatus {
  if (isClassCancelled(slot)) {
    return "CANCELLED";
  }

  if (isClassEnded(slot, now)) {
    return "COMPLETED";
  }

  const startMs = new Date(slot.startTime).getTime();
  const endMs = new Date(slot.endTime).getTime();
  const joinBeforeMins = slot.joinBeforeMinutes ?? 15;
  const joinWindowStartMs = startMs - joinBeforeMins * 60 * 1000;
  const nowMs = now.getTime();

  const isMarkedLive = slot.status === "LIVE" || slot.session?.status === "LIVE" || slot.session?.status === "OPEN";
  const isWithinWindow = nowMs >= joinWindowStartMs && nowMs <= endMs;

  if ((isMarkedLive || isWithinWindow) && nowMs <= endMs) {
    return "LIVE";
  }

  return "UPCOMING";
}

/**
 * Evaluates whether a participant or educator is permitted to enter / join a classroom.
 * Joining is strictly forbidden if the class is cancelled or if its permitted session window has ended.
 */
export function canJoinClass(
  slot: {
    startTime: Date | string;
    endTime: Date | string;
    status: string;
    session?: { status?: string | null; scheduledEndAt?: Date | string | null } | null;
    joinBeforeMinutes?: number | null;
  },
  now: Date = new Date()
): boolean {
  if (isClassCancelled(slot)) {
    return false;
  }

  if (isClassEnded(slot, now)) {
    return false;
  }

  const startMs = new Date(slot.startTime).getTime();
  const endMs = new Date(slot.endTime).getTime();
  const joinBeforeMins = slot.joinBeforeMinutes ?? 15;
  const joinWindowStartMs = startMs - joinBeforeMins * 60 * 1000;
  const nowMs = now.getTime();

  const isMarkedLive = slot.status === "LIVE" || slot.session?.status === "LIVE" || slot.session?.status === "OPEN";
  const isWithinWindow = nowMs >= joinWindowStartMs && nowMs <= endMs;

  return (isMarkedLive || isWithinWindow) && nowMs <= endMs;
}

/**
 * Automatically and idempotently expires ended live classes in the database.
 * 1. Synchronizes LiveClassSlot status to COMPLETED
 * 2. Finalizes LiveClassSession status to ENDED and records actualEndAt/duration
 * 3. Finalizes student attendance (records ABSENT for unattended bookings)
 * 4. Cleans up LiveKit room and signaling memory
 *
 * Safe to call repeatedly; idempotent and resilient against partial network failures.
 */
export async function expireEndedLiveClasses(options?: {
  slotId?: string;
  teacherId?: string;
  now?: Date;
}): Promise<{ expiredSlotsCount: number; expiredSessionsCount: number }> {
  const now = options?.now || new Date();
  let expiredSlotsCount = 0;
  let expiredSessionsCount = 0;

  try {
    // 1. Query all slots whose authoritative scheduled end time has passed but status is not COMPLETED or CANCELLED
    const whereSlot: any = {
      endTime: { lte: now },
      status: { notIn: ["COMPLETED", "CANCELLED"] },
    };

    if (options?.slotId) whereSlot.id = options.slotId;
    if (options?.teacherId) whereSlot.teacherId = options.teacherId;

    const expiredSlots = await prisma.liveClassSlot.findMany({
      where: whereSlot,
      include: {
        session: true,
        bookings: {
          where: { status: { notIn: ["CANCELLED"] } },
        },
      },
    });

    for (const slot of expiredSlots) {
      try {
        // Mark slot as COMPLETED
        await prisma.liveClassSlot.update({
          where: { id: slot.id },
          data: { status: "COMPLETED" },
        });
        expiredSlotsCount++;

        // If session exists, finalize it
        if (slot.session && slot.session.status !== "ENDED" && slot.session.status !== "CANCELLED") {
          const session = slot.session;
          const startAt = session.actualStartAt || session.scheduledStartAt || slot.startTime;
          const endAt = session.actualEndAt || session.scheduledEndAt || slot.endTime;
          const durationMinutes = session.durationMinutes || slot.durationMinutes || Math.max(1, Math.round((endAt.getTime() - startAt.getTime()) / 60000));

          await prisma.liveClassSession.update({
            where: { id: session.id },
            data: {
              status: "ENDED",
              actualStartAt: session.actualStartAt || startAt,
              actualEndAt: session.actualEndAt || endAt,
              durationMinutes,
            },
          });
          expiredSessionsCount++;

          // Finalize student attendance for booked students
          const requiredDurationSec = Math.max(60, durationMinutes * 60 * 0.75);
          for (const booking of slot.bookings) {
            const attendance = await prisma.classAttendance.findFirst({
              where: {
                sessionId: session.id,
                studentId: booking.studentId,
              },
            });

            if (!attendance) {
              await prisma.classAttendance.create({
                data: {
                  sessionId: session.id,
                  studentId: booking.studentId,
                  status: "ABSENT",
                  duration: 0,
                },
              });
            } else if (attendance.status === "ABSENT" && attendance.duration > 0) {
              const studentDuration = attendance.duration;
              const finalStatus = studentDuration >= requiredDurationSec ? "PRESENT" : "PARTIAL";
              await prisma.classAttendance.update({
                where: { id: attendance.id },
                data: {
                  status: finalStatus,
                  leftAt: attendance.leftAt || endAt,
                },
              });
            }
          }

          // Terminate LiveKit room if active
          await closeLiveKitRoom(session.id).catch(() => {});

          // Clean up in-memory signaling store
          const signalingStore = (global as any).__classroomSignaling;
          if (signalingStore) {
            const room = signalingStore.get(session.id);
            if (room) {
              (room as any).isEnded = true;
              (room as any).endedAt = now.getTime();
            }
          }
        }
      } catch (err) {
        console.warn(`[ClassLifecycle] Error expiring slot ${slot.id}:`, err);
      }
    }

    // 2. Query any orphaned LiveClassSessions whose scheduledEndAt has passed but status is not ENDED or CANCELLED
    const whereSession: any = {
      scheduledEndAt: { lte: now },
      status: { notIn: ["ENDED", "CANCELLED"] },
    };

    if (options?.slotId) whereSession.liveClassSlotId = options.slotId;
    if (options?.teacherId) whereSession.teacherId = options.teacherId;

    const expiredSessions = await prisma.liveClassSession.findMany({
      where: whereSession,
      include: {
        liveClassSlot: {
          include: {
            bookings: { where: { status: { notIn: ["CANCELLED"] } } },
          },
        },
      },
    });

    for (const session of expiredSessions) {
      try {
        const startAt = session.actualStartAt || session.scheduledStartAt;
        const endAt = session.actualEndAt || session.scheduledEndAt;
        const durationMinutes = session.durationMinutes || Math.max(1, Math.round((endAt.getTime() - startAt.getTime()) / 60000));

        await prisma.liveClassSession.update({
          where: { id: session.id },
          data: {
            status: "ENDED",
            actualStartAt: session.actualStartAt || startAt,
            actualEndAt: session.actualEndAt || endAt,
            durationMinutes,
          },
        });
        expiredSessionsCount++;

        // Sync parent slot if not completed
        if (session.liveClassSlot && session.liveClassSlot.status !== "COMPLETED" && session.liveClassSlot.status !== "CANCELLED") {
          await prisma.liveClassSlot.update({
            where: { id: session.liveClassSlot.id },
            data: { status: "COMPLETED" },
          });
          expiredSlotsCount++;
        }

        // Finalize attendance
        if (session.liveClassSlot?.bookings) {
          const requiredDurationSec = Math.max(60, durationMinutes * 60 * 0.75);
          for (const booking of session.liveClassSlot.bookings) {
            const attendance = await prisma.classAttendance.findFirst({
              where: {
                sessionId: session.id,
                studentId: booking.studentId,
              },
            });

            if (!attendance) {
              await prisma.classAttendance.create({
                data: {
                  sessionId: session.id,
                  studentId: booking.studentId,
                  status: "ABSENT",
                  duration: 0,
                },
              });
            } else if (attendance.status === "ABSENT" && attendance.duration > 0) {
              const studentDuration = attendance.duration;
              const finalStatus = studentDuration >= requiredDurationSec ? "PRESENT" : "PARTIAL";
              await prisma.classAttendance.update({
                where: { id: attendance.id },
                data: {
                  status: finalStatus,
                  leftAt: attendance.leftAt || endAt,
                },
              });
            }
          }
        }

        await closeLiveKitRoom(session.id).catch(() => {});
      } catch (err) {
        console.warn(`[ClassLifecycle] Error expiring session ${session.id}:`, err);
      }
    }
  } catch (error) {
    console.warn("[ClassLifecycle] Error during batch expiration check:", error);
  }

  return { expiredSlotsCount, expiredSessionsCount };
}
