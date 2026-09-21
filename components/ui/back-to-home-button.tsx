"use client";

import React, { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getHomeUrl, getLearnerDomain } from "@/lib/app-url";

export interface BackToHomeButtonProps {
  /**
   * Visual theme variant:
   * - "default": Soft teal button for dashboard header
   * - "sidebar": Full-width teal navigation button for dashboard sidebar
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
}

export function BackToHomeButton({
  variant = "default",
  className = "",
  compactOnMobile = true,
  href,
}: BackToHomeButtonProps) {
  const pathname = usePathname();
  const [homeUrl, setHomeUrl] = useState<string>("https://learners.educonnects.co.in");

  useEffect(() => {
    try {
      if (href) {
        setHomeUrl(href);
      } else {
        const isLearnerPage =
          typeof window !== "undefined" &&
          (window.location.hostname.toLowerCase().includes("learners") ||
            pathname?.startsWith("/student") ||
            pathname?.startsWith("/learn"));

        if (isLearnerPage) {
          setHomeUrl(getLearnerDomain());
        } else {
          setHomeUrl(getHomeUrl());
        }
      }
    } catch {
      setHomeUrl("https://learners.educonnects.co.in");
    }
  }, [href, pathname]);

  if (variant === "sidebar") {
    return (
      <a
        href={homeUrl}
        title="Return to EduConnects Homepage"
        aria-label="Back to Home"
        data-testid="back-to-home-sidebar-btn"
        className={`flex items-center gap-3 w-full px-3.5 py-2.5 rounded-xl text-sm font-semibold text-teal-100/90 hover:bg-[#1B6863]/40 hover:text-white transition-all cursor-pointer group border border-transparent hover:border-[#1B6863]/60 select-none ${className}`}
        suppressHydrationWarning
      >
        <ArrowLeft className="h-4 w-4 text-teal-200/70 group-hover:text-white group-hover:-translate-x-0.5 transition-all shrink-0" />
        <span className="truncate">Back to Home</span>
      </a>
    );
  }

  if (variant === "dark") {
    return (
      <a
        href={homeUrl}
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

  // Default: Soft teal button for DashboardLayout top header
  return (
    <a
      href={homeUrl}
      title="Return to EduConnects Homepage"
      aria-label="Back to Home"
      data-testid="back-to-home-header-btn"
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-[#0B4F4B] hover:text-[#073F3C] bg-[#E8F3F1] hover:bg-[#D5ECE8] active:bg-[#C2E4DD] border border-[#B8DFD8] hover:border-[#96D0C5] shadow-2xs transition-all cursor-pointer group select-none shrink-0 ${className}`}
      suppressHydrationWarning
    >
      <ArrowLeft className="h-3.5 w-3.5 text-[#0B4F4B] group-hover:-translate-x-0.5 transition-transform shrink-0" />
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
