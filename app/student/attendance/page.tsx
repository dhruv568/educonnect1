"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MetricCard } from "@/components/analytics/metric-card";
import {
  CalendarCheck,
  Video,
  Clock,
  CheckCircle2,
  BookOpen,
  Award,
  Loader2,
  Search,
  UserCheck,
} from "lucide-react";
import { BackButton } from "@/components/ui/back-button";
import { BackToHomeButton } from "@/components/ui/back-to-home-button";

export default function StudentAttendancePage() {
  const [data, setData] = useState<{
    stats: {
      totalBooked: number;
      attendedCount: number;
      liveClassHours: number;
      attendanceRatePercent: number;
      completedLessonsCount: number;
    };
    attendances: any[];
    lessonLogs: any[];
  }>({
    stats: {
      totalBooked: 0,
      attendedCount: 0,
      liveClassHours: 0,
      attendanceRatePercent: 100,
      completedLessonsCount: 0,
    },
    attendances: [],
    lessonLogs: [],
  });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"LIVE" | "COURSES">("LIVE");
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchAttendance();
  }, []);

  const fetchAttendance = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/student/attendance", { cache: "no-store" });
      const json = await res.json();
      if (res.ok && json.data) {
        setData(json.data);
      }
    } catch (err) {
      console.error("Failed to load attendance records:", err);
    } finally {
      setLoading(false);
    }
  };

  const filteredAttendances = data.attendances.filter((a) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (a.slotTitle || "").toLowerCase().includes(q) ||
      (a.teacherName || "").toLowerCase().includes(q) ||
      (a.subject || "").toLowerCase().includes(q)
    );
  });

  const filteredLessonLogs = data.lessonLogs.filter((l) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (l.courseTitle || "").toLowerCase().includes(q) ||
      (l.lessonTitle || "").toLowerCase().includes(q)
    );
  });

  return (
    <DashboardLayout role="STUDENT" userName="Learner">
      <div className="space-y-6 pb-16">
        {/* Header Title Banner */}
        <div className="bg-gradient-to-r from-[#0B4F4B] via-[#073F3C] to-[#042826] text-white rounded-3xl p-6 lg:p-8 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden">
          <div className="space-y-2 relative z-10">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-xs font-bold text-teal-200 border border-white/20 uppercase tracking-wider">
                Classroom Attendance Tracker
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight flex items-center gap-3">
              <CalendarCheck className="w-8 h-8 text-teal-300 shrink-0" />
              Live Class & Course Attendance
            </h1>
            <p className="text-xs sm:text-sm text-teal-100 max-w-xl">
              Track your WebRTC live classroom session participation, duration spent in interactive classes, and lesson completion milestones.
            </p>
          </div>

          <div className="flex items-center gap-2.5 relative z-10 shrink-0">
            <BackButton fallbackUrl="/student/dashboard" label="Back to Dashboard" variant="dark" />
            <BackToHomeButton variant="dark" />
          </div>
        </div>

        {/* Attendance Metric Cards Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard
            title="Classes Attended"
            value={loading ? "..." : `${data.stats.attendedCount} / ${data.stats.totalBooked}`}
            subtitle="Verified live sessions"
            icon={<UserCheck className="h-5 w-5 text-emerald-600" />}
            variant="emerald"
          />

          <MetricCard
            title="Live Learning Time"
            value={loading ? "..." : `${data.stats.liveClassHours} hrs`}
            subtitle="Total session duration"
            icon={<Clock className="h-5 w-5 text-[#0B4F4B]" />}
            variant="blue"
          />

          <MetricCard
            title="Attendance Rate"
            value={loading ? "..." : `${data.stats.attendanceRatePercent}%`}
            subtitle="Punctuality percentage"
            icon={<CalendarCheck className="h-5 w-5 text-amber-500" />}
            variant="amber"
          />

          <MetricCard
            title="Lessons Completed"
            value={loading ? "..." : data.stats.completedLessonsCount}
            subtitle="On-demand LMS milestones"
            icon={<BookOpen className="h-5 w-5 text-purple-600" />}
            variant="purple"
          />
        </div>

        {/* Tab Selection & Search Toolbar */}
        <Card className="p-4 border-slate-200 bg-white rounded-3xl shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-2xl w-full sm:w-auto">
            <button
              onClick={() => setActiveTab("LIVE")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === "LIVE"
                  ? "bg-[#0B4F4B] text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Live Class Sessions ({data.attendances.length})
            </button>
            <button
              onClick={() => setActiveTab("COURSES")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === "COURSES"
                  ? "bg-[#0B4F4B] text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Course Lesson Logs ({data.lessonLogs.length})
            </button>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by topic or educator..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-900 placeholder-slate-400 outline-none focus:ring-2 focus:ring-[#0B4F4B]"
            />
          </div>
        </Card>

        {/* Tab Content Display */}
        {loading ? (
          <Card className="p-12 text-center bg-white border border-slate-200 rounded-3xl">
            <Loader2 className="h-8 w-8 text-[#0B4F4B] animate-spin mx-auto mb-3" />
            <p className="text-xs text-slate-500 font-bold">Loading attendance records...</p>
          </Card>
        ) : activeTab === "LIVE" ? (
          filteredAttendances.length === 0 ? (
            <Card className="p-16 text-center space-y-3 bg-white border border-slate-200 rounded-3xl shadow-sm">
              <Video className="w-12 h-12 text-slate-300 mx-auto" />
              <h3 className="text-base font-bold text-slate-800">No live class attendance logs</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Join scheduled WebRTC video classrooms to record your live session attendance history.
              </p>
              <Link href="/student/live-classes" className="inline-block pt-2">
                <Button variant="outline" size="sm">
                  View Live Schedule
                </Button>
              </Link>
            </Card>
          ) : (
            <Card className="p-0 border-slate-200 overflow-hidden rounded-3xl shadow-xs bg-white">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-600 font-extrabold uppercase border-b border-slate-200">
                    <tr>
                      <th className="p-4">Session Title</th>
                      <th className="p-4">Educator & Subject</th>
                      <th className="p-4">Joined Time</th>
                      <th className="p-4">Duration</th>
                      <th className="p-4 text-right">Attendance Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredAttendances.map((a) => (
                      <tr key={a.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-4 font-extrabold text-slate-900 truncate max-w-[220px]">
                          {a.slotTitle}
                        </td>
                        <td className="p-4 text-slate-700 font-medium">
                          {a.teacherName} • <span className="text-slate-500">{a.subject}</span>
                        </td>
                        <td className="p-4 text-slate-600">
                          {new Date(a.joinedAt).toLocaleString(undefined, {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>
                        <td className="p-4 font-bold text-slate-900">
                          {a.durationMinutes} mins
                        </td>
                        <td className="p-4 text-right">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                              a.status === "PRESENT"
                                ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                                : a.status === "PARTIAL"
                                ? "bg-amber-100 text-amber-800 border border-amber-200"
                                : "bg-red-100 text-red-800 border border-red-200"
                            }`}
                          >
                            {a.status === "PRESENT" && <CheckCircle2 className="w-3 h-3" />}
                            {a.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )
        ) : filteredLessonLogs.length === 0 ? (
          <Card className="p-16 text-center space-y-3 bg-white border border-slate-200 rounded-3xl shadow-sm">
            <BookOpen className="w-12 h-12 text-slate-300 mx-auto" />
            <h3 className="text-base font-bold text-slate-800">No course lesson completion logs</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Complete course video lessons to record your progress milestones here.
            </p>
          </Card>
        ) : (
          <Card className="p-0 border-slate-200 overflow-hidden rounded-3xl shadow-xs bg-white">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-600 font-extrabold uppercase border-b border-slate-200">
                  <tr>
                    <th className="p-4">Lesson Title</th>
                    <th className="p-4">Course Name</th>
                    <th className="p-4">Completion Date</th>
                    <th className="p-4 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredLessonLogs.map((l) => (
                    <tr key={l.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-4 font-extrabold text-slate-900 truncate max-w-[220px]">
                        {l.lessonTitle}
                      </td>
                      <td className="p-4 text-slate-700 font-medium">
                        {l.courseTitle}
                      </td>
                      <td className="p-4 text-slate-600">
                        {new Date(l.completedAt).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </td>
                      <td className="p-4 text-right">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3" />
                          COMPLETED
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
