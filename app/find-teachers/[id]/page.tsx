"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { FloatingNavbar } from "@/components/homepage/floating-navbar";
import { PremiumFooter } from "@/components/homepage/premium-footer";
import { GlassCard } from "@/components/glass/glass-card";
import { GlassBadge } from "@/components/glass/glass-badge";
import { GlassButton } from "@/components/glass/glass-button";
import { AuthModal } from "@/components/shared/auth-modal";
import { ShieldCheck, Star, ArrowLeft, Calendar, BookOpen, Clock, MapPin, Globe } from "lucide-react";
import { UserRole } from "@/types/auth";
import { formatCurrency } from "@/lib/currency";
import { BackButton } from "@/components/ui/back-button";

export default function PublicTeacherProfilePage() {
  const { id } = useParams();
  const router = useRouter();

  const [teacher, setTeacher] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [authModalOpen, setAuthModalOpen] = useState(false);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/teachers/${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setTeacher(data.data.teacher);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [id]);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <FloatingNavbar />

      <main className="flex-1 pt-32 pb-20 max-w-4xl mx-auto px-4 w-full space-y-6">
        <BackButton
          fallbackUrl="/find-teachers"
          label="Back to Teacher Discovery"
          variant="default"
        />

        {loading ? (
          <div className="h-96 bg-white rounded-3xl animate-pulse border border-slate-200" />
        ) : !teacher ? (
          <div className="text-center py-16 bg-white rounded-3xl border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900">Educator Profile Not Found</h3>
          </div>
        ) : (
          <GlassCard glowColor="rgba(16, 128, 91, 0.2)" className="p-8 space-y-6 border-2 border-white/90 shadow-xl">
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <img
                src={teacher.avatarUrl}
                alt={teacher.name}
                className="w-28 h-28 rounded-full object-cover ring-4 ring-emerald-500/20 shadow-md aspect-square shrink-0"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "/images/educators/educator_01.jpg";
                }}
              />
              <div className="space-y-2 text-center sm:text-left">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  <h1 className="text-2xl font-black text-slate-900">{teacher.name}</h1>
                  <GlassBadge variant="emerald" size="sm" className="flex items-center gap-1">
                    <ShieldCheck className="h-3.5 w-3.5" /> Verified Educator
                  </GlassBadge>
                </div>
                <p className="text-sm font-bold text-emerald-700">{teacher.headline}</p>
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 text-xs text-slate-600 font-semibold">
                  <span className="text-amber-500">★ {typeof teacher.rating === "number" ? teacher.rating.toFixed(2) : teacher.rating} Rating</span>
                  <span>• {teacher.experienceYears} Years Experience</span>
                  <span className="text-slate-900 font-extrabold">{formatCurrency(teacher.hourlyRate)}/hr</span>
                  {teacher.location && (
                    <span className="flex items-center gap-1 text-slate-500">
                      <MapPin className="h-3 w-3" /> {teacher.location}
                    </span>
                  )}
                  {teacher.languages && (
                    <span className="flex items-center gap-1 text-slate-500">
                      <Globe className="h-3 w-3" /> {teacher.languages}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-2 pt-4 border-t border-slate-100">
              <h3 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">About Educator</h3>
              <p className="text-sm text-slate-600 leading-relaxed bg-slate-50 p-4 rounded-2xl border border-slate-100">
                {teacher.bio}
              </p>
            </div>

            <div className="space-y-2">
              <h3 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">Teaching Subjects</h3>
              <div className="flex flex-wrap gap-2">
                {teacher.subjects.map((sub: string, idx: number) => (
                  <GlassBadge key={idx} variant="emerald" size="md">
                    {sub}
                  </GlassBadge>
                ))}
              </div>
            </div>

            <div className="pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <span className="text-xs text-slate-500">Hourly Trial Rate</span>
                <div className="text-2xl font-black text-slate-900">{formatCurrency(teacher.hourlyRate)}</div>
              </div>
              <GlassButton
                variant="primary"
                size="lg"
                className="bg-[#16805B] hover:bg-[#0D5C41] text-white shadow-md shadow-emerald-700/20"
                onClick={() => {
                  const firstCourse = teacher.courses && teacher.courses.length > 0 ? teacher.courses[0] : null;
                  const cParam = firstCourse ? `&courseId=${firstCourse.id}` : "";
                  router.push(`/student/register?educatorId=${teacher.id}${cParam}&trial=true`);
                }}
              >
                Book Trial Lesson
              </GlassButton>
            </div>
          </GlassCard>
        )}
      </main>

      <PremiumFooter />

      <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} initialRole="STUDENT" />
    </div>
  );
}
