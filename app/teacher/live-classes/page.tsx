"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { formatCurrency } from "@/lib/currency";
import { BackButton } from "@/components/ui/back-button";
import {
  Video,
  Plus,
  Calendar as CalendarIcon,
  List as ListIcon,
  Clock,
  Users,
  CheckCircle2,
  XCircle,
  Settings,
  Sparkles,
  Edit,
  Trash2,
  Play,
  Eye,
  ChevronLeft,
  ChevronRight,
  Shield,
  BookOpen,
  Lock,
  ShieldAlert,
  ArrowRight,
  CalendarDays,
} from "lucide-react";

const TIMEZONE = "Asia/Kolkata";

function formatInKolkata(d: Date, options: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat("en-IN", { timeZone: TIMEZONE, ...options }).format(d);
}

function getKolkataDateParts(d: Date) {
  const formatter = new Intl.DateTimeFormat("en-IN", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    hourCycle: "h23",
  });
  const parts = formatter.formatToParts(d);
  const year = parseInt(parts.find((p) => p.type === "year")?.value || "1970");
  const month = parseInt(parts.find((p) => p.type === "month")?.value || "1") - 1;
  const day = parseInt(parts.find((p) => p.type === "day")?.value || "1");
  const hour = parseInt(parts.find((p) => p.type === "hour")?.value || "0");
  const minute = parseInt(parts.find((p) => p.type === "minute")?.value || "0");
  return { year, month, day, hour, minute };
}

function isSameDayKolkata(d1: Date, d2: Date): boolean {
  const p1 = getKolkataDateParts(d1);
  const p2 = getKolkataDateParts(d2);
  return p1.year === p2.year && p1.month === p2.month && p1.day === p2.day;
}

