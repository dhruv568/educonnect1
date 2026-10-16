"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { BackButton } from "@/components/ui/back-button";
import {
  Clock,
  Save,
  Plus,
  Trash2,
  Calendar,
  ShieldCheck,
  Ban,
  CheckCircle2,
  AlertCircle,
  Lock,
  Sparkles,
  Info,
  Users,
  Check,
  ChevronLeft,
  ChevronRight,
  User,
  Mail,
  Phone,
  CalendarDays,
  X,
  History,
  Filter,
} from "lucide-react";
import { formatCurrency } from "@/lib/currency";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

interface Availability {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isActive: boolean;
}

interface TeacherBreak {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

interface DateOverride {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  type: "AVAILABLE" | "BLOCKED";
  reason?: string | null;
}

interface SlotItem {
  slotId: string | null;
  time: string;
  startTime: string;
  endTime: string;
  startIso: string;
  endIso: string;
  status: "AVAILABLE" | "BOOKED" | "UNAVAILABLE" | "BLOCKED" | "EXPIRED";
  visualState: "GREEN" | "RED" | "GREY";
  isAvailable: boolean;
  isCurrentStudentBooked?: boolean;
  price: number;
  classType: string;
  maxCapacity: number;
  bookedCount: number;
  reason?: string | null;
}

interface DayAvailability {
  dateStr: string;
  dayName: string;
  displayDate: string;
  fullDate: string;
  dayOfWeek: number;
  isAvailableDay: boolean;
  availableCount: number;
  slots: SlotItem[];
}

interface BookingRecord {
  bookingId: string;
  slotId: string;
  title: string;
  subject: string;
  startTime: string;
  endTime: string;
  startDisplay: string;
  timeDisplay: string;
  status: string;
  slotStatus: string;
  isEnded: boolean;
  price: number;
  student: {
    id: string;
    email: string;
    name: string;
    avatarUrl: string | null;
    phone: string | null;
  };
}

export default function TeacherAvailabilityPage() {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userName, setUserName] = useState("Educator");
  const [userEmail, setUserEmail] = useState("");
  const [timezone, setTimezone] = useState("Asia/Kolkata");
  const [teacherId, setTeacherId] = useState<string | null>(null);

  // Active view tab: "calendar" | "weekly" | "overrides" | "bookings"
  const [activeTab, setActiveTab] = useState<"calendar" | "weekly" | "overrides" | "bookings">("calendar");

  // Weekly availability configuration
  const [availabilities, setAvailabilities] = useState<Availability[]>([
    { dayOfWeek: 1, startTime: "09:00", endTime: "17:00", isActive: true },
    { dayOfWeek: 2, startTime: "09:00", endTime: "17:00", isActive: true },
    { dayOfWeek: 3, startTime: "09:00", endTime: "17:00", isActive: true },
    { dayOfWeek: 4, startTime: "09:00", endTime: "17:00", isActive: true },
    { dayOfWeek: 5, startTime: "09:00", endTime: "17:00", isActive: true },
  ]);

  const [breaks, setBreaks] = useState<TeacherBreak[]>([
    { dayOfWeek: 1, startTime: "13:00", endTime: "14:00" },
    { dayOfWeek: 2, startTime: "13:00", endTime: "14:00" },
    { dayOfWeek: 3, startTime: "13:00", endTime: "14:00" },
    { dayOfWeek: 4, startTime: "13:00", endTime: "14:00" },
    { dayOfWeek: 5, startTime: "13:00", endTime: "14:00" },
  ]);

  const [dateOverrides, setDateOverrides] = useState<DateOverride[]>([]);
  const [allBookings, setAllBookings] = useState<BookingRecord[]>([]);
  const [calendarDays, setCalendarDays] = useState<DayAvailability[]>([]);
  const [selectedDayIdx, setSelectedDayIdx] = useState(0);

  // Modals
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [overrideDate, setOverrideDate] = useState("");
  const [overrideStart, setOverrideStart] = useState("09:00");
  const [overrideEnd, setOverrideEnd] = useState("10:00");
  const [overrideType, setOverrideType] = useState<"AVAILABLE" | "BLOCKED">("BLOCKED");
  const [isFullDay, setIsFullDay] = useState(false);
  const [overrideReason, setOverrideReason] = useState("");
  const [submittingOverride, setSubmittingOverride] = useState(false);

  // Inspector modal for a selected slot
  const [inspectSlot, setInspectSlot] = useState<{
    slot: SlotItem;
    day: DayAvailability;
    booking?: BookingRecord;
  } | null>(null);

  // Block single slot modal
  const [slotToBlock, setSlotToBlock] = useState<{
    slot: SlotItem;
    day: DayAvailability;
  } | null>(null);
  const [blockReasonInput, setBlockReasonInput] = useState("");
  const [submittingBlock, setSubmittingBlock] = useState(false);

  // Bookings filter state
  const [bookingFilter, setBookingFilter] = useState<"ALL" | "UPCOMING" | "COMPLETED" | "CANCELLED">("ALL");

