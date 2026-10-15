"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MetricCard } from "@/components/analytics/metric-card";
import { BackButton } from "@/components/ui/back-button";
import {
  Video,
  Calendar,
  Clock,
  CheckCircle2,
  CalendarCheck,
  AlertCircle,
  ArrowRight,
  Loader2,
  Sparkles,
  Users,
  User,
  GraduationCap,
  ExternalLink,
} from "lucide-react";

export default function StudentLiveClassesPage() {
  const [activeTab, setActiveTab] = useState<"upcoming" | "today" | "completed">("upcoming");
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{
    stats: {
      total: number;
      upcomingCount: number;
      todayCount: number;
      completedCount: number;
    };
    upcoming: any[];
    today: any[];
    completed: any[];
    all: any[];
  }>({
    stats: {
      total: 0,
      upcomingCount: 0,
      todayCount: 0,
      completedCount: 0,
    },
    upcoming: [],
    today: [],
    completed: [],
    all: [],
  });

  const fetchLiveClasses = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/student/live-classes");
      const json = await res.json();
      if (json.success && json.data) {
        setData(json.data);
      }
    } catch (err) {
      console.error("Failed to load student live classes:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLiveClasses();
  }, []);

  const currentList =
    activeTab === "upcoming"
      ? data.upcoming
      : activeTab === "today"
      ? data.today
      : data.completed;

  return (
    <DashboardLayout role="STUDENT">
      <div className="space-y-6 pb-16">
        <BackButton
          fallbackUrl="/student/dashboard"
          label="Back to Dashboard"
          variant="default"
        />

        {/* Header Banner */}
        <div className="bg-gradient-to-r from-blue-700 via-blue-800 to-indigo-900 text-white rounded-3xl p-6 lg:p-8 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-white text-[11px] font-bold uppercase tracking-wider mb-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" /> Interactive Video Classrooms
            </div>
            <h1 className="text-2xl lg:text-3xl font-black tracking-tight">
              My Live Classes
            </h1>
            <p className="text-xs sm:text-sm text-blue-100 font-medium">
              Join real-time classrooms with HD video, interactive whiteboard, live chat, and screen share.
            </p>
          </div>

          <Link href="/student/teachers">
            <Button
              variant="secondary"
              size="sm"
              className="bg-white text-slate-900 hover:bg-slate-100 font-bold shadow-md shrink-0"
              leftIcon={<GraduationCap className="w-4 h-4 text-blue-600" />}
            >
              Book New Session
            </Button>
          </Link>
        </div>

        {/* Live Classes Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard
            title="Upcoming Classes"
            value={loading ? "..." : data.stats.upcomingCount}
            subtitle="Scheduled future sessions"
            icon={<Calendar className="h-5 w-5 text-blue-600" />}
            variant="blue"
          />

          <MetricCard
            title="Today's Classes"
            value={loading ? "..." : data.stats.todayCount}
            subtitle="Happening today"
            icon={<Clock className="h-5 w-5 text-sky-600" />}
            variant="blue"
          />

          <MetricCard
            title="Completed Sessions"
            value={loading ? "..." : data.stats.completedCount}
            subtitle="Classes attended or finished"
            icon={<CheckCircle2 className="h-5 w-5 text-blue-600" />}
            variant="blue"
          />

          <MetricCard
            title="Total Bookings"
            value={loading ? "..." : data.stats.total}
            subtitle="All lifetime reservations"
            icon={<Video className="h-5 w-5 text-amber-500" />}
            variant="amber"
          />
        </div>

        {/* Tabs & Class List Section */}
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
            <div className="flex gap-2">
              <button
                onClick={() => setActiveTab("upcoming")}
                className={`px-4 py-2 text-xs font-extrabold rounded-xl transition-all ${
                  activeTab === "upcoming"
                    ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                    : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
                }`}
              >
                Upcoming Classes ({data.stats.upcomingCount})
              </button>

              <button
                onClick={() => setActiveTab("today")}
                className={`px-4 py-2 text-xs font-extrabold rounded-xl transition-all ${
                  activeTab === "today"
                    ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                    : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
                }`}
              >
                Today's Classes ({data.stats.todayCount})
              </button>

              <button
                onClick={() => setActiveTab("completed")}
                className={`px-4 py-2 text-xs font-extrabold rounded-xl transition-all ${
                  activeTab === "completed"
                    ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                    : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
                }`}
              >
                Completed Classes ({data.stats.completedCount})
              </button>
            </div>

            <span className="text-xs text-slate-400 font-semibold">
              Join opens 15 minutes before scheduled start time
            </span>
          </div>

          {/* Cards List */}
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="p-6 bg-white rounded-3xl border border-slate-200 animate-pulse space-y-3">
                  <div className="h-4 bg-slate-200 rounded w-1/3" />
                  <div className="h-3 bg-slate-100 rounded w-1/4" />
                  <div className="h-10 bg-slate-100 rounded-xl" />
                </Card>
              ))}
            </div>
          ) : currentList.length === 0 ? (
            <Card className="p-12 text-center bg-white rounded-3xl border-2 border-dashed border-slate-200 space-y-4">
              <CalendarCheck className="w-12 h-12 text-slate-300 mx-auto" />
              <h3 className="text-lg font-bold text-slate-800">
                {activeTab === "upcoming"
                  ? "No upcoming live classes scheduled"
                  : activeTab === "today"
                  ? "No live classes scheduled for today"
                  : "No completed live classes yet"}
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {activeTab === "upcoming" || activeTab === "today"
                  ? "Book private 1-on-1 tutoring or join cohort live classes with our verified educators."
                  : "Classes you attend will appear here with attendance history."}
              </p>
              <Link href="/student/teachers" className="inline-block pt-1">
                <Button variant="student" size="sm">
                  Find Educators & Book Session
                </Button>
              </Link>
            </Card>
          ) : (
            <div className="space-y-4">
              {currentList.map((item) => (
                <Card
                  key={item.bookingId}
                  className={`p-6 bg-white rounded-3xl border transition-all space-y-4 shadow-sm hover:shadow-md ${
                    item.isLiveNow
                      ? "border-emerald-500 ring-2 ring-emerald-500/20"
                      : item.canJoin
                      ? "border-blue-400 ring-2 ring-blue-500/10"
                      : "border-slate-200"
                  }`}
                >
                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    {/* Class & Educator Details */}
                    <div className="flex items-start gap-4 min-w-0 flex-1">
                      {item.teacher.avatarUrl ? (
                        <img
                          src={item.teacher.avatarUrl}
                          alt={item.teacher.name}
                          className="w-14 h-14 rounded-2xl object-cover ring-2 ring-slate-100 shrink-0"
                        />
                      ) : (
                        <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 font-black text-lg flex items-center justify-center shrink-0">
                          {item.teacher.name.charAt(0)}
                        </div>
                      )}

                      <div className="space-y-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-base font-extrabold text-slate-900 truncate">
                            {item.title}
                          </h3>
                          <Badge
                            variant={
                              item.isLiveNow
                                ? "success"
                                : item.canJoin
                                ? "student"
                                : item.slotStatus === "COMPLETED" || item.bookingStatus === "ATTENDED"
                                ? "outline"
                                : "secondary"
                            }
                            size="sm"
                          >
                            {item.isLiveNow
                              ? "🔴 Live in Progress"
                              : item.canJoin
                              ? "Ready to Join"
                              : item.slotStatus === "COMPLETED" || item.bookingStatus === "ATTENDED"
                              ? "Completed"
                              : "Scheduled"}
                          </Badge>
                          <Badge variant="outline" size="sm">
                            {item.level}
                          </Badge>
                        </div>

                        <p className="text-xs text-slate-500">
                          Educator: <strong className="text-slate-700">{item.teacher.name}</strong> • {item.subject}
                        </p>

                        <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 font-semibold pt-1">
                          <span className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-blue-500" />
                            {new Date(item.startTime).toLocaleDateString(undefined, {
                              weekday: "short",
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </span>
                          <span className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-indigo-500" />
                            {new Date(item.startTime).toLocaleTimeString(undefined, {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}{" "}
                            -{" "}
                            {new Date(item.endTime).toLocaleTimeString(undefined, {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}{" "}
                            ({item.durationMinutes}m)
                          </span>
                          <span className="flex items-center gap-1 text-slate-400">
                            {item.classType === "ONE_TO_ONE" ? (
                              <>
                                <User className="w-3 h-3" /> 1-on-1 Session
                              </>
                            ) : (
                              <>
                                <Users className="w-3 h-3" /> Group Cohort
                              </>
                            )}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Join CTA or Status */}
                    <div className="w-full md:w-auto flex flex-col items-stretch md:items-end gap-2 shrink-0">
                      {item.canJoin ? (
                        <Link href={item.meetingUrl} className="w-full md:w-auto">
                          <Button
                            variant="student"
                            size="md"
                            className="w-full md:w-48 bg-[#2563EB] hover:bg-[#1E40AF] text-white font-black shadow-lg shadow-blue-600/20 animate-bounce-subtle"
                            rightIcon={<ExternalLink className="w-4 h-4" />}
                          >
                            Join Live Classroom
                          </Button>
                        </Link>
                      ) : activeTab === "completed" || item.slotStatus === "COMPLETED" ? (
                        <Button variant="outline" size="sm" disabled className="w-full md:w-44 text-xs text-slate-400">
                          <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-500" /> Session Finished
                        </Button>
                      ) : (
                        <div className="text-center md:text-right space-y-1">
                          <Button variant="outline" size="sm" disabled className="w-full md:w-44 text-xs font-semibold text-slate-400">
                            Opens 15m before start
                          </Button>
                          {item.minutesUntilStart > 0 && item.minutesUntilStart < 1440 && (
                            <p className="text-[10px] text-slate-400 font-medium">
                              Starts in ~{Math.floor(item.minutesUntilStart / 60) > 0 ? `${Math.floor(item.minutesUntilStart / 60)}h ` : ""}{item.minutesUntilStart % 60}m
                            </p>
                          )}
                        </div>
                      )}
                    </div>
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
