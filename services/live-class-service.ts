import { prisma } from "@/lib/prisma";
import { getLearnerClassroomUrl } from "@/lib/app-url";
import {
  isClassEnded,
  isClassCancelled,
  canJoinClass,
  expireEndedLiveClasses,
} from "@/lib/classroom/class-lifecycle";
import {
  INDIAN_TIMEZONE,
  parseISTDateTime,
  getISTDateString,
  getISTDayOfWeek,
  formatISTTime,
  formatTime24to12,
  formatISTTimeRange,
  formatISTDisplayDate,
  isSlotPastCutoff,
} from "@/lib/timezone";
import { toPaise } from "@/lib/currency";
import crypto from "crypto";

export interface BookSlotItem {
  slotId?: string;
  date: string; // "YYYY-MM-DD"
  startTime: string; // "HH:mm"
  endTime: string; // "HH:mm"
  startIso?: string;
  endIso?: string;
  price?: number;
}

export interface BookEducatorSlotsInput {
  studentUserId: string;
  teacherId: string;
  slots: BookSlotItem[];
  offerCode?: string;
}

export interface CreateLiveClassInput {
  title: string;
  description?: string;
  subject: string;
  level?: string;
  language?: string;
  startTime: string | Date;
  endTime: string | Date;
  timezone?: string;
  durationMinutes?: number;
  classType?: string; // ONE_TO_ONE | GROUP
  maxCapacity?: number;
  minimumStudents?: number;
  price?: number;
  status?: string; // DRAFT | SCHEDULED | OPEN
  bookingOpenAt?: string | Date;
  bookingCloseAt?: string | Date;
  joinBeforeMinutes?: number;
  bufferMinutes?: number;
  cameraRequired?: boolean;
  micRequired?: boolean;
  screenSharingAllowed?: boolean;
  whiteboardAllowed?: boolean;
  chatAllowed?: boolean;
  fileSharingAllowed?: boolean;
  relatedCourseId?: string;
  isRecurring?: boolean;
  recurrenceRule?: string;
  allowAvailabilityOverride?: boolean;
}

export interface TeacherAvailabilityInput {
  timezone?: string;
  availabilities: Array<{
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    isActive: boolean;
  }>;
  breaks: Array<{
    dayOfWeek: number;
    startTime: string;
    endTime: string;
  }>;
}

