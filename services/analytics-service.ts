import { prisma } from "@/lib/prisma";
import { formatPaise, formatCurrency } from "@/lib/currency";
import { isLearnerRole } from "@/lib/auth/roles";

export class AnalyticsService {
  /**
   * Helper: parse date filter into start Date and end Date
   */
  static parseDateRange(range?: string, startStr?: string, endStr?: string): { startDate: Date; endDate: Date } {
    const now = new Date();
    let startDate = new Date();
    let endDate = new Date(now);

    if (startStr && endStr) {
      return { startDate: new Date(startStr), endDate: new Date(endStr) };
    }

    switch (range) {
      case "today":
        startDate.setHours(0, 0, 0, 0);
        break;
      case "7d":
      case "7days":
        startDate.setDate(now.getDate() - 7);
        break;
      case "90d":
      case "90days":
        startDate.setDate(now.getDate() - 90);
        break;
      case "year":
      case "this_year":
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      case "30d":
      case "30days":
      default:
        startDate.setDate(now.getDate() - 30);
        break;
    }

    return { startDate, endDate };
  }

  // =========================================================================
  // STUDENT ANALYTICS & DASHBOARD
  // =========================================================================

  static async getStudentDashboardData(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true, studentProfile: true },
    });

    if (!user || !isLearnerRole(user.role)) {
      throw new Error("UNAUTHORIZED: Student account required.");
    }

    const userName = user.profile ? `${user.profile.firstName} ${user.profile.lastName}`.trim() : user.email;

    // 1. Fetch active enrollments with progress
    const enrollments = await prisma.enrollment.findMany({
      where: {
        studentId: userId,
        status: { in: ["ACTIVE", "COMPLETED"] },
      },
      include: {
        course: {
          include: {
            teacher: { include: { user: { include: { profile: true } } } },
            sections: { include: { lessons: true } },
          },
        },
        lessonProgresses: {
          orderBy: { lastWatchedAt: "desc" },
          take: 1,
          include: { lesson: true },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    // Determine "Continue Learning" course
    let continueLearning = null;
    if (enrollments.length > 0) {
      // Find latest active enrollment sorted by lastWatchedAt
      const sorted = [...enrollments].sort((a, b) => {
        const aWatched = a.lessonProgresses[0]?.lastWatchedAt ? new Date(a.lessonProgresses[0].lastWatchedAt).getTime() : 0;
        const bWatched = b.lessonProgresses[0]?.lastWatchedAt ? new Date(b.lessonProgresses[0].lastWatchedAt).getTime() : 0;
        return bWatched - aWatched;
      });

      const topEnrollment = sorted[0];
      const allLessons = topEnrollment.course.sections.flatMap((s) => s.lessons);
      const totalLessons = allLessons.length;

      // Count completed lessons for this enrollment
      const completedCount = await prisma.lessonProgress.count({
        where: { enrollmentId: topEnrollment.id, completed: true },
      });

      const progressPercent = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;
      const lastWatched = topEnrollment.lessonProgresses[0];

      const teacherName = topEnrollment.course.teacher.user.profile
        ? `${topEnrollment.course.teacher.user.profile.firstName} ${topEnrollment.course.teacher.user.profile.lastName}`
        : "Educator";

      continueLearning = {
        enrollmentId: topEnrollment.id,
        courseId: topEnrollment.course.id,
        courseSlug: topEnrollment.course.slug,
        title: topEnrollment.course.title,
        thumbnailUrl: topEnrollment.course.thumbnailUrl,
        teacherName,
        progressPercent,
        completedLessons: completedCount,
        totalLessons,
        lastLessonTitle: lastWatched?.lesson.title || (allLessons[0]?.title || "Getting Started"),
        lastLessonId: lastWatched?.lesson.id || (allLessons[0]?.id || null),
      };
    }

    // 2. Fetch upcoming live class bookings
    const now = new Date();
    const bookings = await prisma.booking.findMany({
      where: {
        studentId: userId,
        status: { in: ["CONFIRMED", "ATTENDED"] },
        liveClassSlot: {
          endTime: { gte: now },
          status: { notIn: ["CANCELLED"] },
        },
      },
      include: {
        liveClassSlot: {
          include: {
            teacher: { include: { user: { include: { profile: true } } } },
            session: true,
          },
        },
      },
      orderBy: { liveClassSlot: { startTime: "asc" } },
      take: 5,
    });

    const upcomingClasses = bookings.map((b) => {
      const slot = b.liveClassSlot;
      const teacherName = slot.teacher.user.profile
        ? `${slot.teacher.user.profile.firstName} ${slot.teacher.user.profile.lastName}`
        : "Educator";

      const startTime = new Date(slot.startTime);
      const endTime = new Date(slot.endTime);
      const joinWindowStart = new Date(startTime.getTime() - 15 * 60 * 1000);

      const canJoin = now >= joinWindowStart && now <= endTime;

      return {
        bookingId: b.id,
        slotId: slot.id,
        title: slot.title,
        subject: slot.subject,
        teacherName,
        startTime: slot.startTime,
        endTime: slot.endTime,
        status: slot.status,
        canJoin,
        sessionId: slot.session?.id || null,
      };
    });

    // 3. Aggregate Student Stats
    const enrolledCount = await prisma.enrollment.count({ where: { studentId: userId, status: "ACTIVE" } });
    const completedCoursesCount = await prisma.enrollment.count({ where: { studentId: userId, status: "COMPLETED" } });
    const upcomingClassesCount = await prisma.booking.count({
      where: { studentId: userId, status: "CONFIRMED", liveClassSlot: { startTime: { gte: now } } },
    });
    const completedClassesCount = await prisma.classAttendance.count({
      where: { studentId: userId, status: { in: ["PRESENT", "PARTIAL"] } },
    });

    // 4. Calculate Learning Analytics Time
    const videoProgressAgg = await prisma.lessonProgress.aggregate({
      where: { enrollment: { studentId: userId } },
      _sum: { progressSeconds: true },
    });

    const classAttendanceAgg = await prisma.classAttendance.aggregate({
      where: { studentId: userId },
      _sum: { duration: true },
    });

    const totalVideoSeconds = videoProgressAgg._sum.progressSeconds || 0;
    const totalClassMinutes = classAttendanceAgg._sum.duration || 0;

    const courseHours = Math.round((totalVideoSeconds / 3600) * 10) / 10;
    const liveClassHours = Math.round((totalClassMinutes / 60) * 10) / 10;
    const totalHours = Math.round((courseHours + liveClassHours) * 10) / 10;

    // 5. Recent Payments Summary
    const recentPayments = await prisma.paymentTransaction.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        type: true,
        amountPaise: true,
        status: true,
        createdAt: true,
      },
    });

    // 6. Recent Activity Timeline
    const [recentLessonProgress, recentBookingsList, recentEnrollmentsList, unreadNotificationsCount] = await Promise.all([
      prisma.lessonProgress.findMany({
        where: { enrollment: { studentId: userId }, completed: true },
        orderBy: { updatedAt: "desc" },
        take: 3,
        include: {
          lesson: true,
          enrollment: { include: { course: true } },
        },
      }),
      prisma.booking.findMany({
        where: { studentId: userId },
        orderBy: { createdAt: "desc" },
        take: 3,
        include: {
          liveClassSlot: {
            include: {
              teacher: { include: { user: { include: { profile: true } } } },
            },
          },
        },
      }),
      prisma.enrollment.findMany({
        where: { studentId: userId },
        orderBy: { enrolledAt: "desc" },
        take: 3,
        include: { course: true },
      }),
      prisma.notification.count({
        where: { userId, isRead: false },
      }),
    ]);

    const activityList: Array<{
      id: string;
      type: "LESSON_COMPLETED" | "CLASS_BOOKED" | "COURSE_ENROLLED";
      title: string;
      subtitle: string;
      timestamp: Date;
    }> = [];

    recentLessonProgress.forEach((lp) => {
      activityList.push({
        id: `lp-${lp.id}`,
        type: "LESSON_COMPLETED",
        title: `Completed: ${lp.lesson.title}`,
        subtitle: lp.enrollment.course.title,
        timestamp: lp.updatedAt,
      });
    });

    recentBookingsList.forEach((b) => {
      const teacherName = b.liveClassSlot.teacher.user.profile
        ? `${b.liveClassSlot.teacher.user.profile.firstName} ${b.liveClassSlot.teacher.user.profile.lastName}`.trim()
        : "Educator";
      activityList.push({
        id: `bk-${b.id}`,
        type: "CLASS_BOOKED",
        title: `Booked: ${b.liveClassSlot.title}`,
        subtitle: `Tutor: ${teacherName} • ${b.liveClassSlot.subject}`,
        timestamp: b.createdAt,
      });
    });

    recentEnrollmentsList.forEach((e) => {
      activityList.push({
        id: `en-${e.id}`,
        type: "COURSE_ENROLLED",
        title: `Enrolled: ${e.course.title}`,
        subtitle: `${e.course.level} • ${e.course.subject}`,
        timestamp: e.enrolledAt,
      });
    });

    activityList.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    const recentActivity = activityList.slice(0, 5);

    // 7. Enrolled Courses Summary (All Purchased Courses)
    const enrolledCoursesSummary = enrollments.map((e) => {
      const allLessons = e.course.sections.flatMap((s) => s.lessons);
      const totalLessons = allLessons.length;
      const completedCount = e.lessonProgresses.filter((p) => p.completed).length;
      const progressPercent = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;
      const teacherName = e.course.teacher.user.profile
        ? `${e.course.teacher.user.profile.firstName} ${e.course.teacher.user.profile.lastName}`.trim()
        : "Educator";

      return {
        enrollmentId: e.id,
        courseId: e.course.id,
        title: e.course.title,
        slug: e.course.slug,
        subject: e.course.subject,
        level: e.course.level,
        thumbnailUrl: e.course.thumbnailUrl || "/images/course-placeholder.jpg",
        teacherName,
        progressPercent,
        completedLessons: completedCount,
        totalLessons,
        status: e.status,
      };
    });

    // 8. Academic Profile and Personalized Recommendations
    const sp = user.studentProfile;
    const academicTerms: string[] = [];
    if (sp) {
      if (sp.educationType === "DIPLOMA" && sp.diplomaBranch) {
        academicTerms.push(sp.diplomaBranch);
        academicTerms.push("Diploma");
        academicTerms.push("Engineering");
      } else if (sp.educationType === "SCHOOL") {
        if (sp.competitiveExam) academicTerms.push(sp.competitiveExam);
        if (sp.stream) academicTerms.push(sp.stream);
        if (sp.gradeLevel) academicTerms.push(sp.gradeLevel);
      }
      if (Array.isArray(sp.interests)) {
        sp.interests.forEach((i: string) => {
          if (i && typeof i === "string") academicTerms.push(i);
        });
      }
    }

    const recommendedCourses = await prisma.course.findMany({
      where: {
        status: "PUBLISHED",
        ...(academicTerms.length > 0
          ? {
              OR: academicTerms.slice(0, 5).flatMap((term) => [
                { title: { contains: term, mode: "insensitive" as const } },
                { subject: { contains: term, mode: "insensitive" as const } },
                { level: { contains: term, mode: "insensitive" as const } },
              ]),
            }
          : {}),
      },
      include: {
        teacher: { include: { user: { include: { profile: true } } } },
      },
      take: 4,
    });

    // Admin-controlled Recommended Educators selection system
    const recommendedConfig = await prisma.platformConfig.findUnique({
      where: { key: "recommended_educators" },
    });

    let selectedTeacherIds: string[] = [];
    if (recommendedConfig?.value) {
      try {
        selectedTeacherIds = JSON.parse(recommendedConfig.value);
      } catch {
        selectedTeacherIds = [];
      }
    }

    let recommendedEducators: any[] = [];
    if (Array.isArray(selectedTeacherIds) && selectedTeacherIds.length > 0) {
      const fetchedProfiles = await prisma.teacherProfile.findMany({
        where: {
          id: { in: selectedTeacherIds },
          verificationStatus: "VERIFIED",
        },
        include: {
          user: { include: { profile: true } },
        },
      });

      const profileMap = new Map(fetchedProfiles.map((p) => [p.id, p]));
      recommendedEducators = selectedTeacherIds
        .map((id) => profileMap.get(id))
        .filter(Boolean);
    }

    return {
      userName,
      userEmail: user.email,
      avatarUrl: user.profile?.avatarUrl || null,
      gradeLevel: user.studentProfile?.gradeLevel || null,
      interests: user.studentProfile?.interests || null,
      academicProfile: sp
        ? {
            educationType: sp.educationType,
            gradeLevel: sp.gradeLevel,
            stream: sp.stream,
            competitiveExam: sp.competitiveExam,
            diplomaBranch: sp.diplomaBranch,
          }
        : null,
      recommendedCourses: recommendedCourses.map((c) => ({
        id: c.id,
        title: c.title,
        slug: c.slug,
        subject: c.subject,
        level: c.level,
        thumbnailUrl: c.thumbnailUrl || "/images/course-placeholder.jpg",
        teacherName: c.teacher?.user?.profile
          ? `${c.teacher.user.profile.firstName} ${c.teacher.user.profile.lastName}`.trim()
          : "Educator",
        priceFormatted: formatCurrency(c.price || 0),
      })),
      recommendedEducators: recommendedEducators.map((t) => ({
        id: t.id,
        name: t.user.profile
          ? `${t.user.profile.firstName} ${t.user.profile.lastName}`.trim()
          : "Educator",
        headline: t.headline,
        avatarUrl: t.user.profile?.avatarUrl || null,
        subjects: t.subjects,
        hourlyRateFormatted: formatCurrency(t.hourlyRate || 0),
        rating: t.rating || 5.0,
      })),
      unreadNotificationsCount,
      continueLearning,
      upcomingClasses,
      enrolledCourses: enrolledCoursesSummary,
      recentActivity,
      stats: {
        enrolledCount,
        completedCoursesCount,
        upcomingClassesCount,
        completedClassesCount,
        courseHours,
        liveClassHours,
        totalHours,
      },
      recentPayments: recentPayments.map((p) => ({
        id: p.id,
        type: p.type,
        amountFormatted: formatPaise(p.amountPaise),
        status: p.status,
        date: p.createdAt,
      })),
    };
  }

  // =========================================================================
  // TEACHER ANALYTICS & DASHBOARD
  // =========================================================================

  static async getTeacherDashboardData(userId: string) {
    let teacherProfile = await prisma.teacherProfile.findUnique({
      where: { userId },
      include: { user: { include: { profile: true } } },
    });

    if (!teacherProfile) {
      teacherProfile = await prisma.teacherProfile.create({
        data: {
          userId,
          headline: "Educator",
          teachingMode: "ONLINE",
          verificationStatus: "PENDING",
          isSeededProfile: false,
        },
        include: { user: { include: { profile: true } } },
      });
    }

    const teacherId = teacherProfile.id;
    const userName = teacherProfile.user.profile
      ? `${teacherProfile.user.profile.firstName} ${teacherProfile.user.profile.lastName}`.trim()
      : teacherProfile.user.email;

    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(now);
    todayEnd.setHours(23, 59, 59, 999);

    // 1. Overview metrics
    const todayClassesCount = await prisma.liveClassSlot.count({
      where: { teacherId, startTime: { gte: todayStart, lte: todayEnd }, status: { notIn: ["CANCELLED"] } },
    });
    const upcomingClassesCount = await prisma.liveClassSlot.count({
      where: { teacherId, startTime: { gte: now }, status: { notIn: ["CANCELLED"] } },
    });
    const activeStudentsCount = await prisma.enrollment.count({
      where: { course: { teacherId }, status: { in: ["ACTIVE", "COMPLETED"] } },
    });
    const activeCoursesCount = await prisma.course.count({
      where: { teacherId, status: "PUBLISHED" },
    });

    // 2. Earnings from Module 08 Ledger
    const earningsAgg = await prisma.financialLedgerEntry.aggregate({
      where: {
        teacherId,
        type: "TEACHER_EARNING",
        status: "COMPLETED",
      },
      _sum: { amountPaise: true },
    });

    const monthlyEarningsAgg = await prisma.financialLedgerEntry.aggregate({
      where: {
        teacherId,
        type: "TEACHER_EARNING",
        status: "COMPLETED",
        createdAt: { gte: new Date(now.getFullYear(), now.getMonth(), 1) },
      },
      _sum: { amountPaise: true },
    });

    const totalEarningsRupees = (earningsAgg._sum.amountPaise || 0) / 100;
    const monthlyEarningsRupees = (monthlyEarningsAgg._sum.amountPaise || 0) / 100;

    // 3. Today's schedule
    const todaySlots = await prisma.liveClassSlot.findMany({
      where: { teacherId, startTime: { gte: todayStart, lte: todayEnd }, status: { notIn: ["CANCELLED"] } },
      orderBy: { startTime: "asc" },
      include: { bookings: { where: { status: { notIn: ["CANCELLED"] } } }, session: true },
    });

    const todaySchedule = todaySlots.map((slot) => ({
      slotId: slot.id,
      title: slot.title,
      subject: slot.subject,
      startTime: slot.startTime,
      endTime: slot.endTime,
      bookedCount: slot.bookings.length,
      maxCapacity: slot.maxCapacity,
      status: slot.status,
      sessionId: slot.session?.id || null,
    }));

    // 4. Next 5 Upcoming Classes
    const upcomingSlots = await prisma.liveClassSlot.findMany({
      where: { teacherId, startTime: { gte: now }, status: { notIn: ["CANCELLED"] } },
      orderBy: { startTime: "asc" },
      take: 5,
      include: { bookings: { where: { status: { notIn: ["CANCELLED"] } } }, session: true },
    });

    const upcomingClasses = upcomingSlots.map((slot) => {
      const startTime = new Date(slot.startTime);
      const endTime = new Date(slot.endTime);
      const canEnter = now >= new Date(startTime.getTime() - 15 * 60 * 1000) && now <= endTime;

      return {
        slotId: slot.id,
        title: slot.title,
        subject: slot.subject,
        startTime: slot.startTime,
        endTime: slot.endTime,
        bookedCount: slot.bookings.length,
        maxCapacity: slot.maxCapacity,
        status: slot.status,
        canEnter,
        sessionId: slot.session?.id || null,
      };
    });

    return {
      userName,
      verificationStatus: teacherProfile.verificationStatus,
      metrics: {
        todayClassesCount,
        upcomingClassesCount,
        activeStudentsCount,
        activeCoursesCount,
        totalEarningsRupees,
        monthlyEarningsRupees,
      },
      todaySchedule,
      upcomingClasses,
    };
  }

  static async getTeacherAnalyticsData(userId: string, dateFilter?: { range?: string; startDate?: string; endDate?: string }) {
    const teacherProfile = await prisma.teacherProfile.findUnique({
      where: { userId },
    });

    if (!teacherProfile) {
      throw new Error("NOT_FOUND: Teacher profile not found.");
    }

    const teacherId = teacherProfile.id;
    const { startDate, endDate } = this.parseDateRange(dateFilter?.range, dateFilter?.startDate, dateFilter?.endDate);

    // 1. Course Performance Metrics
    const courses = await prisma.course.findMany({
      where: { teacherId },
      include: {
        enrollments: { where: { createdAt: { gte: startDate, lte: endDate } } },
        reviews: true,
        sections: { include: { lessons: true } },
      },
    });

    let totalEnrollmentsInPeriod = 0;
    let completedEnrollmentsCount = 0;
    let sumProgress = 0;
    let activeEnrollmentsCount = 0;

    const courseBreakdown = await Promise.all(
      courses.map(async (course) => {
        const totalLessons = course.sections.flatMap((s) => s.lessons).length;
        const enrollments = await prisma.enrollment.findMany({
          where: { courseId: course.id, status: { in: ["ACTIVE", "COMPLETED"] } },
          include: { lessonProgresses: true },
        });

        let courseCompletedCount = 0;
        let courseSumProgressPercent = 0;

        enrollments.forEach((e) => {
          if (e.status === "COMPLETED") courseCompletedCount++;
          const completedLessons = e.lessonProgresses.filter((lp) => lp.completed).length;
          const prog = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;
          courseSumProgressPercent += prog;
        });

        totalEnrollmentsInPeriod += course.enrollments.length;
        completedEnrollmentsCount += courseCompletedCount;
        sumProgress += courseSumProgressPercent;
        activeEnrollmentsCount += enrollments.length;

        const avgProgress = enrollments.length > 0 ? Math.round(courseSumProgressPercent / enrollments.length) : 0;
        const completionRate = enrollments.length > 0 ? Math.round((courseCompletedCount / enrollments.length) * 100) : 0;

        return {
          courseId: course.id,
          title: course.title,
          status: course.status,
          price: course.price,
          totalEnrollments: course.enrollmentCount,
          periodEnrollments: course.enrollments.length,
          completionRatePercent: completionRate,
          averageProgressPercent: avgProgress,
          rating: course.rating,
          reviewCount: course.reviewCount,
        };
      })
    );

    const overallCompletionRate = activeEnrollmentsCount > 0 ? Math.round((completedEnrollmentsCount / activeEnrollmentsCount) * 100) : 0;
    const overallAvgProgress = activeEnrollmentsCount > 0 ? Math.round(sumProgress / activeEnrollmentsCount) : 0;

    // 2. Live Class Analytics
    const slots = await prisma.liveClassSlot.findMany({
      where: { teacherId, createdAt: { gte: startDate, lte: endDate } },
      include: { bookings: true, session: { include: { attendances: true } } },
    });

    const totalSlots = slots.length;
    const completedSlots = slots.filter((s) => s.status === "COMPLETED").length;
    const cancelledSlots = slots.filter((s) => s.status === "CANCELLED").length;

    let totalExpectedParticipants = 0;
    let totalPresentParticipants = 0;

    slots.forEach((s) => {
      const activeBookings = s.bookings.filter((b) => b.status !== "CANCELLED").length;
      totalExpectedParticipants += activeBookings;
      if (s.session) {
        const presentCount = s.session.attendances.filter((a) => a.status === "PRESENT" || a.status === "PARTIAL").length;
        totalPresentParticipants += presentCount;
      }
    });

    const attendanceRate = totalExpectedParticipants > 0 ? Math.round((totalPresentParticipants / totalExpectedParticipants) * 100) : 0;

    // 3. Earnings breakdown in period
    const ledgerEntries = await prisma.financialLedgerEntry.findMany({
      where: {
        teacherId,
        type: "TEACHER_EARNING",
        status: "COMPLETED",
        createdAt: { gte: startDate, lte: endDate },
      },
      orderBy: { createdAt: "asc" },
    });

    const periodEarningsRupees = ledgerEntries.reduce((sum, e) => sum + e.amountPaise / 100, 0);

    return {
      dateRange: { startDate, endDate },
      courseMetrics: {
        publishedCoursesCount: courses.filter((c) => c.status === "PUBLISHED").length,
        totalEnrollmentsInPeriod,
        overallCompletionRate,
        overallAvgProgress,
        courseBreakdown,
      },
      liveClassMetrics: {
        totalSlots,
        completedSlots,
        cancelledSlots,
        totalExpectedParticipants,
        totalPresentParticipants,
        attendanceRatePercent: attendanceRate,
      },
      financialMetrics: {
        periodEarningsRupees,
      },
    };
  }

  // =========================================================================
  // ADMIN ANALYTICS & DASHBOARD
  // =========================================================================

  static async getAdminDashboardData() {
    const totalUsers = await prisma.user.count();
    const totalTeachers = await prisma.user.count({ where: { role: "TEACHER" } });
    const totalStudents = await prisma.user.count({ where: { role: "STUDENT" } });
    const verifiedTeachers = await prisma.teacherProfile.count({ where: { verificationStatus: "VERIFIED" } });
    const pendingVerifications = await prisma.teacherProfile.count({ where: { verificationStatus: "PENDING" } });
    const rejectedTeachers = await prisma.teacherProfile.count({ where: { verificationStatus: "REJECTED" } });
    const suspendedTeachers = await prisma.teacherProfile.count({ where: { verificationStatus: "SUSPENDED" } });
    const totalCourses = await prisma.course.count();
    const publishedCourses = await prisma.course.count({ where: { status: "PUBLISHED" } });
    const totalLiveClasses = await prisma.liveClassSlot.count();
    const openReports = await prisma.report.count({ where: { status: "OPEN" } });
    const pendingRefunds = await prisma.refund.count({ where: { status: "REFUND_REQUESTED" } });

    // Financial Metrics from Module 08 Database
    const capturedTransactionsAgg = await prisma.paymentTransaction.aggregate({
      where: { status: "CAPTURED" },
      _sum: { amountPaise: true },
    });

    const platformCommissionAgg = await prisma.financialLedgerEntry.aggregate({
      where: { type: "PLATFORM_COMMISSION", status: "COMPLETED" },
      _sum: { amountPaise: true },
    });

    const teacherEarningsAgg = await prisma.financialLedgerEntry.aggregate({
      where: { type: "TEACHER_EARNING", status: "COMPLETED" },
      _sum: { amountPaise: true },
    });

    const refundsAgg = await prisma.refund.aggregate({
      where: { status: "REFUNDED" },
      _sum: { amountPaise: true },
    });

    const grossRevenueRupees = (capturedTransactionsAgg._sum.amountPaise || 0) / 100;
    const platformCommissionRupees = (platformCommissionAgg._sum.amountPaise || 0) / 100;
    const teacherEarningsRupees = (teacherEarningsAgg._sum.amountPaise || 0) / 100;
    const refundsRupees = (refundsAgg._sum.amountPaise || 0) / 100;
    const netPlatformRevenueRupees = grossRevenueRupees - refundsRupees - teacherEarningsRupees;

    // Recent platform activities
    const recentActivities = await (prisma as any).activityLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      include: { actor: { include: { profile: true } } },
    });

    return {
      metrics: {
        totalUsers,
        totalTeachers,
        totalStudents,
        verifiedTeachers,
        pendingVerifications,
        rejectedTeachers,
        suspendedTeachers,
        totalCourses,
        publishedCourses,
        totalLiveClasses,
        openReports,
        pendingRefunds,
      },
      financials: {
        grossRevenueRupees,
        platformCommissionRupees,
        teacherEarningsRupees,
        refundsRupees,
        netPlatformRevenueRupees,
      },
      recentActivities: recentActivities.map((a: any) => ({
        id: a.id,
        action: a.action,
        actorName: a.actor?.profile ? `${a.actor.profile.firstName} ${a.actor.profile.lastName}` : a.actorId || "System",
        actorRole: a.actorRole,
        entityType: a.entityType,
        createdAt: a.createdAt,
      })),
    };
  }

  static async getAdminAnalyticsData(dateFilter?: { range?: string; startDate?: string; endDate?: string }) {
    const { startDate, endDate } = this.parseDateRange(dateFilter?.range, dateFilter?.startDate, dateFilter?.endDate);

    // 1. User registrations in date range
    const newStudents = await prisma.user.count({
      where: { role: "STUDENT", createdAt: { gte: startDate, lte: endDate } },
    });
    const newTeachers = await prisma.user.count({
      where: { role: "TEACHER", createdAt: { gte: startDate, lte: endDate } },
    });

    // 2. Revenue in date range
    const transactions = await prisma.paymentTransaction.findMany({
      where: { status: "CAPTURED", capturedAt: { gte: startDate, lte: endDate } },
      orderBy: { capturedAt: "asc" },
    });

    const periodGrossRevenueRupees = transactions.reduce((sum, t) => sum + t.amountPaise / 100, 0);

    // 3. Live Class Attendance Rate
    const sessions = await prisma.liveClassSession.findMany({
      where: { createdAt: { gte: startDate, lte: endDate } },
      include: { attendances: true, liveClassSlot: { include: { bookings: true } } },
    });

    let expectedTotal = 0;
    let presentTotal = 0;

    sessions.forEach((s) => {
      expectedTotal += s.liveClassSlot.bookings.filter((b) => b.status !== "CANCELLED").length;
      presentTotal += s.attendances.filter((a) => a.status === "PRESENT" || a.status === "PARTIAL").length;
    });

    const periodAttendanceRate = expectedTotal > 0 ? Math.round((presentTotal / expectedTotal) * 100) : 0;

    // 4. Top Courses
    const topCourses = await prisma.course.findMany({
      where: { status: "PUBLISHED" },
      orderBy: { enrollmentCount: "desc" },
      take: 5,
      include: { teacher: { include: { user: { include: { profile: true } } } } },
    });

    const formattedTopCourses = topCourses.map((c) => ({
      id: c.id,
      title: c.title,
      teacherName: c.teacher.user.profile
        ? `${c.teacher.user.profile.firstName} ${c.teacher.user.profile.lastName}`
        : "Educator",
      enrollmentCount: c.enrollmentCount,
      rating: c.rating,
      priceRupees: c.price,
    }));

    return {
      dateRange: { startDate, endDate },
      userStats: { newStudents, newTeachers },
      revenueStats: { periodGrossRevenueRupees, transactionCount: transactions.length },
      attendanceStats: { expectedTotal, presentTotal, periodAttendanceRate },
      topCourses: formattedTopCourses,
    };
  }

  // =========================================================================
  // SYSTEM HEALTH
  // =========================================================================

  static async getAdminSystemHealth() {
    let dbStatus = "HEALTHY";
    try {
      await prisma.$queryRaw`SELECT 1`;
    } catch {
      dbStatus = "DEGRADED";
    }

    const emailProvider = process.env.RESEND_API_KEY ? "RESEND" : process.env.SMTP_HOST ? "SMTP" : "CONSOLE";
    const paymentGateway = process.env.CASHFREE_APP_ID || process.env.RAZORPAY_KEY_ID ? "CASHFREE_CONFIGURED" : "DEMO_MODE";
    const livekitStatus = process.env.LIVEKIT_API_KEY ? "LIVEKIT_ACTIVE" : "CONFIG_PENDING";
    const muxStatus = process.env.MUX_TOKEN_ID ? "MUX_ACTIVE" : "CONFIG_PENDING";

    return {
      status: dbStatus === "HEALTHY" ? "OPERATIONAL" : "ISSUES_DETECTED",
      services: {
        database: { status: dbStatus, type: "PostgreSQL (Neon)" },
        paymentGateway: { status: paymentGateway, provider: "Cashfree" },
        emailService: { status: "HEALTHY", provider: emailProvider },
        liveClassroom: { status: livekitStatus, provider: "LiveKit Cloud" },
        videoProcessing: { status: muxStatus, provider: "Mux Video" },
      },
      timestamp: new Date().toISOString(),
    };
  }
}
