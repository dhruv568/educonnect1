"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { GlassCard } from "@/components/glass/glass-card";
import { GlassBadge } from "@/components/glass/glass-badge";
import { GlassButton } from "@/components/glass/glass-button";
import { Star, ShieldCheck, ArrowRight, MapPin } from "lucide-react";
import { TeacherPreviewModal } from "./teacher-preview-modal";
import { UserRole } from "@/types/auth";
import { formatCurrency } from "@/lib/currency";

export interface EducatorData {
  id: string;
  name: string;
  avatarUrl?: string;
  avatar?: string;
  headline?: string;
  subjects?: string[];
  experienceYears?: number;
  experience?: string | number;
  hourlyRate?: number;
  rate?: string | number;
  rating?: number;
  reviewsCount?: number;
  verificationStatus?: string;
  location?: string;
  bio?: string;
}

export interface EducatorCardProps {
  educator: EducatorData;
  theme?: "auto" | "learner" | "main" | "home";
  onSelect?: (educator: EducatorData) => void;
  bookingUrl?: string;
  buttonLabel?: string;
  className?: string;
}

export function EducatorCard({
  educator,
  theme = "auto",
  onSelect,
  bookingUrl,
  buttonLabel = "Book Trial Lesson",
  className,
}: EducatorCardProps) {
  const pathname = usePathname();

  // Resolve active theme: via explicit prop, ancestor data-theme, or pathname detection fallback
  const isLearnerPortal =
    theme === "learner" ||
    (theme === "auto" &&
      (pathname === "/student" ||
        pathname?.startsWith("/student/") ||
        pathname === "/courses" ||
        pathname?.startsWith("/courses/")));

  const activeTheme =
    theme !== "auto"
      ? theme
      : isLearnerPortal
      ? "learner"
      : "main";

  // Normalize educator fields
  const avatar = educator.avatarUrl || educator.avatar || "/images/educators/educator_01.jpg";
  const name = educator.name || "Verified Educator";
  const headline = educator.headline || "Educator & Subject Specialist";
  const subjects = educator.subjects && educator.subjects.length > 0 ? educator.subjects : ["Education"];

  const ratingValue =
    typeof educator.rating === "number"
      ? educator.rating.toFixed(2)
      : educator.rating || "4.90";

  const experienceText =
    educator.experienceYears !== undefined
      ? `${educator.experienceYears} Years Exp`
      : educator.experience !== undefined
      ? typeof educator.experience === "number"
        ? `${educator.experience} Years Exp`
        : educator.experience
      : "5+ Years Exp";

  const rateText =
    educator.hourlyRate !== undefined
      ? `${formatCurrency(educator.hourlyRate)}/hr`
      : educator.rate !== undefined
      ? typeof educator.rate === "number"
        ? `${formatCurrency(educator.rate)}/hr`
        : educator.rate.includes("/hr")
        ? educator.rate
        : `${educator.rate}/hr`
      : "₹300/hr";

  const targetBookingUrl =
    bookingUrl || `/student/register?educatorId=${educator.id}&trial=true`;

  return (
    <GlassCard
      data-theme={activeTheme}
      glowColor="var(--color-card-glow, rgba(22, 128, 91, 0.15))"
      className={`group cursor-pointer flex flex-col justify-between h-full border-2 border-white/90 hover:border-theme-border transition-all p-6 min-w-0 overflow-hidden ${
        className || ""
      }`}
      onClick={() => onSelect && onSelect(educator)}
    >
      <div className="space-y-4 min-w-0">
        <div className="flex items-start gap-4 min-w-0">
          <img
            src={avatar}
            alt={name}
            className="w-14 h-14 rounded-full object-cover ring-2 ring-theme-primary/20 group-hover:ring-theme-primary transition-all shrink-0 aspect-square shadow-xs"
            onError={(e) => {
              (e.target as HTMLImageElement).src = "/images/educators/educator_01.jpg";
            }}
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-1.5 min-w-0">
              <h3
                className="text-base font-bold text-slate-900 group-hover:text-theme-primary transition-colors truncate min-w-0"
                title={name}
              >
                {name}
              </h3>
              <GlassBadge variant="emerald" size="sm" className="shrink-0 flex items-center gap-1">
                <ShieldCheck className="h-3 w-3 shrink-0" /> Verified
              </GlassBadge>
            </div>
            <p className="text-xs font-bold text-theme-primary truncate mt-0.5" title={headline}>
              {headline}
            </p>
            {educator.location && (
              <div className="flex items-center gap-1 text-[11px] text-slate-400 font-medium mt-1 min-w-0">
                <MapPin className="h-3 w-3 shrink-0 text-slate-400" />
                <span className="truncate min-w-0">{educator.location}</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5 min-w-0">
          {subjects.map((sub: string, idx: number) => (
            <span
              key={idx}
              className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-theme-primary-soft text-theme-primary border border-theme-border/60 max-w-full truncate"
            >
              {sub}
            </span>
          ))}
        </div>

        <div className="flex items-center justify-between text-xs bg-slate-50 p-3 rounded-2xl border border-slate-100 gap-2">
          <span className="font-bold text-amber-500 shrink-0">
            ★ {ratingValue}
          </span>
          <span className="font-semibold text-slate-600 shrink-0">{experienceText}</span>
          <span className="font-black text-theme-primary shrink-0">{rateText}</span>
        </div>
      </div>

      <div className="pt-4 border-t border-slate-100 mt-4 flex items-center gap-2">
        <Link href={targetBookingUrl} className="w-full" onClick={(e) => onSelect && e.stopPropagation()}>
          <GlassButton
            variant="theme"
            size="sm"
            className="w-full bg-theme-primary hover:bg-theme-primary-dark active:bg-theme-primary-dark text-white font-bold shadow-md shadow-theme-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-primary focus-visible:ring-offset-2 disabled:bg-slate-300 disabled:text-slate-500 disabled:cursor-not-allowed"
            rightIcon={<ArrowRight className="h-3.5 w-3.5 text-white" />}
          >
            {buttonLabel}
          </GlassButton>
        </Link>
      </div>
    </GlassCard>
  );
}

export interface TeacherCardGridProps {
  teachers: any[];
  loading?: boolean;
  onOpenAuth: (role: UserRole) => void;
  theme?: "auto" | "learner" | "main" | "home";
}

export function TeacherCardGrid({ teachers, loading = false, onOpenAuth, theme = "auto" }: TeacherCardGridProps) {
  const [selectedTeacher, setSelectedTeacher] = useState<any | null>(null);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[1, 2, 4].map((i) => (
          <div key={i} className="h-64 bg-white rounded-3xl animate-pulse border border-slate-200" />
        ))}
      </div>
    );
  }

  if (teachers.length === 0) {
    return (
      <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-slate-200 p-8">
        <h3 className="text-lg font-bold text-slate-900">No educators found</h3>
        <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
          Try broadening your search query, increasing your hourly price filter, or selecting &ldquo;All Subjects&rdquo;.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {teachers.map((t) => (
          <EducatorCard
            key={t.id}
            educator={t}
            theme={theme}
            onSelect={() => setSelectedTeacher(t)}
          />
        ))}
      </div>

      <TeacherPreviewModal
        teacher={selectedTeacher}
        isOpen={!!selectedTeacher}
        onClose={() => setSelectedTeacher(null)}
        onOpenAuth={onOpenAuth}
      />
    </>
  );
}
