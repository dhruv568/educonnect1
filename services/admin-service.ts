import { prisma } from "@/lib/prisma";
import { AuditLogger } from "@/lib/audit-logger";
import { DEFAULT_CURRENCY } from "@/lib/currency";
import { OFFICIAL_COMPANY_INFO } from "@/lib/company";
import { PaymentService } from "@/services/payment-service";

export interface UserFilterOptions {
  search?: string;
  role?: string;
  status?: string;
  verificationStatus?: string;
  page?: number;
  limit?: number;
}

export interface CourseFilterOptions {
  search?: string;
  status?: string;
  category?: string;
  page?: number;
  limit?: number;
}

export interface LiveClassFilterOptions {
  search?: string;
  status?: string;
  page?: number;
  limit?: number;
}

export interface RefundFilterOptions {
  status?: string;
  page?: number;
  limit?: number;
}

export interface ReportFilterOptions {
  status?: string;
  targetType?: string;
  page?: number;
  limit?: number;
}

export class AdminService {
  // =========================================================================
  // USER MANAGEMENT
  // =========================================================================

  static async getUsers(options: UserFilterOptions = {}) {
    const page = Math.max(1, options.page || 1);
    const limit = Math.max(1, Math.min(100, options.limit || 15));
    const skip = (page - 1) * limit;

    const where: any = {};

    if (options.role) {
      where.role = options.role;
    }

    if (options.status) {
      where.status = options.status;
    }

    if (options.search) {
      const s = options.search.trim();
      where.OR = [
        { email: { contains: s, mode: "insensitive" } },
        { profile: { firstName: { contains: s, mode: "insensitive" } } },
        { profile: { lastName: { contains: s, mode: "insensitive" } } },
      ];
    }

    if (options.verificationStatus) {
      where.teacherProfile = {
        verificationStatus: options.verificationStatus,
      };
    }

    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          email: true,
          role: true,
          status: true,
          emailVerified: true,
          emailVerifiedAt: true,
          createdAt: true,
          profile: {
            select: {
              firstName: true,
              lastName: true,
              phone: true,
              avatarUrl: true,
            },
          },
          teacherProfile: {
            select: {
              id: true,
              verificationStatus: true,
              headline: true,
              rating: true,
            },
          },
          studentProfile: {
            select: {
              gradeLevel: true,
            },
          },
        },
      }),
    ]);

    return {
      users: users.map((u) => ({
        id: u.id,
        email: u.email,
        name: u.profile ? `${u.profile.firstName} ${u.profile.lastName}`.trim() : u.email,
        role: u.role,
        status: u.status || "ACTIVE",
        emailVerified: u.emailVerified,
        createdAt: u.createdAt,
        phone: u.profile?.phone || null,
        avatarUrl: u.profile?.avatarUrl || null,
        teacherVerificationStatus: u.teacherProfile?.verificationStatus || null,
        teacherId: u.teacherProfile?.id || null,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  static async getUserDetails(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        emailVerified: true,
        emailVerifiedAt: true,
        createdAt: true,
        updatedAt: true,
        profile: {
          select: {
            firstName: true,
            lastName: true,
            phone: true,
            avatarUrl: true,
            bio: true,
          },
        },
        teacherProfile: {
          select: {
            id: true,
            headline: true,
            bio: true,
            location: true,
            subjects: true,
            experienceYears: true,
            hourlyRate: true,
            qualifications: true,
            verificationStatus: true,
            rating: true,
            submittedAt: true,
            verifiedAt: true,
            rejectedAt: true,
            suspendedAt: true,
            rejectionReason: true,
            suspensionReason: true,
          },
        },
        studentProfile: true,
        enrollments: {
          take: 10,
          orderBy: { enrolledAt: "desc" },
          include: { course: { select: { id: true, title: true, slug: true } } },
        },
        bookings: {
          take: 10,
          orderBy: { createdAt: "desc" },
          include: { liveClassSlot: { select: { id: true, title: true, startTime: true } } },
        },
        paymentTransactions: {
          take: 10,
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            type: true,
            amountPaise: true,
            status: true,
            createdAt: true,
          },
        },
      },
    });

    if (!user) {
      throw new Error("NOT_FOUND: User not found.");
    }

    return {
      id: user.id,
      email: user.email,
      name: user.profile ? `${user.profile.firstName} ${user.profile.lastName}`.trim() : user.email,
      role: user.role,
      status: user.status || "ACTIVE",
      emailVerified: user.emailVerified,
      createdAt: user.createdAt,
      profile: user.profile,
      teacherProfile: user.teacherProfile,
      studentProfile: user.studentProfile,
      recentEnrollments: user.enrollments,
      recentBookings: user.bookings,
      recentTransactions: user.paymentTransactions.map((t) => ({
        ...t,
        amountRupees: t.amountPaise / 100,
      })),
    };
  }

  static async updateUserStatus(adminId: string, userId: string, targetStatus: "ACTIVE" | "SUSPENDED" | "DEACTIVATED", reason?: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new Error("NOT_FOUND: User not found.");
    }

    if (user.role === "ADMIN") {
      throw new Error("FORBIDDEN: Admin accounts cannot be suspended or deactivated via user management.");
    }

    const previousStatus = user.status || "ACTIVE";
    const updated = await prisma.user.update({
      where: { id: userId },
      data: { status: targetStatus },
    });

    // If teacher, update teacher profile verificationStatus if suspending
    if (user.role === "TEACHER") {
      const tp = await prisma.teacherProfile.findUnique({ where: { userId } });
      if (tp) {
        if (targetStatus === "SUSPENDED") {
          await prisma.teacherProfile.update({
            where: { id: tp.id },
            data: {
              verificationStatus: "SUSPENDED",
              suspendedAt: new Date(),
              suspensionReason: reason || "Account suspended by Administrator",
            },
          });
        } else if (targetStatus === "ACTIVE" && tp.verificationStatus === "SUSPENDED") {
          await prisma.teacherProfile.update({
            where: { id: tp.id },
            data: {
              verificationStatus: "VERIFIED",
              suspendedAt: null,
              suspensionReason: null,
            },
          });
        }
      }
    }

    await AuditLogger.log({
      userId: adminId,
      event: `USER_STATUS_CHANGED`,
      metadata: {
        targetUserId: userId,
        previousStatus,
        newStatus: targetStatus,
        reason: reason || null,
      },
    });

    return updated;
  }

  // =========================================================================
  // TEACHER MANAGEMENT
  // =========================================================================

  static async getTeachers(options: UserFilterOptions = {}) {
    const page = Math.max(1, options.page || 1);
    const limit = Math.max(1, Math.min(100, options.limit || 15));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (options.status) {
      where.verificationStatus = options.status;
    }

    if (options.search) {
      const s = options.search.trim();
      where.OR = [
        { user: { email: { contains: s, mode: "insensitive" } } },
        { user: { profile: { firstName: { contains: s, mode: "insensitive" } } } },
        { user: { profile: { lastName: { contains: s, mode: "insensitive" } } } },
        { subjects: { contains: s, mode: "insensitive" } },
      ];
    }

    const [total, teachers] = await Promise.all([
      prisma.teacherProfile.count({ where }),
      prisma.teacherProfile.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              status: true,
              profile: { select: { firstName: true, lastName: true, avatarUrl: true, phone: true } },
            },
          },
          _count: { select: { courses: true, teacherQualifications: true, teacherDocuments: true } },
        },
      }),
    ]);

    return {
      teachers: teachers.map((t) => ({
        id: t.id,
        userId: t.userId,
        email: t.user.email,
        name: t.user.profile ? `${t.user.profile.firstName} ${t.user.profile.lastName}`.trim() : t.user.email,
        headline: t.headline,
        subjects: t.subjects ? t.subjects.split(",").map((s) => s.trim()) : [],
        experienceYears: t.experienceYears,
        hourlyRate: t.hourlyRate,
        verificationStatus: t.verificationStatus,
        userStatus: t.user.status || "ACTIVE",
        rating: t.rating,
        courseCount: t._count.courses,
        qualificationCount: t._count.teacherQualifications,
        documentCount: t._count.teacherDocuments,
        submittedAt: t.submittedAt,
        verifiedAt: t.verifiedAt,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  static async reviewTeacher(
    adminId: string,
    teacherId: string,
    action: "APPROVE" | "REJECT" | "SUSPEND" | "REACTIVATE",
    reason?: string
  ) {
    const teacher = await prisma.teacherProfile.findUnique({
      where: { id: teacherId },
      include: { user: true },
    });

    if (!teacher) {
      throw new Error("NOT_FOUND: Teacher profile not found.");
    }

    const previousStatus = teacher.verificationStatus;
    let newStatus = previousStatus;
    const updateData: any = {};

    switch (action) {
      case "APPROVE":
        newStatus = "VERIFIED";
        updateData.verificationStatus = "VERIFIED";
        updateData.verifiedAt = new Date();
        updateData.rejectionReason = null;
        break;
      case "REJECT":
        if (!reason) throw new Error("VALIDATION_ERROR: Rejection reason is required.");
        newStatus = "REJECTED";
        updateData.verificationStatus = "REJECTED";
        updateData.rejectedAt = new Date();
        updateData.rejectionReason = reason;
        break;
      case "SUSPEND":
        if (!reason) throw new Error("VALIDATION_ERROR: Suspension reason is required.");
        newStatus = "SUSPENDED";
        updateData.verificationStatus = "SUSPENDED";
        updateData.suspendedAt = new Date();
        updateData.suspensionReason = reason;
        await prisma.user.update({
          where: { id: teacher.userId },
          data: { status: "SUSPENDED" },
        });
        break;
      case "REACTIVATE":
        newStatus = "VERIFIED";
        updateData.verificationStatus = "VERIFIED";
        updateData.suspendedAt = null;
        updateData.suspensionReason = null;
        await prisma.user.update({
          where: { id: teacher.userId },
          data: { status: "ACTIVE" },
        });
        break;
    }

    const updatedTeacher = await prisma.teacherProfile.update({
      where: { id: teacherId },
      data: updateData,
    });

    await prisma.teacherVerificationHistory.create({
      data: {
        teacherId,
        adminId,
        previousStatus,
        newStatus,
        reason: reason || null,
      },
    });

    await AuditLogger.log({
      userId: adminId,
      event: `TEACHER_VERIFICATION_${action}`,
      metadata: {
        teacherId,
        teacherUserId: teacher.userId,
        previousStatus,
        newStatus,
        reason: reason || null,
      },
    });

    return updatedTeacher;
  }

  // =========================================================================
  // COURSE MANAGEMENT & MODERATION
  // =========================================================================

  static async getCourses(options: CourseFilterOptions = {}) {
    const page = Math.max(1, options.page || 1);
    const limit = Math.max(1, Math.min(500, options.limit || 100));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (options.status) {
      where.status = options.status;
    }

    if (options.category) {
      where.category = options.category;
    }

    if (options.search) {
      const s = options.search.trim();
      where.OR = [
        { title: { contains: s, mode: "insensitive" } },
        { subject: { contains: s, mode: "insensitive" } },
        { teacher: { user: { profile: { firstName: { contains: s, mode: "insensitive" } } } } },
        { teacher: { user: { profile: { lastName: { contains: s, mode: "insensitive" } } } } },
      ];
    }

    const [total, courses] = await Promise.all([
      prisma.course.count({ where }),
      prisma.course.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          teacher: {
            select: {
              id: true,
              user: {
                select: {
                  email: true,
                  profile: { select: { firstName: true, lastName: true } },
                },
              },
            },
          },
          sections: {
            include: { lessons: true },
          },
          _count: { select: { enrollments: true, reviews: true } },
        },
      }),
    ]);

    return {
      courses: courses.map((c) => {
        const totalLessons = c.sections.flatMap((s) => s.lessons).length;
        const teacherName = c.teacher.user.profile
          ? `${c.teacher.user.profile.firstName} ${c.teacher.user.profile.lastName}`.trim()
          : c.teacher.user.email;

        return {
          id: c.id,
          title: c.title,
          slug: c.slug,
          subject: c.subject,
          category: c.category || "General",
          level: c.level,
          price: c.price,
          rating: c.rating,
          reviewCount: c._count.reviews,
          enrollmentCount: c._count.enrollments,
          enrollmentsCount: c._count.enrollments,
          sectionsCount: c.sections.length,
          totalLessons,
          status: c.status,
          teacherName,
          teacherEmail: c.teacher.user.email,
          teacherId: c.teacherId,
          publishedAt: c.publishedAt,
          createdAt: c.createdAt,
        };
      }),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  static async moderateCourse(
    adminId: string,
    courseId: string,
    action: "APPROVE" | "REJECT" | "REQUEST_CHANGES" | "UNPUBLISH" | "ARCHIVE" | "FEATURE" | "UNFEATURE",
    reason?: string
  ) {
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      include: {
        sections: { include: { lessons: true } },
        teacher: true,
      },
    });

    if (!course) {
      throw new Error("NOT_FOUND: Course not found.");
    }

    const previousStatus = course.status;
    let newStatus = previousStatus;
    const updateData: any = {};

    switch (action) {
      case "APPROVE":
        let totalLessons = course.sections.flatMap((s) => s.lessons).length || course.lessonCount || 0;
        if (totalLessons === 0) {
          throw new Error("VALIDATION_ERROR: Cannot approve/publish a course without any lessons.");
        }

        // If totalLessons > 0 but sections array is empty, auto-create a default section and lesson for UI/curriculum visibility
        if (course.sections.length === 0) {
          const defaultSection = await prisma.courseSection.create({
            data: {
              courseId,
              title: "Section 1: Course Overview",
              order: 1,
            },
          });
          await prisma.courseLesson.create({
            data: {
              sectionId: defaultSection.id,
              title: "Lesson 1: Introduction to Course",
              durationSeconds: 300,
              status: "READY",
              isPreview: true,
              order: 1,
            },
          });
          updateData.lessonCount = Math.max(1, course.lessonCount);
        }

        newStatus = "PUBLISHED";
        updateData.status = "PUBLISHED";
        updateData.publishedAt = new Date();

        // Ensure educator verification is verified so approved course is visible in public discovery catalog
        if (course.teacher && (course.teacher.verificationStatus === "PENDING" || !course.teacher.verificationStatus)) {
          await prisma.teacherProfile.update({
            where: { id: course.teacherId },
            data: {
              verificationStatus: "VERIFIED",
              verifiedAt: new Date(),
            },
          });
        }
        break;
      case "REJECT":
        newStatus = "UNPUBLISHED";
        updateData.status = "UNPUBLISHED";
        break;
      case "REQUEST_CHANGES":
        if (!reason) throw new Error("VALIDATION_ERROR: Reason for requesting changes is required.");
        newStatus = "DRAFT";
        updateData.status = "DRAFT";
        break;
      case "UNPUBLISH":
        newStatus = "UNPUBLISHED";
        updateData.status = "UNPUBLISHED";
        break;
      case "ARCHIVE":
        newStatus = "ARCHIVED";
        updateData.status = "ARCHIVED";
        break;
      default:
        break;
    }

    const updatedCourse = await prisma.course.update({
      where: { id: courseId },
      data: updateData,
    });

    if (["APPROVE", "REJECT", "REQUEST_CHANGES", "UNPUBLISH", "ARCHIVE"].includes(action)) {
      await prisma.courseModerationHistory.create({
        data: {
          courseId,
          adminId,
          previousStatus,
          newStatus,
          reason: reason || null,
        },
      });
    }

    await AuditLogger.log({
      userId: adminId,
      event: `COURSE_MODERATED_${action}`,
      metadata: {
        courseId,
        previousStatus,
        newStatus,
        reason: reason || null,
      },
    });

    return updatedCourse;
  }

  // =========================================================================
  // LIVE CLASS MANAGEMENT
  // =========================================================================

  static async getLiveClasses(options: LiveClassFilterOptions = {}) {
    const page = Math.max(1, options.page || 1);
    const limit = Math.max(1, Math.min(100, options.limit || 15));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (options.status) {
      where.status = options.status;
    }

    if (options.search) {
      const s = options.search.trim();
      where.OR = [
        { title: { contains: s, mode: "insensitive" } },
        { subject: { contains: s, mode: "insensitive" } },
        { teacher: { user: { profile: { firstName: { contains: s, mode: "insensitive" } } } } },
        { teacher: { user: { profile: { lastName: { contains: s, mode: "insensitive" } } } } },
      ];
    }

    const [total, slots] = await Promise.all([
      prisma.liveClassSlot.count({ where }),
      prisma.liveClassSlot.findMany({
        where,
        skip,
        take: limit,
        orderBy: { startTime: "desc" },
        include: {
          teacher: {
            select: {
              id: true,
              user: {
                select: {
                  email: true,
                  profile: { select: { firstName: true, lastName: true } },
                },
              },
            },
          },
          bookings: {
            where: { status: { notIn: ["CANCELLED"] } },
            select: { id: true, studentId: true },
          },
          session: true,
        },
      }),
    ]);

    return {
      classes: slots.map((s) => {
        const teacherName = s.teacher.user.profile
          ? `${s.teacher.user.profile.firstName} ${s.teacher.user.profile.lastName}`.trim()
          : s.teacher.user.email;

        return {
          id: s.id,
          title: s.title,
          subject: s.subject,
          teacherName,
          teacherId: s.teacherId,
          startTime: s.startTime,
          endTime: s.endTime,
          price: s.price,
          status: s.status,
          bookedCount: s.bookings.length,
          maxCapacity: s.maxCapacity,
          sessionId: s.session?.id || null,
        };
      }),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  static async cancelLiveClass(adminId: string, slotId: string, reason: string) {
    if (!reason) {
      throw new Error("VALIDATION_ERROR: Reason for live class cancellation is required.");
    }

    const slot = await prisma.liveClassSlot.findUnique({
      where: { id: slotId },
      include: { bookings: { where: { status: "CONFIRMED" } } },
    });

    if (!slot) {
      throw new Error("NOT_FOUND: Live class slot not found.");
    }

    if (slot.status === "CANCELLED" || slot.status === "COMPLETED") {
      throw new Error(`VALIDATION_ERROR: Live class is already ${slot.status.toLowerCase()}.`);
    }

    const updatedSlot = await prisma.liveClassSlot.update({
      where: { id: slotId },
      data: { status: "CANCELLED" },
    });

    await prisma.liveClassSession.updateMany({
      where: { liveClassSlotId: slotId },
      data: { status: "CANCELLED" },
    });

    await prisma.booking.updateMany({
      where: { liveClassSlotId: slotId, status: "CONFIRMED" },
      data: { status: "CANCELLED" },
    });

    await AuditLogger.log({
      userId: adminId,
      event: "ADMIN_CANCELLED_LIVE_CLASS",
      metadata: {
        slotId,
        cancelledBookingsCount: slot.bookings.length,
        reason,
      },
    });

    return updatedSlot;
  }

  // =========================================================================
  // REFUND MANAGEMENT
  // =========================================================================

  static async getRefunds(options: RefundFilterOptions = {}) {
    const page = Math.max(1, options.page || 1);
    const limit = Math.max(1, Math.min(100, options.limit || 15));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (options.status && options.status !== "ALL") {
      if (options.status === "PENDING" || options.status === "REFUND_REQUESTED") {
        where.status = { in: ["PENDING", "REFUND_REQUESTED"] };
      } else if (options.status === "REFUNDED" || options.status === "APPROVED") {
        where.status = { in: ["APPROVED", "REFUNDED"] };
      } else if (options.status === "REJECTED" || options.status === "REFUND_FAILED") {
        where.status = { in: ["REJECTED", "REFUND_FAILED"] };
      } else {
        where.status = options.status;
      }
    }

    const [total, refunds] = await Promise.all([
      prisma.refund.count({ where }),
      prisma.refund.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          requester: {
            select: {
              id: true,
              email: true,
              profile: { select: { firstName: true, lastName: true } },
            },
          },
          transaction: {
            select: {
              id: true,
              internalReference: true,
              providerOrderId: true,
              providerPaymentId: true,
              type: true,
              amountPaise: true,
              status: true,
            },
          },
        },
      }),
    ]);

    return {
      refunds: refunds.map((r) => ({
        id: r.id,
        transactionId: r.transactionId,
        internalReference: r.transaction.internalReference,
        providerOrderId: r.transaction.providerOrderId,
        providerPaymentId: r.transaction.providerPaymentId,
        transactionStatus: r.transaction.status,
        providerRefundId: r.providerRefundId,
        amountRupees: r.amountPaise / 100,
        reason: r.reason,
        status: r.status,
        requestedBy: r.requester.profile
          ? `${r.requester.profile.firstName} ${r.requester.profile.lastName}`.trim()
          : r.requester.email,
        requestedById: r.requestedBy,
        createdAt: r.createdAt,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  static async processRefund(adminId: string, refundId: string, action: "APPROVE" | "REJECT", reason?: string) {
    const refund = await prisma.refund.findUnique({
      where: { id: refundId },
      include: { transaction: true },
    });

    if (!refund) {
      throw new Error("NOT_FOUND: Refund request not found.");
    }

    if (refund.status === "REFUNDED" || refund.status === "REFUND_FAILED" || refund.status === "REJECTED") {
      throw new Error(`VALIDATION_ERROR: Refund is already ${refund.status.toLowerCase()}.`);
    }

    if (action === "REJECT") {
      if (!reason || !reason.trim()) throw new Error("VALIDATION_ERROR: Rejection reason is required.");
      const updated = await prisma.refund.update({
        where: { id: refundId },
        data: {
          status: "REJECTED",
          approvedBy: adminId,
          reason: `Rejected by Admin: ${reason.trim()}`,
        },
      });

      await AuditLogger.log({
        userId: adminId,
        event: "ADMIN_REFUND_REJECTED",
        metadata: { refundId, transactionId: refund.transactionId, reason },
      });

      // Dispatch refund.rejected event for in-app notification & WhatsApp
      try {
        const { EventService } = require("@/services/event-service");
        await EventService.emit("refund.rejected", {
          userId: refund.transaction.userId,
          actorId: adminId,
          actorRole: "ADMIN",
          data: {
            refundId: refund.id,
            transactionId: refund.transactionId,
            reason: reason.trim(),
            title: "EduConnects Purchase",
            entityType: "Refund",
            entityId: refund.id,
          },
          idempotencyKey: `refund-rej-${refund.id}`,
        });
      } catch (evtErr) {
        console.error("Failed to emit refund.rejected event:", evtErr);
      }

      return updated;
    }

    // APPROVE: First notify approval via EventService / WhatsApp
    try {
      const { EventService } = require("@/services/event-service");
      await EventService.emit("refund.approved", {
        userId: refund.transaction.userId,
        actorId: adminId,
        actorRole: "ADMIN",
        data: {
          refundId: refund.id,
          transactionId: refund.transactionId,
          amountPaise: refund.amountPaise,
          title: "EduConnects Purchase",
          entityType: "Refund",
          entityId: refund.id,
        },
        idempotencyKey: `refund-appr-${refund.id}`,
      });
    } catch (evtErr) {
      console.error("Failed to emit refund.approved event:", evtErr);
    }

    // Execute live Cashfree refund and access revocation via PaymentService
    const processedRefund = await PaymentService.processRefund({
      transactionId: refund.transactionId,
      requestedBy: adminId,
      reason: reason || refund.reason || "Approved by Admin",
      isAdmin: true,
      existingRefundId: refund.id,
    });

    await AuditLogger.log({
      userId: adminId,
      event: "ADMIN_REFUND_APPROVED",
      metadata: {
        refundId,
        transactionId: refund.transactionId,
        amountPaise: refund.amountPaise,
        providerRefundId: processedRefund.providerRefundId,
      },
    });

    return processedRefund;
  }

  // =========================================================================
  // COMMISSION & PLATFORM SETTINGS
  // =========================================================================

  static async getCommissionSettings() {
    const config = await prisma.platformConfig.findUnique({
      where: { key: "platform_commission_rate" },
    });

    const percentage = config ? parseFloat(config.value) : 15.0;
    return {
      percentage,
      updatedAt: config?.updatedAt || null,
    };
  }

  static async updateCommissionSettings(adminId: string, percentage: number) {
    if (percentage < 0 || percentage > 100) {
      throw new Error("VALIDATION_ERROR: Commission percentage must be between 0 and 100.");
    }

    const updated = await prisma.platformConfig.upsert({
      where: { key: "platform_commission_rate" },
      update: { value: percentage.toString() },
      create: { key: "platform_commission_rate", value: percentage.toString() },
    });

    await AuditLogger.log({
      userId: adminId,
      event: "COMMISSION_SETTINGS_UPDATED",
      metadata: { newCommissionRate: percentage },
    });

    return { percentage, updatedAt: updated.updatedAt };
  }

  static async getPlatformSettings() {
    const configs = await prisma.platformConfig.findMany();
    const settings: Record<string, string> = {};
    configs.forEach((c) => {
      settings[c.key] = c.value;
    });

    return {
      siteName: settings.site_name || "EduConnects",
      supportEmail: settings.support_email || "support@educonnects.com",
      platformCommissionRate: settings.platform_commission_rate ? parseFloat(settings.platform_commission_rate) : 15,
      allowRegistration: settings.allow_registration !== "false",
      requireTeacherApproval: settings.require_teacher_approval !== "false",
      maintenanceMode: settings.maintenance_mode === "true",
      brandName: settings.company_brand_name || "MyProFunnels Ventures",
      legalName: settings.company_legal_name || "SHRIVASTAVA PROFUNNELS VENTURES PRIVATE LIMITED",
      cin: settings.company_cin || "U85499UP2024PTC212061",
      pan: settings.company_pan || "ABOCS6783J",
      founder: settings.company_founder || "Neeraj Shrivastava",
      authorizedSignatory: settings.company_authorized_signatory || "Neeraj Shrivastava",
      natureOfBusiness: settings.company_nature_of_business || "Digital business solutions, digital marketing, automation, online education, training, and technology-enabled business services.",
      registeredAddress: settings.company_registered_address || "Bard No. 8, Basundhara Colony, Chandmari, Lalitpur (UP), 284403",
      website: settings.company_website || "https://myprofunnels.com",
      tagline: settings.company_tagline || "Automate • Engage • Grow",
      governingLaw: settings.company_governing_law || "India",
      whatsappNumber: settings.company_whatsapp_number || "+91 9109019090",
      refundPeriod: settings.company_refund_period || "Within 24 Hours, subject to applicable terms and conditions.",
      pricingRange: settings.company_pricing_range || "₹99 to ₹2.99 Lakh",
      currency: settings.company_currency || "INR",
      youtubeUrl: settings.social_youtube_url || "",
      facebookUrl: settings.social_facebook_url || "",
      instagramUrl: settings.social_instagram_url || "",
      linkedinUrl: settings.social_linkedin_url || "",
      whatsappUrl: settings.social_whatsapp_url !== undefined ? settings.social_whatsapp_url : (settings.company_whatsapp_url || OFFICIAL_COMPANY_INFO.socials.whatsapp || OFFICIAL_COMPANY_INFO.whatsappUrl || ""),
      whatsappEnabled: settings.whatsapp_enabled !== "false",
      whatsappPhoneNumberId: settings.whatsapp_phone_number_id || process.env.WHATSAPP_PHONE_NUMBER_ID || "",
      whatsappBusinessAccountId: settings.whatsapp_business_account_id || process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || "",
      whatsappAccessToken: settings.whatsapp_access_token || process.env.WHATSAPP_ACCESS_TOKEN || "",
      whatsappNotificationsEnabled: settings.whatsapp_notifications_enabled ? JSON.parse(settings.whatsapp_notifications_enabled) : {},
      whatsappTemplateMapping: settings.whatsapp_template_mapping ? JSON.parse(settings.whatsapp_template_mapping) : {},
      isWhatsAppApiConfigured: Boolean((process.env.WHATSAPP_ACCESS_TOKEN || settings.whatsapp_access_token) && (process.env.WHATSAPP_PHONE_NUMBER_ID || settings.whatsapp_phone_number_id)),
    };
  }

  static async updatePlatformSettings(adminId: string, settingsPayload: Record<string, any>) {
    const mapped: Record<string, any> = {};
    for (const [key, val] of Object.entries(settingsPayload)) {
      if (key === "whatsappEnabled") {
        mapped["whatsapp_enabled"] = String(val);
      } else if (key === "whatsappPhoneNumberId") {
        mapped["whatsapp_phone_number_id"] = String(val);
      } else if (key === "whatsappBusinessAccountId") {
        mapped["whatsapp_business_account_id"] = String(val);
      } else if (key === "whatsappAccessToken") {
        mapped["whatsapp_access_token"] = String(val);
      } else if (key === "whatsappNotificationsEnabled") {
        mapped["whatsapp_notifications_enabled"] = typeof val === "string" ? val : JSON.stringify(val);
      } else if (key === "whatsappTemplateMapping") {
        mapped["whatsapp_template_mapping"] = typeof val === "string" ? val : JSON.stringify(val);
      } else {
        mapped[key] = val;
      }
    }

    for (const [key, val] of Object.entries(mapped)) {
      await prisma.platformConfig.upsert({
        where: { key },
        update: { value: String(val) },
        create: { key, value: String(val) },
      });
    }

    await AuditLogger.log({
      userId: adminId,
      event: "PLATFORM_SETTINGS_UPDATED",
      metadata: { keysUpdated: Object.keys(settingsPayload) },
    });

    return this.getPlatformSettings();
  }

  // =========================================================================
  // CATEGORY MANAGEMENT
  // =========================================================================

  static async getCategories() {
    const categories = await prisma.courseCategory.findMany({
      orderBy: { name: "asc" },
    });

    const result = await Promise.all(
      categories.map(async (cat) => {
        const courseCount = await prisma.course.count({
          where: { category: cat.name },
        });
        return {
          ...cat,
          courseCount,
        };
      })
    );

    return result;
  }

  static async createCategory(adminId: string, data: { name: string; description?: string }) {
    if (!data.name?.trim()) {
      throw new Error("VALIDATION_ERROR: Category name is required.");
    }

    const name = data.name.trim();
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-");

    const existing = await prisma.courseCategory.findFirst({
      where: { OR: [{ name }, { slug }] },
    });

    if (existing) {
      throw new Error("VALIDATION_ERROR: Category name already exists.");
    }

    const category = await prisma.courseCategory.create({
      data: {
        name,
        slug,
        description: data.description?.trim() || null,
        isActive: true,
      },
    });

    await AuditLogger.log({
      userId: adminId,
      event: "CATEGORY_CREATED",
      metadata: { categoryId: category.id, name },
    });

    return category;
  }

  static async toggleCategoryActive(adminId: string, categoryId: string, isActive: boolean) {
    const category = await prisma.courseCategory.findUnique({ where: { id: categoryId } });
    if (!category) {
      throw new Error("NOT_FOUND: Category not found.");
    }

    const updated = await prisma.courseCategory.update({
      where: { id: categoryId },
      data: { isActive },
    });

    await AuditLogger.log({
      userId: adminId,
      event: "CATEGORY_STATUS_TOGGLED",
      metadata: { categoryId, isActive },
    });

    return updated;
  }

  // =========================================================================
  // REPORT MANAGEMENT
  // =========================================================================

  static async getReports(options: ReportFilterOptions = {}) {
    const page = Math.max(1, options.page || 1);
    const limit = Math.max(1, Math.min(100, options.limit || 15));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (options.status) {
      where.status = options.status;
    }
    if (options.targetType) {
      where.targetType = options.targetType;
    }

    const [total, reports] = await Promise.all([
      prisma.report.count({ where }),
      prisma.report.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          reporter: {
            select: {
              id: true,
              email: true,
              profile: { select: { firstName: true, lastName: true } },
            },
          },
          resolvedBy: {
            select: {
              id: true,
              email: true,
              profile: { select: { firstName: true, lastName: true } },
            },
          },
        },
      }),
    ]);

    return {
      reports: reports.map((r) => ({
        id: r.id,
        targetType: r.targetType,
        targetId: r.targetId,
        reason: r.reason,
        description: r.description,
        status: r.status,
        actionTaken: r.actionTaken,
        reporterName: r.reporter.profile
          ? `${r.reporter.profile.firstName} ${r.reporter.profile.lastName}`.trim()
          : r.reporter.email,
        reporterId: r.reporterId,
        resolvedByName: r.resolvedBy
          ? r.resolvedBy.profile
            ? `${r.resolvedBy.profile.firstName} ${r.resolvedBy.profile.lastName}`.trim()
            : r.resolvedBy.email
          : null,
        createdAt: r.createdAt,
        resolvedAt: r.resolvedAt,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  static async updateReportStatus(
    adminId: string,
    reportId: string,
    status: "OPEN" | "UNDER_REVIEW" | "RESOLVED" | "REJECTED",
    actionTaken?: string
  ) {
    const report = await prisma.report.findUnique({ where: { id: reportId } });
    if (!report) {
      throw new Error("NOT_FOUND: Report not found.");
    }

    const updated = await prisma.report.update({
      where: { id: reportId },
      data: {
        status,
        actionTaken: actionTaken || null,
        resolvedAt: status === "RESOLVED" || status === "REJECTED" ? new Date() : null,
        resolvedById: status === "RESOLVED" || status === "REJECTED" ? adminId : null,
      },
    });

    await AuditLogger.log({
      userId: adminId,
      event: `REPORT_STATUS_CHANGED`,
      metadata: { reportId, previousStatus: report.status, newStatus: status, actionTaken },
    });

    return updated;
  }
}
