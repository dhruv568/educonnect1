"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import mainLogo from "@/educonnects.co.in.png";
import learnerLogo from "@/learmers.educonnects.co.in.png";
import educatorLogo from "@/educators.educonnects.co.in.png";

export { mainLogo, learnerLogo, educatorLogo };

export type LogoVariant = "full" | "mark" | "horizontal" | "compact";
export type LogoSize = "xs" | "sm" | "md" | "lg" | "xl" | "2xl";
export type LogoTheme = "light" | "dark" | "auto";
export type LogoRoleContext = "student" | "teacher" | "admin" | "default";
export type LogoPortal = "main" | "learner" | "educator";

export interface LogoProps {
  /**
   * Visual variant:
   * - "full": complete stacked artwork with emblem, wordmark, and tagline pill
   * - "mark": standalone official crest mark
   * - "horizontal" | "compact": mark alongside crisp typography and optional subtitle
   */
  variant?: LogoVariant;
  /** Size preset */
  size?: LogoSize;
  /** Custom width override in pixels */
  width?: number;
  /** Custom height override in pixels */
  height?: number;
  /** Priority loading for above-the-fold next/image */
  priority?: boolean;
  /** Additional container classes */
  className?: string;
  /** Target link destination. Set false to render a non-interactive element */
  href?: string | false;
  /** Show sub-brand tagline or role subtitle */
  showTagline?: boolean;
  /** Custom tagline text */
  tagline?: string;
  /** Background theme context for typography contrast */
  theme?: LogoTheme;
  /** Role context for portal-specific color accents */
  roleContext?: LogoRoleContext;
  /** Target portal website: main (emerald green), learner (blue), or educator (teal) */
  portal?: LogoPortal;
  /** Custom image alt text */
  alt?: string;
  /** Click handler */
  onClick?: () => void;
}

// Aspect ratio constants derived directly from the official logo files
// All 3 domain logos are 1536 x 1024 (exact 3:2 ratio ~ 1.5)
const MARK_RATIO = 1185 / 635;
const FULL_RATIO = 1355 / 1161;

const SIZE_PRESETS: Record<LogoSize, { markH: number; fullH: number; textSize: string; subSize: string }> = {
  xs: { markH: 26, fullH: 40, textSize: "text-xs", subSize: "text-[9px]" },
  sm: { markH: 32, fullH: 52, textSize: "text-sm", subSize: "text-[10px]" },
  md: { markH: 42, fullH: 72, textSize: "text-base sm:text-lg", subSize: "text-[11px]" },
  lg: { markH: 52, fullH: 96, textSize: "text-lg sm:text-xl", subSize: "text-xs" },
  xl: { markH: 64, fullH: 125, textSize: "text-xl sm:text-2xl", subSize: "text-sm" },
  "2xl": { markH: 80, fullH: 160, textSize: "text-2xl sm:text-3xl", subSize: "text-base" },
};

