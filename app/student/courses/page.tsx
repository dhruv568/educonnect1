"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MetricCard } from "@/components/analytics/metric-card";
import { BackButton } from "@/components/ui/back-button";
import {
  BookOpen,
  PlayCircle,
  CheckCircle2,
  Clock,
  ArrowRight,
  Sparkles,
  Award,
  Search,
  RotateCcw,
  Loader2,
  GraduationCap,
} from "lucide-react";

export default function StudentCoursesDashboardPage() {
  const [enrolledCourses, setEnrolledCourses] = useState<any[]>([]);
  const [continueLearning, setContinueLearning] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [filterTab, setFilterTab] = useState<"all" | "in_progress" | "completed">("all");
  const [searchQuery, setSearchQuery] = useState("");

  const fetchEnrolledCourses = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/student/courses");
      const data = await res.json();
      if (data.success && data.data) {
        setEnrolledCourses(data.data.enrolledCourses || []);
        setContinueLearning(data.data.continueLearning || null);
      }
    } catch (err) {
      console.error("Failed to fetch student enrolled courses:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEnrolledCourses();
  }, []);

  // Stats calculation
  const totalCount = enrolledCourses.length;
  const completedCount = enrolledCourses.filter(
    (c) => c.status === "COMPLETED" || c.progressPercent === 100
  ).length;
  const inProgressCount = totalCount - completedCount;
  const totalLessonsDone = enrolledCourses.reduce(
    (acc, c) => acc + (c.completedLessons || 0),
    0
  );

  // Filtered courses
  const filteredCourses = useMemo(() => {
    return enrolledCourses.filter((item) => {
      const matchesSearch =
        item.course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.course.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.course.teacherName.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      if (filterTab === "in_progress") {
        return item.status !== "COMPLETED" && item.progressPercent < 100;
      }
      if (filterTab === "completed") {
        return item.status === "COMPLETED" || item.progressPercent === 100;
      }
      return true;
    });
  }, [enrolledCourses, filterTab, searchQuery]);

  return (
    <DashboardLayout role="STUDENT">
      <div className="space-y-6 pb-16">
        <BackButton
          fallbackUrl="/student/dashboard"
          label="Back to Dashboard"
          variant="default"
        />

        {/* Top Header Banner */}
        <div className="bg-gradient-to-r from-blue-700 via-blue-800 to-indigo-900 text-white rounded-3xl p-6 lg:p-8 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-white text-[11px] font-bold uppercase tracking-wider mb-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" /> Self-Paced Video Academy
            </div>
            <h1 className="text-2xl lg:text-3xl font-black tracking-tight">
              Enrolled Courses
            </h1>
            <p className="text-xs sm:text-sm text-blue-100 font-medium">
              Access all your registered video curriculums, review lecture notes, and track your milestone progress.
            </p>
          </div>

          <Link href="/courses" className="shrink-0">
            <Button
              variant="secondary"
              size="md"
              leftIcon={<BookOpen className="w-4 h-4 text-blue-600" />}
              className="bg-white text-slate-900 hover:bg-slate-100 font-bold shadow-lg border border-white/40 px-5 py-2.5 rounded-2xl whitespace-nowrap"
            >
              Explore Course Catalog
            </Button>
          </Link>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard
            title="Total Enrolled"
            value={loading ? "..." : totalCount}
            subtitle="Registered courses"
            icon={<BookOpen className="h-5 w-5 text-blue-600" />}
            variant="blue"
          />

          <MetricCard
            title="In Progress"
            value={loading ? "..." : inProgressCount}
            subtitle="Active learning tracks"
            icon={<Clock className="h-5 w-5 text-sky-600" />}
            variant="blue"
          />

          <MetricCard
            title="Completed Courses"
            value={loading ? "..." : completedCount}
            subtitle="100% finished courses"
            icon={<CheckCircle2 className="h-5 w-5 text-blue-600" />}
            variant="blue"
          />

          <MetricCard
            title="Lessons Completed"
            value={loading ? "..." : totalLessonsDone}
            subtitle="Video lessons watched"
            icon={<Award className="h-5 w-5 text-amber-500" />}
            variant="amber"
          />
        </div>

        {/* Continue Learning Featured Hero Card */}
        {continueLearning && (
          <Card className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-blue-950 via-slate-900 to-indigo-950 text-white border-0 shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-3 max-w-xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-white text-[10px] font-bold uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5 text-amber-300" /> Resume Where You Left Off
              </div>

              <h2 className="text-xl sm:text-2xl font-black text-white">
                {continueLearning.course.title}
              </h2>

              {continueLearning.currentLesson && (
                <div className="flex items-center gap-2 text-xs font-semibold text-blue-200">
                  <PlayCircle className="w-4 h-4 text-blue-300" />
                  <span>Current Lesson: {continueLearning.currentLesson.title}</span>
                </div>
              )}

              {/* Progress Bar */}
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between text-xs font-bold text-blue-100">
                  <span>
                    {continueLearning.completedLessons} of {continueLearning.totalLessons} lessons complete
                  </span>
                  <span className="font-extrabold text-white">
                    {continueLearning.progressPercent}%
                  </span>
                </div>
                <div className="w-full h-2.5 rounded-full bg-white/20 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-400 to-indigo-300 rounded-full transition-all duration-500"
                    style={{ width: `${continueLearning.progressPercent}%` }}
                  />
                </div>
              </div>
            </div>

            <Link
              href={`/learn/${continueLearning.course.slug}`}
              className="shrink-0"
            >
              <Button
                variant="secondary"
                size="md"
                leftIcon={<PlayCircle className="w-5 h-5 text-blue-600" />}
                className="bg-white text-slate-900 hover:bg-slate-100 font-extrabold shadow-lg px-8 py-3 rounded-2xl whitespace-nowrap"
              >
                Resume Course
              </Button>
            </Link>
          </Card>
        )}

        {/* Filter Tabs & Search Bar */}
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
            <div className="flex gap-2">
              <button
                onClick={() => setFilterTab("all")}
                className={`px-4 py-2 text-xs font-extrabold rounded-xl transition-all ${
                  filterTab === "all"
                    ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                    : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
                }`}
              >
                All Courses ({totalCount})
              </button>

              <button
                onClick={() => setFilterTab("in_progress")}
                className={`px-4 py-2 text-xs font-extrabold rounded-xl transition-all ${
                  filterTab === "in_progress"
                    ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                    : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
                }`}
              >
                In Progress ({inProgressCount})
              </button>

              <button
                onClick={() => setFilterTab("completed")}
                className={`px-4 py-2 text-xs font-extrabold rounded-xl transition-all ${
                  filterTab === "completed"
                    ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                    : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
                }`}
              >
                Completed ({completedCount})
              </button>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Filter your courses..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900 outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Enrolled Courses Grid */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((n) => (
                <Card key={n} className="p-5 rounded-3xl bg-white border border-slate-200 animate-pulse space-y-4">
                  <div className="aspect-video rounded-2xl bg-slate-200" />
                  <div className="h-4 bg-slate-200 rounded w-3/4" />
                  <div className="h-3 bg-slate-100 rounded w-1/2" />
                  <div className="h-2 bg-slate-100 rounded-full" />
                </Card>
              ))}
            </div>
          ) : filteredCourses.length === 0 ? (
            <Card className="p-12 text-center bg-white rounded-3xl border-2 border-dashed border-slate-200 space-y-4">
              <BookOpen className="w-12 h-12 text-slate-300 mx-auto" />
              <h3 className="text-lg font-bold text-slate-800">
                {filterTab === "completed"
                  ? "No completed courses yet"
                  : filterTab === "in_progress"
                  ? "No courses currently in progress"
                  : "No enrolled courses found"}
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {enrolledCourses.length === 0
                  ? "You haven't enrolled in any courses yet. Browse our verified course catalog to start learning."
                  : "No courses match your current search criteria."}
              </p>
              {enrolledCourses.length === 0 ? (
                <Link href="/courses" className="inline-block pt-1">
                  <Button variant="student" size="sm">
                    Browse Course Platform
                  </Button>
                </Link>
              ) : (
                <Button variant="outline" size="sm" onClick={() => { setSearchQuery(""); setFilterTab("all"); }}>
                  Clear Filters
                </Button>
              )}
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCourses.map((item) => (
                <Card
                  key={item.enrollmentId}
                  className="p-5 rounded-3xl bg-white border border-slate-200 hover:border-blue-300 hover:shadow-lg transition-all flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    {/* Thumbnail with Status Overlay */}
                    <div className="relative aspect-video rounded-2xl overflow-hidden bg-slate-100">
                      <img
                        src={item.course.thumbnailUrl || "/images/course-placeholder.jpg"}
                        alt={item.course.title}
                        className="w-full h-full object-cover"
                      />
                      {item.status === "COMPLETED" || item.progressPercent === 100 ? (
                        <div className="absolute top-2.5 right-2.5 px-2.5 py-1 text-[10px] font-extrabold rounded-full bg-emerald-600 text-white shadow-md flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Completed
                        </div>
                      ) : (
                        <div className="absolute top-2.5 right-2.5 px-2.5 py-1 text-[10px] font-extrabold rounded-full bg-blue-600/90 text-white shadow-md backdrop-blur-xs">
                          {item.progressPercent}% Done
                        </div>
                      )}
                      <div className="absolute bottom-2.5 left-2.5 px-2 py-0.5 text-[10px] font-bold rounded-md bg-slate-900/80 text-white backdrop-blur-xs">
                        {item.course.level}
                      </div>
                    </div>

                    {/* Course Title & Teacher */}
                    <div className="space-y-1">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-blue-600">
                        {item.course.subject}
                      </div>
                      <h3 className="text-base font-extrabold text-slate-900 line-clamp-1">
                        {item.course.title}
                      </h3>
                      <p className="text-xs text-slate-500">
                        Instructor: <strong className="text-slate-700">{item.course.teacherName}</strong>
                      </p>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-1.5 pt-1">
                      <div className="flex justify-between text-xs font-semibold text-slate-600">
                        <span>
                          {item.completedLessons} of {item.totalLessons} Lessons
                        </span>
                        <span className="font-extrabold text-blue-600">{item.progressPercent}%</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            item.progressPercent === 100
                              ? "bg-emerald-500"
                              : "bg-blue-600"
                          }`}
                          style={{ width: `${item.progressPercent}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Action Link */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[10px] text-slate-400 font-semibold">
                      Enrolled: {new Date(item.enrolledAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                    </span>

                    <Link href={`/learn/${item.course.slug}`}>
                      <Button
                        variant={item.progressPercent === 100 ? "outline" : "student"}
                        size="sm"
                        rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                      >
                        {item.progressPercent === 100 ? "Review Lessons" : "Continue"}
                      </Button>
                    </Link>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
