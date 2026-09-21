import { NextRequest } from "next/server";
import { requireRole } from "@/lib/auth/guards";
import { apiSuccess, handleApiError } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const session = await requireRole(["STUDENT", "LEARNER"]);
    const userId = session.userId;

    const [
      lessonProgresses,
      bookings,
      enrollments,
      transactions,
      auditLogs,
    ] = await Promise.all([
      prisma.lessonProgress.findMany({
        where: { enrollment: { studentId: userId } },
        orderBy: { updatedAt: "desc" },
        take: 20,
        include: {
          lesson: true,
          enrollment: { include: { course: true } },
        },
      }),
      prisma.booking.findMany({
        where: { studentId: userId },
        orderBy: { createdAt: "desc" },
        take: 20,
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
        take: 20,
        include: { course: true },
      }),
      prisma.paymentTransaction.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 20,
        include: { course: true, liveClassSlot: true },
      }),
      prisma.auditLog.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
    ]);

    const activities: Array<{
      id: string;
      category: "LESSONS" | "CLASSES" | "PURCHASES" | "ACCOUNT";
      title: string;
      subtitle: string;
      status?: string;
      timestamp: Date;
    }> = [];

    lessonProgresses.forEach((lp) => {
      activities.push({
        id: `lp-${lp.id}`,
        category: "LESSONS",
        title: lp.completed ? `Completed Lesson: ${lp.lesson.title}` : `Watched Lesson: ${lp.lesson.title}`,
        subtitle: `Course: ${lp.enrollment.course.title}`,
        status: lp.completed ? "COMPLETED" : "IN_PROGRESS",
        timestamp: lp.updatedAt,
      });
    });

    bookings.forEach((b) => {
      const teacherName = b.liveClassSlot.teacher.user.profile
        ? `${b.liveClassSlot.teacher.user.profile.firstName} ${b.liveClassSlot.teacher.user.profile.lastName}`.trim()
        : "Educator";

      activities.push({
        id: `bk-${b.id}`,
        category: "CLASSES",
        title: `Booked Live Session: ${b.liveClassSlot.title}`,
        subtitle: `Educator: ${teacherName} • ${b.liveClassSlot.subject}`,
        status: b.status,
        timestamp: b.createdAt,
      });
    });

    enrollments.forEach((e) => {
      activities.push({
        id: `en-${e.id}`,
        category: "LESSONS",
        title: `Enrolled in Course: ${e.course.title}`,
        subtitle: `Level: ${e.course.level} • ${e.course.subject}`,
        status: e.status,
        timestamp: e.enrolledAt,
      });
    });

    transactions.forEach((t) => {
      const itemTitle = t.course?.title || t.liveClassSlot?.title || "EduConnects Purchase";
      activities.push({
        id: `tx-${t.id}`,
        category: "PURCHASES",
        title: `Payment ${t.status}: ${itemTitle}`,
        subtitle: `Ref: ${t.internalReference} • ₹${(t.amountPaise / 100).toLocaleString()}`,
        status: t.status,
        timestamp: t.createdAt,
      });
    });

    auditLogs.forEach((al) => {
      activities.push({
        id: `al-${al.id}`,
        category: "ACCOUNT",
        title: al.event.replace(/_/g, " "),
        subtitle: `Security audit log entry`,
        status: "LOGGED",
        timestamp: al.createdAt,
      });
    });

    activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return apiSuccess({ activities });
  } catch (error: any) {
    return handleApiError(error);
  }
}
