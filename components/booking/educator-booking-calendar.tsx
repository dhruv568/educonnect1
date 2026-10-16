"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Calendar as CalendarIcon,
  Clock,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  ShieldCheck,
  Loader2,
  Sparkles,
  RefreshCw,
  Info,
  CalendarDays,
  Lock,
} from "lucide-react";
import { formatCurrency } from "@/lib/currency";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export interface SlotItem {
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
  hasStudentConflict?: boolean;
  price: number;
  classType: string;
  maxCapacity: number;
  bookedCount: number;
  reason?: string | null;
}

export interface DayAvailability {
  dateStr: string; // YYYY-MM-DD
  dayName: string; // "Today", "Tomorrow", "Mon", etc.
  displayDate: string; // "Oct 19"
  fullDate: string; // "Monday, Oct 19, 2026"
  dayOfWeek: number;
  isAvailableDay: boolean;
  availableCount: number;
  slots: SlotItem[];
}

export interface SelectedSlot {
  dateStr: string;
  fullDate: string;
  time: string;
  startTime: string;
  endTime: string;
  startIso: string;
  endIso: string;
  price: number;
  slotId?: string | null;
}

interface EducatorBookingCalendarProps {
  teacherId: string;
  teacherName?: string;
  hourlyRate?: number;
  subjects?: string[];
  onBookingSuccess?: (result: any) => void;
  onCancel?: () => void;
  compact?: boolean;
}

