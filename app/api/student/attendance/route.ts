import { NextRequest } from "next/server";
import { requireRole } from "@/lib/auth/guards";
import { apiSuccess, handleApiError } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const session = await requireRole(["STUDENT", "LEARNER"]);
    const userId = session.userId;

    const [
      attendances,
      bookings,
      completedLessons,
      classAttendanceAgg,
    ] = await Promise.all([
      prisma.classAttendance.findMany({
        where: { studentId: userId },
        orderBy: { joinedAt: "desc" },
        include: {
          session: {
            include: {
              liveClassSlot: {
                include: {
                  teacher: { include: { user: { include: { profile: true } } } },
                },
              },
            },
          },
        },
      }),
      prisma.booking.findMany({
        where: { studentId: userId, status: { in: ["CONFIRMED", "ATTENDED"] } },
        include: {
          liveClassSlot: {
            include: {
              teacher: { include: { user: { include: { profile: true } } } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.lessonProgress.findMany({
        where: { enrollment: { studentId: userId }, completed: true },
        orderBy: { updatedAt: "desc" },
        take: 30,
        include: {
          lesson: true,
          enrollment: { include: { course: true } },
        },
      }),
      prisma.classAttendance.aggregate({
        where: { studentId: userId },
        _sum: { duration: true },
      }),
    ]);

    const totalMinutes = classAttendanceAgg._sum.duration || 0;
    const liveClassHours = Math.round((totalMinutes / 60) * 10) / 10;
    const totalBooked = bookings.length;
    const attendedCount = attendances.filter((a) => a.status === "PRESENT" || a.status === "PARTIAL").length;
    const attendanceRatePercent = totalBooked > 0 ? Math.round((attendedCount / totalBooked) * 100) : 100;

    const formattedAttendances = attendances.map((a) => {
      const slot = a.session.liveClassSlot;
      const teacherName = slot.teacher.user.profile
        ? `${slot.teacher.user.profile.firstName} ${slot.teacher.user.profile.lastName}`.trim()
        : "Educator";

      return {
        id: a.id,
        slotTitle: slot.title,
        subject: slot.subject,
        teacherName,
        startTime: slot.startTime,
        joinedAt: a.joinedAt,
        leftAt: a.leftAt,
        durationMinutes: a.duration,
        status: a.status,
      };
    });

    const formattedLessonLogs = completedLessons.map((lp) => ({
      id: lp.id,
      courseTitle: lp.enrollment.course.title,
      lessonTitle: lp.lesson.title,
      durationSeconds: lp.progressSeconds,
      completedAt: lp.updatedAt,
    }));

    return apiSuccess({
      stats: {
        totalBooked,
        attendedCount,
        liveClassHours,
        attendanceRatePercent,
        completedLessonsCount: completedLessons.length,
      },
      attendances: formattedAttendances,
      lessonLogs: formattedLessonLogs,
    });
  } catch (error: any) {
    return handleApiError(error);
  }
}