export default function TeacherLiveClassesPage() {
  const router = useRouter();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState("Educator");
  const [userEmail, setUserEmail] = useState("");
  const [verificationStatus, setVerificationStatus] = useState<string>("PENDING");

  const [viewMode, setViewMode] = useState<"CALENDAR" | "LIST">("LIST");
  const [calendarMode, setCalendarMode] = useState<"DAY" | "WEEK" | "MONTH">("WEEK");
  const [currentCalendarDate, setCurrentCalendarDate] = useState<Date>(new Date());
  const [filterStatus, setFilterStatus] = useState<string>("ALL");

  const [stats, setStats] = useState({
    total: 0,
    upcoming: 0,
    today: 0,
    completed: 0,
    cancelled: 0,
  });

  const [slots, setSlots] = useState<any[]>([]);

  // Create Modal Multi-Step State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("Mathematics");
  const [description, setDescription] = useState("");
  const [level, setLevel] = useState("ALL_LEVELS");
  const [language, setLanguage] = useState("English");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("17:00");
  const [endTime, setEndTime] = useState("18:00");
  const [timezone, setTimezone] = useState("Asia/Kolkata");
  const [classType, setClassType] = useState("GROUP");
  const [maxCapacity, setMaxCapacity] = useState(10);
  const [minimumStudents, setMinimumStudents] = useState(1);
  const [price, setPrice] = useState(0);

  // Classroom settings
  const [cameraRequired, setCameraRequired] = useState(true);
  const [micRequired, setMicRequired] = useState(true);
  const [screenSharingAllowed, setScreenSharingAllowed] = useState(true);
  const [whiteboardAllowed, setWhiteboardAllowed] = useState(true);
  const [chatAllowed, setChatAllowed] = useState(true);
  const [fileSharingAllowed, setFileSharingAllowed] = useState(true);

  // Cancel Modal
  const [cancellingSlot, setCancellingSlot] = useState<any>(null);

  const fetchLiveClassesData = async () => {
    setLoading(true);
    try {
      // Fetch onboarding for user info and verification status
      const profileRes = await fetch("/api/teacher/onboarding");
      const profileJson = await profileRes.json();
      if (profileJson.data) {
        setUserName(`${profileJson.data.profile.firstName} ${profileJson.data.profile.lastName}`.trim() || profileJson.data.user.email);
        setUserEmail(profileJson.data.user.email);
        if (profileJson.data.teacherProfile) {
          setVerificationStatus(profileJson.data.teacherProfile.verificationStatus || "PENDING");
        }
      }

      // Fetch live class slots & stats
      const res = await fetch(`/api/teacher/live-classes?status=${filterStatus}`);
      const json = await res.json();
      if (json.success && json.data) {
        setStats(json.data.stats || { total: 0, upcoming: 0, today: 0, completed: 0, cancelled: 0 });
        setSlots(json.data.slots || []);
      }
    } catch (err) {
      console.error("Failed to load live classes:", err);
      showToast("Error", "Could not fetch live class schedule.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLiveClassesData();
  }, [filterStatus]);

  // Calendar Navigation Controls
  const handleCalendarPrev = () => {
    const next = new Date(currentCalendarDate);
    if (calendarMode === "DAY") {
      next.setDate(next.getDate() - 1);
    } else if (calendarMode === "WEEK") {
      next.setDate(next.getDate() - 7);
    } else if (calendarMode === "MONTH") {
      next.setMonth(next.getMonth() - 1);
    }
    setCurrentCalendarDate(next);
  };

  const handleCalendarNext = () => {
    const next = new Date(currentCalendarDate);
    if (calendarMode === "DAY") {
      next.setDate(next.getDate() + 1);
    } else if (calendarMode === "WEEK") {
      next.setDate(next.getDate() + 7);
    } else if (calendarMode === "MONTH") {
      next.setMonth(next.getMonth() + 1);
    }
    setCurrentCalendarDate(next);
  };

  const handleCalendarToday = () => {
    setCurrentCalendarDate(new Date());
  };

  // Calendar Header Title
  const calendarTitle = useMemo(() => {
    if (calendarMode === "DAY") {
      return formatInKolkata(currentCalendarDate, {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      });
    }
    if (calendarMode === "WEEK") {
      const currentDayOfWeek = currentCalendarDate.getDay();
      const start = new Date(currentCalendarDate);
      start.setDate(currentCalendarDate.getDate() - currentDayOfWeek);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      return `${formatInKolkata(start, { day: "numeric", month: "short" })} - ${formatInKolkata(end, {
        day: "numeric",
        month: "short",
        year: "numeric",
      })}`;
    }
    if (calendarMode === "MONTH") {
      return formatInKolkata(currentCalendarDate, {
        month: "long",
        year: "numeric",
      });
    }
    return "";
  }, [calendarMode, currentCalendarDate]);

  // Calculated Days for Week View
  const weekDays = useMemo(() => {
    const currentDayOfWeek = currentCalendarDate.getDay();
    const start = new Date(currentCalendarDate);
    start.setDate(currentCalendarDate.getDate() - currentDayOfWeek);
    start.setHours(0, 0, 0, 0);

    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      days.push(d);
    }
    return days;
  }, [currentCalendarDate]);

  // Calculated Days for Month View Grid
  const monthGridDays = useMemo(() => {
    const year = currentCalendarDate.getFullYear();
    const month = currentCalendarDate.getMonth();
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    const daysInMonth = lastDayOfMonth.getDate();
    const startDayOfWeek = firstDayOfMonth.getDay();

    const prevMonthLastDay = new Date(year, month, 0).getDate();
    const cells: { date: Date; isCurrentMonth: boolean }[] = [];

    // Padding for previous month
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      cells.push({
        date: new Date(year, month - 1, prevMonthLastDay - i),
        isCurrentMonth: false,
      });
    }

    // Days in current month
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({
        date: new Date(year, month, d),
        isCurrentMonth: true,
      });
    }

    // Padding for next month to complete rows of 7
    const totalCells = Math.ceil(cells.length / 7) * 7;
    const nextDaysCount = totalCells - cells.length;
    for (let d = 1; d <= nextDaysCount; d++) {
      cells.push({
        date: new Date(year, month + 1, d),
        isCurrentMonth: false,
      });
    }

    return cells;
  }, [currentCalendarDate]);

  // Handle Create Class Submit
  const handleCreateSubmit = async (publishImmediate: boolean = true) => {
    if (verificationStatus !== "VERIFIED") {
      showToast("Verification Required 🔒", "Only verified educators can create live classes.", "error");
      router.push("/teacher/onboarding");
      return;
    }

    if (!title.trim() || !date || !startTime || !endTime) {
      showToast("Validation Error", "Title, date, start time, and end time are required.", "error");
      return;
    }

    const startDateTimeStr = `${date}T${startTime}:00`;
    const endDateTimeStr = `${date}T${endTime}:00`;

    setSubmitting(true);
    try {
      const res = await fetch("/api/teacher/live-classes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          subject,
          description,
          level,
          language,
          startTime: startDateTimeStr,
          endTime: endDateTimeStr,
          timezone,
          classType,
          maxCapacity: Number(maxCapacity),
          minimumStudents: Number(minimumStudents),
          price: Number(price),
          status: publishImmediate ? "SCHEDULED" : "DRAFT",
          cameraRequired,
          micRequired,
          screenSharingAllowed,
          whiteboardAllowed,
          chatAllowed,
          fileSharingAllowed,
        }),
      });

      const json = await res.json();
      if (json.success) {
        showToast("Success", "Live class created successfully.", "success");
        setShowCreateModal(false);
        resetForm();
        fetchLiveClassesData();
      } else {
        showToast("Error", json.error || "Failed to create live class.", "error");
      }
    } catch (err: any) {
      showToast("Error", err.message || "Failed to submit live class.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleStartClassroom = async (slotId: string) => {
    if (verificationStatus !== "VERIFIED") {
      showToast("Verification Required 🔒", "Only verified educators can host live classrooms.", "error");
      router.push("/teacher/onboarding");
      return;
    }

    try {
      const res = await fetch(`/api/teacher/live-classes/${slotId}/start-session`, {
        method: "POST",
      });
      const json = await res.json();
      if (json.success && json.data) {
        router.push(`/classroom/${slotId}`);
      } else {
        showToast("Cannot Enter", json.error || "Class session could not be started.", "error");
      }
    } catch (err) {
      showToast("Error", "Failed to start live classroom.", "error");
    }
  };

  const handleCancelSlot = async () => {
    if (!cancellingSlot) return;
    try {
      const res = await fetch(`/api/teacher/live-classes/${cancellingSlot.id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (json.success) {
        showToast("Cancelled", "Live class has been cancelled.", "info");
        setCancellingSlot(null);
        fetchLiveClassesData();
      } else {
        showToast("Error", json.error || "Failed to cancel live class.", "error");
      }
    } catch (err) {
      showToast("Error", "Failed to cancel live class.", "error");
    }
  };

  const resetForm = (prefillDate?: string) => {
    setStep(1);
    setTitle("");
    setSubject("Mathematics");
    setDescription("");
    setDate(prefillDate || new Date().toISOString().split("T")[0]);
    setStartTime("17:00");
    setEndTime("18:00");
    setPrice(0);
    setMaxCapacity(10);
  };

  const today = new Date();

  return (
    <DashboardLayout role="TEACHER" userName={userName} userEmail={userEmail}>
      <div className="space-y-6">
        {/* Verification Required Banner for Unverified Educators */}
        {verificationStatus !== "VERIFIED" && (
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-center gap-3">
              <ShieldAlert className="h-5 w-5 text-amber-600 shrink-0" />
              <div>
                <h4 className="text-xs font-black text-amber-950">Educator Verification Required for Live Classes</h4>
                <p className="text-[11px] text-amber-800 font-medium">
                  You must be an approved, verified educator to schedule live slots or launch interactive LiveKit classrooms.
                </p>
              </div>
            </div>
            <Link href="/teacher/onboarding" className="shrink-0 w-full sm:w-auto">
              <Button size="sm" variant="secondary" rightIcon={<ArrowRight className="h-3.5 w-3.5" />} className="w-full sm:w-auto text-xs font-bold bg-amber-600 text-white hover:bg-amber-700">
                Complete Verification
              </Button>
            </Link>
          </div>
        )}

        {/* Top Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div>
            <BackButton
              fallbackUrl="/teacher/dashboard"
              label="Back to Dashboard"
              variant="default"
              className="mb-3"
            />
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 flex items-center gap-2">
              <Video className="h-7 w-7 text-blue-600" /> Live Class Slots
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Create and manage your interactive teaching schedule in Asia/Kolkata (IST).
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/teacher/live-classes/availability">
              <Button variant="outline" size="sm" leftIcon={<Settings className="h-4 w-4" />}>
                Availability Settings
              </Button>
            </Link>

            {verificationStatus === "VERIFIED" ? (
              <Button
                onClick={() => {
                  resetForm();
                  setShowCreateModal(true);
                }}
                variant="primary"
                size="sm"
                leftIcon={<Plus className="h-4 w-4" />}
              >
                + Create Live Class
              </Button>
            ) : (
              <Link href="/teacher/onboarding" title="Verification required to schedule live classes">
                <Button
                  variant="outline"
                  size="sm"
                  leftIcon={<Lock className="h-4 w-4 text-amber-600" />}
                  className="bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100 font-bold"
                >
                  🔒 Verification required
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* Metrics Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="space-y-1 border-l-4 border-l-blue-600">
            <div className="text-xs font-semibold text-slate-500 uppercase">Upcoming Classes</div>
            <div className="text-2xl font-black text-slate-900">{stats.upcoming}</div>
            <p className="text-[10px] text-blue-600 font-medium">Scheduled & Bookable</p>
          </Card>

          <Card className="space-y-1 border-l-4 border-l-amber-500">
            <div className="text-xs font-semibold text-slate-500 uppercase">Today's Classes</div>
            <div className="text-2xl font-black text-slate-900">{stats.today}</div>
            <p className="text-[10px] text-amber-600 font-medium">Scheduled Today</p>
          </Card>

          <Card className="space-y-1 border-l-4 border-l-emerald-600">
            <div className="text-xs font-semibold text-slate-500 uppercase">Completed Classes</div>
            <div className="text-2xl font-black text-slate-900">{stats.completed}</div>
            <p className="text-[10px] text-emerald-600 font-medium">Successfully Taught</p>
          </Card>

          <Card className="space-y-1 border-l-4 border-l-rose-500">
            <div className="text-xs font-semibold text-slate-500 uppercase">Cancelled Classes</div>
            <div className="text-2xl font-black text-slate-900">{stats.cancelled}</div>
            <p className="text-[10px] text-rose-500 font-medium">Cancelled Sessions</p>
          </Card>
        </div>

        {/* View Mode & Filter Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setViewMode("LIST")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition ${
                viewMode === "LIST" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-900"
              }`}
            >
              <ListIcon className="h-4 w-4" /> List View
            </button>
            <button
              onClick={() => setViewMode("CALENDAR")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition ${
                viewMode === "CALENDAR" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-900"
              }`}
            >
              <CalendarIcon className="h-4 w-4" /> Calendar View
            </button>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto">
            {["ALL", "SCHEDULED", "OPEN", "LIVE", "COMPLETED", "CANCELLED"].map((st) => (
              <button
                key={st}
                onClick={() => setFilterStatus(st)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-xl border transition whitespace-nowrap ${
                  filterStatus === st
                    ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        {/* Main Content Area */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-32 bg-slate-200/70 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : viewMode === "LIST" ? (
          /* ========================================================================= */
          /* LIST VIEW */
          /* ========================================================================= */
          slots.length === 0 ? (
            <Card className="p-12 text-center space-y-4 border-dashed border-2">
              <Video className="h-12 w-12 text-slate-400 mx-auto" />
              <div>
                <h3 className="text-base font-bold text-slate-800">No Live Classes Found</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                  You haven't scheduled any live classes matching this filter.
                </p>
              </div>
              {verificationStatus === "VERIFIED" ? (
                <Button
                  onClick={() => {
                    resetForm();
                    setShowCreateModal(true);
                  }}
                  variant="primary"
                  size="sm"
                  leftIcon={<Plus className="h-4 w-4" />}
                >
                  Create Your First Live Class
                </Button>
              ) : (
                <Link href="/teacher/onboarding">
                  <Button variant="outline" size="sm" leftIcon={<Lock className="h-4 w-4 text-amber-600" />}>
                    Complete Verification to Schedule
                  </Button>
                </Link>
              )}
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {slots.map((slot) => {
                const isLive = slot.status === "LIVE";
                const isCompleted = slot.status === "COMPLETED";
                const isCancelled = slot.status === "CANCELLED";

                return (
                  <Card
                    key={slot.id}
                    className={`space-y-4 transition hover:shadow-md flex flex-col justify-between ${
                      isLive ? "border-2 border-emerald-500 bg-emerald-50/20" : ""
                    }`}
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="px-2.5 py-1 text-[10px] font-bold uppercase rounded-md bg-blue-100 text-blue-700">
                          {slot.subject}
                        </span>

                        <span
                          className={`px-2.5 py-0.5 text-[10px] font-bold uppercase rounded-full ${
                            isLive
                              ? "bg-rose-500 text-white animate-pulse"
                              : isCompleted
                              ? "bg-slate-100 text-slate-600"
                              : isCancelled
                              ? "bg-rose-100 text-rose-700"
                              : "bg-blue-50 text-blue-600 border border-blue-200"
                          }`}
                        >
                          ● {slot.status}
                        </span>
                      </div>

                      <h3 className="text-base font-bold text-slate-900 line-clamp-2">{slot.title}</h3>

                      <div className="space-y-1.5 text-xs text-slate-600">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-slate-400" />
                          <span>
                            {formatInKolkata(new Date(slot.startTime), {
                              weekday: "short",
                              month: "short",
                              day: "numeric",
                            })}{" "}
                            ({formatInKolkata(new Date(slot.startTime), { hour: "2-digit", minute: "2-digit" })} -{" "}
                            {formatInKolkata(new Date(slot.endTime), { hour: "2-digit", minute: "2-digit" })}{" "}
                            IST)
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-slate-400" />
                          <span>
                            {slot.studentCount || 0} / {slot.maxCapacity} Students Enrolled ({slot.classType})
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                      <Link href={`/teacher/live-classes/${slot.id}`} className="flex-1">
                        <Button variant="outline" size="sm" className="w-full">
                          <Eye className="h-3.5 w-3.5 mr-1" /> View Details
                        </Button>
                      </Link>

                      {!isCompleted && !isCancelled && (
                        <Button
                          onClick={() => handleStartClassroom(slot.id)}
                          variant="primary"
                          size="sm"
                          leftIcon={<Play className="h-3.5 w-3.5" />}
                        >
                          Enter Classroom
                        </Button>
                      )}

                      {!isCompleted && !isCancelled && (
                        <button
                          onClick={() => setCancellingSlot(slot)}
                          className="p-2 rounded-xl text-rose-500 hover:bg-rose-50"
                          title="Cancel Class"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          )
        ) : (
          /* ========================================================================= */
          /* CALENDAR VIEW (DAY / WEEK / MONTH IN ASIA/KOLKATA) */
          /* ========================================================================= */
          <Card className="p-6 space-y-6">
            {/* Calendar Control Toolbar */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 border-b border-slate-100 pb-4">
              {/* Prev / Next / Today Controls & Date Title */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                  <button
                    onClick={handleCalendarPrev}
                    className="p-1.5 rounded-lg hover:bg-white text-slate-600 transition"
                    title="Previous"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    onClick={handleCalendarToday}
                    className="px-3 py-1 rounded-lg text-xs font-bold hover:bg-white text-slate-700 transition"
                  >
                    Today
                  </button>
                  <button
                    onClick={handleCalendarNext}
                    className="p-1.5 rounded-lg hover:bg-white text-slate-600 transition"
                    title="Next"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>

                <div>
                  <h3 className="text-base font-extrabold text-slate-900">{calendarTitle}</h3>
                  <p className="text-[10px] text-slate-400 font-semibold">Indian Standard Time (Asia/Kolkata)</p>
                </div>
              </div>

              {/* Mode Switcher: DAY / WEEK / MONTH */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                {(["DAY", "WEEK", "MONTH"] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setCalendarMode(m)}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
                      calendarMode === m ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    {m === "DAY" ? "Day View" : m === "WEEK" ? "Week View" : "Month View"}
                  </button>
                ))}
              </div>
            </div>

            {/* --------------------------------------------------------------------- */}
            {/* 1. DAY VIEW */}
            {/* --------------------------------------------------------------------- */}
            {calendarMode === "DAY" && (
              <div className="space-y-4">
                <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-100 flex items-center justify-between">
                  <span className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                    <CalendarDays className="h-4 w-4 text-blue-600" />
                    <span>Viewing Schedule for: {formatInKolkata(currentCalendarDate, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</span>
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      resetForm(currentCalendarDate.toISOString().split("T")[0]);
                      setShowCreateModal(true);
                    }}
                    leftIcon={<Plus className="h-3.5 w-3.5" />}
                    className="text-xs font-bold"
                  >
                    Schedule on this Day
                  </Button>
                </div>

                {/* Day hourly schedule list */}
                {(() => {
                  const daySlots = slots.filter((s) => isSameDayKolkata(new Date(s.startTime), currentCalendarDate));
                  if (daySlots.length === 0) {
                    return (
                      <div className="p-12 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50 space-y-2">
                        <Clock className="h-8 w-8 text-slate-300 mx-auto" />
                        <p className="text-xs font-bold text-slate-600">No live classes scheduled for this day.</p>
                        <Button
                          size="sm"
                          variant="primary"
                          onClick={() => {
                            resetForm(currentCalendarDate.toISOString().split("T")[0]);
                            setShowCreateModal(true);
                          }}
                          leftIcon={<Plus className="h-3.5 w-3.5" />}
                          className="mt-2"
                        >
                          Schedule a Class
                        </Button>
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-3">
                      {daySlots
                        .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
                        .map((slot) => {
                          const isLive = slot.status === "LIVE";
                          return (
                            <div
                              key={slot.id}
                              className={`p-4 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition ${
                                isLive ? "bg-emerald-50/30 border-emerald-300" : "bg-white border-slate-200 hover:border-blue-300"
                              }`}
                            >
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-100 text-blue-800 uppercase">
                                    {slot.subject}
                                  </span>
                                  <span
                                    className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                                      isLive ? "bg-rose-500 text-white animate-pulse" : "bg-slate-100 text-slate-700"
                                    }`}
                                  >
                                    ● {slot.status}
                                  </span>
                                </div>
                                <h4 className="text-sm font-extrabold text-slate-900">{slot.title}</h4>
                                <div className="text-xs text-slate-500 flex items-center gap-2">
                                  <Clock className="h-3.5 w-3.5 text-slate-400" />
                                  <span>
                                    {formatInKolkata(new Date(slot.startTime), { hour: "2-digit", minute: "2-digit" })} -{" "}
                                    {formatInKolkata(new Date(slot.endTime), { hour: "2-digit", minute: "2-digit" })} IST
                                  </span>
                                  <span>•</span>
                                  <Users className="h-3.5 w-3.5 text-slate-400" />
                                  <span>{slot.studentCount || 0} / {slot.maxCapacity} Booked</span>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 self-end sm:self-center">
                                <Link href={`/teacher/live-classes/${slot.id}`}>
                                  <Button variant="outline" size="sm">
                                    View Details
                                  </Button>
                                </Link>
                                <Button
                                  variant="primary"
                                  size="sm"
                                  onClick={() => handleStartClassroom(slot.id)}
                                  leftIcon={<Play className="h-3.5 w-3.5" />}
                                >
                                  Enter Classroom
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  );
                })()}
              </div>
            )}

            {/* --------------------------------------------------------------------- */}
            {/* 2. WEEK VIEW */}
            {/* --------------------------------------------------------------------- */}
            {calendarMode === "WEEK" && (
              <div className="space-y-2">
                {/* 7-Day Column Headers with actual dates */}
                <div className="grid grid-cols-7 gap-2 text-center pb-2 border-b border-slate-100">
                  {weekDays.map((dayDate) => {
                    const isCurrentDay = isSameDayKolkata(dayDate, today);
                    return (
                      <div
                        key={dayDate.toISOString()}
                        className={`p-2 rounded-xl transition ${
                          isCurrentDay ? "bg-blue-600 text-white font-black shadow-xs" : "text-slate-600 font-bold"
                        }`}
                      >
                        <div className="text-[11px] uppercase tracking-wider">
                          {formatInKolkata(dayDate, { weekday: "short" })}
                        </div>
                        <div className="text-base font-extrabold">
                          {formatInKolkata(dayDate, { day: "numeric" })}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* 7-Day Slot Columns */}
                <div className="grid grid-cols-7 gap-2 min-h-[380px]">
                  {weekDays.map((dayDate) => {
                    const isCurrentDay = isSameDayKolkata(dayDate, today);
                    const daySlots = slots.filter((s) => isSameDayKolkata(new Date(s.startTime), dayDate));

                    return (
                      <div
                        key={dayDate.toISOString()}
                        className={`rounded-2xl p-2.5 space-y-2 border flex flex-col justify-between ${
                          isCurrentDay
                            ? "bg-blue-50/40 border-blue-200 ring-1 ring-blue-300"
                            : "bg-slate-50/70 border-slate-100 hover:border-slate-200"
                        }`}
                      >
                        <div className="space-y-2">
                          {daySlots.length === 0 ? (
                            <div className="text-[10px] text-slate-400 text-center py-6 italic">
                              No classes
                            </div>
                          ) : (
                            daySlots.map((s) => {
                              const isLive = s.status === "LIVE";
                              return (
                                <div
                                  key={s.id}
                                  onClick={() => router.push(`/teacher/live-classes/${s.id}`)}
                                  className={`p-2 rounded-xl text-left cursor-pointer transition shadow-2xs space-y-1 ${
                                    isLive
                                      ? "bg-emerald-600 text-white ring-2 ring-emerald-300"
                                      : "bg-white text-slate-800 border border-slate-200 hover:border-blue-400"
                                  }`}
                                >
                                  <div className="text-[10px] font-black line-clamp-2 leading-tight">
                                    {s.title}
                                  </div>
                                  <div className={`text-[9px] font-semibold flex items-center gap-1 ${isLive ? "text-emerald-100" : "text-slate-500"}`}>
                                    <Clock className="h-2.5 w-2.5" />
                                    <span>
                                      {formatInKolkata(new Date(s.startTime), { hour: "2-digit", minute: "2-digit" })}
                                    </span>
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>

                        <button
                          onClick={() => {
                            resetForm(dayDate.toISOString().split("T")[0]);
                            setShowCreateModal(true);
                          }}
                          className="w-full py-1 text-[10px] font-extrabold text-slate-400 hover:text-blue-600 hover:bg-white rounded-lg transition text-center"
                          title="Add class on this day"
                        >
                          + Add
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* --------------------------------------------------------------------- */}
            {/* 3. MONTH VIEW */}
            {/* --------------------------------------------------------------------- */}
            {calendarMode === "MONTH" && (
              <div className="space-y-2">
                {/* Day of week headers */}
                <div className="grid grid-cols-7 gap-1 text-center pb-2 border-b border-slate-100 text-[11px] font-black text-slate-500 uppercase">
                  <div>Sun</div>
                  <div>Mon</div>
                  <div>Tue</div>
                  <div>Wed</div>
                  <div>Thu</div>
                  <div>Fri</div>
                  <div>Sat</div>
                </div>

                {/* Monthly 7-column calendar matrix */}
                <div className="grid grid-cols-7 gap-1.5">
                  {monthGridDays.map((cell, idx) => {
                    const isCurrentDay = isSameDayKolkata(cell.date, today);
                    const daySlots = slots.filter((s) => isSameDayKolkata(new Date(s.startTime), cell.date));

                    return (
                      <div
                        key={idx}
                        className={`min-h-[90px] p-2 rounded-xl border flex flex-col justify-between transition ${
                          !cell.isCurrentMonth
                            ? "bg-slate-50/40 text-slate-300 border-slate-100 opacity-60"
                            : isCurrentDay
                            ? "bg-blue-50/50 border-blue-300 ring-2 ring-blue-200"
                            : "bg-white border-slate-100 hover:border-slate-300"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span
                            className={`text-xs font-black ${
                              isCurrentDay
                                ? "w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]"
                                : cell.isCurrentMonth
                                ? "text-slate-800"
                                : "text-slate-400"
                            }`}
                          >
                            {cell.date.getDate()}
                          </span>

                          {daySlots.length > 0 && (
                            <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded-full bg-blue-100 text-blue-800">
                              {daySlots.length}
                            </span>
                          )}
                        </div>

                        {/* Slot Chips */}
                        <div className="space-y-1 my-1 overflow-hidden">
                          {daySlots.slice(0, 2).map((s) => (
                            <div
                              key={s.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                router.push(`/teacher/live-classes/${s.id}`);
                              }}
                              className={`px-1.5 py-0.5 rounded text-[9px] font-bold truncate cursor-pointer transition ${
                                s.status === "LIVE"
                                  ? "bg-rose-500 text-white"
                                  : "bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-100"
                              }`}
                              title={`${s.title} (${formatInKolkata(new Date(s.startTime), { hour: "2-digit", minute: "2-digit" })})`}
                            >
                              {formatInKolkata(new Date(s.startTime), { hour: "2-digit", minute: "2-digit" })} • {s.title}
                            </div>
                          ))}
                          {daySlots.length > 2 && (
                            <div
                              onClick={() => {
                                setCurrentCalendarDate(cell.date);
                                setCalendarMode("DAY");
                              }}
                              className="text-[9px] font-bold text-blue-600 cursor-pointer hover:underline text-center"
                            >
                              +{daySlots.length - 2} more
                            </div>
                          )}
                        </div>

                        <button
                          onClick={() => {
                            resetForm(cell.date.toISOString().split("T")[0]);
                            setShowCreateModal(true);
                          }}
                          className="opacity-0 hover:opacity-100 text-[9px] font-bold text-slate-400 hover:text-blue-600 text-center transition"
                        >
                          +
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </Card>
        )}

        {/* 5-Step Create Live Class Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="relative w-full max-w-2xl bg-white rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-blue-600" /> Create Live Class
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">Step {step} of 5</p>
                </div>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="text-slate-400 hover:text-slate-600 text-lg font-bold"
                >
                  ✕
                </button>
              </div>

              {/* Progress Steps Header */}
              <div className="grid grid-cols-5 gap-2 text-center text-[10px] font-bold">
                {[
                  "1. Basic Info",
                  "2. Schedule",
                  "3. Booking",
                  "4. Classroom",
                  "5. Review",
                ].map((stTitle, idx) => (
                  <div
                    key={idx}
                    className={`py-1.5 rounded-lg transition ${
                      step === idx + 1
                        ? "bg-blue-600 text-white"
                        : step > idx + 1
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-slate-100 text-slate-400"
                    }`}
                  >
                    {stTitle}
                  </div>
                ))}
              </div>

              {/* Step 1: Basic Information */}
              {step === 1 && (
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Class Title *</label>
                    <input
                      type="text"
                      placeholder="e.g. Masterclass on Calculus Integration"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full px-4 py-2.5 text-xs border border-slate-200 rounded-xl outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">Subject *</label>
                      <select
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        className="w-full px-4 py-2.5 text-xs border border-slate-200 rounded-xl outline-none bg-white"
                      >
                        <option value="Mathematics">Mathematics</option>
                        <option value="Physics">Physics</option>
                        <option value="Chemistry">Chemistry</option>
                        <option value="Biology">Biology</option>
                        <option value="Computer Science">Computer Science</option>
                        <option value="English">English</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">Level</label>
                      <select
                        value={level}
                        onChange={(e) => setLevel(e.target.value)}
                        className="w-full px-4 py-2.5 text-xs border border-slate-200 rounded-xl outline-none bg-white"
                      >
                        <option value="ALL_LEVELS">All Levels</option>
                        <option value="BEGINNER">Beginner</option>
                        <option value="INTERMEDIATE">Intermediate</option>
                        <option value="ADVANCED">Advanced</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Description</label>
                    <textarea
                      rows={3}
                      placeholder="Describe what will be covered in this live session..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="w-full px-4 py-2.5 text-xs border border-slate-200 rounded-xl outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              )}

              {/* Step 2: Schedule & Time */}
              {step === 2 && (
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Date *</label>
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full px-4 py-2.5 text-xs border border-slate-200 rounded-xl outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">Start Time (IST) *</label>
                      <input
                        type="time"
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                        className="w-full px-4 py-2.5 text-xs border border-slate-200 rounded-xl outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">End Time (IST) *</label>
                      <input
                        type="time"
                        value={endTime}
                        onChange={(e) => setEndTime(e.target.value)}
                        className="w-full px-4 py-2.5 text-xs border border-slate-200 rounded-xl outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Timezone</label>
                    <input
                      disabled
                      value="Asia/Kolkata (IST - Indian Standard Time)"
                      className="w-full px-4 py-2.5 text-xs border border-slate-200 rounded-xl bg-slate-50 text-slate-500 font-medium cursor-not-allowed"
                    />
                  </div>
                </div>
              )}

              {/* Step 3: Booking & Pricing */}
              {step === 3 && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">Class Type</label>
                      <select
                        value={classType}
                        onChange={(e) => setClassType(e.target.value)}
                        className="w-full px-4 py-2.5 text-xs border border-slate-200 rounded-xl outline-none bg-white"
                      >
                        <option value="GROUP">Group Class</option>
                        <option value="ONE_ON_ONE">1-on-1 Mentorship</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">Price per Seat (₹)</label>
                      <input
                        type="number"
                        min="0"
                        value={price}
                        onChange={(e) => setPrice(Number(e.target.value))}
                        className="w-full px-4 py-2.5 text-xs border border-slate-200 rounded-xl outline-none font-bold"
                      />
                      <span className="text-[10px] text-slate-400">Set 0 for Free class</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">Max Capacity</label>
                      <input
                        type="number"
                        min="1"
                        max="50"
                        value={maxCapacity}
                        onChange={(e) => setMaxCapacity(Number(e.target.value))}
                        className="w-full px-4 py-2.5 text-xs border border-slate-200 rounded-xl outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">Minimum Students</label>
                      <input
                        type="number"
                        min="1"
                        value={minimumStudents}
                        onChange={(e) => setMinimumStudents(Number(e.target.value))}
                        className="w-full px-4 py-2.5 text-xs border border-slate-200 rounded-xl outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Step 4: LiveKit Classroom Settings */}
              {step === 4 && (
                <div className="space-y-3">
                  <p className="text-xs text-slate-500 mb-2">Configure in-class learner permissions and devices:</p>

                  <div className="space-y-2">
                    {[
                      { key: cameraRequired, set: setCameraRequired, label: "Learner Camera Required" },
                      { key: micRequired, set: setMicRequired, label: "Learner Microphone Required" },
                      { key: screenSharingAllowed, set: setScreenSharingAllowed, label: "Learner Screen Sharing Allowed" },
                      { key: whiteboardAllowed, set: setWhiteboardAllowed, label: "Interactive Whiteboard Collaboration" },
                      { key: chatAllowed, set: setChatAllowed, label: "Public & Direct Chat Enabled" },
                      { key: fileSharingAllowed, set: setFileSharingAllowed, label: "In-session File Sharing Allowed" },
                    ].map((item, idx) => (
                      <label key={idx} className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 hover:bg-slate-50 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={item.key}
                          onChange={(e) => item.set(e.target.checked)}
                          className="h-4 w-4 rounded text-blue-600"
                        />
                        <span className="text-xs font-semibold text-slate-700">{item.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Step 5: Review & Publish */}
              {step === 5 && (
                <div className="space-y-4 text-xs">
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                      <span className="font-bold text-slate-900 text-sm">{title || "Untitled Live Class"}</span>
                      <span className="font-mono font-bold text-blue-600">
                        {price === 0 ? "FREE" : formatCurrency(price)}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-slate-600 pt-1">
                      <div>Subject: <strong>{subject}</strong></div>
                      <div>Level: <strong>{level}</strong></div>
                      <div>Date: <strong>{date}</strong></div>
                      <div>Time: <strong>{startTime} - {endTime} (IST)</strong></div>
                      <div>Capacity: <strong>{maxCapacity} Students</strong></div>
                      <div>Class Type: <strong>{classType}</strong></div>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-500">
                    Once published, this slot appears on the live class catalog for learners to enroll.
                  </p>
                </div>
              )}

              {/* Modal Navigation Buttons */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                {step > 1 ? (
                  <Button variant="secondary" size="sm" onClick={() => setStep(step - 1)}>
                    Back
                  </Button>
                ) : (
                  <div />
                )}

                {step < 5 ? (
                  <Button variant="primary" size="sm" onClick={() => setStep(step + 1)}>
                    Next Step
                  </Button>
                ) : (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleCreateSubmit(true)}
                    isLoading={submitting}
                  >
                    Publish Live Class
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Cancel Slot Confirmation Modal */}
        {cancellingSlot && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl">
              <h3 className="text-base font-black text-slate-900">Cancel Live Class?</h3>
              <p className="text-xs text-slate-600">
                Are you sure you want to cancel <strong>"{cancellingSlot.title}"</strong>? Enrolled learners will be notified.
              </p>
              <div className="flex items-center justify-end gap-2 pt-2">
                <Button variant="secondary" size="sm" onClick={() => setCancellingSlot(null)}>
                  Keep Class
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleCancelSlot}
                  className="bg-rose-600 hover:bg-rose-700 text-white"
                >
                  Yes, Cancel
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