export class LiveClassService {
  /**
   * Resolve teacherProfile for a user
   */
  static async getTeacherProfileId(userId: string): Promise<string> {
    const profile = await prisma.teacherProfile.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!profile) {
      throw new Error("Teacher profile not found. Please complete profile onboarding.");
    }
    return profile.id;
  }

  /**
   * Resolve and enforce verified teacherProfile
   */
  static async getVerifiedTeacherProfile(userId: string) {
    const profile = await prisma.teacherProfile.findUnique({
      where: { userId },
    });
    if (!profile) {
      throw new Error("TEACHER_NOT_FOUND: Teacher profile not found. Please complete profile onboarding.");
    }
    const isVerified =
      profile.verificationStatus === "VERIFIED" ||
      profile.verificationStatus === "APPROVED";
    if (!isVerified) {
      throw new Error("FORBIDDEN: Your educator account is pending verification. Teaching, live classes, course publishing, and content publishing will be available after verification.");
    }
    return profile;
  }

  /**
   * Get teacher live classes dashboard stats
   */
  static async getLiveClassStats(userId: string) {
    const teacherId = await this.getTeacherProfileId(userId);
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

    // Synchronize expired classes in the database
    await expireEndedLiveClasses({ teacherId, now }).catch(() => {});

    const [total, upcoming, today, completed, cancelled] = await Promise.all([
      prisma.liveClassSlot.count({ where: { teacherId } }),
      prisma.liveClassSlot.count({
        where: {
          teacherId,
          startTime: { gte: now },
          endTime: { gt: now },
          status: { in: ["SCHEDULED", "OPEN", "FULL"] },
        },
      }),
      prisma.liveClassSlot.count({
        where: {
          teacherId,
          startTime: { gte: startOfToday, lt: endOfToday },
          endTime: { gt: now },
          status: { notIn: ["CANCELLED", "COMPLETED"] },
        },
      }),
      prisma.liveClassSlot.count({
        where: {
          teacherId,
          OR: [
            { status: "COMPLETED" },
            { endTime: { lte: now }, status: { not: "CANCELLED" } },
          ],
        },
      }),
      prisma.liveClassSlot.count({
        where: { teacherId, status: "CANCELLED" },
      }),
    ]);

    return {
      total,
      upcoming,
      today,
      completed,
      cancelled,
    };
  }

  /**
   * Get list of live class slots for a teacher with filtering
   */
  static async getTeacherLiveClasses(userId: string, filterStatus?: string) {
    const teacherId = await this.getTeacherProfileId(userId);
    const now = new Date();

    // Synchronize expired classes in the database
    await expireEndedLiveClasses({ teacherId, now }).catch(() => {});

    const slots = await prisma.liveClassSlot.findMany({
      where: { teacherId },
      orderBy: { startTime: "asc" },
      include: {
        bookings: {
          include: {
            student: {
              select: {
                id: true,
                email: true,
                profile: { select: { firstName: true, lastName: true, avatarUrl: true } },
              },
            },
          },
        },
        session: true,
      },
    });

    const mapped = slots.map((s) => {
      const isEnded = isClassEnded(s, now);
      const isCancelled = isClassCancelled(s);
      const effectiveStatus = isCancelled ? "CANCELLED" : isEnded ? "COMPLETED" : s.status;

      return {
        ...s,
        status: effectiveStatus,
        studentCount: s.bookings.filter((b) => b.status !== "CANCELLED").length,
        shareableUrl: getLearnerClassroomUrl(s.id),
      };
    });

    if (filterStatus && filterStatus !== "ALL") {
      return mapped.filter((s) => s.status === filterStatus);
    }

    return mapped;
  }

  /**
   * Check for schedule overlaps and buffer time conflicts
   */
  static async checkScheduleConflict(
    teacherId: string,
    start: Date,
    end: Date,
    bufferMins: number = 15,
    excludeSlotId?: string
  ) {
    const bufferedStart = new Date(start.getTime() - bufferMins * 60 * 1000);
    const bufferedEnd = new Date(end.getTime() + bufferMins * 60 * 1000);

    const existingSlots = await prisma.liveClassSlot.findMany({
      where: {
        teacherId,
        status: { in: ["DRAFT", "SCHEDULED", "OPEN", "FULL", "LIVE"] },
        id: excludeSlotId ? { not: excludeSlotId } : undefined,
        OR: [
          {
            startTime: { lt: bufferedEnd },
            endTime: { gt: bufferedStart },
          },
        ],
      },
    });

    if (existingSlots.length > 0) {
      const conflict = existingSlots[0];
      return {
        hasConflict: true,
        conflictingSlot: {
          id: conflict.id,
          title: conflict.title,
          startTime: conflict.startTime,
          endTime: conflict.endTime,
        },
        message: `Schedule conflict with existing class "${conflict.title}" (${conflict.startTime.toLocaleTimeString()} - ${conflict.endTime.toLocaleTimeString()}) including ${bufferMins} min buffer.`,
      };
    }

    return { hasConflict: false };
  }

  /**
   * Create a new live class slot
   */
  static async createLiveClass(userId: string, input: CreateLiveClassInput) {
    const teacher = await this.getVerifiedTeacherProfile(userId);
    const teacherId = teacher.id;

    const start = new Date(input.startTime);
    const end = new Date(input.endTime);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new Error("Invalid start or end time specified.");
    }

    if (end <= start) {
      throw new Error("End time must be strictly later than start time.");
    }

    const durationMinutes = input.durationMinutes || Math.round((end.getTime() - start.getTime()) / (60 * 1000));
    const bufferMinutes = input.bufferMinutes ?? 15;

    // Check conflict
    const conflictCheck = await this.checkScheduleConflict(teacherId, start, end, bufferMinutes);
    if (conflictCheck.hasConflict) {
      throw new Error(conflictCheck.message);
    }

    const slot = await prisma.liveClassSlot.create({
      data: {
        teacherId,
        title: input.title,
        description: input.description,
        subject: input.subject,
        level: input.level || "ALL_LEVELS",
        language: input.language || "English",
        startTime: start,
        endTime: end,
        timezone: input.timezone || "Asia/Kolkata",
        durationMinutes,
        classType: input.classType || (input.maxCapacity === 1 ? "ONE_TO_ONE" : "GROUP"),
        maxCapacity: input.maxCapacity || 10,
        minimumStudents: input.minimumStudents || 1,
        price: input.price || 0,
        status: input.status || "SCHEDULED",
        bookingOpenAt: input.bookingOpenAt ? new Date(input.bookingOpenAt) : null,
        bookingCloseAt: input.bookingCloseAt ? new Date(input.bookingCloseAt) : null,
        joinBeforeMinutes: input.joinBeforeMinutes ?? 10,
        bufferMinutes,
        cameraRequired: input.cameraRequired ?? true,
        micRequired: input.micRequired ?? true,
        screenSharingAllowed: input.screenSharingAllowed ?? true,
        whiteboardAllowed: input.whiteboardAllowed ?? true,
        chatAllowed: input.chatAllowed ?? true,
        fileSharingAllowed: input.fileSharingAllowed ?? true,
        relatedCourseId: input.relatedCourseId || null,
        isRecurring: input.isRecurring ?? false,
        recurrenceRule: input.recurrenceRule || null,
      },
    });

    return {
      ...slot,
      shareableUrl: getLearnerClassroomUrl(slot.id),
    };
  }

  /**
   * Get single live class slot details
   */
  static async getLiveClassDetails(userId: string, slotId: string) {
    const teacherId = await this.getTeacherProfileId(userId);

    const slot = await prisma.liveClassSlot.findFirst({
      where: { id: slotId, teacherId },
      include: {
        bookings: {
          include: {
            student: {
              select: {
                id: true,
                email: true,
                profile: { select: { firstName: true, lastName: true, avatarUrl: true, phone: true } },
              },
            },
          },
        },
        session: {
          include: {
            attendances: {
              include: {
                student: {
                  select: {
                    id: true,
                    email: true,
                    profile: { select: { firstName: true, lastName: true } },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!slot) {
      throw new Error("Live class slot not found or unauthorized access.");
    }

    return {
      ...slot,
      shareableUrl: getLearnerClassroomUrl(slot.id),
    };
  }

  /**
   * Update live class slot details
   */
  static async updateLiveClass(userId: string, slotId: string, input: Partial<CreateLiveClassInput>) {
    const teacherId = await this.getTeacherProfileId(userId);

    const existing = await prisma.liveClassSlot.findFirst({
      where: { id: slotId, teacherId },
      include: { bookings: true },
    });

    if (!existing) {
      throw new Error("Live class slot not found or unauthorized.");
    }

    const currentConfirmedBookings = existing.bookings.filter((b) => b.status !== "CANCELLED").length;

    if (input.maxCapacity !== undefined && input.maxCapacity < currentConfirmedBookings) {
      throw new Error(`Capacity cannot be lower than current active bookings (${currentConfirmedBookings}).`);
    }

    const updateData: any = {};
    if (input.title !== undefined) updateData.title = input.title;
    if (input.description !== undefined) updateData.description = input.description;
    if (input.subject !== undefined) updateData.subject = input.subject;
    if (input.level !== undefined) updateData.level = input.level;
    if (input.language !== undefined) updateData.language = input.language;
    if (input.maxCapacity !== undefined) updateData.maxCapacity = input.maxCapacity;
    if (input.minimumStudents !== undefined) updateData.minimumStudents = input.minimumStudents;
    if (input.price !== undefined) updateData.price = input.price;
    if (input.cameraRequired !== undefined) updateData.cameraRequired = input.cameraRequired;
    if (input.micRequired !== undefined) updateData.micRequired = input.micRequired;
    if (input.screenSharingAllowed !== undefined) updateData.screenSharingAllowed = input.screenSharingAllowed;
    if (input.whiteboardAllowed !== undefined) updateData.whiteboardAllowed = input.whiteboardAllowed;
    if (input.chatAllowed !== undefined) updateData.chatAllowed = input.chatAllowed;
    if (input.fileSharingAllowed !== undefined) updateData.fileSharingAllowed = input.fileSharingAllowed;
    if (input.relatedCourseId !== undefined) updateData.relatedCourseId = input.relatedCourseId;

    if (input.startTime && input.endTime) {
      const start = new Date(input.startTime);
      const end = new Date(input.endTime);
      if (end <= start) {
        throw new Error("End time must be strictly later than start time.");
      }

      const conflict = await this.checkScheduleConflict(
        teacherId,
        start,
        end,
        existing.bufferMinutes,
        slotId
      );
      if (conflict.hasConflict) {
        throw new Error(conflict.message);
      }

      updateData.startTime = start;
      updateData.endTime = end;
      updateData.durationMinutes = Math.round((end.getTime() - start.getTime()) / (60 * 1000));
    }

    const updated = await prisma.liveClassSlot.update({
      where: { id: slotId },
      data: updateData,
    });

    return updated;
  }

  /**
   * Cancel a live class slot
   */
  static async cancelLiveClass(userId: string, slotId: string, reason?: string) {
    const teacherId = await this.getTeacherProfileId(userId);

    const slot = await prisma.liveClassSlot.findFirst({
      where: { id: slotId, teacherId },
    });

    if (!slot) {
      throw new Error("Live class slot not found.");
    }

    const updated = await prisma.liveClassSlot.update({
      where: { id: slotId },
      data: { status: "CANCELLED" },
    });

    // Cancel related session if active
    await prisma.liveClassSession.updateMany({
      where: { liveClassSlotId: slotId },
      data: { status: "CANCELLED" },
    });

    return updated;
  }

  /**
   * Publish a draft live class
   */
  static async publishLiveClass(userId: string, slotId: string) {
    const teacher = await this.getVerifiedTeacherProfile(userId);
    const teacherId = teacher.id;

    const slot = await prisma.liveClassSlot.findFirst({
      where: { id: slotId, teacherId },
    });

    if (!slot) throw new Error("Live class slot not found.");

    if (!slot.title || !slot.subject || !slot.startTime || !slot.endTime) {
      throw new Error("Class title, subject, date, and time must be completed before publishing.");
    }

    const updated = await prisma.liveClassSlot.update({
      where: { id: slotId },
      data: { status: "SCHEDULED" },
    });

    return updated;
  }

  /**
   * Connect live class slot to Module 06 LiveClassSession
   */
  static async startOrGetClassroomSession(userId: string, slotId: string) {
    const teacher = await this.getVerifiedTeacherProfile(userId);
    const teacherId = teacher.id;

    const slot = await prisma.liveClassSlot.findFirst({
      where: { id: slotId, teacherId },
      include: { session: true },
    });

    if (!slot) throw new Error("Live class slot not found.");

    if (isClassCancelled(slot)) {
      throw new Error("Cannot enter or start a cancelled live class.");
    }

    if (isClassEnded(slot)) {
      throw new Error("Cannot enter or start a live class that has already ended.");
    }

    if (slot.session) {
      if (isClassEnded(slot.session)) {
        throw new Error("Cannot enter or start a classroom session that has already ended.");
      }
      return slot.session;
    }

    const roomId = `room-${slot.id.substring(0, 8)}`;
    const session = await prisma.liveClassSession.create({
      data: {
        liveClassSlotId: slot.id,
        teacherId: slot.teacherId,
        roomId,
        status: "OPEN",
        scheduledStartAt: slot.startTime,
        scheduledEndAt: slot.endTime,
        studentCanDraw: slot.whiteboardAllowed,
      },
    });

    await prisma.liveClassSlot.update({
      where: { id: slot.id },
      data: { status: "LIVE" },
    });

    return session;
  }

  /**
   * Get teacher availability settings, date overrides, and current slot statuses
   */
  static async getTeacherAvailability(userId: string) {
    const teacherId = await this.getTeacherProfileId(userId);
    const now = new Date();

    const availabilities = await prisma.teacherAvailability.findMany({
      where: { teacherId },
      orderBy: { dayOfWeek: "asc" },
    });

    const breaks = await prisma.teacherBreak.findMany({
      where: { teacherId },
      orderBy: { dayOfWeek: "asc" },
    });

    const dateOverrides = await prisma.teacherDateOverride.findMany({
      where: { teacherId },
      orderBy: { date: "asc" },
    });

    const slots = await prisma.liveClassSlot.findMany({
      where: { teacherId },
      include: {
        bookings: {
          include: {
            student: {
              select: {
                id: true,
                email: true,
                profile: { select: { firstName: true, lastName: true, avatarUrl: true, phone: true } },
              },
            },
          },
        },
      },
      orderBy: { startTime: "asc" },
    });

    // Also collect all confirmed and historical student bookings for the educator
    const allBookings = slots.flatMap((s) =>
      s.bookings.map((b) => ({
        bookingId: b.id,
        slotId: s.id,
        title: s.title,
        subject: s.subject,
        startTime: s.startTime.toISOString(),
        endTime: s.endTime.toISOString(),
        startDisplay: formatISTDisplayDate(s.startTime),
        timeDisplay: formatISTTimeRange(s.startTime, s.endTime),
        status: b.status,
        slotStatus: s.status,
        isEnded: isClassEnded(s, now),
        price: s.price,
        student: {
          id: b.student.id,
          email: b.student.email,
          name: b.student.profile
            ? `${b.student.profile.firstName || ""} ${b.student.profile.lastName || ""}`.trim() || b.student.email
            : b.student.email,
          avatarUrl: b.student.profile?.avatarUrl || null,
          phone: b.student.profile?.phone || null,
        },
      }))
    );

    return { teacherId, availabilities, breaks, dateOverrides, slots, allBookings };
  }

  /**
   * Update teacher availability settings
   */
  static async updateTeacherAvailability(userId: string, input: TeacherAvailabilityInput) {
    const teacherId = await this.getTeacherProfileId(userId);

    // Delete existing and re-insert
    await prisma.$transaction([
      prisma.teacherAvailability.deleteMany({ where: { teacherId } }),
      prisma.teacherBreak.deleteMany({ where: { teacherId } }),
    ]);

    if (input.availabilities && input.availabilities.length > 0) {
      await prisma.teacherAvailability.createMany({
        data: input.availabilities.map((a) => ({
          teacherId,
          dayOfWeek: a.dayOfWeek,
          startTime: a.startTime,
          endTime: a.endTime,
          timezone: input.timezone || "Asia/Kolkata",
          isActive: a.isActive ?? true,
        })),
      });
    }

    if (input.breaks && input.breaks.length > 0) {
      await prisma.teacherBreak.createMany({
        data: input.breaks.map((b) => ({
          teacherId,
          dayOfWeek: b.dayOfWeek,
          startTime: b.startTime,
          endTime: b.endTime,
        })),
      });
    }

    return this.getTeacherAvailability(userId);
  }

  /**
   * Add a date-specific availability or block override
   */
  static async addDateOverride(
    userId: string,
    input: { date: string; startTime: string; endTime: string; type: "AVAILABLE" | "BLOCKED"; reason?: string }
  ) {
    const teacherId = await this.getTeacherProfileId(userId);

    // If BLOCKED, check if there are any confirmed bookings within this date and time range
    if (input.type === "BLOCKED") {
      const start = parseISTDateTime(input.date, input.startTime || "00:00");
      const end = parseISTDateTime(input.date, input.endTime || "23:59");
      const conflictingBooking = await prisma.booking.findFirst({
        where: {
          status: "CONFIRMED",
          liveClassSlot: {
            teacherId,
            status: { not: "CANCELLED" },
            startTime: { lt: end },
            endTime: { gt: start },
          },
        },
        include: { liveClassSlot: true, student: { include: { profile: true } } },
      });
      if (conflictingBooking) {
        throw new Error(
          `CONFIRMED_BOOKING_PROTECTION: Cannot block this time (${input.date} ${input.startTime}-${input.endTime}) because a confirmed session is already scheduled with student ${conflictingBooking.student?.profile?.firstName || 'Learner'}. Please manage the confirmed session in your Live Classes dashboard.`
        );
      }
    }

    const override = await prisma.teacherDateOverride.create({
      data: {
        teacherId,
        date: input.date,
        startTime: input.startTime,
        endTime: input.endTime,
        type: input.type,
        reason: input.reason || null,
      },
    });

    return override;
  }

  /**
   * Delete a date override
   */
  static async deleteDateOverride(userId: string, overrideId: string) {
    const teacherId = await this.getTeacherProfileId(userId);

    await prisma.teacherDateOverride.deleteMany({
      where: { id: overrideId, teacherId },
    });

    return { success: true };
  }

  /**
   * Block a specific time slot or date for a teacher
   */
  static async blockSlot(
    userId: string,
    params: { slotId?: string; date?: string; startTime?: string; endTime?: string; reason?: string }
  ) {
    const teacherId = await this.getTeacherProfileId(userId);

    if (params.slotId) {
      const slot = await prisma.liveClassSlot.findFirst({
        where: { id: params.slotId, teacherId },
        include: { bookings: true },
      });
      if (!slot) throw new Error("Slot not found.");

      const activeBookings = slot.bookings.filter((b) => b.status !== "CANCELLED");
      if (activeBookings.length > 0) {
        throw new Error(
          `CONFIRMED_BOOKING_PROTECTION: Cannot block slot "${slot.title}" because it already has ${activeBookings.length} confirmed student booking(s). Confirmed bookings cannot be overridden accidentally.`
        );
      }

      const updated = await prisma.liveClassSlot.update({
        where: { id: params.slotId },
        data: { status: "BLOCKED" },
      });
      return updated;
    } else if (params.date && params.startTime && params.endTime) {
      const start = parseISTDateTime(params.date, params.startTime);
      const end = parseISTDateTime(params.date, params.endTime);
      const conflictingBooking = await prisma.booking.findFirst({
        where: {
          status: "CONFIRMED",
          liveClassSlot: {
            teacherId,
            status: { not: "CANCELLED" },
            startTime: { lt: end },
            endTime: { gt: start },
          },
        },
        include: { liveClassSlot: true, student: { include: { profile: true } } },
      });
      if (conflictingBooking) {
        throw new Error(
          `CONFIRMED_BOOKING_PROTECTION: Cannot block this time (${params.date} ${params.startTime}-${params.endTime}) because a confirmed session is already scheduled with student ${conflictingBooking.student?.profile?.firstName || 'Learner'}. Confirmed bookings cannot be overridden accidentally.`
        );
      }

      const override = await prisma.teacherDateOverride.create({
        data: {
          teacherId,
          date: params.date,
          startTime: params.startTime,
          endTime: params.endTime,
          type: "BLOCKED",
          reason: params.reason || "Temporarily Blocked by Educator",
        },
      });
      return override;
    } else {
      throw new Error("BAD_REQUEST: Either slotId or date, startTime, and endTime are required.");
    }
  }

  /**
   * Unblock a specific time slot or date override for a teacher
   */
  static async unblockSlot(userId: string, params: { slotId?: string; overrideId?: string }) {
    const teacherId = await this.getTeacherProfileId(userId);

    if (params.slotId) {
      const updated = await prisma.liveClassSlot.updateMany({
        where: { id: params.slotId, teacherId },
        data: { status: "OPEN" },
      });
      return updated;
    } else if (params.overrideId) {
      await prisma.teacherDateOverride.deleteMany({
        where: { id: params.overrideId, teacherId },
      });
      return { success: true };
    } else {
      throw new Error("BAD_REQUEST: Either slotId or overrideId is required.");
    }
  }

  /**
   * Get dynamic educator availability for public booking flow
   */
  /**
   * Get dynamic educator availability for calendar booking flow
   */
  static async getPublicEducatorAvailability(
    teacherIdOrUserId: string,
    daysAhead: number = 14,
    studentUserId?: string,
    customStartDate?: string,
    customEndDate?: string
  ) {
    let teacher = await prisma.teacherProfile.findFirst({
      where: { OR: [{ id: teacherIdOrUserId }, { userId: teacherIdOrUserId }] },
      include: {
        user: { include: { profile: true } },
        availabilities: true,
        breaks: true,
        dateOverrides: true,
      },
    });

    if (!teacher) {
      throw new Error("NOT_FOUND: Educator profile not found.");
    }

    const teacherId = teacher.id;
    const rawName =
      `${teacher.user.profile?.firstName || ""} ${teacher.user.profile?.lastName || ""}`.trim() || "Educator";

    const isVerified =
      teacher.verificationStatus === "VERIFIED" || teacher.verificationStatus === "APPROVED";
    if (!isVerified) {
      return {
        educator: {
          id: teacher.user.id,
          teacherProfileId: teacher.id,
          name: rawName,
          headline: teacher.headline || "Educator",
          hourlyRate: teacher.hourlyRate || 300,
          isVerified: false,
          isLocked: true,
          verificationMessage:
            "Your educator account is pending verification. Teaching, live classes, course publishing, and content publishing will be available after verification.",
        },
        dates: [],
        totalAvailableSlots: 0,
      };
    }

    const now = new Date();
    const todayStr = getISTDateString(now);

    let startDayIdx = 0;
    let endDayIdx = daysAhead;

    let baseDate: Date;
    if (customStartDate && customEndDate) {
      baseDate = parseISTDateTime(customStartDate, "00:00");
      const targetEnd = parseISTDateTime(customEndDate, "23:59");
      const diffDays = Math.max(0, Math.round((targetEnd.getTime() - baseDate.getTime()) / (24 * 60 * 60 * 1000)));
      startDayIdx = 0;
      endDayIdx = Math.min(diffDays, 60);
    } else {
      baseDate = parseISTDateTime(todayStr, "00:00");
    }

    const rangeStart = new Date(baseDate.getTime() + startDayIdx * 24 * 60 * 60 * 1000);
    const rangeEnd = new Date(baseDate.getTime() + (endDayIdx + 1) * 24 * 60 * 60 * 1000);

    const existingSlots = await prisma.liveClassSlot.findMany({
      where: {
        teacherId,
        startTime: { gte: rangeStart, lte: rangeEnd },
      },
      include: {
        bookings: {
          include: {
            student: {
              select: {
                id: true,
                email: true,
                profile: { select: { firstName: true, lastName: true } },
              },
            },
          },
        },
      },
    });

    let studentBookings: any[] = [];
    if (studentUserId) {
      studentBookings = await prisma.booking.findMany({
        where: {
          studentId: studentUserId,
          status: "CONFIRMED",
          liveClassSlot: {
            status: { notIn: ["CANCELLED"] },
            startTime: { gte: rangeStart, lte: rangeEnd },
          },
        },
        include: { liveClassSlot: true },
      });
    }

    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const fullDays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    const datesResult = [];
    let totalAvailableCount = 0;

    const generateHourSlots = (startStr: string, endStr: string) => {
      const slots = [];
      const [startH] = startStr.split(":").map(Number);
      const [endH] = endStr.split(":").map(Number);
      for (let h = startH; h < endH; h++) {
        const sTime = `${String(h).padStart(2, "0")}:00`;
        const eTime = `${String(h + 1).padStart(2, "0")}:00`;
        const label = `${formatTime24to12(sTime)} - ${formatTime24to12(eTime)}`;
        slots.push({ startTime: sTime, endTime: eTime, label });
      }
      return slots;
    };

    const hasAnyCustomAvail = teacher.availabilities.length > 0;

    for (let i = startDayIdx; i <= endDayIdx; i++) {
      const currentDayDate = new Date(baseDate.getTime() + i * 24 * 60 * 60 * 1000);
      const dateStr = getISTDateString(currentDayDate);
      const dayOfWeek = getISTDayOfWeek(currentDayDate);

      const isToday = dateStr === todayStr;
      const tomorrowStr = getISTDateString(new Date(now.getTime() + 24 * 60 * 60 * 1000));
      const isTomorrow = dateStr === tomorrowStr;

      const dayName = isToday ? "Today" : isTomorrow ? "Tomorrow" : days[dayOfWeek];
      const [yPart, mPart, dPart] = dateStr.split("-").map(Number);
      const displayDate = `${months[mPart - 1]} ${dPart}`;
      const fullDate = `${fullDays[dayOfWeek]}, ${displayDate}, ${yPart}`;

      // Configured weekly working hours
      let weeklyAvail = teacher.availabilities.filter((a) => a.dayOfWeek === dayOfWeek && a.isActive);

      // Default fallback if educator hasn't set any availability yet
      if (!hasAnyCustomAvail) {
        if (dayOfWeek >= 1 && dayOfWeek <= 5) {
          weeklyAvail = [{ dayOfWeek, startTime: "09:00", endTime: "17:00", isActive: true } as any];
        }
      }

      const dateOverrides = teacher.dateOverrides.filter((o) => o.date === dateStr);
      const dayBreaks = teacher.breaks.filter((b) => b.dayOfWeek === dayOfWeek);

      const isFullDayBlocked = dateOverrides.some(
        (o) => o.type === "BLOCKED" && (!o.startTime || o.startTime === "00:00" || (o.startTime <= "09:00" && o.endTime >= "18:00"))
      );

      let candidateSlots: Array<{ startTime: string; endTime: string; label: string }> = [];

      for (const wa of weeklyAvail) {
        candidateSlots.push(...generateHourSlots(wa.startTime, wa.endTime));
      }

      const availOverrides = dateOverrides.filter((o) => o.type === "AVAILABLE");
      for (const ao of availOverrides) {
        candidateSlots.push(...generateHourSlots(ao.startTime, ao.endTime));
      }

      const uniqueMap = new Map();
      for (const cs of candidateSlots) {
        uniqueMap.set(cs.startTime, cs);
      }
      candidateSlots = Array.from(uniqueMap.values()).sort((a, b) => a.startTime.localeCompare(b.startTime));

      const processedSlots = candidateSlots.map((cs) => {
        const slotStart = parseISTDateTime(dateStr, cs.startTime);
        const slotEnd = parseISTDateTime(dateStr, cs.endTime);

        // Find existing slot overlapping
        const existing = existingSlots.find((es) => {
          return es.startTime < slotEnd && es.endTime > slotStart;
        });

        let status = "AVAILABLE";
        let reason: string | null = null;
        let slotId = existing?.id || null;
        let bookedCount = 0;
        let maxCapacity = existing?.maxCapacity || 1;
        let classType = existing?.classType || "ONE_TO_ONE";
        let slotPrice = existing?.price !== undefined ? existing.price : (teacher.hourlyRate || 300);

        const isBreak = dayBreaks.some((b) => b.startTime <= cs.startTime && b.endTime >= cs.endTime);
        const isBlockedOverride = dateOverrides.some(
          (bo) => bo.type === "BLOCKED" && bo.startTime <= cs.startTime && bo.endTime >= cs.endTime
        );

        if (isFullDayBlocked) {
          status = "BLOCKED";
          reason = "Educator Leave / Holiday";
        } else if (isBlockedOverride) {
          const overrideObj = dateOverrides.find(
            (bo) => bo.type === "BLOCKED" && bo.startTime <= cs.startTime && bo.endTime >= cs.endTime
          );
          status = "BLOCKED";
          reason = overrideObj?.reason || "Blocked by Educator";
        } else if (isBreak) {
          status = "UNAVAILABLE";
          reason = "Educator Break";
        } else if (existing) {
          bookedCount = existing.bookings.filter((b) => b.status !== "CANCELLED").length;
          maxCapacity = existing.maxCapacity;
          classType = existing.classType;
          slotPrice = existing.price;

          if (existing.status === "BLOCKED") {
            status = "BLOCKED";
            reason = "Blocked by Educator";
          } else if (existing.status === "CANCELLED") {
            // Cancelled live class slot does NOT occupy the time slot
            status = "AVAILABLE";
          } else if (existing.status === "PENDING" && existing.lockedUntil && new Date(existing.lockedUntil) > now) {
            status = "BOOKED";
            reason = "In checkout by another student";
          } else if (bookedCount >= maxCapacity || existing.status === "FULL") {
            status = "BOOKED";
            reason = "Already booked by another student";
          } else if (classType === "ONE_TO_ONE" && bookedCount > 0) {
            status = "BOOKED";
            reason = "Already booked by another student";
          } else {
            status = "AVAILABLE";
          }
        }

        // Cutoff check: if slot is in the past or within 15 mins of start
        if (isSlotPastCutoff(slotStart, 15)) {
          status = "EXPIRED";
          reason = slotStart.getTime() <= now.getTime() ? "Past session time" : "Past booking cutoff (15 mins)";
        }

        const isAvailable = status === "AVAILABLE";
        if (isAvailable) totalAvailableCount++;

        // Visual State mapping:
        // GREEN: Available and bookable
        // RED: Already booked by another student or otherwise fully occupied
        // GREY: Educator unavailable, outside configured working hours, during break, past booking cutoff, or blocked
        const visualState = isAvailable ? "GREEN" : status === "BOOKED" ? "RED" : "GREY";

        // Current student overlap/booking check
        let isCurrentStudentBooked = false;
        let hasStudentConflict = false;
        if (studentUserId) {
          if (existing && existing.bookings.some((b) => b.studentId === studentUserId && b.status !== "CANCELLED")) {
            isCurrentStudentBooked = true;
          }
          if (studentBookings.some((sb) => sb.liveClassSlot.startTime < slotEnd && sb.liveClassSlot.endTime > slotStart)) {
            hasStudentConflict = true;
          }
        }

        return {
          slotId,
          time: cs.label,
          startTime: cs.startTime,
          endTime: cs.endTime,
          startIso: slotStart.toISOString(),
          endIso: slotEnd.toISOString(),
          status,
          visualState,
          isAvailable,
          isCurrentStudentBooked,
          hasStudentConflict,
          price: slotPrice,
          classType,
          maxCapacity,
          bookedCount,
          reason,
        };
      });

      const availableCount = processedSlots.filter((s) => s.isAvailable).length;

      datesResult.push({
        dateStr,
        dayName,
        displayDate,
        fullDate,
        dayOfWeek,
        isAvailableDay: availableCount > 0,
        availableCount,
        slots: processedSlots,
      });
    }

    return {
      educator: {
        id: teacher.id,
        userId: teacher.userId,
        name: rawName,
        headline: teacher.headline || "Educator",
        avatarUrl: teacher.user.profile?.avatarUrl || null,
        hourlyRate: teacher.hourlyRate || 300,
        subjects: teacher.subjects ? teacher.subjects.split(",").map((s) => s.trim()) : ["General"],
        rating: teacher.rating || 5.0,
        experienceYears: teacher.experienceYears || 0,
        location: teacher.location || null,
        languages: teacher.languages || "English",
        isVerified: true,
        isLocked: false,
      },
      dates: datesResult,
      totalAvailableSlots: totalAvailableCount,
    };
  }

  /**
   * Book multiple educator availability slots atomically with double-booking and concurrency protection
   */
  static async bookEducatorSlots(input: BookEducatorSlotsInput) {
    if (!input.slots || input.slots.length === 0) {
      throw new Error("BAD_REQUEST: At least one time slot must be selected.");
    }

    // 1. Prevent duplicate selection within the request
    const seenSlots = new Set<string>();
    for (const s of input.slots) {
      const key = `${s.date}_${s.startTime}`;
      if (seenSlots.has(key)) {
        throw new Error(`DUPLICATE_SELECTION: You have selected duplicate slot on ${s.date} at ${formatTime24to12(s.startTime)}.`);
      }
      seenSlots.add(key);
    }

    // 2. Prevent overlapping slots within the selected items
    const parsedItems = input.slots.map((s) => ({
      ...s,
      start: parseISTDateTime(s.date, s.startTime),
      end: parseISTDateTime(s.date, s.endTime),
    }));

    for (let i = 0; i < parsedItems.length; i++) {
      for (let j = i + 1; j < parsedItems.length; j++) {
        if (parsedItems[i].start < parsedItems[j].end && parsedItems[i].end > parsedItems[j].start) {
          throw new Error(
            `OVERLAPPING_SELECTION: You cannot select overlapping slots (${input.slots[i].date} ${input.slots[i].startTime} and ${input.slots[j].date} ${input.slots[j].startTime}).`
          );
        }
      }
    }

    // 3. Resolve educator profile
    const teacher = await prisma.teacherProfile.findFirst({
      where: { OR: [{ id: input.teacherId }, { userId: input.teacherId }] },
      include: { user: { include: { profile: true } } },
    });
    if (!teacher) {
      throw new Error("NOT_FOUND: Educator profile not found.");
    }

    const isVerified = teacher.verificationStatus === "VERIFIED" || teacher.verificationStatus === "APPROVED";
    if (!isVerified) {
      throw new Error("FORBIDDEN: Educator account is pending verification.");
    }

    const teacherName =
      `${teacher.user.profile?.firstName || ""} ${teacher.user.profile?.lastName || ""}`.trim() || "Educator";

    // 4. Pre-check student overlapping bookings outside transaction
    for (const item of parsedItems) {
      const studentOverlap = await prisma.booking.findFirst({
        where: {
          studentId: input.studentUserId,
          status: "CONFIRMED",
          liveClassSlot: {
            status: { notIn: ["CANCELLED", "COMPLETED"] },
            startTime: { lt: item.end },
            endTime: { gt: item.start },
          },
        },
        include: { liveClassSlot: true },
      });

      if (studentOverlap) {
        throw new Error(
          `STUDENT_SCHEDULE_CONFLICT: You already have a confirmed session booked on ${formatISTDisplayDate(item.start)} from ${formatISTTime(studentOverlap.liveClassSlot.startTime)} to ${formatISTTime(studentOverlap.liveClassSlot.endTime)}. Overlapping bookings are not permitted.`
        );
      }
    }

    // 5. Execute atomic transaction to revalidate, lock, and book
    const result = await prisma.$transaction(async (tx) => {
      const now = new Date();
      const lockExpiration = new Date(Date.now() + 15 * 60 * 1000);
      const resolvedSlots: any[] = [];
      let totalAmountPaise = 0;

      for (const item of parsedItems) {
        // Cutoff check
        if (isSlotPastCutoff(item.start, 15)) {
          throw new Error(
            `SLOT_CUTOFF: The slot on ${formatISTDisplayDate(item.start)} at ${formatTime24to12(item.startTime)} has passed the booking cutoff time. Please select another slot.`
          );
        }

        // Educator blocked date override check
        const blockedOverride = await tx.teacherDateOverride.findFirst({
          where: {
            teacherId: teacher.id,
            date: item.date,
            type: "BLOCKED",
            OR: [
              { startTime: "00:00", endTime: "23:59" },
              { startTime: { lte: item.startTime }, endTime: { gte: item.endTime } },
            ],
          },
        });
        if (blockedOverride) {
          throw new Error(
            `SLOT_CONFLICT: The slot on ${formatISTDisplayDate(item.start)} at ${formatTime24to12(item.startTime)} is marked unavailable by the educator (${blockedOverride.reason || "Blocked"}). Please select another slot.`
          );
        }

        // Educator break check
        const dayOfWeek = getISTDayOfWeek(item.start);
        const breakConflict = await tx.teacherBreak.findFirst({
          where: {
            teacherId: teacher.id,
            dayOfWeek,
            startTime: { lte: item.startTime },
            endTime: { gte: item.endTime },
          },
        });
        if (breakConflict) {
          throw new Error(
            `SLOT_CONFLICT: The slot on ${formatISTDisplayDate(item.start)} at ${formatTime24to12(item.startTime)} falls during the educator's scheduled break. Please select another slot.`
          );
        }

        // Existing LiveClassSlot check
        let slot = null;
        if (item.slotId) {
          slot = await tx.liveClassSlot.findFirst({
            where: { id: item.slotId, teacherId: teacher.id },
            include: { bookings: true },
          });
        }
        if (!slot) {
          slot = await tx.liveClassSlot.findFirst({
            where: {
              teacherId: teacher.id,
              status: { not: "CANCELLED" },
              startTime: { lt: item.end },
              endTime: { gt: item.start },
            },
            include: { bookings: true },
          });
        }

        if (slot) {
          if (slot.status === "BLOCKED") {
            throw new Error(
              `SLOT_CONFLICT: The slot on ${formatISTDisplayDate(item.start)} at ${formatTime24to12(item.startTime)} is blocked by the educator. Please select another slot.`
            );
          }
          if (slot.status === "PENDING" && slot.lockedUntil && new Date(slot.lockedUntil) > now) {
            throw new Error(
              `SLOT_CONFLICT: The slot on ${formatISTDisplayDate(item.start)} at ${formatTime24to12(item.startTime)} is currently in checkout by another learner. Please choose another slot.`
            );
          }
          const activeBookings = slot.bookings.filter((b) => b.status !== "CANCELLED");
          if (activeBookings.length >= slot.maxCapacity || slot.status === "FULL") {
            throw new Error(
              `SLOT_CONFLICT: The slot on ${formatISTDisplayDate(item.start)} at ${formatTime24to12(item.startTime)} has already been booked by another student. Please select another slot.`
            );
          }
          const alreadyBooked = activeBookings.some((b) => b.studentId === input.studentUserId);
          if (alreadyBooked) {
            throw new Error(
              `DUPLICATE_BOOKING: You have already booked the slot on ${formatISTDisplayDate(item.start)} at ${formatTime24to12(item.startTime)}.`
            );
          }

          // Lock slot in PENDING state
          await tx.liveClassSlot.update({
            where: { id: slot.id },
            data: { status: "PENDING", lockedUntil: lockExpiration },
          });
          resolvedSlots.push(slot);
          totalAmountPaise += toPaise(slot.price);
        } else {
          // Create slot in PENDING state
          const price = item.price !== undefined ? item.price : (teacher.hourlyRate || 300);
          const createdSlot = await tx.liveClassSlot.create({
            data: {
              teacherId: teacher.id,
              title: `1-on-1 Session with ${teacherName}`,
              description: `Personalized 1-on-1 live session with ${teacherName}`,
              subject: teacher.subjects?.split(",")[0]?.trim() || "General",
              startTime: item.start,
              endTime: item.end,
              timezone: "Asia/Kolkata",
              durationMinutes: Math.round((item.end.getTime() - item.start.getTime()) / (60 * 1000)),
              price,
              classType: "ONE_TO_ONE",
              maxCapacity: 1,
              status: "PENDING",
              lockedUntil: lockExpiration,
            },
          });
          resolvedSlots.push(createdSlot);
          totalAmountPaise += toPaise(price);
        }
      }

      // Handle offer code if provided
      let discountAmountPaise = 0;
      if (input.offerCode && input.offerCode.trim() && totalAmountPaise > 0) {
        try {
          const { OfferService } = require("@/services/offer-service");
          const applied = await OfferService.validateOfferCode(input.offerCode, totalAmountPaise, {
            userId: input.studentUserId,
            targetAudience: "LEARNERS",
          });
          discountAmountPaise = applied.discountAmountPaise;
          totalAmountPaise = applied.finalAmountPaise;
        } catch {}
      }

      // Free Session Booking (Price == 0 or 100% discount)
      if (totalAmountPaise === 0) {
        const bookings = [];
        for (const sl of resolvedSlots) {
          const booking = await tx.booking.create({
            data: {
              liveClassSlotId: sl.id,
              studentId: input.studentUserId,
              status: "CONFIRMED",
            },
          });
          await tx.liveClassSlot.update({
            where: { id: sl.id },
            data: { status: "FULL", lockedUntil: null },
          });

          await tx.paymentTransaction.create({
            data: {
              userId: input.studentUserId,
              type: "LIVE_CLASS_BOOKING",
              status: "CAPTURED",
              amountPaise: 0,
              currency: "INR",
              provider: "INTERNAL_FREE",
              providerOrderId: `FREE_ORD_${Date.now()}_${sl.id.substring(0, 6)}`,
              providerPaymentId: `FREE_PAY_${Date.now()}_${sl.id.substring(0, 6)}`,
              internalReference: `EDU_FREE_${Date.now()}_${crypto.randomBytes(4).toString("hex").toUpperCase()}`,
              liveClassSlotId: sl.id,
              bookingId: booking.id,
              capturedAt: new Date(),
            },
          });

          try {
            const { EventService } = require("@/services/event-service");
            await EventService.emit("class.booked", {
              userId: input.studentUserId,
              actorId: input.studentUserId,
              actorRole: "STUDENT",
              data: {
                slotId: sl.id,
                classTitle: sl.title,
                startTime: sl.startTime.toISOString(),
                teacherUserId: teacher.userId,
                entityType: "LiveClassSlot",
                entityId: sl.id,
              },
              idempotencyKey: `book-${sl.id}-${input.studentUserId}`,
            });
          } catch (evtErr) {
            console.error("Failed to emit free class booked event:", evtErr);
          }

          bookings.push(booking);
        }

        return {
          isFree: true,
          success: true,
          slotCount: resolvedSlots.length,
          slots: resolvedSlots,
          bookings,
          message: `Successfully booked ${resolvedSlots.length} session(s)!`,
        };
      }

      // Paid Session Booking (Create Cashfree PaymentOrder)
      const internalReference = `EDU_MULTI_${Date.now()}_${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
      const cfOrderId = `CF_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
      const amountRupees = totalAmountPaise / 100;
      const receipt = `rcpt_${internalReference}`;

      const paymentOrder = await tx.paymentOrder.create({
        data: {
          userId: input.studentUserId,
          type: "LIVE_CLASS_BOOKING",
          referenceId: resolvedSlots[0].id,
          liveClassSlotId: resolvedSlots[0].id,
          provider: "CASHFREE",
          providerOrderId: cfOrderId,
          amountPaise: totalAmountPaise,
          currency: "INR",
          status: "CREATED",
          receipt,
          notes: JSON.stringify({
            slotIds: resolvedSlots.map((sl) => sl.id),
            teacherId: teacher.id,
            slotCount: resolvedSlots.length,
          }),
          expiresAt: lockExpiration,
        },
      });

      return {
        isFree: false,
        success: true,
        orderId: paymentOrder.id,
        providerOrderId: cfOrderId,
        internalReference,
        totalAmount: amountRupees,
        totalAmountPaise,
        slotCount: resolvedSlots.length,
        slots: resolvedSlots,
        checkoutUrl: `/payment/checkout?type=LIVE_CLASS_BOOKING&orderId=${paymentOrder.id}&slotId=${resolvedSlots[0].id}`,
        message: `Initialized checkout for ${resolvedSlots.length} session(s).`,
      };
    });

    return result;
  }

  /**
   * Get all live class bookings for an authenticated student
   */
  static async getStudentLiveClasses(studentUserId: string) {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    // Synchronize expired classes in the database
    await expireEndedLiveClasses({ now }).catch(() => {});

    const bookings = await prisma.booking.findMany({
      where: {
        studentId: studentUserId,
      },
      include: {
        liveClassSlot: {
          include: {
            teacher: {
              include: {
                user: {
                  include: { profile: true },
                },
              },
            },
            session: true,
          },
        },
      },
      orderBy: {
        liveClassSlot: { startTime: "asc" },
      },
    });

    const formatClass = (b: any) => {
      const slot = b.liveClassSlot;
      const startTime = new Date(slot.startTime);
      const endTime = new Date(slot.endTime);
      const joinBeforeMinutes = slot.joinBeforeMinutes ?? 15;
      const joinWindowStart = new Date(startTime.getTime() - joinBeforeMinutes * 60 * 1000);

      const isEnded = isClassEnded(slot, now);
      const isCancelled = isClassCancelled(slot) || b.status === "CANCELLED";
      const effectiveSlotStatus = isCancelled ? "CANCELLED" : isEnded ? "COMPLETED" : slot.status;
      const canJoin = canJoinClass(slot, now) && !isCancelled;
      const isLiveNow = !isEnded && !isCancelled && (slot.status === "LIVE" || slot.session?.status === "LIVE" || slot.session?.status === "OPEN") && now <= endTime;

      const teacherProfile = slot.teacher?.user?.profile;
      const teacherName = teacherProfile
        ? `${teacherProfile.firstName || ""} ${teacherProfile.lastName || ""}`.trim() || "Educator"
        : "Educator";

      // Calculate minutes until starts
      const minutesUntilStart = Math.round((startTime.getTime() - now.getTime()) / (60 * 1000));

      return {
        bookingId: b.id,
        bookingStatus: b.status,
        bookedAt: b.createdAt,
        slotId: slot.id,
        sessionId: slot.session?.id || null,
        roomId: slot.session?.roomId || null,
        meetingUrl: `/classroom/${slot.session?.id || slot.id}`,
        shareableUrl: getLearnerClassroomUrl(slot.id),
        title: slot.title,
        description: slot.description,
        subject: slot.subject,
        level: slot.level,
        language: slot.language,
        classType: slot.classType,
        price: slot.price,
        maxCapacity: slot.maxCapacity,
        slotStatus: effectiveSlotStatus,
        startTime: slot.startTime.toISOString(),
        endTime: slot.endTime.toISOString(),
        durationMinutes: slot.durationMinutes,
        timezone: slot.timezone,
        canJoin,
        isLiveNow,
        minutesUntilStart,
        teacher: {
          id: slot.teacher.id,
          userId: slot.teacher.userId,
          name: teacherName,
          headline: slot.teacher.headline || "Educator",
          avatarUrl: teacherProfile?.avatarUrl || null,
          rating: slot.teacher.rating,
        },
      };
    };

    const formattedBookings = bookings.map(formatClass);

    // Grouping: strictly exclude ended or completed classes from upcoming and today
    const upcoming = formattedBookings.filter((c) => {
      const end = new Date(c.endTime);
      return end > now && c.bookingStatus !== "CANCELLED" && c.slotStatus !== "CANCELLED" && c.slotStatus !== "COMPLETED";
    });

    const today = formattedBookings.filter((c) => {
      const start = new Date(c.startTime);
      const end = new Date(c.endTime);
      return (
        start >= startOfToday &&
        start <= endOfToday &&
        end > now &&
        c.bookingStatus !== "CANCELLED" &&
        c.slotStatus !== "CANCELLED" &&
        c.slotStatus !== "COMPLETED"
      );
    });

    const completed = formattedBookings.filter((c) => {
      const end = new Date(c.endTime);
      return (
        end <= now ||
        c.bookingStatus === "ATTENDED" ||
        c.slotStatus === "COMPLETED" ||
        c.bookingStatus === "CANCELLED" ||
        c.slotStatus === "CANCELLED"
      );
    }).reverse(); // Most recent completed first

    return {
      stats: {
        total: formattedBookings.length,
        upcomingCount: upcoming.length,
        todayCount: today.length,
        completedCount: completed.length,
      },
      upcoming,
      today,
      completed,
      all: formattedBookings,
    };
  }
}