export function Logo({
  variant = "compact",
  size = "md",
  width,
  height,
  priority = false,
  className = "",
  href,
  showTagline = true,
  tagline,
  theme = "auto",
  roleContext = "default",
  portal,
  alt,
  onClick,
}: LogoProps) {
  const pathname = usePathname();
  const preset = SIZE_PRESETS[size] || SIZE_PRESETS.md;

  // Resolve which portal website we are on:
  // 1) Explicit portal prop
  // 2) Explicit roleContext prop
  // 3) Current route pathname
  // 4) Current browser hostname
  const resolvePortal = (): "main" | "learner" | "educator" => {
    if (portal) return portal;
    if (roleContext === "teacher") return "educator";
    if (roleContext === "student") return "learner";

    if (pathname) {
      if (
        pathname === "/teacher" ||
        pathname.startsWith("/teacher/") ||
        pathname === "/register/teacher"
      ) {
        return "educator";
      }
      if (
        pathname === "/student" ||
        pathname.startsWith("/student/") ||
        pathname === "/exam" ||
        pathname.startsWith("/exam/") ||
        pathname === "/register/student"
      ) {
        return "learner";
      }
    }

    if (typeof window !== "undefined") {
      const host = window.location.hostname.toLowerCase();
      if (
        host.startsWith("educators.") ||
        host.startsWith("educator.") ||
        host.startsWith("teachers.") ||
        host.startsWith("teacher.")
      ) {
        return "educator";
      }
      if (
        host.startsWith("learners.") ||
        host.startsWith("learner.") ||
        host.startsWith("students.") ||
        host.startsWith("student.")
      ) {
        return "learner";
      }
    }

    return "main";
  };

  const currentPortal = resolvePortal();

  // Domain-specific logo image asset mapping
  const resolvedImage =
    currentPortal === "learner"
      ? learnerLogo
      : currentPortal === "educator"
      ? educatorLogo
      : mainLogo;

  // Domain-specific alt text
  const defaultAlt =
    currentPortal === "learner"
      ? "EduConnects Learner Portal Logo"
      : currentPortal === "educator"
      ? "EduConnects Educator Portal Logo"
      : "EduConnects Main Logo";

  const resolvedAlt = alt || defaultAlt;

  // Standard platform tagline
  const resolvedTagline = tagline || "Learn • Grow • Belong";

  // Typography color styling based on theme and role
  const isDarkTheme = theme === "dark";

  const getPrimaryTextColor = () => {
    if (isDarkTheme) return "text-white";
    return "text-slate-900";
  };

  // Preserved portal themes:
  // Main: Emerald Green (#16805B / #35A979)
  // Learner: Blue (#2563EB / #60A5FA)
  // Educator: Teal (#0F766E / #2DD4BF)
  const getAccentTextColor = () => {
    if (currentPortal === "learner") {
      return isDarkTheme ? "text-[#60A5FA]" : "text-[#2563EB]";
    }
    if (currentPortal === "educator") {
      return isDarkTheme ? "text-[#2DD4BF]" : "text-[#0F766E]";
    }
    if (isDarkTheme) {
      return "text-[#35A979]";
    }
    return "text-[#16805B]";
  };

  const getTaglineTextColor = () => {
    if (currentPortal === "learner") {
      return isDarkTheme ? "text-blue-200/90" : "text-blue-600/80";
    }
    if (currentPortal === "educator") {
      return isDarkTheme ? "text-teal-200/90" : "text-teal-600/80";
    }
    if (isDarkTheme) {
      return "text-emerald-100/90";
    }
    return "text-slate-500";
  };

  const getFocusRingColor = () => {
    if (currentPortal === "learner") return "focus-visible:ring-blue-500";
    if (currentPortal === "educator") return "focus-visible:ring-teal-500";
    return "focus-visible:ring-emerald-500";
  };

  // Responsive image dimensions with 3:2 ratio
  const MAIN_IMAGE_SIZE_CLASSES: Record<LogoSize, string> = {
    xs: "h-8 sm:h-9",
    sm: "h-9 sm:h-10.5",
    md: "h-11 sm:h-12 md:h-14",
    lg: "h-14 sm:h-16 lg:h-20",
    xl: "h-16 sm:h-20 lg:h-24",
    "2xl": "h-20 sm:h-24 lg:h-28",
  };

  const hasCustomDim = Boolean(width || height);
  const customStyle: React.CSSProperties = hasCustomDim
    ? {
        width: width ? `${width}px` : height ? `${Math.round(height * 1.5)}px` : "auto",
        height: height ? `${height}px` : width ? `${Math.round(width / 1.5)}px` : "auto",
      }
    : {};

  const imageElement = (
    <div
      style={customStyle}
      className={`relative inline-flex items-center justify-center shrink-0 select-none aspect-[3/2] ${
        hasCustomDim ? "" : (MAIN_IMAGE_SIZE_CLASSES[size] || MAIN_IMAGE_SIZE_CLASSES.md)
      }`}
    >
      <Image
        src={resolvedImage}
        alt={resolvedAlt}
        width={1536}
        height={1024}
        priority={priority}
        className="h-full w-auto max-w-full max-h-full object-contain filter drop-shadow-xs transition-transform duration-200 group-hover:scale-[1.02]"
        sizes="(max-width: 640px) 90px, (max-width: 1024px) 110px, 140px"
      />
    </div>
  );

  let content: React.ReactNode;

  if (variant === "mark") {
    content = (
      <div className={`inline-flex items-center select-none ${className}`}>
        {imageElement}
      </div>
    );
  } else {
    content = (
      <div className={`inline-flex items-center gap-2.5 sm:gap-3 select-none ${className}`}>
        {imageElement}
        <div className="flex flex-col justify-center min-w-0 text-left">
          <span
            className={`${preset.textSize} font-black tracking-tight leading-none ${getPrimaryTextColor()}`}
          >
            Edu<span className={getAccentTextColor()}>Connects</span>
          </span>
          {showTagline && (
            <span
              className={`${preset.subSize} font-semibold tracking-wide mt-0.5 truncate ${getTaglineTextColor()}`}
            >
              {resolvedTagline}
            </span>
          )}
        </div>
      </div>
    );
  }

  // Interactive link wrapping
  if (href !== false && href !== undefined && href !== "") {
    return (
      <Link
        href={href}
        onClick={onClick}
        className={`group inline-flex items-center focus:outline-none focus-visible:ring-2 ${getFocusRingColor()} rounded-xl`}
      >
        <div className="group-hover:opacity-95 transition-opacity">{content}</div>
      </Link>
    );
  }

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`group inline-flex items-center focus:outline-none focus-visible:ring-2 ${getFocusRingColor()} rounded-xl cursor-pointer`}
      >
        <div className="group-hover:opacity-95 transition-opacity">{content}</div>
      </button>
    );
  }

  return <>{content}</>;
}

export default Logo;
