"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MetricCard } from "@/components/analytics/metric-card";
import {
  BookOpen,
  Video,
  CalendarCheck,
  Flame,
  Search,
  Clock,
  Play,
  CheckCircle2,
  CreditCard,
  Loader2,
} from "lucide-react";

export default function StudentDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{
    userName: string;
    userEmail?: string;
    avatarUrl?: string | null;
    gradeLevel?: string | null;
    learningGoals?: string | null;
    unreadNotificationsCount?: number;
    continueLearning?: any;
    upcomingClasses: any[];
    enrolledCourses?: any[];
    recentActivity?: any[];
    stats: {
      enrolledCount: number;
      completedCoursesCount: number;
      upcomingClassesCount: number;
      completedClassesCount: number;
      courseHours: number;
      liveClassHours: number;
      totalHours: number;
    };
    recentPayments: any[];
  }>({
    userName: "Learner",
    upcomingClasses: [],
    enrolledCourses: [],
    recentActivity: [],
    stats: {
      enrolledCount: 0,
      completedCoursesCount: 0,
      upcomingClassesCount: 0,
      completedClassesCount: 0,
      courseHours: 0,
      liveClassHours: 0,
      totalHours: 0,
    },
    recentPayments: [],
  });

  useEffect(() => {
    fetch("/api/student/dashboard", { cache: "no-store", headers: { Pragma: "no-cache" } })
      .then((res) => {
        if (!res.ok || res.status === 401) {
          window.location.replace("/student/login");
          return null;
        }
        return res.json();
      })
      .then((json) => {
        if (json?.data) {
          setData(json.data);
        }
      })
      .catch(() => {
        window.location.replace("/student/login");
      })
      .finally(() => setLoading(false));
  }, []);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  return (
    <DashboardLayout role="STUDENT" userName={data.userName} userEmail={data.userEmail}>
      <div className="space-y-8 pb-16">
        {/* Welcome Header Banner */}
        <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-purple-800 text-white rounded-3xl p-6 lg:p-8 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden">
          <div className="flex items-center gap-4 relative z-10">
            {data.avatarUrl ? (
              <img
                src={data.avatarUrl}
                alt={data.userName}
                className="w-16 h-16 rounded-2xl object-cover ring-4 ring-white/20 shadow-lg"
              />
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-md text-white font-black text-2xl flex items-center justify-center ring-4 ring-white/20 shadow-lg">
                {data.userName.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h1 className="text-2xl lg:text-3xl font-black tracking-tight">
                  {getGreeting()}, {data.userName} 👋
                </h1>
                {data.gradeLevel && (
                  <Badge variant="outline" className="text-white border-white/30 bg-white/10 text-[10px] hidden sm:inline-flex">
                    {data.gradeLevel}
                  </Badge>
                )}
              </div>
              <p className="text-xs sm:text-sm text-blue-100 font-medium">
                {data.userEmail || "Your personalized learning dashboard"} • Ready to continue?
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 relative z-10 shrink-0">
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-white/20 shadow-sm">
              <Flame className="h-5 w-5 text-amber-300 animate-pulse" />
              <div className="text-left">
                <div className="text-[10px] font-bold uppercase tracking-wider text-blue-200">Learning Streak</div>
                <div className="text-xs font-black text-white">{data.stats.totalHours} hrs Total</div>
              </div>
            </div>

            <Link href="/student/teachers">
              <Button variant="secondary" size="sm" className="bg-white text-slate-900 hover:bg-slate-100 font-bold border-0 shadow-md">
                Find Teachers
              </Button>
            </Link>
          </div>
        </div>

        {/* Statistics Overview Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard
            title="Courses Enrolled"
            value={loading ? "..." : data.stats.enrolledCount}
            subtitle={`${data.stats.completedCoursesCount} courses completed`}
            icon={<BookOpen className="h-5 w-5 text-blue-600" />}
            variant="blue"
          />

          <MetricCard
            title="Upcoming Live Classes"
            value={loading ? "..." : data.stats.upcomingClassesCount}
            subtitle={`${data.stats.completedClassesCount} classes attended`}
            icon={<CalendarCheck className="h-5 w-5 text-emerald-600" />}
            variant="emerald"
          />

          <MetricCard
            title="Course Learning Time"
            value={loading ? "..." : `${data.stats.courseHours} hrs`}
            subtitle="Video lessons completed"
            icon={<Clock className="h-5 w-5 text-purple-600" />}
            variant="purple"
          />

          <MetricCard
            title="Live Classroom Time"
            value={loading ? "..." : `${data.stats.liveClassHours} hrs`}
            subtitle={`Total: ${data.stats.totalHours} hours`}
            icon={<Video className="h-5 w-5 text-amber-500" />}
            variant="amber"
          />
        </div>

        {/* Continue Learning & Upcoming Classes Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Continue Learning Card */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black text-slate-900">
                Continue Learning
              </h3>
              <Link href="/student/courses" className="text-xs font-bold text-blue-600 hover:underline">
                View All Enrolled Courses →
              </Link>
            </div>

            {loading ? (
              <Card className="p-8 text-center bg-white border border-slate-200">
                <Loader2 className="h-8 w-8 text-blue-600 animate-spin mx-auto" />
              </Card>
            ) : !data.continueLearning ? (
              <Card className="p-8 text-center space-y-3 bg-white border-2 border-dashed border-slate-200 shadow-sm rounded-3xl">
                <BookOpen className="h-10 w-10 text-slate-300 mx-auto" />
                <div className="text-sm font-bold text-slate-700">
                  No active course progress yet
                </div>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Enroll in self-paced video courses or explore verified teacher lessons to begin learning.
                </p>
                <div className="pt-2 flex justify-center gap-3">
                  <Link href="/courses">
                    <Button variant="primary" size="sm">
                      Browse Course Catalog
                    </Button>
                  </Link>
                  <Link href="/student/teachers">
                    <Button variant="outline" size="sm">
                      Find Live Tutors
                    </Button>
                  </Link>
                </div>
              </Card>
            ) : (
              <Card className="p-6 space-y-5 border-l-4 border-l-blue-600 shadow-md bg-white rounded-3xl border border-slate-200">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <span className="text-[11px] font-extrabold uppercase text-blue-600 tracking-wider">
                      Active In-Progress Course
                    </span>
                    <h4 className="text-lg font-extrabold text-slate-900">
                      {data.continueLearning.title}
                    </h4>
                    <p className="text-xs text-slate-500">
                      Educator: {data.continueLearning.teacherName}
                    </p>
                  </div>
                  <Badge variant="student" className="w-fit">
                    {data.continueLearning.progressPercent}% Complete
                  </Badge>
                </div>

                {/* Progress Bar */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-600">
                    <span>
                      {data.continueLearning.completedLessons} of {data.continueLearning.totalLessons} Lessons
                    </span>
                    <span>{data.continueLearning.progressPercent}%</span>
                  </div>
                  <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-600 rounded-full transition-all duration-500"
                      style={{ width: `${data.continueLearning.progressPercent}%` }}
                    />
                  </div>
                </div>

                {/* Last Lesson Details */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-4">
                  <div className="space-y-0.5 min-w-0">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">NEXT UP</div>
                    <div className="text-sm font-extrabold text-slate-900 truncate">
                      {data.continueLearning.lastLessonTitle}
                    </div>
                  </div>

                  <Link href={`/learn/${data.continueLearning.courseSlug}`} className="shrink-0">
                    <Button variant="student" size="sm" leftIcon={<Play className="h-4 w-4" />}>
                      Resume Lesson
                    </Button>
                  </Link>
                </div>
              </Card>
            )}

            {/* Enrolled Courses Mini Cards Grid */}
            {data.enrolledCourses && data.enrolledCourses.length > 0 && (
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Your Course Library ({data.enrolledCourses.length})
                  </h4>
                  <Link href="/student/courses" className="text-xs font-semibold text-blue-600 hover:underline">
                    View All
                  </Link>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {data.enrolledCourses.map((c) => (
                    <Link
                      key={c.enrollmentId}
                      href={`/learn/${c.slug}`}
                      className="group p-3.5 bg-white rounded-2xl border border-slate-200 hover:border-blue-400 hover:shadow-md transition-all flex items-center gap-3"
                    >
                      <div className="w-14 h-14 rounded-xl overflow-hidden bg-slate-100 shrink-0">
                        <img
                          src={c.thumbnailUrl}
                          alt={c.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                      </div>
                      <div className="min-w-0 flex-1 space-y-1">
                        <h5 className="text-xs font-bold text-slate-900 truncate group-hover:text-blue-600 transition-colors">
                          {c.title}
                        </h5>
                        <p className="text-[10px] text-slate-500 truncate">{c.teacherName}</p>
                        <div className="flex items-center justify-between text-[10px] font-semibold text-slate-600">
                          <span>{c.completedLessons}/{c.totalLessons} Lessons</span>
                          <span className="font-bold text-blue-600">{c.progressPercent}%</span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Upcoming Live Classes List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black text-slate-900">
                Upcoming Live Classes
              </h3>
              <Link href="/student/live-classes" className="text-xs font-bold text-blue-600 hover:underline">
                View All Schedule →
              </Link>
            </div>

            <Card className="p-5 space-y-4 border-slate-200 bg-white rounded-3xl shadow-sm">
              {loading ? (
                <div className="p-6 text-center">
                  <Loader2 className="h-6 w-6 text-blue-600 animate-spin mx-auto" />
                </div>
              ) : data.upcomingClasses.length === 0 ? (
                <div className="p-6 text-center space-y-2">
                  <CalendarCheck className="h-8 w-8 text-slate-300 mx-auto" />
                  <p className="text-xs font-semibold text-slate-500">
                    No scheduled live classes coming up.
                  </p>
                  <Link href="/student/teachers" className="inline-block pt-1">
                    <Button variant="outline" size="sm">
                      Find Tutor & Book
                    </Button>
                  </Link>
                </div>
              ) : (
                data.upcomingClasses.map((item) => (
                  <div
                    key={item.bookingId}
                    className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3 hover:border-slate-300 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="text-sm font-extrabold text-slate-900">
                          {item.title}
                        </h4>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {item.teacherName} • {item.subject}
                        </p>
                      </div>
                      <Badge variant={item.canJoin ? "success" : "outline"} size="sm">
                        {item.canJoin ? "Live Join Ready" : "Scheduled"}
                      </Badge>
                    </div>

                    <div className="text-xs text-slate-500 font-medium flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      {new Date(item.startTime).toLocaleDateString(undefined, {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>

                    {item.canJoin ? (
                      <Link href={`/classroom/${item.sessionId || item.slotId}`}>
                        <Button variant="primary" size="sm" className="w-full bg-emerald-600 hover:bg-emerald-700">
                          Join Live Classroom
                        </Button>
                      </Link>
                    ) : (
                      <Button variant="outline" size="sm" disabled className="w-full text-xs">
                        Opens 15m before start
                      </Button>
                    )}
                  </div>
                ))
              )}
            </Card>

            {/* Recent Activity Card */}
            {data.recentActivity && data.recentActivity.length > 0 && (
              <Card className="p-5 space-y-3 border-slate-200 bg-white rounded-3xl shadow-sm">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  Recent Learning Activity
                </h4>
                <div className="space-y-2.5">
                  {data.recentActivity.map((act) => (
                    <div key={act.id} className="text-xs flex items-start gap-2.5 pb-2 border-b border-slate-100 last:border-0 last:pb-0">
                      <div className="p-1 rounded-lg bg-blue-50 text-blue-600 mt-0.5 shrink-0">
                        {act.type === "LESSON_COMPLETED" ? (
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        ) : act.type === "CLASS_BOOKED" ? (
                          <CalendarCheck className="w-3.5 h-3.5" />
                        ) : (
                          <BookOpen className="w-3.5 h-3.5" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-slate-800 truncate">{act.title}</p>
                        <p className="text-[10px] text-slate-400">{act.subtitle}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>
        </div>

        {/* Quick Actions & Navigation Shortcuts */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
          <Card className="space-y-3 p-5 bg-white border border-slate-200 rounded-3xl hover:shadow-md transition-all">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Discovery</span>
              <Search className="h-4 w-4 text-blue-600" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Find Teachers</h3>
            <p className="text-xs text-slate-500">Search verified educators, view qualifications, and book sessions.</p>
            <Link href="/student/teachers" className="block pt-1">
              <Button variant="secondary" size="sm" className="w-full">
                Browse Teachers
              </Button>
            </Link>
          </Card>

          <Card className="space-y-3 p-5 bg-white border border-slate-200 rounded-3xl hover:shadow-md transition-all">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Live Classes</span>
              <Video className="h-4 w-4 text-emerald-600" />
            </div>
            <h3 className="text-base font-bold text-slate-900">My Live Schedule</h3>
            <p className="text-xs text-slate-500">View upcoming, today's, and completed video classrooms.</p>
            <Link href="/student/live-classes" className="block pt-1">
              <Button variant="outline" size="sm" className="w-full">
                View Classes
              </Button>
            </Link>
          </Card>

          <Card className="space-y-3 p-5 bg-white border border-slate-200 rounded-3xl hover:shadow-md transition-all">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Course Library</span>
              <BookOpen className="h-4 w-4 text-purple-600" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Enrolled Courses</h3>
            <p className="text-xs text-slate-500">Access video lessons, track progress, and resume learning.</p>
            <Link href="/student/courses" className="block pt-1">
              <Button variant="outline" size="sm" className="w-full">
                My Courses
              </Button>
            </Link>
          </Card>

          <Card className="space-y-3 p-5 bg-white border border-slate-200 rounded-3xl hover:shadow-md transition-all">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Finance</span>
              <CreditCard className="h-4 w-4 text-amber-500" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Payment Invoices</h3>
            <p className="text-xs text-slate-500">Review purchases, receipts, and Cashfree transactions.</p>
            <Link href="/student/payments" className="block pt-1">
              <Button variant="outline" size="sm" className="w-full">
                Billing Receipts
              </Button>
            </Link>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
