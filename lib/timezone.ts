/**
 * Centralized Timezone Utilities for EduConnects
 * Canonical timezone: Asia/Kolkata (IST - Indian Standard Time, UTC+05:30)
 */

export const INDIAN_TIMEZONE = "Asia/Kolkata";
export const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000; // 5 hours 30 mins in milliseconds

/**
 * Returns current Date in IST
 */
export function getNowInIST(): Date {
  return new Date();
}

/**
 * Parse a date string ("YYYY-MM-DD") and time string ("HH:mm") into a UTC Date object representing that instant in IST.
 */
export function parseISTDateTime(dateStr: string, timeStr: string): Date {
  const cleanTime = timeStr.includes(":") ? timeStr.slice(0, 5) : timeStr;
  return new Date(`${dateStr}T${cleanTime}:00+05:30`);
}

/**
 * Format Date to "YYYY-MM-DD" in Asia/Kolkata
 */
export function getISTDateString(date: Date = new Date()): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: INDIAN_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(date); // outputs YYYY-MM-DD
}

/**
 * Get day of week (0 = Sunday, 1 = Monday, ..., 6 = Saturday) in Asia/Kolkata
 */
export function getISTDayOfWeek(date: Date = new Date()): number {
  const dateStr = getISTDateString(date);
  const [y, m, d] = dateStr.split("-").map(Number);
  const istDate = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  return istDate.getUTCDay();
}

/**
 * Format a Date to 12-hour time string in Asia/Kolkata (e.g. "09:00 AM")
 */
export function formatISTTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-US", {
    timeZone: INDIAN_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(d);
}

/**
 * Format a 24h string ("09:00") into a 12h label ("09:00 AM")
 */
export function formatTime24to12(time24: string): string {
  const [hStr, mStr] = time24.split(":");
  const h = parseInt(hStr, 10);
  const m = parseInt(mStr || "0", 10);
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${String(h12).padStart(2, "0")}:${String(m).padStart(2, "0")} ${ampm}`;
}

/**
 * Format a time range string (e.g. "09:00 AM - 10:00 AM IST")
 */
export function formatISTTimeRange(start: Date | string, end: Date | string): string {
  return `${formatISTTime(start)} - ${formatISTTime(end)} IST`;
}

/**
 * Format a full display date in IST (e.g. "Mon, Oct 19, 2026")
 */
export function formatISTDisplayDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-US", {
    timeZone: INDIAN_TIMEZONE,
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(d);
}

/**
 * Check if a slot start time has passed or is within the booking cutoff window
 * Default cutoff is 15 minutes before slot start.
 */
export function isSlotPastCutoff(slotStart: Date | string, cutoffMinutes: number = 15): boolean {
  const startMs = typeof slotStart === "string" ? new Date(slotStart).getTime() : slotStart.getTime();
  const nowMs = Date.now();
  return startMs <= nowMs + cutoffMinutes * 60 * 1000;
}
