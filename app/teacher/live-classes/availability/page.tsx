"use client";

import React, { useState, useEffect } from "react";
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
} from "lucide-react";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

interface Availability {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isActive: boolean;
}

interface DateOverride {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  type: "AVAILABLE" | "BLOCKED";
  reason?: string | null;
}

interface Slot {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  status: string;
  bookings: any[];
}

export default function TeacherAvailabilityPage() {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userName, setUserName] = useState("Educator");
  const [userEmail, setUserEmail] = useState("");
  const [timezone, setTimezone] = useState("Asia/Kolkata");

  const [availabilities, setAvailabilities] = useState<Availability[]>([
    { dayOfWeek: 1, startTime: "09:00", endTime: "17:00", isActive: true },
    { dayOfWeek: 2, startTime: "09:00", endTime: "17:00", isActive: true },
    { dayOfWeek: 3, startTime: "09:00", endTime: "17:00", isActive: true },
    { dayOfWeek: 4, startTime: "09:00", endTime: "17:00", isActive: true },
    { dayOfWeek: 5, startTime: "09:00", endTime: "17:00", isActive: true },
  ]);

  const [breaks, setBreaks] = useState<Array<{ dayOfWeek: number; startTime: string; endTime: string }>>([
    { dayOfWeek: 1, startTime: "13:00", endTime: "14:00" },
    { dayOfWeek: 2, startTime: "13:00", endTime: "14:00" },
    { dayOfWeek: 3, startTime: "13:00", endTime: "14:00" },
    { dayOfWeek: 4, startTime: "13:00", endTime: "14:00" },
    { dayOfWeek: 5, startTime: "13:00", endTime: "14:00" },
  ]);

  const [dateOverrides, setDateOverrides] = useState<DateOverride[]>([]);
  const [slots, setSlots] = useState<Slot[]>([]);

  // Form states for Date Override / Block Slot modal
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [overrideDate, setOverrideDate] = useState("");
  const [overrideStart, setOverrideStart] = useState("09:00");
  const [overrideEnd, setOverrideEnd] = useState("10:00");
  const [overrideType, setOverrideType] = useState<"AVAILABLE" | "BLOCKED">("AVAILABLE");
  const [overrideReason, setOverrideReason] = useState("");
  const [submittingOverride, setSubmittingOverride] = useState(false);

  const fetchAvailability = async () => {
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
        if (json.data.availabilities && json.data.availabilities.length > 0) {
          setAvailabilities(json.data.availabilities);
        }
        if (json.data.breaks && json.data.breaks.length > 0) {
          setBreaks(json.data.breaks);
        }
        if (json.data.dateOverrides) {
          setDateOverrides(json.data.dateOverrides);
        }
        if (json.data.slots) {
          setSlots(json.data.slots);
        }
      }
    } catch (err) {
      console.error("Failed to load availability:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAvailability();
  }, []);

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
        showToast("Settings Saved", "Your weekly teaching availability has been updated.", "success");
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

  const handleAddOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!overrideDate) {
      showToast("Validation Error", "Please select a date.", "error");
      return;
    }
    setSubmittingOverride(true);
    try {
      const res = await fetch("/api/teacher/availability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: overrideDate,
          startTime: overrideStart,
          endTime: overrideEnd,
          type: overrideType,
          reason: overrideReason,
        }),
      });
      const json = await res.json();
      if (json.success) {
        showToast(
          "Date Schedule Added!",
          overrideType === "BLOCKED" ? "Date slot blocked successfully." : "Custom date availability saved.",
          "success"
        );
        setShowOverrideModal(false);
        setOverrideReason("");
        fetchAvailability();
      } else {
        showToast("Error", json.error?.message || "Failed to add date override.", "error");
      }
    } catch (err: any) {
      showToast("Error", err.message || "Failed to add date override.", "error");
    } finally {
      setSubmittingOverride(false);
    }
  };

  const handleDeleteOverride = async (overrideId: string) => {
    try {
      const res = await fetch(`/api/teacher/availability?overrideId=${overrideId}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (json.success) {
        showToast("Override Removed", "The date schedule override has been deleted.", "info");
        fetchAvailability();
      }
    } catch (err) {
      showToast("Error", "Could not delete date override.", "error");
    }
  };

  const handleUnblockSlot = async (slotId: string) => {
    try {
      const res = await fetch(`/api/teacher/availability`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "UNBLOCK_SLOT", slotId }),
      });
      const json = await res.json();
      if (json.success) {
        showToast("Slot Unblocked", "The live class slot is now open for booking.", "success");
        fetchAvailability();
      }
    } catch (err) {
      showToast("Error", "Could not unblock slot.", "error");
    }
  };

  return (
    <DashboardLayout role="TEACHER" userName={userName} userEmail={userEmail}>
      <div className="space-y-6 font-sans">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <BackButton fallbackUrl="/teacher/live-classes" label="Back to Live Classes" variant="default" />
            <div>
              <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
                <Clock className="h-6 w-6 text-blue-600" /> Availability & Schedule Management
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Manage your weekly teaching schedule, add custom date slots, or block availability.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={() => setShowOverrideModal(true)}
              variant="outline"
              size="sm"
              leftIcon={<Plus className="h-4 w-4 text-[#16805B]" />}
            >
              Add Date / Block Slot
            </Button>
            <Button
              onClick={handleSaveWeekly}
              disabled={saving}
              variant="primary"
              size="sm"
              leftIcon={<Save className="h-4 w-4" />}
            >
              {saving ? "Saving..." : "Save Weekly Availability"}
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="h-64 bg-slate-100 rounded-2xl animate-pulse" />
        ) : (
          <div className="space-y-6 max-w-5xl">
            {/* Status Legend Card */}
            <Card className="p-4 bg-slate-50/80 border border-slate-200/80">
              <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                <span className="font-bold text-slate-700 flex items-center gap-1.5">
                  <Info className="w-4 h-4 text-blue-600" /> Slot Status Indicators:
                </span>
                <div className="flex flex-wrap items-center gap-4 font-semibold">
                  <span className="flex items-center gap-1.5 text-emerald-700">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> AVAILABLE (Open for Learners)
                  </span>
                  <span className="flex items-center gap-1.5 text-blue-700">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-600" /> BOOKED / CONFIRMED
                  </span>
                  <span className="flex items-center gap-1.5 text-amber-700">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> PENDING (In Checkout)
                  </span>
                  <span className="flex items-center gap-1.5 text-rose-700">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> BLOCKED (Temporarily Blocked)
                  </span>
                </div>
              </div>
            </Card>

            {/* Timezone Configuration */}
            <Card className="p-6 space-y-4">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Calendar className="h-5 w-5 text-blue-600" /> Teaching Timezone
              </h3>
              <div className="max-w-md">
                <select
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="w-full px-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 outline-none font-medium"
                >
                  <option value="Asia/Kolkata">Asia/Kolkata (IST - UTC+5:30)</option>
                  <option value="America/New_York">America/New_York (EST - UTC-5)</option>
                  <option value="Europe/London">Europe/London (GMT - UTC+0)</option>
                  <option value="Asia/Dubai">Asia/Dubai (GST - UTC+4)</option>
                  <option value="Asia/Singapore">Asia/Singapore (SGT - UTC+8)</option>
                </select>
              </div>
            </Card>

            {/* Weekly Schedule Grid */}
            <Card className="p-6 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Weekly Recurring Hours</h3>
                  <p className="text-xs text-slate-500">Enable active days and specify your regular available window.</p>
                </div>
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                  Recurring Schedule
                </span>
              </div>

              <div className="space-y-3">
                {DAYS.map((dayName, dayIdx) => {
                  const dayAvail = availabilities.find((a) => a.dayOfWeek === dayIdx) || {
                    dayOfWeek: dayIdx,
                    startTime: "09:00",
                    endTime: "17:00",
                    isActive: false,
                  };

                  return (
                    <div
                      key={dayIdx}
                      className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl border transition ${
                        dayAvail.isActive ? "bg-white border-slate-200 shadow-xs" : "bg-slate-50 border-slate-200 opacity-60"
                      }`}
                    >
                      <div className="flex items-center gap-3 w-40">
                        <input
                          type="checkbox"
                          checked={dayAvail.isActive}
                          onChange={() => toggleDayActive(dayIdx)}
                          className="h-4 w-4 rounded-md text-blue-600 cursor-pointer"
                        />
                        <span className="text-xs font-bold text-slate-900">{dayName}</span>
                      </div>

                      {dayAvail.isActive ? (
                        <div className="flex items-center gap-3 text-xs">
                          <input
                            type="time"
                            value={dayAvail.startTime}
                            onChange={(e) => updateTimes(dayIdx, "startTime", e.target.value)}
                            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl outline-none font-medium"
                          />
                          <span className="text-slate-400 font-bold">to</span>
                          <input
                            type="time"
                            value={dayAvail.endTime}
                            onChange={(e) => updateTimes(dayIdx, "endTime", e.target.value)}
                            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl outline-none font-medium"
                          />
                        </div>
                      ) : (
                        <span className="text-xs font-semibold text-slate-400">Unavailable</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </Card>

            {/* Date-Specific Overrides & Blocked Slots */}
            <Card className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Custom Date Schedules & Blocked Slots</h3>
                  <p className="text-xs text-slate-500">Specific date overrides and blocked time windows.</p>
                </div>
                <Button
                  onClick={() => setShowOverrideModal(true)}
                  variant="outline"
                  size="sm"
                  leftIcon={<Plus className="h-4 w-4" />}
                >
                  Add Custom Date / Block
                </Button>
              </div>

              {dateOverrides.length === 0 ? (
                <div className="p-6 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-1">
                  <Calendar className="w-8 h-8 text-slate-400 mx-auto" />
                  <p className="text-xs text-slate-500 font-semibold">No custom date overrides configured.</p>
                  <p className="text-[11px] text-slate-400">Add a specific date to offer extra hours or block a day off.</p>
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
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              o.type === "BLOCKED" ? "bg-rose-200 text-rose-800" : "bg-emerald-200 text-emerald-800"
                            }`}
                          >
                            {o.type}
                          </span>
                          <span className="font-bold">{o.date}</span>
                        </div>
                        <div className="font-semibold">
                          {o.startTime} - {o.endTime}
                        </div>
                        {o.reason && <div className="text-[11px] opacity-80">{o.reason}</div>}
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDeleteOverride(o.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition-all"
                        title="Delete Override"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Current Live Class Slots & Blocked Slots Grid */}
            {slots.length > 0 && (
              <Card className="p-6 space-y-4">
                <h3 className="text-base font-bold text-slate-900">Current Slot Overview</h3>
                <div className="space-y-3">
                  {slots.slice(0, 10).map((s) => {
                    const activeCount = s.bookings?.filter((b) => b.status !== "CANCELLED").length || 0;
                    const isBlocked = s.status === "BLOCKED";
                    return (
                      <div
                        key={s.id}
                        className="p-4 rounded-2xl border border-slate-200 flex items-center justify-between gap-4 bg-white"
                      >
                        <div className="space-y-1 text-xs">
                          <div className="flex items-center gap-2">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                isBlocked
                                  ? "bg-rose-100 text-rose-700"
                                  : activeCount > 0
                                  ? "bg-blue-100 text-blue-700"
                                  : "bg-emerald-100 text-emerald-700"
                              }`}
                            >
                              {isBlocked ? "BLOCKED" : activeCount > 0 ? "BOOKED" : "AVAILABLE"}
                            </span>
                            <span className="font-bold text-slate-900">{s.title}</span>
                          </div>
                          <div className="text-slate-500">
                            {new Date(s.startTime).toLocaleString()} - {new Date(s.endTime).toLocaleTimeString()}
                          </div>
                        </div>

                        {isBlocked && (
                          <Button
                            onClick={() => handleUnblockSlot(s.id)}
                            variant="outline"
                            size="sm"
                            className="text-xs"
                          >
                            Unblock Slot
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </Card>
            )}
          </div>
        )}

        {/* Add Date Override / Block Modal */}
        {showOverrideModal && (
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-5 animate-in fade-in zoom-in duration-150">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-[#16805B]" /> Custom Date / Block Slot
                </h3>
                <button
                  onClick={() => setShowOverrideModal(false)}
                  className="text-slate-400 hover:text-slate-600 text-sm font-bold"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleAddOverride} className="space-y-4 text-xs font-sans">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Schedule Type</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setOverrideType("AVAILABLE")}
                      className={`py-2 px-3 rounded-xl font-bold border transition-all ${
                        overrideType === "AVAILABLE"
                          ? "bg-emerald-500 text-white border-emerald-500 shadow-xs"
                          : "bg-slate-50 text-slate-700 border-slate-200"
                      }`}
                    >
                      ✓ Extra Available Date
                    </button>
                    <button
                      type="button"
                      onClick={() => setOverrideType("BLOCKED")}
                      className={`py-2 px-3 rounded-xl font-bold border transition-all ${
                        overrideType === "BLOCKED"
                          ? "bg-rose-500 text-white border-rose-500 shadow-xs"
                          : "bg-slate-50 text-slate-700 border-slate-200"
                      }`}
                    >
                      🚫 Block Time Slot
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
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none font-medium"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Start Time</label>
                    <input
                      type="time"
                      value={overrideStart}
                      onChange={(e) => setOverrideStart(e.target.value)}
                      required
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">End Time</label>
                    <input
                      type="time"
                      value={overrideEnd}
                      onChange={(e) => setOverrideEnd(e.target.value)}
                      required
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Reason / Note (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Special weekend workshop or Personal leave"
                    value={overrideReason}
                    onChange={(e) => setOverrideReason(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none font-medium"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                  <Button type="button" variant="outline" size="sm" onClick={() => setShowOverrideModal(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" variant="primary" size="sm" disabled={submittingOverride}>
                    {submittingOverride ? "Saving..." : "Save Override"}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
