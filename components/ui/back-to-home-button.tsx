"use client";

import React, { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getHomeUrl, getLearnerDomain, getEducatorDomain } from "@/lib/app-url";

export interface BackToHomeButtonProps {
  /**
   * Visual theme variant:
   * - "default": Soft pill button for dashboard header (theme-aware)
   * - "sidebar": Full-width navigation button for dashboard sidebar (theme-aware)
   * - "dark": Dark slate button for dark theme pages (LMS, earnings, receipts)
   * - "light": White/slate border button
   */
  variant?: "default" | "sidebar" | "dark" | "light";
  /** Optional custom CSS classes */
  className?: string;
  /** Whether to show compact label on mobile (default: true) */
  compactOnMobile?: boolean;
  /** Optional custom target URL override */
  href?: string;
  /** Role context or theme ("learner" | "student" | "educator" | "teacher" | "admin") */
  roleContext?: string;
  /** Optional click handler (e.g. to close drawers or dropdowns) */
  onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
}

export function BackToHomeButton({
  variant = "default",
  className = "",
  compactOnMobile = true,
  href,
  roleContext,
  onClick,
}: BackToHomeButtonProps) {
  const pathname = usePathname();
  const [homeUrl, setHomeUrl] = useState<string>("https://learners.educonnects.co.in");

  useEffect(() => {
    try {
      if (href) {
        setHomeUrl(href);
        return;
      }

      const isEducatorPage =
        roleContext === "teacher" ||
        roleContext === "educator" ||
        pathname?.startsWith("/teacher") ||
        (typeof window !== "undefined" && window.location.hostname.toLowerCase().includes("educator"));

      const isLearnerPage =
        roleContext === "student" ||
        roleContext === "learner" ||
        pathname?.startsWith("/student") ||
        pathname?.startsWith("/learn") ||
        (typeof window !== "undefined" && window.location.hostname.toLowerCase().includes("learner"));

      const isLocal =
        typeof window !== "undefined" &&
        (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");

      if (isEducatorPage) {
        setHomeUrl(isLocal ? "/teacher" : getEducatorDomain());
      } else if (isLearnerPage) {
        setHomeUrl(isLocal ? "/student" : getLearnerDomain());
      } else {
        setHomeUrl(isLocal ? "/" : getHomeUrl());
      }
    } catch {
      setHomeUrl("https://learners.educonnects.co.in");
    }
  }, [href, pathname, roleContext]);

  const isEducator =
    roleContext === "teacher" ||
    roleContext === "educator" ||
    pathname?.startsWith("/teacher") ||
    (typeof window !== "undefined" && window.location.hostname.toLowerCase().includes("educator"));

  const isLearner =
    roleContext === "student" ||
    roleContext === "learner" ||
    pathname?.startsWith("/student") ||
    pathname?.startsWith("/learn") ||
    (typeof window !== "undefined" && window.location.hostname.toLowerCase().includes("learner"));

  if (variant === "sidebar") {
    const sidebarThemeClasses = isLearner
      ? "text-slate-300 hover:text-white hover:bg-blue-950/60 border-transparent hover:border-blue-800/40"
      : isEducator
      ? "text-teal-100/90 hover:text-white hover:bg-[#115E59]/40 border-transparent hover:border-[#115E59]/60"
      : "text-teal-100/90 hover:text-white hover:bg-[#1B6863]/40 border-transparent hover:border-[#1B6863]/60";

    const sidebarIconClasses = isLearner
      ? "text-blue-300/80 group-hover:text-white"
      : isEducator
      ? "text-teal-300/80 group-hover:text-white"
      : "text-teal-200/70 group-hover:text-[#F2C14E]";

    return (
      <a
        href={homeUrl}
        onClick={onClick}
        title="Return to EduConnects Homepage"
        aria-label="Back to Home"
        data-testid="back-to-home-sidebar-btn"
        className={`flex items-center gap-3 w-full px-3.5 py-2.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer group select-none ${sidebarThemeClasses} ${className}`}
        suppressHydrationWarning
      >
        <ArrowLeft className={`h-4 w-4 shrink-0 transition-transform group-hover:-translate-x-0.5 ${sidebarIconClasses}`} />
        <span className="truncate">Back to Home</span>
      </a>
    );
  }

  if (variant === "dark") {
    return (
      <a
        href={homeUrl}
        onClick={onClick}
        title="Return to EduConnects Homepage"
        aria-label="Back to Home"
        data-testid="back-to-home-dark-btn"
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 shadow-2xs transition-all cursor-pointer group select-none shrink-0 ${className}`}
        suppressHydrationWarning
      >
        <ArrowLeft className="h-3.5 w-3.5 text-slate-400 group-hover:text-white group-hover:-translate-x-0.5 transition-transform shrink-0" />
        {compactOnMobile ? (
          <>
            <span className="hidden sm:inline">Back to Home</span>
            <span className="sm:hidden">Home</span>
          </>
        ) : (
          <span>Back to Home</span>
        )}
      </a>
    );
  }

  if (variant === "light") {
    return (
      <a
        href={homeUrl}
        onClick={onClick}
        title="Return to EduConnects Homepage"
        aria-label="Back to Home"
        data-testid="back-to-home-light-btn"
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 hover:text-slate-950 bg-white hover:bg-slate-100 border border-slate-200 hover:border-slate-300 shadow-2xs transition-all cursor-pointer group select-none shrink-0 ${className}`}
        suppressHydrationWarning
      >
        <ArrowLeft className="h-3.5 w-3.5 text-slate-500 group-hover:text-slate-900 group-hover:-translate-x-0.5 transition-transform shrink-0" />
        {compactOnMobile ? (
          <>
            <span className="hidden sm:inline">Back to Home</span>
            <span className="sm:hidden">Home</span>
          </>
        ) : (
          <span>Back to Home</span>
        )}
      </a>
    );
  }

  // Default: Theme-tailored pill button for DashboardLayout top header
  const defaultThemeClasses = isLearner
    ? "bg-blue-50 hover:bg-blue-100 active:bg-blue-200 border-blue-200 hover:border-blue-300 text-blue-700"
    : isEducator
    ? "bg-[#E8F3F1] hover:bg-[#D5ECE8] active:bg-[#C2E4DD] border-[#B8DFD8] hover:border-[#96D0C5] text-[#0B4F4B]"
    : "bg-slate-100 hover:bg-slate-200 border-slate-300 hover:border-slate-400 text-slate-700";

  const defaultIconClasses = isLearner
    ? "text-blue-700"
    : isEducator
    ? "text-[#0B4F4B]"
    : "text-slate-700";

  return (
    <a
      href={homeUrl}
      onClick={onClick}
      title="Return to EduConnects Homepage"
      aria-label="Back to Home"
      data-testid="back-to-home-header-btn"
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border shadow-2xs transition-all cursor-pointer group select-none shrink-0 ${defaultThemeClasses} ${className}`}
      suppressHydrationWarning
    >
      <ArrowLeft className={`h-3.5 w-3.5 group-hover:-translate-x-0.5 transition-transform shrink-0 ${defaultIconClasses}`} />
      {compactOnMobile ? (
        <>
          <span className="hidden sm:inline">Back to Home</span>
          <span className="sm:hidden">Home</span>
        </>
      ) : (
        <span>Back to Home</span>
      )}
    </a>
  );
}

export default BackToHomeButton;
