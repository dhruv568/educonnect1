"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Bell,
  CheckCircle2,
  AlertTriangle,
  Info,
  Calendar,
  CheckCheck,
  X,
  ExternalLink,
  Sparkles,
} from "lucide-react";

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: string;
  actionUrl?: string;
  linkUrl?: string;
  isRead: boolean;
  createdAt: string;
}

export interface NotificationPopoverProps {
  /**
   * Theme variant for the notification trigger bell:
   * - "educator": Light teal / crisp white button matching the dark teal Educator header
   * - "light": Dark slate button tailored for light/white backgrounds (e.g. DashboardLayout topbar)
   * - "dark": Crisp white button tailored for dark backgrounds (e.g. Learner/Admin dark headers)
   * - "auto" | "default": Smart auto-detection based on current route or theme context
   */
  variant?: "educator" | "light" | "dark" | "default" | "auto";
  /** Optional custom CSS classes for the root container */
  className?: string;
  /** Optional custom CSS classes for the trigger button */
  buttonClassName?: string;
  /** Optional custom CSS classes for the popover panel */
  popoverClassName?: string;
}

export function NotificationPopover({
  variant = "auto",
  className = "",
  buttonClassName = "",
  popoverClassName = "",
}: NotificationPopoverProps = {}) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [filter, setFilter] = useState<"ALL" | "UNREAD">("ALL");
  const popoverRef = useRef<HTMLDivElement>(null);

  // Resolve active visual variant
  let resolvedVariant = variant;
  if (!resolvedVariant || resolvedVariant === "default" || resolvedVariant === "auto") {
    if (typeof window !== "undefined") {
      const isTeacherRoute = window.location.pathname.startsWith("/teacher");
      const isDashboard = window.location.pathname.startsWith("/teacher/dashboard");
      if (isTeacherRoute && !isDashboard) {
        resolvedVariant = "educator";
      } else {
        resolvedVariant = "light";
      }
    } else {
      resolvedVariant = "light";
    }
  }

  const isEducatorVariant = resolvedVariant === "educator";
  const isDarkVariant = resolvedVariant === "dark";

  let triggerClasses =
    "relative h-10 w-10 flex items-center justify-center rounded-xl transition-all duration-200 cursor-pointer select-none group shrink-0 focus:outline-none ";

  if (isEducatorVariant) {
    triggerClasses +=
      "bg-white/10 hover:bg-white/20 active:bg-white/25 active:scale-95 text-teal-100 hover:text-white border border-teal-300/30 hover:border-teal-200/60 shadow-2xs focus-visible:ring-2 focus-visible:ring-teal-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#115E59]";
  } else if (isDarkVariant) {
    triggerClasses +=
      "bg-white/10 hover:bg-white/20 active:bg-white/25 active:scale-95 text-white/90 hover:text-white border border-white/20 hover:border-white/40 shadow-2xs focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900";
  } else {
    // light background (e.g. DashboardLayout)
    triggerClasses +=
      "bg-slate-50 hover:bg-slate-100 active:bg-slate-200 active:scale-95 text-slate-700 hover:text-slate-950 border border-slate-200/80 shadow-2xs focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2 focus-visible:ring-offset-white";
  }

  if (buttonClassName) {
    triggerClasses += ` ${buttonClassName}`;
  }

  const iconClasses = isEducatorVariant
    ? "h-5 w-5 text-teal-100 group-hover:text-white group-hover:rotate-12 transition-all duration-200"
    : isDarkVariant
    ? "h-5 w-5 text-white/90 group-hover:text-white group-hover:rotate-12 transition-all duration-200"
    : "h-5 w-5 text-slate-700 group-hover:text-slate-950 group-hover:rotate-12 transition-all duration-200";

  const badgeRing = isEducatorVariant
    ? "ring-[#115E59]"
    : isDarkVariant
    ? "ring-slate-900"
    : "ring-white";

  const fetchNotifications = async () => {
    try {
      const res = await fetch("/api/notifications?limit=10");
      const data = await res.json();
      if (data.success && data.data) {
        setNotifications(data.data.notifications || []);
        setUnreadCount(data.data.unreadCount || 0);
      }
    } catch (err) {
      console.error("Failed to load notifications:", err);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000); // refresh every 30s
    return () => clearInterval(interval);
  }, []);

  // Close popover when clicking outside (supports desktop & mobile touch)
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("touchstart", handleClickOutside, { passive: true });
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [isOpen]);

  const handleMarkAllRead = async () => {
    try {
      await fetch("/api/notifications/read-all", {
        method: "POST",
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error("Failed to mark all as read:", err);
    }
  };

  const handleItemClick = async (item: NotificationItem) => {
    if (!item.isRead) {
      try {
        await fetch(`/api/notifications/${item.id}/read`, {
          method: "PATCH",
        });
        setNotifications((prev) =>
          prev.map((n) => (n.id === item.id ? { ...n, isRead: true } : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      } catch (err) {
        console.error("Failed to mark item as read:", err);
      }
    }

    const targetUrl = item.actionUrl || item.linkUrl;
    if (targetUrl) {
      setIsOpen(false);
      router.push(targetUrl);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "SUCCESS":
      case "PAYMENT_SUCCESS":
      case "TEACHER_VERIFIED":
      case "COURSE_ENROLLED":
        return <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0" />;
      case "WARNING":
      case "PAYMENT_FAILED":
      case "TEACHER_REJECTED":
        return <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0" />;
      case "CLASS":
      case "CLASS_BOOKED":
      case "CLASS_STARTING_SOON":
        return <Calendar className="h-4 w-4 text-indigo-500 flex-shrink-0" />;
      default:
        return <Sparkles className="h-4 w-4 text-blue-500 flex-shrink-0" />;
    }
  };

  const getTimeAgo = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diffSec = Math.floor((now.getTime() - d.getTime()) / 1000);
    if (diffSec < 60) return "Just now";
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
    return `${Math.floor(diffSec / 86400)}d ago`;
  };

  const filteredItems = notifications.filter((n) => {
    if (filter === "UNREAD") return !n.isRead;
    return true;
  });

  return (
    <div className={`relative ${className}`} ref={popoverRef}>
      {/* Trigger Bell Button */}
      <button
        type="button"
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) fetchNotifications();
        }}
        className={triggerClasses}
        title="Notifications"
        aria-label="View notifications"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <Bell className={iconClasses} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex items-center justify-center pointer-events-none">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
            <span
              className={`relative inline-flex rounded-full h-4 min-w-[1rem] px-1 bg-rose-500 text-[10px] font-black text-white items-center justify-center ring-2 ${badgeRing} shadow-xs`}
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          </span>
        )}
      </button>

      {/* Popover Dropdown Panel */}
      {isOpen && (
        <div
          className={`absolute right-0 mt-2 sm:mt-3 w-[calc(100vw-2rem)] sm:w-96 max-w-sm sm:max-w-md bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 ${popoverClassName}`}
          role="region"
          aria-label="Notifications panel"
        >
          {/* Header */}
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-900/70">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-black text-slate-900 dark:text-slate-100">
                Notifications
              </h3>
              {unreadCount > 0 && (
                <span
                  className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                    isEducatorVariant
                      ? "bg-teal-100 text-teal-800 dark:bg-teal-900/60 dark:text-teal-200"
                      : "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300"
                  }`}
                >
                  {unreadCount} new
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllRead}
                  className={`text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer ${
                    isEducatorVariant
                      ? "text-teal-700 hover:text-teal-800 dark:text-teal-400"
                      : "text-blue-600 hover:text-blue-700 dark:text-blue-400"
                  }`}
                  title="Mark all as read"
                >
                  <CheckCheck className="h-3.5 w-3.5" /> Read All
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                aria-label="Close notification panel"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center px-4 py-2 bg-slate-100/60 dark:bg-slate-950/40 border-b border-slate-100 dark:border-slate-800 gap-1 text-xs">
            <button
              type="button"
              onClick={() => setFilter("ALL")}
              className={`px-3 py-1 font-bold rounded-lg transition-colors cursor-pointer ${
                filter === "ALL"
                  ? isEducatorVariant
                    ? "bg-white dark:bg-slate-800 text-teal-700 dark:text-teal-300 shadow-xs"
                    : "bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-xs"
                  : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              All ({notifications.length})
            </button>
            <button
              type="button"
              onClick={() => setFilter("UNREAD")}
              className={`px-3 py-1 font-bold rounded-lg transition-colors cursor-pointer ${
                filter === "UNREAD"
                  ? isEducatorVariant
                    ? "bg-white dark:bg-slate-800 text-teal-700 dark:text-teal-300 shadow-xs"
                    : "bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-xs"
                  : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              Unread ({unreadCount})
            </button>
          </div>

          {/* Notifications List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60">
            {filteredItems.length === 0 ? (
              <div className="p-8 text-center space-y-2">
                <Bell className="h-8 w-8 text-slate-300 dark:text-slate-600 mx-auto" />
                <p className="text-xs font-semibold text-slate-500">
                  {filter === "UNREAD"
                    ? "No unread notifications"
                    : "No notifications yet"}
                </p>
              </div>
            ) : (
              filteredItems.map((item) => {
                const targetUrl = item.actionUrl || item.linkUrl;
                return (
                  <div
                    key={item.id}
                    onClick={() => handleItemClick(item)}
                    className={`p-4 flex items-start gap-3 transition-colors cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 ${
                      !item.isRead
                        ? isEducatorVariant
                          ? "bg-teal-50/40 dark:bg-teal-950/20"
                          : "bg-blue-50/40 dark:bg-blue-950/20"
                        : ""
                    }`}
                  >
                    <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 flex-shrink-0 mt-0.5">
                      {getNotificationIcon(item.type)}
                    </div>

                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                          {item.title}
                        </h4>
                        <span className="text-[10px] font-semibold text-slate-400 flex-shrink-0">
                          {getTimeAgo(item.createdAt)}
                        </span>
                      </div>

                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed line-clamp-2">
                        {item.message}
                      </p>

                      {targetUrl && (
                        <span
                          className={`inline-flex items-center gap-1 text-[11px] font-bold hover:underline pt-1 ${
                            isEducatorVariant
                              ? "text-teal-700 dark:text-teal-400"
                              : "text-blue-600 dark:text-blue-400"
                          }`}
                        >
                          View details <ExternalLink className="h-3 w-3" />
                        </span>
                      )}
                    </div>

                    {!item.isRead && (
                      <span
                        className={`h-2 w-2 rounded-full flex-shrink-0 mt-1.5 ${
                          isEducatorVariant ? "bg-teal-600" : "bg-blue-600"
                        }`}
                      />
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="p-3 bg-slate-50/80 dark:bg-slate-900/80 border-t border-slate-100 dark:border-slate-800 text-center">
            <Link
              href="/notifications"
              onClick={() => setIsOpen(false)}
              className={`text-xs font-bold hover:underline ${
                isEducatorVariant
                  ? "text-teal-700 dark:text-teal-400"
                  : "text-blue-600 dark:text-blue-400"
              }`}
            >
              View Notification Center →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