export function EducatorBookingCalendar({
  teacherId,
  teacherName = "Educator",
  hourlyRate = 300,
  subjects = [],
  onBookingSuccess,
  onCancel,
  compact = false,
}: EducatorBookingCalendarProps) {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dates, setDates] = useState<DayAvailability[]>([]);
  const [educatorData, setEducatorData] = useState<any>(null);

  // Selected date index (which day is currently active in the viewer)
  const [selectedDayIdx, setSelectedDayIdx] = useState(0);

  // Multiple slot selection state
  const [selectedSlots, setSelectedSlots] = useState<SelectedSlot[]>([]);

  // Booking submission states
  const [submitting, setSubmitting] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [bookingSuccess, setBookingSuccess] = useState<any | null>(null);

  // Pagination of dates (display 7 days per page in the date bar)
  const [pageOffset, setPageOffset] = useState(0);
  const DAYS_PER_VIEW = compact ? 5 : 7;

  // Fetch availability from the canonical API
  const fetchAvailability = useCallback(async () => {
    setLoading(true);
    setError(null);
    setBookingError(null);
    try {
      const res = await fetch(`/api/teachers/${teacherId}/availability?days=21`);
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || json.error || "Failed to load educator schedule.");
      }

      setDates(json.data.dates || []);
      setEducatorData(json.data.educator || null);

      // Default selected day: first day that has available slots, or day 0
      const firstAvailDayIdx = (json.data.dates || []).findIndex(
        (d: DayAvailability) => d.isAvailableDay
      );
      if (firstAvailDayIdx !== -1) {
        setSelectedDayIdx(firstAvailDayIdx);
        setPageOffset(Math.floor(firstAvailDayIdx / DAYS_PER_VIEW) * DAYS_PER_VIEW);
      } else {
        setSelectedDayIdx(0);
        setPageOffset(0);
      }
    } catch (err: any) {
      console.error("Availability fetch error:", err);
      setError(err.message || "Failed to fetch availability. Please retry.");
    } finally {
      setLoading(false);
    }
  }, [teacherId, DAYS_PER_VIEW]);

  useEffect(() => {
    fetchAvailability();
  }, [fetchAvailability]);

  // Current active day
  const activeDay = dates[selectedDayIdx] || null;

  // Visible days in the date picker strip
  const visibleDays = useMemo(() => {
    return dates.slice(pageOffset, pageOffset + DAYS_PER_VIEW);
  }, [dates, pageOffset, DAYS_PER_VIEW]);

  const canGoPrev = pageOffset > 0;
  const canGoNext = pageOffset + DAYS_PER_VIEW < dates.length;

  const handlePrevPage = () => {
    if (canGoPrev) {
      const nextOffset = Math.max(0, pageOffset - DAYS_PER_VIEW);
      setPageOffset(nextOffset);
      setSelectedDayIdx(nextOffset);
    }
  };

  const handleNextPage = () => {
    if (canGoNext) {
      const nextOffset = pageOffset + DAYS_PER_VIEW;
      setPageOffset(nextOffset);
      setSelectedDayIdx(nextOffset);
    }
  };

  // Jump to today
  const handleJumpToToday = () => {
    setSelectedDayIdx(0);
    setPageOffset(0);
  };

  // Check if a slot is currently selected
  const isSlotSelected = (dateStr: string, startTime: string) => {
    return selectedSlots.some(
      (s) => s.dateStr === dateStr && s.startTime === startTime
    );
  };

  // Toggle slot selection
  const handleSlotClick = (slot: SlotItem, day: DayAvailability) => {
    setBookingError(null);

    // If slot is not available, show helpful feedback
    if (!slot.isAvailable) {
      if (slot.status === "BOOKED") {
        setBookingError(`The slot at ${slot.time} on ${day.displayDate} is already booked.`);
      } else if (slot.status === "EXPIRED") {
        setBookingError(`The slot at ${slot.time} has already passed or is past the booking cutoff.`);
      } else if (slot.status === "BLOCKED") {
        setBookingError(`The educator is unavailable at ${slot.time} (${slot.reason || "Blocked"}).`);
      } else {
        setBookingError(`This time slot is outside the educator's available working hours.`);
      }
      return;
    }

    const key = `${day.dateStr}_${slot.startTime}`;
    const alreadySelected = isSlotSelected(day.dateStr, slot.startTime);

    if (alreadySelected) {
      // Deselect
      setSelectedSlots((prev) =>
        prev.filter((s) => !(s.dateStr === day.dateStr && s.startTime === slot.startTime))
      );
    } else {
      // Check for overlapping selection
      const newSlotStart = new Date(slot.startIso).getTime();
      const newSlotEnd = new Date(slot.endIso).getTime();

      const overlaps = selectedSlots.some((s) => {
        const sStart = new Date(s.startIso).getTime();
        const sEnd = new Date(s.endIso).getTime();
        return newSlotStart < sEnd && newSlotEnd > sStart;
      });

      if (overlaps) {
        setBookingError("You cannot select overlapping time slots.");
        return;
      }

      // Add to selection
      const newSelected: SelectedSlot = {
        dateStr: day.dateStr,
        fullDate: day.fullDate,
        time: slot.time,
        startTime: slot.startTime,
        endTime: slot.endTime,
        startIso: slot.startIso,
        endIso: slot.endIso,
        price: slot.price,
        slotId: slot.slotId,
      };

      setSelectedSlots((prev) => [...prev, newSelected]);
    }
  };

  // Remove specific selected slot
  const handleRemoveSelectedSlot = (dateStr: string, startTime: string) => {
    setSelectedSlots((prev) =>
      prev.filter((s) => !(s.dateStr === dateStr && s.startTime === startTime))
    );
  };

  // Clear all selections
  const handleClearAll = () => {
    setSelectedSlots([]);
    setBookingError(null);
  };

  // Calculate total price
  const totalPrice = useMemo(() => {
    return selectedSlots.reduce((sum, s) => sum + s.price, 0);
  }, [selectedSlots]);

  // Submit multi-slot booking
  const handleConfirmBooking = async () => {
    if (selectedSlots.length === 0) {
      setBookingError("Please select at least one available time slot.");
      return;
    }

    setSubmitting(true);
    setBookingError(null);

    try {
      const payload = {
        slots: selectedSlots.map((s) => ({
          slotId: s.slotId || undefined,
          date: s.dateStr,
          startTime: s.startTime,
          endTime: s.endTime,
          startIso: s.startIso,
          endIso: s.endIso,
          price: s.price,
        })),
      };

      const res = await fetch(`/api/teachers/${teacherId}/book-sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        // Specific conflict handling
        const rawErrMsg = json.error?.message || json.error || "Failed to confirm session bookings.";
        const cleanMsg = rawErrMsg.replace(/^[A-Z_]+:\s*/, "");

        // If a slot conflict occurred, identify if one of the slots was taken and remove it
        if (rawErrMsg.includes("SLOT_CONFLICT") || rawErrMsg.includes("SLOT_OCCUPIED")) {
          // Re-fetch availability to update calendar view with real state
          await fetchAvailability();
        }

        throw new Error(cleanMsg);
      }

      const result = json.data;

      if (result.isFree) {
        // Free sessions booked immediately
        setBookingSuccess({
          message: `Success! ${result.slotCount || selectedSlots.length} session(s) booked successfully.`,
          count: result.slotCount || selectedSlots.length,
          slots: selectedSlots,
        });
        setSelectedSlots([]);
        if (onBookingSuccess) onBookingSuccess(result);
      } else if (result.checkoutUrl) {
        // Paid sessions -> redirect to checkout
        router.push(result.checkoutUrl);
      } else {
        router.push(`/payment/checkout?type=LIVE_CLASS_BOOKING&orderId=${result.orderId}`);
      }
    } catch (err: any) {
      console.error("Booking confirmation error:", err);
      setBookingError(err.message || "Failed to confirm booking. Please choose another slot.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xl overflow-hidden font-sans">
      {/* Top Banner & Title */}
      <div className="bg-gradient-to-r from-blue-700 via-blue-800 to-indigo-900 text-white p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/10 text-[11px] font-bold uppercase tracking-wider text-amber-300">
            <Sparkles className="w-3 h-3" /> Live Calendar Booking
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight">
            Book Live Sessions with {teacherName}
          </h2>
          <p className="text-xs text-blue-100 font-medium">
            Select one or more available time slots. Multi-slot booking supported across days.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right bg-white/10 backdrop-blur-xs px-4 py-2 rounded-2xl border border-white/10">
            <span className="text-[10px] uppercase font-bold text-blue-200 block">Session Rate</span>
            <span className="text-lg font-black text-white">{formatCurrency(hourlyRate)}/hr</span>
          </div>
          {onCancel && (
            <button
              onClick={onCancel}
              className="text-white/70 hover:text-white p-2 rounded-xl hover:bg-white/10 transition-colors"
              title="Close calendar"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Visual State Color Legend Bar */}
      <div className="bg-slate-50 border-b border-slate-200 px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3 text-xs">
        <span className="font-bold text-slate-700 flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5 text-blue-600" /> Slot Indicators:
        </span>
        <div className="flex flex-wrap items-center gap-4 text-[11px] font-bold">
          <span className="flex items-center gap-1.5 text-emerald-700">
            <span className="w-3 h-3 rounded-md bg-emerald-500 ring-2 ring-emerald-200" />
            GREEN: Available
          </span>
          <span className="flex items-center gap-1.5 text-rose-700">
            <span className="w-3 h-3 rounded-md bg-rose-500 ring-2 ring-rose-200" />
            RED: Already Booked
          </span>
          <span className="flex items-center gap-1.5 text-slate-500">
            <span className="w-3 h-3 rounded-md bg-slate-300 ring-2 ring-slate-200" />
            GREY: Unavailable / Break
          </span>
          <span className="flex items-center gap-1.5 text-blue-700">
            <span className="w-3 h-3 rounded-md bg-blue-600 ring-2 ring-blue-300 flex items-center justify-center text-white text-[9px]">
              ✓
            </span>
            BLUE: Selected by You
          </span>
        </div>
      </div>

      {/* Error & Success Notification Banners */}
      {error && (
        <div className="m-4 sm:m-6 p-4 rounded-2xl bg-red-50 border border-red-200 text-xs font-semibold text-red-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{error}</span>
          </div>
          <Button variant="outline" size="sm" onClick={fetchAvailability} leftIcon={<RefreshCw className="w-3.5 h-3.5" />}>
            Retry
          </Button>
        </div>
      )}

      {bookingError && (
        <div className="m-4 sm:m-6 p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs font-semibold text-amber-900 flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Booking Conflict or Notice</p>
              <p className="text-[11px] text-amber-800 mt-0.5">{bookingError}</p>
            </div>
          </div>
          <button
            onClick={() => setBookingError(null)}
            className="text-amber-500 hover:text-amber-800 p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {bookingSuccess && (
        <div className="m-4 sm:m-6 p-6 rounded-3xl bg-emerald-50 border-2 border-emerald-300 text-emerald-950 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-md">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-emerald-900">
                Sessions Confirmed Successfully!
              </h3>
              <p className="text-xs text-emerald-700 font-medium">{bookingSuccess.message}</p>
            </div>
          </div>
          <div className="pt-2 flex flex-wrap gap-2">
            <Button
              variant="student"
              size="sm"
              onClick={() => router.push("/student/live-classes")}
            >
              View in My Live Classes
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setBookingSuccess(null);
                fetchAvailability();
              }}
            >
              Book More Sessions
            </Button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      {loading ? (
        <div className="p-12 text-center space-y-4">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
          <p className="text-xs text-slate-500 font-semibold">
            Checking real educator schedule & working hours...
          </p>
        </div>
      ) : dates.length === 0 ? (
        <div className="p-12 text-center space-y-3">
          <CalendarIcon className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-base font-bold text-slate-800">No Teaching Hours Configured</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            This educator has not configured weekly availability yet. Check back soon.
          </p>
        </div>
      ) : (
        <div className="p-4 sm:p-6 space-y-6">
          {/* Date Selector Navigation Strip */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-extrabold uppercase tracking-wider text-slate-600">
                  Select Day
                </span>
                <span className="text-[11px] text-slate-400 font-medium">
                  (Indian Standard Time - IST)
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleJumpToToday}
                  className="text-[11px] h-8 px-2.5 font-bold"
                >
                  Today
                </Button>
                <button
                  type="button"
                  onClick={handlePrevPage}
                  disabled={!canGoPrev}
                  className="p-1.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                  title="Previous days"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleNextPage}
                  disabled={!canGoNext}
                  className="p-1.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                  title="Next days"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Date Pills Row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
              {visibleDays.map((day, vIdx) => {
                const actualIdx = pageOffset + vIdx;
                const isSelected = actualIdx === selectedDayIdx;
                const hasSelectedSlotsOnThisDay = selectedSlots.some(
                  (s) => s.dateStr === day.dateStr
                );

                return (
                  <button
                    key={day.dateStr}
                    type="button"
                    onClick={() => setSelectedDayIdx(actualIdx)}
                    className={`p-3 rounded-2xl text-left border transition-all flex flex-col justify-between gap-1.5 relative ${
                      isSelected
                        ? "bg-blue-600 text-white border-blue-600 shadow-md scale-[1.02]"
                        : hasSelectedSlotsOnThisDay
                        ? "bg-blue-50 text-blue-900 border-blue-300"
                        : day.isAvailableDay
                        ? "bg-white text-slate-800 border-slate-200 hover:border-blue-300 hover:bg-slate-50/80"
                        : "bg-slate-50 text-slate-400 border-slate-200 opacity-70"
                    }`}
                  >
                    {hasSelectedSlotsOnThisDay && !isSelected && (
                      <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-blue-600 text-white text-[9px] font-bold flex items-center justify-center shadow-xs">
                        {selectedSlots.filter((s) => s.dateStr === day.dateStr).length}
                      </span>
                    )}

                    <div className="flex items-center justify-between w-full">
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider ${
                          isSelected ? "text-blue-100" : "text-slate-400"
                        }`}
                      >
                        {day.dayName}
                      </span>
                      {day.isAvailableDay ? (
                        <span
                          className={`w-2 h-2 rounded-full ${
                            isSelected ? "bg-amber-300" : "bg-emerald-500"
                          }`}
                          title="Slots available"
                        />
                      ) : (
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                      )}
                    </div>

                    <div>
                      <div className="text-sm font-black">{day.displayDate}</div>
                      <div
                        className={`text-[10px] font-semibold mt-0.5 ${
                          isSelected
                            ? "text-blue-100"
                            : day.isAvailableDay
                            ? "text-emerald-600"
                            : "text-slate-400"
                        }`}
                      >
                        {day.isAvailableDay
                          ? `${day.availableCount} open`
                          : "Unavailable"}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active Day Slots Grid */}
          {activeDay && (
            <div className="space-y-4 pt-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100">
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-blue-600" /> {activeDay.fullDate}
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    {activeDay.isAvailableDay
                      ? `Click any green slot to add to selection. Multiple slots can be selected.`
                      : `The educator has no open slots on this date.`}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-slate-600">
                    Day Status:
                  </span>
                  {activeDay.isAvailableDay ? (
                    <Badge variant="success" size="sm">
                      {activeDay.availableCount} Available Slot(s)
                    </Badge>
                  ) : (
                    <Badge variant="outline" size="sm">
                      Unavailable
                    </Badge>
                  )}
                </div>
              </div>

              {/* Slots Layout */}
              {activeDay.slots.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-2">
                  <Clock className="w-8 h-8 text-slate-300 mx-auto" />
                  <p className="text-xs font-bold text-slate-600">
                    No teaching slots scheduled on this date.
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Try selecting another day above or view subsequent weeks.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {activeDay.slots.map((slot, idx) => {
                    const isSelected = isSlotSelected(activeDay.dateStr, slot.startTime);

                    // Determine exact visual state classes:
                    // BLUE: Selected by current student
                    // GREEN: Available and bookable
                    // RED: Booked / Occupied
                    // GREY: Unavailable, Break, Cutoff, Blocked
                    let cardClasses = "";
                    let badgeLabel = "";
                    let badgeColor = "";

                    if (isSelected) {
                      cardClasses =
                        "bg-blue-600 text-white border-blue-600 shadow-md ring-2 ring-blue-400 cursor-pointer scale-[1.02]";
                      badgeLabel = "SELECTED";
                      badgeColor = "bg-white/20 text-white";
                    } else if (slot.visualState === "GREEN") {
                      cardClasses =
                        "bg-emerald-50/70 border-emerald-300 text-emerald-950 hover:bg-emerald-100/70 hover:border-emerald-400 cursor-pointer shadow-2xs hover:shadow-sm";
                      badgeLabel = "AVAILABLE";
                      badgeColor = "bg-emerald-500 text-white";
                    } else if (slot.visualState === "RED") {
                      cardClasses =
                        "bg-rose-50/80 border-rose-200 text-rose-900 opacity-80 cursor-not-allowed";
                      badgeLabel = slot.reason === "In checkout by another student" ? "CHECKOUT" : "BOOKED";
                      badgeColor = "bg-rose-500 text-white";
                    } else {
                      // GREY
                      cardClasses =
                        "bg-slate-100 border-slate-200 text-slate-500 opacity-60 cursor-not-allowed";
                      badgeLabel = slot.reason || "UNAVAILABLE";
                      badgeColor = "bg-slate-300 text-slate-700";
                    }

                    return (
                      <button
                        key={`${slot.startTime}_${idx}`}
                        type="button"
                        onClick={() => handleSlotClick(slot, activeDay)}
                        className={`p-3.5 rounded-2xl border text-left flex flex-col justify-between gap-2.5 transition-all ${cardClasses}`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span className="text-xs font-black tracking-tight">
                            {slot.time}
                          </span>
                          <span
                            className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${badgeColor}`}
                          >
                            {isSelected ? (
                              <span className="flex items-center gap-1">
                                <Check className="w-2.5 h-2.5" /> Selected
                              </span>
                            ) : (
                              badgeLabel
                            )}
                          </span>
                        </div>

                        <div className="flex items-center justify-between w-full pt-1 border-t border-black/5 text-[11px] font-semibold">
                          <span className={isSelected ? "text-blue-100" : "text-slate-500"}>
                            1-on-1 Session
                          </span>
                          <span className="font-extrabold">
                            {formatCurrency(slot.price)}
                          </span>
                        </div>

                        {slot.reason && !isSelected && (
                          <div className="text-[10px] opacity-75 truncate" title={slot.reason}>
                            {slot.reason}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Multiple Selected Slots Drawer & Confirmation Summary */}
          {selectedSlots.length > 0 && (
            <div className="mt-6 p-5 sm:p-6 rounded-3xl bg-slate-900 text-white shadow-2xl space-y-4 border border-slate-800 animate-in fade-in slide-in-from-bottom-2 duration-200">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-extrabold">
                    {selectedSlots.length}
                  </div>
                  <div>
                    <h4 className="text-sm font-black">
                      {selectedSlots.length} Time Slot{selectedSlots.length > 1 ? "s" : ""} Selected
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      Review your chosen dates and times before confirming.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleClearAll}
                  className="text-xs text-slate-400 hover:text-white underline font-semibold"
                >
                  Clear Selection
                </button>
              </div>

              {/* Selected Slots List */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 max-h-48 overflow-y-auto pr-1">
                {selectedSlots.map((s, idx) => (
                  <div
                    key={`${s.dateStr}_${s.startTime}_${idx}`}
                    className="p-3 rounded-2xl bg-slate-800/80 border border-slate-700/80 flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-extrabold text-white truncate">
                        {s.fullDate}
                      </div>
                      <div className="text-[11px] font-bold text-blue-400 flex items-center gap-1">
                        <Clock className="w-3 h-3 shrink-0" /> {s.time}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        Fee: {formatCurrency(s.price)}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveSelectedSlot(s.dateStr, s.startTime)}
                      className="p-1 text-slate-400 hover:text-rose-400 hover:bg-slate-700 rounded-lg transition-colors shrink-0"
                      title="Remove slot"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Bottom Price & Confirmation Action */}
              <div className="pt-3 border-t border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                    Total Estimated Amount
                  </span>
                  <div className="text-2xl font-black text-white">
                    {totalPrice === 0 ? "FREE" : formatCurrency(totalPrice)}
                  </div>
                  <span className="text-[10px] text-slate-400 font-medium">
                    (Includes live classroom, notes & homework support)
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  {onCancel && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={onCancel}
                      className="bg-transparent text-white border-slate-700 hover:bg-slate-800"
                    >
                      Cancel
                    </Button>
                  )}
                  <Button
                    variant="student"
                    size="lg"
                    disabled={submitting}
                    onClick={handleConfirmBooking}
                    className="bg-blue-600 hover:bg-blue-500 text-white font-extrabold shadow-lg shadow-blue-600/30 min-w-44"
                  >
                    {submitting ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Revalidating & Confirming...
                      </span>
                    ) : totalPrice === 0 ? (
                      `Confirm ${selectedSlots.length} Free Booking(s)`
                    ) : (
                      `Proceed to Book (${selectedSlots.length})`
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
