"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowRight, ShieldCheck, Star, Users, UserCheck } from "lucide-react";
import { GlassButton } from "@/components/glass/glass-button";

interface TeacherData {
  id: string;
  name: string;
  avatarUrl: string;
  headline: string;
  subjects: string[];
  experienceYears?: number;
  hourlyRate?: number;
  rating?: number;
  verificationStatus?: string;
}

export function ExploreEducatorsSection() {
  const [teachers, setTeachers] = useState<TeacherData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchTeachers() {
      try {
        const res = await fetch("/api/teachers");
        if (res.ok) {
          const json = await res.json();
          if (json.data?.teachers) {
            setTeachers(json.data.teachers.slice(0, 3));
          }
        }
      } catch (err) {
        // Fallback gracefully to empty state
      } finally {
        setLoading(false);
      }
    }
    fetchTeachers();
  }, []);

  return (
    <section className="py-20 lg:py-28 bg-[#FBF7EE] border-b border-[#E2E8F0] font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2 text-center md:text-left">
            <span className="text-xs font-black text-[#16805B] uppercase tracking-widest px-3 py-1 rounded-full bg-[#F0FAF5]">
              VERIFIED FACULTY & COACHES
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-[#0F172A] tracking-tight">
              Meet educators who can help you grow
            </h2>
            <p className="text-xs sm:text-sm text-[#64748B] max-w-xl">
              Connect with subject specialists verified by our administration team.
            </p>
          </div>

          <Link href="/find-teachers">
            <GlassButton
              variant="primary"
              className="bg-[#16805B] hover:bg-[#0D5C41] active:bg-[#09422F] text-white font-extrabold px-6 rounded-full transition-all"
              rightIcon={<ArrowRight className="h-4 w-4" />}
            >
              Find an Educator →
            </GlassButton>
          </Link>
        </div>

        {/* Dynamic Teacher Cards or Polished Empty State */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-64 bg-white/60 animate-pulse rounded-3xl border border-[#E2E8F0]" />
            ))}
          </div>
        ) : teachers.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {teachers.map((t) => (
              <div
                key={t.id}
                className="p-6 rounded-3xl bg-white border border-[#E2E8F0] shadow-sm hover:shadow-xl transition-all space-y-4 flex flex-col justify-between overflow-hidden min-w-0"
              >
                <div className="space-y-4 min-w-0">
                  <div className="flex items-center gap-4 min-w-0">
                    <img
                      src={t.avatarUrl}
                      alt={t.name}
                      className="w-14 h-14 rounded-full object-cover ring-2 ring-[#16805B]/20 shadow-sm shrink-0 aspect-square"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <h3 className="text-base font-extrabold text-[#0F172A] truncate min-w-0" title={t.name}>{t.name}</h3>
                        {t.verificationStatus === "VERIFIED" && (
                          <ShieldCheck className="h-4 w-4 text-[#16805B] shrink-0" />
                        )}
                      </div>
                      <p className="text-xs font-bold text-[#16805B] truncate mt-0.5" title={t.headline}>{t.headline}</p>
                    </div>
                  </div>

                  {/* Subjects */}
                  {t.subjects && t.subjects.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 min-w-0">
                      {t.subjects.slice(0, 3).map((sub, idx) => (
                        <span key={idx} className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#F8FAFC] text-[#64748B] border border-[#E2E8F0] max-w-full truncate">
                          {sub}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Stats Row */}
                  <div className="flex items-center justify-between text-xs bg-[#F8FAFC] p-3 rounded-2xl border border-[#E2E8F0] gap-2">
                    {t.rating ? (
                      <div className="flex items-center gap-1 text-[#B8860B] font-black shrink-0">
                        <Star className="h-3.5 w-3.5 fill-[#F2C14E] text-[#F2C14E]" />
                        <span>{t.rating.toFixed(1)}</span>
                      </div>
                    ) : (
                      <span className="text-[11px] text-[#64748B] font-semibold shrink-0">New Educator</span>
                    )}

                    {t.experienceYears ? (
                      <span className="text-[#64748B] font-semibold shrink-0">{t.experienceYears} yrs exp</span>
                    ) : null}

                    {t.hourlyRate ? (
                      <span className="font-extrabold text-[#0F172A] shrink-0">₹{t.hourlyRate}/hr</span>
                    ) : null}
                  </div>
                </div>

                <div className="pt-2">
                  <Link href={`/find-teachers/${t.id}`}>
                    <GlassButton variant="secondary" className="w-full justify-center text-xs font-bold hover:bg-[#0D5C41] hover:text-white active:bg-[#09422F] transition-all">
                      View Educator Profile
                    </GlassButton>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Polished Empty State */
          <div className="p-10 rounded-3xl bg-white border border-[#E2E8F0] text-center space-y-4 max-w-xl mx-auto">
            <div className="p-3.5 rounded-full bg-[#F0FAF5] text-[#16805B] w-fit mx-auto">
              <UserCheck className="h-8 w-8" />
            </div>
            <h3 className="text-xl font-black text-[#0F172A]">Empowering New Educators</h3>
            <p className="text-xs sm:text-sm text-[#64748B] leading-relaxed">
              Our verified educator roster is continuously expanding. Browse available courses or register to become one of EduConnects’ founding educators.
            </p>
            <div className="pt-2">
              <Link href="/teacher">
                <GlassButton variant="primary" className="bg-[#16805B] hover:bg-[#0D5C41] active:bg-[#09422F] text-white text-xs font-extrabold transition-all">
                  Become an Educator →
                </GlassButton>
              </Link>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
