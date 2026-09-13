import { prisma } from "@/lib/prisma";

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
      throw new Error("FORBIDDEN: Educator verification is required before using this feature.");
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

    const [total, upcoming, today, completed, cancelled] = await Promise.all([
      prisma.liveClassSlot.count({ where: { teacherId } }),
      prisma.liveClassSlot.count({
        where: {
          teacherId,
          startTime: { gte: now },
          status: { in: ["SCHEDULED", "OPEN", "FULL"] },
        },
      }),
      prisma.liveClassSlot.count({
        where: {
          teacherId,
          startTime: { gte: startOfToday, lt: endOfToday },
          status: { not: "CANCELLED" },
        },
      }),
      prisma.liveClassSlot.count({
        where: { teacherId, status: "COMPLETED" },
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

    const where: any = { teacherId };
    if (filterStatus && filterStatus !== "ALL") {
      where.status = filterStatus;
    }

    const slots = await prisma.liveClassSlot.findMany({
      where,
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

    return slots.map((s) => ({
      ...s,
      studentCount: s.bookings.filter((b) => b.status !== "CANCELLED").length,
    }));
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

    return slot;
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

    return slot;
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
    const teacherId = await this.getTeacherProfileId(userId);

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

    if (slot.session) {
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
   * Get teacher availability settings
   */
  static async getTeacherAvailability(userId: string) {
    const teacherId = await this.getTeacherProfileId(userId);

    const availabilities = await prisma.teacherAvailability.findMany({
      where: { teacherId },
      orderBy: { dayOfWeek: "asc" },
    });

    const breaks = await prisma.teacherBreak.findMany({
      where: { teacherId },
      orderBy: { dayOfWeek: "asc" },
    });

    return { availabilities, breaks };
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
   * Get all live class bookings for an authenticated student
   */
  static async getStudentLiveClasses(studentUserId: string) {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

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

      const isLiveNow = slot.status === "LIVE" || slot.session?.status === "LIVE" || slot.session?.status === "OPEN";
      const isWithinWindow = now >= joinWindowStart && now <= endTime;
      const canJoin = (isLiveNow || isWithinWindow) && slot.status !== "CANCELLED" && b.status !== "CANCELLED";

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
        title: slot.title,
        description: slot.description,
        subject: slot.subject,
        level: slot.level,
        language: slot.language,
        classType: slot.classType,
        price: slot.price,
        maxCapacity: slot.maxCapacity,
        slotStatus: slot.status,
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

    // Grouping
    const upcoming = formattedBookings.filter((c) => {
      const end = new Date(c.endTime);
      return end >= now && c.bookingStatus !== "CANCELLED" && c.slotStatus !== "CANCELLED" && c.slotStatus !== "COMPLETED";
    });

    const today = formattedBookings.filter((c) => {
      const start = new Date(c.startTime);
      return start >= startOfToday && start <= endOfToday && c.bookingStatus !== "CANCELLED" && c.slotStatus !== "CANCELLED";
    });

    const completed = formattedBookings.filter((c) => {
      const end = new Date(c.endTime);
      return (
        end < now ||
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

