"use client";

import React, { useState } from "react";
import Link from "next/link";
import { GlassCard } from "@/components/glass/glass-card";
import { GlassBadge } from "@/components/glass/glass-badge";
import { GlassButton } from "@/components/glass/glass-button";
import { Star, ShieldCheck, ArrowRight, MapPin } from "lucide-react";
import { TeacherPreviewModal } from "./teacher-preview-modal";
import { UserRole } from "@/types/auth";
import { formatCurrency } from "@/lib/currency";

export interface TeacherCardGridProps {
  teachers: any[];
  loading?: boolean;
  onOpenAuth: (role: UserRole) => void;
}

export function TeacherCardGrid({ teachers, loading = false, onOpenAuth }: TeacherCardGridProps) {
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
          <GlassCard
            key={t.id}
            glowColor="rgba(16, 128, 91, 0.15)"
            className="group cursor-pointer flex flex-col justify-between h-full border-2 border-white/90 hover:border-emerald-300 transition-all p-6 min-w-0 overflow-hidden"
            onClick={() => setSelectedTeacher(t)}
          >
            <div className="space-y-4 min-w-0">
              <div className="flex items-start gap-4 min-w-0">
                <img
                  src={t.avatarUrl}
                  alt={t.name}
                  className="w-14 h-14 rounded-full object-cover ring-2 ring-emerald-600/20 group-hover:ring-emerald-500 transition-all shrink-0 aspect-square shadow-xs"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "/images/educators/educator_01.jpg";
                  }}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1.5 min-w-0">
                    <h3 className="text-base font-bold text-slate-900 group-hover:text-emerald-700 transition-colors truncate min-w-0" title={t.name}>
                      {t.name}
                    </h3>
                    <GlassBadge variant="emerald" size="sm" className="shrink-0 flex items-center gap-1">
                      <ShieldCheck className="h-3 w-3" /> Verified
                    </GlassBadge>
                  </div>
                  <p className="text-xs font-bold text-emerald-700 truncate mt-0.5" title={t.headline}>{t.headline}</p>
                  {t.location && (
                    <div className="flex items-center gap-1 text-[11px] text-slate-400 font-medium mt-1 min-w-0">
                      <MapPin className="h-3 w-3 shrink-0 text-slate-400" />
                      <span className="truncate min-w-0">{t.location}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5 min-w-0">
                {t.subjects && t.subjects.map((sub: string, idx: number) => (
                  <span key={idx} className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 max-w-full truncate">
                    {sub}
                  </span>
                ))}
              </div>

              <div className="flex items-center justify-between text-xs bg-slate-50 p-3 rounded-2xl border border-slate-100 gap-2">
                <span className="font-bold text-amber-500 shrink-0">★ {typeof t.rating === "number" ? t.rating.toFixed(2) : t.rating}</span>
                <span className="font-semibold text-slate-600 shrink-0">{t.experienceYears} Years Exp</span>
                <span className="font-black text-slate-900 shrink-0">{formatCurrency(t.hourlyRate)}/hr</span>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 mt-4 flex items-center gap-2">
              <Link href={`/student/register?educatorId=${t.id}&trial=true`} className="w-full">
                <GlassButton variant="primary" size="sm" className="w-full bg-[#16805B] hover:bg-[#0D5C41] text-white font-bold shadow-md shadow-emerald-700/20" rightIcon={<ArrowRight className="h-3.5 w-3.5" />}>
                  Book Trial Lesson
                </GlassButton>
              </Link>
            </div>
          </GlassCard>
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
