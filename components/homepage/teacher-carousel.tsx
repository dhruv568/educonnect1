"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { GlassCard } from "@/components/glass/glass-card";
import { GlassBadge } from "@/components/glass/glass-badge";
import { GlassButton } from "@/components/glass/glass-button";
import { Star, ShieldCheck, Calendar, ArrowRight, Award } from "lucide-react";
import { UserRole } from "@/types/auth";

export interface TeacherCarouselProps {
  onOpenAuth: (role: UserRole) => void;
}

export function TeacherCarousel({ onOpenAuth }: TeacherCarouselProps) {
  const [activeTeacher, setActiveTeacher] = useState<number | null>(null);

  const teachers = [
    {
      id: 1,
      name: "Sunita Natarajan",
      subject: "Mathematics & Calculus",
      headline: "Advanced Mathematics & Calculus Lead Instructor",
      avatar: "/images/educators/educator_02.jpg",
      rating: 4.95,
      reviewsCount: 48,
      experience: "16+ Years",
      rate: "₹300",
      status: "VERIFIED",
    },
    {
      id: 2,
      name: "Dr. Vikramaditya Sen",
      subject: "Physics & Mechanics",
      headline: "Senior Faculty of Theoretical & Applied Physics",
      avatar: "/images/educators/male-1.png",
      rating: 4.96,
      reviewsCount: 52,
      experience: "18+ Years",
      rate: "₹350",
      status: "VERIFIED",
    },
    {
      id: 3,
      name: "Meenakshi Sundaram",
      subject: "Computer Science & AI",
      headline: "Senior Computer Science & Systems Architect Mentor",
      avatar: "/images/educators/educator_04.jpg",
      rating: 4.93,
      reviewsCount: 36,
      experience: "14+ Years",
      rate: "₹350",
      status: "VERIFIED",
    },
  ];

  return (
    <section id="teachers" className="py-24 bg-white/60 backdrop-blur-md border-y border-white/80 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
          <span className="text-xs font-extrabold text-indigo-600 uppercase tracking-widest">
            Verified Educators
          </span>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">
            Find someone who makes it click.
          </h2>
          <p className="text-base text-slate-600">
            Browse top-rated tutors, check real student reviews, and book an instant demo session.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {teachers.map((t) => (
            <GlassCard
              key={t.id}
              glowColor="rgba(99, 102, 241, 0.15)"
              onMouseEnter={() => setActiveTeacher(t.id)}
              onMouseLeave={() => setActiveTeacher(null)}
              className="group cursor-pointer flex flex-col justify-between h-full border-2 border-white/90 hover:border-indigo-300 transition-all p-5 sm:p-7 min-w-0 overflow-hidden"
            >
              <div className="space-y-4 min-w-0">
                <div className="flex items-center gap-4 min-w-0">
                  <img
                    src={t.avatar}
                    alt={t.name}
                    className="w-14 h-14 sm:w-16 sm:h-16 rounded-full object-cover ring-4 ring-indigo-500/20 group-hover:ring-indigo-500 transition-all shrink-0 aspect-square"
                  />
                  <div className="min-w-0 flex-1">
                    <h3 className="text-lg font-bold text-slate-900 group-hover:text-indigo-600 transition-colors truncate min-w-0" title={t.name}>
                      {t.name}
                    </h3>
                    <p className="text-xs font-bold text-indigo-600 truncate">{t.subject}</p>
                    <div className="flex items-center gap-1.5 mt-1 min-w-0">
                      <GlassBadge variant="emerald" size="sm" className="flex items-center gap-1 shrink-0">
                        <ShieldCheck className="h-3 w-3" /> Verified
                      </GlassBadge>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed font-medium line-clamp-2" title={t.headline}>
                  {t.headline}
                </p>

                <div className="flex items-center justify-between text-xs bg-slate-50/80 p-3 rounded-2xl border border-slate-100 gap-2">
                  <div className="shrink-0">
                    <span className="font-bold text-amber-500">★ {t.rating}</span>
                    <span className="text-slate-400 text-[10px]"> ({t.reviewsCount})</span>
                  </div>
                  <div className="font-bold text-slate-700 shrink-0">{t.experience}</div>
                  <div className="font-extrabold text-slate-900 shrink-0">{t.rate}/hr</div>
                </div>
              </div>

              <div className="pt-6 border-t border-slate-100 mt-6">
                <GlassButton
                  variant={activeTeacher === t.id ? "primary" : "secondary"}
                  size="sm"
                  className="w-full"
                  onClick={() => onOpenAuth("STUDENT")}
                  rightIcon={<ArrowRight className="h-3.5 w-3.5" />}
                >
                  View Profile & Book Demo
                </GlassButton>
              </div>
            </GlassCard>
          ))}
        </div>
      </div>
    </section>
  );
}
