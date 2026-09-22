"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import officialLogo from "@/logo for educonnect.co.in.png";

export type LogoVariant = "full" | "mark" | "horizontal" | "compact";
export type LogoSize = "xs" | "sm" | "md" | "lg" | "xl" | "2xl";
export type LogoTheme = "light" | "dark" | "auto";
export type LogoRoleContext = "student" | "teacher" | "admin" | "default";

export interface LogoProps {
  /**
   * Visual variant:
   * - "full": complete stacked artwork with emblem, wordmark, and tagline pill (from logo-transparent.png)
   * - "mark": standalone official crest mark (EC monogram + graduation cap + open book)
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
  /** Click handler */
  onClick?: () => void;
}

// Aspect ratio constants derived directly from the official logo files
// logo-transparent.png: 1355 x 1161 (ratio ~ 1.167)
// logo-mark.png: 1185 x 635 (ratio ~ 1.866)
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
  onClick,
}: LogoProps) {
  const preset = SIZE_PRESETS[size] || SIZE_PRESETS.md;

  // Calculate dimensions
  let markHeight = height || preset.markH;
  let markWidth = width || Math.round(markHeight * MARK_RATIO);

  let fullHeight = height || preset.fullH;
  let fullWidth = width || Math.round(fullHeight * FULL_RATIO);

  // Standard platform tagline
  const resolvedTagline = tagline || "Learn • Grow • Belong";

  // Typography color styling based on theme and role
  const isDarkTheme = theme === "dark";

  const getPrimaryTextColor = () => {
    if (isDarkTheme) return "text-white";
    return "text-slate-900";
  };

  const getAccentTextColor = () => {
    if (isDarkTheme) {
      return "text-[#35A979]";
    }
    return "text-[#16805B]";
  };

  const getTaglineTextColor = () => {
    if (isDarkTheme) {
      return "text-emerald-100/90";
    }
    return "text-slate-500";
  };

  // Render content based on variant & roleContext
  let content: React.ReactNode;

  // Official EduConnects brand asset (logo for educonnect.co.in.png)
  // Applied consistently across main and educator websites with slightly increased visibility and exact 3:2 ratio
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
        src={officialLogo}
        alt="EduConnects"
        width={1536}
        height={1024}
        priority={priority}
        className="h-full w-auto max-w-full max-h-full object-contain filter drop-shadow-xs transition-transform duration-200 group-hover:scale-[1.02]"
        sizes="(max-width: 640px) 90px, (max-width: 1024px) 110px, 140px"
      />
    </div>
  );

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
        className="group inline-flex items-center focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-xl"
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
        className="group inline-flex items-center focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-xl cursor-pointer"
      >
        <div className="group-hover:opacity-95 transition-opacity">{content}</div>
      </button>
    );
  }

  return <>{content}</>;
}

export default Logo;