  // Fetch all availability and booking data
  const fetchAvailability = useCallback(async () => {
    setLoading(true);
    try {
      const profileRes = await fetch("/api/teacher/onboarding");
      const profileJson = await profileRes.json();
      if (profileJson.data) {
        setUserName(
          `${profileJson.data.profile.firstName || ""} ${profileJson.data.profile.lastName || ""}`.trim() ||
            profileJson.data.user.email
        );
        setUserEmail(profileJson.data.user.email);
      }

      const res = await fetch("/api/teacher/availability");
      const json = await res.json();
      if (json.success && json.data) {
        const tId = json.data.teacherId;
        setTeacherId(tId);

        if (json.data.availabilities && json.data.availabilities.length > 0) {
          setAvailabilities(json.data.availabilities);
        }
        if (json.data.breaks) {
          setBreaks(json.data.breaks);
        }
        if (json.data.dateOverrides) {
          setDateOverrides(json.data.dateOverrides);
        }
        if (json.data.allBookings) {
          setAllBookings(json.data.allBookings);
        }

        // Fetch calendar days using teacher ID
        if (tId) {
          const calRes = await fetch(`/api/teachers/${tId}/availability?days=14`);
          const calJson = await calRes.json();
          if (calJson.success && calJson.data?.dates) {
            setCalendarDays(calJson.data.dates);
          }
        }
      }
    } catch (err) {
      console.error("Failed to load availability:", err);
      showToast("Error", "Failed to load schedule data. Please refresh.", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchAvailability();
  }, [fetchAvailability]);

  // Save weekly hours
  const handleSaveWeekly = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/teacher/availability", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ timezone, availabilities, breaks }),
      });
      const json = await res.json();
      if (json.success) {
        showToast("Weekly Schedule Saved", "Your regular working hours have been updated.", "success");
        fetchAvailability();
      } else {
        showToast("Error", json.error?.message || "Failed to save availability.", "error");
      }
    } catch (err) {
      showToast("Error", "Server error while saving availability.", "error");
    } finally {
      setSaving(false);
    }
  };

  const toggleDayActive = (dayIdx: number) => {
    setAvailabilities((prev) => {
      const existing = prev.find((a) => a.dayOfWeek === dayIdx);
      if (existing) {
        return prev.map((a) => (a.dayOfWeek === dayIdx ? { ...a, isActive: !a.isActive } : a));
      } else {
        return [...prev, { dayOfWeek: dayIdx, startTime: "09:00", endTime: "17:00", isActive: true }];
      }
    });
  };

  const updateTimes = (dayIdx: number, field: "startTime" | "endTime", value: string) => {
    setAvailabilities((prev) => prev.map((a) => (a.dayOfWeek === dayIdx ? { ...a, [field]: value } : a)));
  };

  // Add date override or holiday
  const handleAddOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!overrideDate) {
      showToast("Validation Error", "Please select a date.", "error");
      return;
    }

    const startTime = isFullDay ? "00:00" : overrideStart;
    const endTime = isFullDay ? "23:59" : overrideEnd;

    setSubmittingOverride(true);
    try {
      const res = await fetch("/api/teacher/availability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: overrideDate,
          startTime,
          endTime,
          type: overrideType,
          reason: overrideReason,
        }),
      });
      const json = await res.json();
      if (json.success) {
        showToast(
          overrideType === "BLOCKED" ? "Holiday / Block Created" : "Extra Availability Added",
          overrideType === "BLOCKED"
            ? `Blocked time on ${overrideDate}. Students will not be able to book this window.`
            : `Added available hours on ${overrideDate}.`,
          "success"
        );
        setShowOverrideModal(false);
        setOverrideReason("");
        setIsFullDay(false);
        fetchAvailability();
      } else {
        showToast("Cannot Block Schedule", json.error?.message || "Failed to add date override.", "error");
      }
    } catch (err: any) {
      showToast("Error", err.message || "Failed to add date override.", "error");
    } finally {
      setSubmittingOverride(false);
    }
  };

  // Delete date override
  const handleDeleteOverride = async (overrideId: string) => {
    try {
      const res = await fetch(`/api/teacher/availability?overrideId=${overrideId}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (json.success) {
        showToast("Override Removed", "The date schedule exception has been deleted.", "info");
        fetchAvailability();
      }
    } catch (err) {
      showToast("Error", "Could not delete date override.", "error");
    }
  };

  // Block a single slot from the calendar view
  const handleConfirmBlockSlot = async () => {
    if (!slotToBlock) return;
    setSubmittingBlock(true);
    try {
      const res = await fetch("/api/teacher/availability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "BLOCK_SLOT",
          slotId: slotToBlock.slot.slotId || undefined,
          date: slotToBlock.day.dateStr,
          startTime: slotToBlock.slot.startTime,
          endTime: slotToBlock.slot.endTime,
          reason: blockReasonInput || "Temporarily Blocked by Educator",
        }),
      });
      const json = await res.json();
      if (json.success) {
        showToast("Slot Blocked", `The slot at ${slotToBlock.slot.time} on ${slotToBlock.day.displayDate} is now blocked.`, "success");
        setSlotToBlock(null);
        setBlockReasonInput("");
        fetchAvailability();
      } else {
        showToast("Cannot Block Slot", json.error?.message || "Failed to block slot.", "error");
      }
    } catch (err: any) {
      showToast("Error", err.message || "Failed to block slot.", "error");
    } finally {
      setSubmittingBlock(false);
    }
  };

  // Unblock a slot
  const handleUnblockSlot = async (slot: SlotItem, day: DayAvailability) => {
    try {
      let res: Response;
      if (slot.slotId) {
        res = await fetch("/api/teacher/availability", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "UNBLOCK_SLOT", slotId: slot.slotId }),
        });
      } else {
        // If it was an override, find the matching date override
        const match = dateOverrides.find(
          (o) => o.date === day.dateStr && o.type === "BLOCKED" && o.startTime <= slot.startTime && o.endTime >= slot.endTime
        );
        if (match) {
          res = await fetch(`/api/teacher/availability?overrideId=${match.id}`, { method: "DELETE" });
        } else {
          showToast("Info", "Slot is managed by weekly settings.", "info");
          return;
        }
      }

      const json = await res.json();
      if (json.success) {
        showToast("Slot Unblocked", "The time slot is now open and available for students to book.", "success");
        setInspectSlot(null);
        fetchAvailability();
      } else {
        showToast("Error", json.error?.message || "Could not unblock slot.", "error");
      }
    } catch (err) {
      showToast("Error", "Could not unblock slot.", "error");
    }
  };

  // Filtered student bookings list
  const filteredBookings = useMemo(() => {
    const now = new Date();
    return allBookings.filter((b) => {
      const bDate = new Date(b.startTime);
      if (bookingFilter === "UPCOMING") {
        return bDate >= now && b.status !== "CANCELLED";
      }
      if (bookingFilter === "COMPLETED") {
        return (bDate < now || b.isEnded) && b.status !== "CANCELLED";
      }
      if (bookingFilter === "CANCELLED") {
        return b.status === "CANCELLED";
      }
      return true;
    });
  }, [allBookings, bookingFilter]);

  // Selected calendar day
  const currentDay = calendarDays[selectedDayIdx] || null;

  // Active statistics
  const activeWorkingDaysCount = availabilities.filter((a) => a.isActive).length;
  const upcomingBookingsCount = allBookings.filter(
    (b) => new Date(b.startTime) >= new Date() && b.status !== "CANCELLED"
  ).length;

  return (
    <DashboardLayout role="TEACHER" userName={userName} userEmail={userEmail}>
      <div className="space-y-6 font-sans pb-16">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <BackButton fallbackUrl="/teacher/live-classes" label="Back to Live Classes" variant="default" />
            <div>
              <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
                <Clock className="h-6 w-6 text-[#0F766E]" /> Availability & Schedule Management
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Configure your weekly working hours, manage student bookings, and block leaves or holidays.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              onClick={() => {
                setOverrideType("BLOCKED");
                setShowOverrideModal(true);
              }}
              variant="outline"
              size="sm"
              leftIcon={<Plus className="h-4 w-4 text-[#0F766E]" />}
            >
              Add Holiday / Leave
            </Button>
            <Button
              onClick={handleSaveWeekly}
              disabled={saving}
              variant="teacher"
              size="sm"
              leftIcon={<Save className="h-4 w-4" />}
            >
              {saving ? "Saving..." : "Save Weekly Hours"}
            </Button>
          </div>
        </div>

        {/* Quick Stats Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card className="p-4 bg-white border border-slate-200 rounded-2xl flex items-center gap-3 shadow-xs">
            <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center text-[#0F766E] shrink-0 font-bold">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-slate-500 font-medium">Working Days</div>
              <div className="text-lg font-black text-slate-900">{activeWorkingDaysCount} Days / Wk</div>
            </div>
          </Card>

          <Card className="p-4 bg-white border border-slate-200 rounded-2xl flex items-center gap-3 shadow-xs">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0 font-bold">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-slate-500 font-medium">Upcoming Sessions</div>
              <div className="text-lg font-black text-emerald-700">{upcomingBookingsCount} Booked</div>
            </div>
          </Card>

          <Card className="p-4 bg-white border border-slate-200 rounded-2xl flex items-center gap-3 shadow-xs">
            <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600 shrink-0 font-bold">
              <Ban className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-slate-500 font-medium">Date Overrides / Leaves</div>
              <div className="text-lg font-black text-rose-700">{dateOverrides.length} Active</div>
            </div>
          </Card>

          <Card className="p-4 bg-white border border-slate-200 rounded-2xl flex items-center gap-3 shadow-xs">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 shrink-0 font-bold">
              <History className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-slate-500 font-medium">Total Student Bookings</div>
              <div className="text-lg font-black text-blue-700">{allBookings.length} Total</div>
            </div>
          </Card>
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
          <button
            type="button"
            onClick={() => setActiveTab("calendar")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === "calendar"
                ? "bg-[#0F766E] text-white shadow-xs"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            <Calendar className="w-4 h-4" /> Interactive Calendar View
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("weekly")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === "weekly"
                ? "bg-[#0F766E] text-white shadow-xs"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            <Clock className="w-4 h-4" /> Weekly Recurring Hours
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("overrides")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === "overrides"
                ? "bg-[#0F766E] text-white shadow-xs"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            <Ban className="w-4 h-4" /> Date Exceptions & Holidays ({dateOverrides.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("bookings")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === "bookings"
                ? "bg-[#0F766E] text-white shadow-xs"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            <Users className="w-4 h-4" /> Student Bookings & History ({allBookings.length})
          </button>
        </div>

        {loading ? (
          <div className="space-y-4">
            <div className="h-20 bg-slate-100 rounded-2xl animate-pulse" />
            <div className="h-96 bg-slate-100 rounded-2xl animate-pulse" />
          </div>
        ) : (
          <>
            {/* ========================================================================= */}
            {/* TAB 1: INTERACTIVE CALENDAR VIEW */}
            {/* ========================================================================= */}
            {activeTab === "calendar" && (
              <div className="space-y-6">
                {/* Visual Status Legend */}
                <Card className="p-4 bg-slate-50/90 border border-slate-200 rounded-2xl">
                  <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                    <span className="font-bold text-slate-700 flex items-center gap-1.5">
                      <Info className="w-4 h-4 text-[#0F766E]" /> Calendar Slot States (Asia/Kolkata):
                    </span>
                    <div className="flex flex-wrap items-center gap-4 font-semibold text-[11px]">
                      <span className="flex items-center gap-1.5 text-emerald-700">
                        <span className="w-3 h-3 rounded-md bg-emerald-500 border border-emerald-600" /> GREEN: Available (Open for Learners)
                      </span>
                      <span className="flex items-center gap-1.5 text-rose-700">
                        <span className="w-3 h-3 rounded-md bg-rose-500 border border-rose-600" /> RED: Booked / Occupied by Student
                      </span>
                      <span className="flex items-center gap-1.5 text-slate-600">
                        <span className="w-3 h-3 rounded-md bg-slate-300 border border-slate-400" /> GREY: Blocked / Break / Past Cutoff
                      </span>
                    </div>
                  </div>
                </Card>

                {/* Day Strip Navigation */}
                {calendarDays.length > 0 && (
                  <Card className="p-4 bg-white border border-slate-200 rounded-2xl space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CalendarDays className="w-4 h-4 text-[#0F766E]" />
                        <span className="text-xs font-black text-slate-900 uppercase tracking-wider">
                          Select Date To Inspect Schedule
                        </span>
                      </div>
                      <span className="text-xs text-slate-500 font-semibold">
                        Showing next {calendarDays.length} days
                      </span>
                    </div>

                    <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                      {calendarDays.map((d, idx) => {
                        const isSelected = selectedDayIdx === idx;
                        const bookedCount = d.slots.filter((s) => s.status === "BOOKED").length;
                        return (
                          <button
                            key={d.dateStr}
                            type="button"
                            onClick={() => setSelectedDayIdx(idx)}
                            className={`flex flex-col items-center justify-center p-3 rounded-2xl min-w-[85px] border transition-all shrink-0 ${
                              isSelected
                                ? "bg-[#0F766E] text-white border-[#0F766E] shadow-md scale-102"
                                : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 hover:border-slate-300"
                            }`}
                          >
                            <span className={`text-[10px] font-bold ${isSelected ? "text-teal-100" : "text-slate-400"}`}>
                              {d.dayName}
                            </span>
                            <span className="text-xs font-black my-0.5">{d.displayDate}</span>
                            <div className="flex items-center gap-1 mt-1">
                              {d.availableCount > 0 ? (
                                <span
                                  className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full ${
                                    isSelected ? "bg-emerald-400 text-teal-950" : "bg-emerald-100 text-emerald-800"
                                  }`}
                                >
                                  {d.availableCount} Open
                                </span>
                              ) : bookedCount > 0 ? (
                                <span
                                  className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full ${
                                    isSelected ? "bg-rose-400 text-rose-950" : "bg-rose-100 text-rose-800"
                                  }`}
                                >
                                  {bookedCount} Booked
                                </span>
                              ) : (
                                <span className={`text-[9px] ${isSelected ? "text-teal-200" : "text-slate-400"}`}>
                                  Off
                                </span>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </Card>
                )}

                {/* Slots Grid For Selected Day */}
                {currentDay && (
                  <Card className="p-6 bg-white border border-slate-200 rounded-3xl space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                      <div>
                        <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                          <Calendar className="w-5 h-5 text-[#0F766E]" /> {currentDay.fullDate}
                        </h2>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {currentDay.availableCount} available open slots •{" "}
                          {currentDay.slots.filter((s) => s.status === "BOOKED").length} booked session(s)
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setOverrideDate(currentDay.dateStr);
                            setOverrideType("BLOCKED");
                            setShowOverrideModal(true);
                          }}
                          leftIcon={<Ban className="w-3.5 h-3.5 text-rose-600" />}
                        >
                          Block Full / Part Day
                        </Button>
                      </div>
                    </div>

                    {currentDay.slots.length === 0 ? (
                      <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-2">
                        <Clock className="w-10 h-10 text-slate-300 mx-auto" />
                        <h4 className="text-sm font-bold text-slate-700">No Teaching Hours Configured for this Day</h4>
                        <p className="text-xs text-slate-400 max-w-sm mx-auto">
                          Configure regular working hours in Weekly Recurring Hours, or click Add Date to add a custom available time.
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                        {currentDay.slots.map((s, sIdx) => {
                          const isAvailable = s.visualState === "GREEN";
                          const isBooked = s.visualState === "RED" || s.status === "BOOKED";
                          const isBlocked = s.status === "BLOCKED";

                          // Find booking record if booked
                          const booking = allBookings.find(
                            (b) =>
                              (s.slotId && b.slotId === s.slotId) ||
                              (b.startDisplay.includes(currentDay.displayDate) && b.timeDisplay.includes(s.startTime))
                          );

                          return (
                            <div
                              key={sIdx}
                              className={`p-3.5 rounded-2xl border transition-all flex flex-col justify-between gap-3 text-xs ${
                                isAvailable
                                  ? "bg-emerald-50/70 border-emerald-300 hover:border-emerald-500 shadow-xs"
                                  : isBooked
                                  ? "bg-rose-50/80 border-rose-300 hover:border-rose-500 shadow-xs"
                                  : "bg-slate-50 border-slate-200 text-slate-500"
                              }`}
                            >
                              <div className="space-y-1.5">
                                <div className="flex items-center justify-between">
                                  <span className="font-extrabold text-slate-900 flex items-center gap-1.5">
                                    <Clock className="w-3.5 h-3.5 text-slate-500" /> {s.time}
                                  </span>
                                  <span
                                    className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                                      isAvailable
                                        ? "bg-emerald-100 text-emerald-800"
                                        : isBooked
                                        ? "bg-rose-100 text-rose-800"
                                        : "bg-slate-200 text-slate-700"
                                    }`}
                                  >
                                    {isAvailable ? "AVAILABLE" : isBooked ? "BOOKED" : s.status}
                                  </span>
                                </div>

                                {isBooked && booking ? (
                                  <div className="space-y-1 pt-1 border-t border-rose-200/60">
                                    <div className="flex items-center gap-1.5 text-slate-900 font-bold">
                                      <User className="w-3 h-3 text-rose-600 shrink-0" />
                                      <span className="truncate">{booking.student.name}</span>
                                    </div>
                                    <div className="text-[10px] text-slate-500 truncate">{booking.student.email}</div>
                                    <div className="inline-flex items-center gap-1 text-[10px] text-rose-700 font-semibold">
                                      <Lock className="w-3 h-3" /> Confirmed Protected
                                    </div>
                                  </div>
                                ) : isBlocked ? (
                                  <div className="text-[11px] text-rose-700 font-medium">
                                    {s.reason || "Blocked by Educator"}
                                  </div>
                                ) : !isAvailable ? (
                                  <div className="text-[10px] text-slate-400 font-medium">
                                    {s.reason || "Outside working hours / Past cutoff"}
                                  </div>
                                ) : (
                                  <div className="text-[11px] text-emerald-700 font-semibold">
                                    Open for 1-on-1 booking
                                  </div>
                                )}
                              </div>

                              {/* Action Footer */}
                              <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between gap-2">
                                {isBooked ? (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="w-full text-[11px] py-1 h-7 border-rose-300 text-rose-800 hover:bg-rose-100"
                                    onClick={() => setInspectSlot({ slot: s, day: currentDay, booking })}
                                  >
                                    View Student Info
                                  </Button>
                                ) : isAvailable ? (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="w-full text-[11px] py-1 h-7 border-slate-300 text-slate-700 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-300 transition-all"
                                    onClick={() => setSlotToBlock({ slot: s, day: currentDay })}
                                  >
                                    Block Slot
                                  </Button>
                                ) : isBlocked ? (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="w-full text-[11px] py-1 h-7 border-emerald-300 text-emerald-800 hover:bg-emerald-100"
                                    onClick={() => handleUnblockSlot(s, currentDay)}
                                  >
                                    Unblock Slot
                                  </Button>
                                ) : (
                                  <span className="text-[10px] text-slate-400 italic">Unavailable</span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </Card>
                )}
              </div>
            )}

            {/* ========================================================================= */}
            {/* TAB 2: WEEKLY RECURRING HOURS */}
            {/* ========================================================================= */}
            {activeTab === "weekly" && (
              <div className="space-y-6 max-w-4xl">
                {/* Timezone Configuration */}
                <Card className="p-6 space-y-4 bg-white border border-slate-200 rounded-3xl">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                        <Calendar className="h-5 w-5 text-[#0F766E]" /> Teaching Timezone
                      </h3>
                      <p className="text-xs text-slate-500">
                        All student and educator booking displays will adhere to this canonical timezone.
                      </p>
                    </div>
                    <span className="text-xs font-bold text-teal-800 bg-teal-50 px-3 py-1 rounded-full border border-teal-200">
                      Canonical IST
                    </span>
                  </div>

                  <div className="max-w-md">
                    <select
                      value={timezone}
                      onChange={(e) => setTimezone(e.target.value)}
                      className="w-full px-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 outline-none font-medium focus:ring-2 focus:ring-[#0F766E]"
                    >
                      <option value="Asia/Kolkata">Asia/Kolkata (IST - UTC+5:30) [India Standard]</option>
                      <option value="America/New_York">America/New_York (EST - UTC-5)</option>
                      <option value="Europe/London">Europe/London (GMT - UTC+0)</option>
                      <option value="Asia/Dubai">Asia/Dubai (GST - UTC+4)</option>
                      <option value="Asia/Singapore">Asia/Singapore (SGT - UTC+8)</option>
                    </select>
                  </div>
                </Card>

                {/* Weekly Schedule Grid */}
                <Card className="p-6 space-y-6 bg-white border border-slate-200 rounded-3xl">
                  <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                    <div>
                      <h3 className="text-base font-bold text-slate-900">Weekly Working Window</h3>
                      <p className="text-xs text-slate-500">
                        Enable teaching days and set regular start/finish times. Available slots will be generated automatically.
                      </p>
                    </div>
                    <Button
                      onClick={handleSaveWeekly}
                      disabled={saving}
                      variant="teacher"
                      size="sm"
                      leftIcon={<Save className="h-4 w-4" />}
                    >
                      {saving ? "Saving..." : "Save Schedule"}
                    </Button>
                  </div>

                  <div className="space-y-3">
                    {DAYS.map((dayName, dayIdx) => {
                      const dayAvail = availabilities.find((a) => a.dayOfWeek === dayIdx) || {
                        dayOfWeek: dayIdx,
                        startTime: "09:00",
                        endTime: "17:00",
                        isActive: false,
                      };

                      const dayBreak = breaks.find((b) => b.dayOfWeek === dayIdx);

                      return (
                        <div
                          key={dayIdx}
                          className={`p-4 rounded-2xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                            dayAvail.isActive
                              ? "bg-white border-slate-200 shadow-xs"
                              : "bg-slate-50 border-slate-200 opacity-60"
                          }`}
                        >
                          <div className="flex items-center gap-3 w-40">
                            <input
                              type="checkbox"
                              checked={dayAvail.isActive}
                              onChange={() => toggleDayActive(dayIdx)}
                              className="h-4 w-4 rounded-md accent-[#0F766E] cursor-pointer"
                            />
                            <span className="text-xs font-bold text-slate-900">{dayName}</span>
                          </div>

                          {dayAvail.isActive ? (
                            <div className="flex flex-wrap items-center gap-4 text-xs">
                              <div className="flex items-center gap-2">
                                <span className="text-slate-500 font-medium">Hours:</span>
                                <input
                                  type="time"
                                  value={dayAvail.startTime}
                                  onChange={(e) => updateTimes(dayIdx, "startTime", e.target.value)}
                                  className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl outline-none font-semibold text-slate-900"
                                />
                                <span className="text-slate-400 font-bold">to</span>
                                <input
                                  type="time"
                                  value={dayAvail.endTime}
                                  onChange={(e) => updateTimes(dayIdx, "endTime", e.target.value)}
                                  className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl outline-none font-semibold text-slate-900"
                                />
                              </div>

                              {dayBreak && (
                                <div className="flex items-center gap-1.5 text-slate-500 bg-slate-100 px-2.5 py-1 rounded-xl">
                                  <Clock className="w-3 h-3 text-slate-400" />
                                  <span className="text-[11px] font-medium">
                                    Break: {dayBreak.startTime}-{dayBreak.endTime}
                                  </span>
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs font-semibold text-slate-400">Unavailable (Day Off)</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </Card>
              </div>
            )}

            {/* ========================================================================= */}
            {/* TAB 3: DATE EXCEPTIONS & HOLIDAYS */}
            {/* ========================================================================= */}
            {activeTab === "overrides" && (
              <div className="space-y-6 max-w-4xl">
                <Card className="p-6 space-y-4 bg-white border border-slate-200 rounded-3xl">
                  <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                    <div>
                      <h3 className="text-base font-bold text-slate-900">Configured Date Overrides & Holidays</h3>
                      <p className="text-xs text-slate-500">
                        Date-specific exceptions, leaves, and custom working hours. Confirmed student bookings are strictly protected.
                      </p>
                    </div>
                    <Button
                      onClick={() => {
                        setOverrideType("BLOCKED");
                        setShowOverrideModal(true);
                      }}
                      variant="teacher"
                      size="sm"
                      leftIcon={<Plus className="h-4 w-4" />}
                    >
                      Add Holiday / Leave
                    </Button>
                  </div>

                  {dateOverrides.length === 0 ? (
                    <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-2">
                      <Calendar className="w-10 h-10 text-slate-300 mx-auto" />
                      <h4 className="text-sm font-bold text-slate-700">No Date Overrides Configured</h4>
                      <p className="text-xs text-slate-400 max-w-sm mx-auto">
                        Your weekly schedule will apply normally. Add a date exception to block a vacation day or offer special holiday hours.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {dateOverrides.map((o) => (
                        <div
                          key={o.id}
                          className={`p-4 rounded-2xl border flex items-center justify-between gap-3 ${
                            o.type === "BLOCKED"
                              ? "bg-rose-50/70 border-rose-200 text-rose-900"
                              : "bg-emerald-50/70 border-emerald-200 text-emerald-900"
                          }`}
                        >
                          <div className="space-y-1 text-xs">
                            <div className="flex items-center gap-2">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                                  o.type === "BLOCKED" ? "bg-rose-200 text-rose-800" : "bg-emerald-200 text-emerald-800"
                                }`}
                              >
                                {o.type === "BLOCKED" ? "HOLIDAY / BLOCKED" : "EXTRA AVAILABLE"}
                              </span>
                              <span className="font-extrabold text-slate-900">{o.date}</span>
                            </div>
                            <div className="font-semibold text-slate-700">
                              {o.startTime === "00:00" && o.endTime === "23:59"
                                ? "Full Day"
                                : `${o.startTime} - ${o.endTime}`}
                            </div>
                            {o.reason && <div className="text-[11px] opacity-80 italic">Note: {o.reason}</div>}
                          </div>

                          <button
                            type="button"
                            onClick={() => handleDeleteOverride(o.id)}
                            className="p-2 text-slate-400 hover:text-rose-600 rounded-xl hover:bg-white transition-all"
                            title="Delete Override"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              </div>
            )}

            {/* ========================================================================= */}
            {/* TAB 4: STUDENT BOOKINGS & HISTORY */}
            {/* ========================================================================= */}
            {activeTab === "bookings" && (
              <div className="space-y-6">
                <Card className="p-6 space-y-6 bg-white border border-slate-200 rounded-3xl">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                    <div>
                      <h3 className="text-base font-bold text-slate-900">Student Booking Records</h3>
                      <p className="text-xs text-slate-500">
                        View upcoming student bookings and historical completed classes. Records are preserved permanently.
                      </p>
                    </div>

                    {/* Filter buttons */}
                    <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-2xl text-xs font-bold">
                      {(["ALL", "UPCOMING", "COMPLETED", "CANCELLED"] as const).map((filter) => (
                        <button
                          key={filter}
                          type="button"
                          onClick={() => setBookingFilter(filter)}
                          className={`px-3 py-1.5 rounded-xl transition-all ${
                            bookingFilter === filter
                              ? "bg-white text-slate-900 shadow-xs"
                              : "text-slate-500 hover:text-slate-900"
                          }`}
                        >
                          {filter === "ALL"
                            ? `All (${allBookings.length})`
                            : filter === "UPCOMING"
                            ? `Upcoming (${upcomingBookingsCount})`
                            : filter}
                        </button>
                      ))}
                    </div>
                  </div>

                  {filteredBookings.length === 0 ? (
                    <div className="p-12 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-2">
                      <Users className="w-12 h-12 text-slate-300 mx-auto" />
                      <h4 className="text-sm font-bold text-slate-700">No Bookings Found</h4>
                      <p className="text-xs text-slate-400 max-w-sm mx-auto">
                        {bookingFilter === "ALL"
                          ? "You do not have any student bookings yet. Ensure your weekly working hours are open."
                          : `No bookings match the "${bookingFilter}" filter.`}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {filteredBookings.map((b) => {
                        const isUpcoming = new Date(b.startTime) >= new Date() && b.status !== "CANCELLED";
                        return (
                          <div
                            key={b.bookingId}
                            className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white ${
                              isUpcoming ? "border-teal-200 shadow-xs" : "border-slate-200"
                            }`}
                          >
                            <div className="flex items-center gap-3.5">
                              <img
                                src={b.student.avatarUrl || "/images/educators/educator_01.jpg"}
                                alt={b.student.name}
                                className="w-11 h-11 rounded-full object-cover ring-2 ring-slate-100 shrink-0"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = "/images/educators/educator_01.jpg";
                                }}
                              />
                              <div className="space-y-1 text-xs">
                                <div className="flex items-center gap-2">
                                  <span className="font-extrabold text-slate-900">{b.student.name}</span>
                                  <span
                                    className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                                      b.status === "CONFIRMED"
                                        ? "bg-teal-100 text-teal-800"
                                        : b.status === "COMPLETED"
                                        ? "bg-blue-100 text-blue-800"
                                        : "bg-slate-100 text-slate-600"
                                    }`}
                                  >
                                    {b.status}
                                  </span>
                                </div>
                                <div className="text-slate-500 flex flex-wrap items-center gap-3 text-[11px]">
                                  <span>{b.student.email}</span>
                                  {b.student.phone && <span>• {b.student.phone}</span>}
                                </div>
                              </div>
                            </div>

                            <div className="flex flex-col sm:items-end gap-1 text-xs">
                              <div className="font-extrabold text-slate-900 flex items-center gap-1.5">
                                <Calendar className="w-3.5 h-3.5 text-[#0F766E]" /> {b.startDisplay}
                              </div>
                              <div className="text-slate-500 font-medium">{b.timeDisplay} (IST)</div>
                              <div className="text-[11px] font-black text-teal-700">
                                {b.price > 0 ? formatCurrency(b.price) : "Free Class"}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </Card>
              </div>
            )}
          </>
        )}

        {/* ========================================================================= */}
        {/* MODAL 1: ADD DATE OVERRIDE / HOLIDAY */}
        {/* ========================================================================= */}
        {showOverrideModal && (
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-5 animate-in fade-in zoom-in duration-150 font-sans">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-[#0F766E]" />
                  {overrideType === "BLOCKED" ? "Add Holiday / Leave" : "Add Extra Available Hours"}
                </h3>
                <button
                  onClick={() => setShowOverrideModal(false)}
                  className="text-slate-400 hover:text-slate-600 text-sm font-bold"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleAddOverride} className="space-y-4 text-xs">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Schedule Type</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setOverrideType("BLOCKED")}
                      className={`py-2 px-3 rounded-xl font-bold border transition-all ${
                        overrideType === "BLOCKED"
                          ? "bg-rose-500 text-white border-rose-500 shadow-xs"
                          : "bg-slate-50 text-slate-700 border-slate-200"
                      }`}
                    >
                      🚫 Block / Holiday
                    </button>
                    <button
                      type="button"
                      onClick={() => setOverrideType("AVAILABLE")}
                      className={`py-2 px-3 rounded-xl font-bold border transition-all ${
                        overrideType === "AVAILABLE"
                          ? "bg-emerald-500 text-white border-emerald-500 shadow-xs"
                          : "bg-slate-50 text-slate-700 border-slate-200"
                      }`}
                    >
                      ✓ Extra Available Hours
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Select Date</label>
                  <input
                    type="date"
                    value={overrideDate}
                    onChange={(e) => setOverrideDate(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none font-medium text-slate-900"
                  />
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="fullDayCheck"
                    checked={isFullDay}
                    onChange={(e) => setIsFullDay(e.target.checked)}
                    className="h-4 w-4 rounded accent-[#0F766E] cursor-pointer"
                  />
                  <label htmlFor="fullDayCheck" className="text-slate-700 font-bold cursor-pointer">
                    Block Full Day (00:00 to 23:59)
                  </label>
                </div>

                {!isFullDay && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">Start Time</label>
                      <input
                        type="time"
                        value={overrideStart}
                        onChange={(e) => setOverrideStart(e.target.value)}
                        required={!isFullDay}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none font-medium text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">End Time</label>
                      <input
                        type="time"
                        value={overrideEnd}
                        onChange={(e) => setOverrideEnd(e.target.value)}
                        required={!isFullDay}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none font-medium text-slate-900"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Reason / Note (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Festival holiday, Personal leave, Sick leave"
                    value={overrideReason}
                    onChange={(e) => setOverrideReason(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none font-medium text-slate-900"
                  />
                </div>

                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 text-[11px] flex items-start gap-2">
                  <Lock className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                  <span>
                    <strong>Protection Rule:</strong> If students have already booked confirmed sessions during this time window, the block will be safely rejected to prevent accidental overrides.
                  </span>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                  <Button type="button" variant="outline" size="sm" onClick={() => setShowOverrideModal(false)}>
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant={overrideType === "BLOCKED" ? "danger" : "primary"}
                    size="sm"
                    disabled={submittingOverride}
                  >
                    {submittingOverride ? "Saving..." : "Save Schedule"}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODAL 2: CONFIRM BLOCK SINGLE SLOT */}
        {/* ========================================================================= */}
        {slotToBlock && (
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in duration-150 font-sans">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <Ban className="w-5 h-5 text-rose-600" /> Block Time Slot
                </h3>
                <button onClick={() => setSlotToBlock(null)} className="text-slate-400 hover:text-slate-600 font-bold">
                  ✕
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <p className="text-slate-600">
                  Are you sure you want to block this time slot? Students will not be able to book this session.
                </p>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                  <div className="font-extrabold text-slate-900">{slotToBlock.day.fullDate}</div>
                  <div className="font-semibold text-[#0F766E]">{slotToBlock.slot.time} (Asia/Kolkata)</div>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Reason for blocking (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Doctor appointment, prep time"
                    value={blockReasonInput}
                    onChange={(e) => setBlockReasonInput(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none font-medium text-slate-900"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <Button type="button" variant="outline" size="sm" onClick={() => setSlotToBlock(null)}>
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="danger"
                  size="sm"
                  onClick={handleConfirmBlockSlot}
                  disabled={submittingBlock}
                >
                  {submittingBlock ? "Blocking..." : "Block Slot"}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODAL 3: INSPECT BOOKED SLOT & STUDENT DETAILS */}
        {/* ========================================================================= */}
        {inspectSlot && (
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-slate-200 space-y-5 animate-in fade-in zoom-in duration-150 font-sans">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-rose-500" />
                  <h3 className="text-lg font-black text-slate-900">Booked Session Details</h3>
                </div>
                <button onClick={() => setInspectSlot(null)} className="text-slate-400 hover:text-slate-600 font-bold">
                  ✕
                </button>
              </div>

              {inspectSlot.booking ? (
                <div className="space-y-4 text-xs">
                  {/* Student Card */}
                  <div className="p-4 bg-teal-50/60 rounded-2xl border border-teal-200/80 flex items-center gap-3.5">
                    <img
                      src={inspectSlot.booking.student.avatarUrl || "/images/educators/educator_01.jpg"}
                      alt={inspectSlot.booking.student.name}
                      className="w-12 h-12 rounded-full object-cover ring-2 ring-teal-200 shrink-0"
                    />
                    <div className="space-y-0.5 min-w-0 flex-1">
                      <div className="font-extrabold text-slate-900 text-sm truncate">
                        {inspectSlot.booking.student.name}
                      </div>
                      <div className="text-slate-600 flex items-center gap-1.5 truncate">
                        <Mail className="w-3 h-3 text-slate-400 shrink-0" /> {inspectSlot.booking.student.email}
                      </div>
                      {inspectSlot.booking.student.phone && (
                        <div className="text-slate-600 flex items-center gap-1.5">
                          <Phone className="w-3 h-3 text-slate-400 shrink-0" /> {inspectSlot.booking.student.phone}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Session Details */}
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500 font-medium">Session Title / Subject:</span>
                      <span className="font-extrabold text-slate-900">
                        {inspectSlot.booking.subject || inspectSlot.booking.title || "1-on-1 Mentorship"}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500 font-medium">Date:</span>
                      <span className="font-bold text-slate-900">{inspectSlot.day.fullDate}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500 font-medium">Time (Asia/Kolkata):</span>
                      <span className="font-bold text-[#0F766E]">{inspectSlot.slot.time}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500 font-medium">Booking Status:</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-teal-100 text-teal-800">
                        {inspectSlot.booking.status}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500 font-medium">Rate / Price:</span>
                      <span className="font-black text-slate-900">
                        {inspectSlot.booking.price > 0 ? formatCurrency(inspectSlot.booking.price) : "Free Session"}
                      </span>
                    </div>
                  </div>

                  {/* Confirmed booking protection alert */}
                  <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 text-[11px] flex items-start gap-2">
                    <Lock className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                    <div>
                      <strong>Confirmed Booking Protected:</strong> To preserve student schedules and prevent accidental cancellations, confirmed sessions cannot be blocked or overridden here. Manage active live sessions in your Live Classes room.
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-slate-50 rounded-2xl text-xs text-slate-600">
                  This slot has been booked by a student.
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <Button type="button" variant="outline" size="sm" onClick={() => setInspectSlot(null)}>
                  Close
                </Button>
                <Link href="/teacher/live-classes">
                  <Button variant="teacher" size="sm">
                    Open Live Classes Room
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
