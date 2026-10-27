"use client";

import React from "react";
import Link from "next/link";
import { Trophy, ArrowRight, BookOpen } from "lucide-react";
import { GlassButton } from "@/components/glass/glass-button";

export function LearnerMilestonesBanner() {
  return (
    <section
      aria-label="Learner Milestone Highlights"
      className="py-12 sm:py-16 bg-white border-b border-[#E2E8F0] font-sans"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-[#E2E8F0] bg-gradient-to-br from-[#F0FAF5]/80 via-white to-[#F0FAF5]/40 shadow-sm overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-12 items-center">
            {/* Visual Column */}
            <div className="lg:col-span-5 p-4 sm:p-6 lg:p-8 flex items-center justify-center bg-[#F0FAF5]/50 lg:border-r border-[#E2E8F0]">
              <div className="relative w-full aspect-[16/10] sm:aspect-[16/9] lg:aspect-[4/3] rounded-2xl overflow-hidden border border-[#E2E8F0] bg-white shadow-xs">
                <img
                  src="/images/learner-hero.jpeg"
                  alt="EduConnects learners celebrating academic milestones and exam achievements"
                  className="w-full h-full object-cover object-center"
                />
              </div>
            </div>

            {/* Content & Action Column */}
            <div className="lg:col-span-7 p-6 sm:p-8 lg:p-10 space-y-5 text-left">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#F0FAF5] text-[#16805B] text-xs font-bold border border-emerald-200">
                <Trophy className="h-3.5 w-3.5 text-[#16805B]" />
                <span>Learner Milestone Accomplishments</span>
              </div>

              <div className="space-y-2">
                <h3 className="text-2xl sm:text-3xl font-black text-[#0F172A] tracking-tight">
                  Empowering learners to reach their highest potential
                </h3>
                <p className="text-sm sm:text-base text-[#64748B] leading-relaxed">
                  From board exam preparation to cutting-edge technical skills, EduConnects provides the 1-on-1 mentorship and structured learning environment that enables learners across India to thrive.
                </p>
              </div>

              {/* Promotional CTAs */}
              <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <Link href="/find-teachers" className="w-full sm:w-auto">
                  <GlassButton
                    variant="primary"
                    size="md"
                    rightIcon={<ArrowRight className="h-4 w-4 text-white" />}
                    className="w-full sm:w-auto bg-[#16805B] hover:bg-[#0D5C41] active:bg-[#09422F] text-white border border-emerald-400/40 font-bold px-6 py-2.5 rounded-full shadow-sm transition-all"
                  >
                    Find an Educator
                  </GlassButton>
                </Link>

                <Link href="/courses" className="w-full sm:w-auto">
                  <GlassButton
                    variant="secondary"
                    size="md"
                    leftIcon={<BookOpen className="h-4 w-4 text-[#16805B]" />}
                    className="w-full sm:w-auto bg-white hover:bg-[#F0FAF5] text-[#0F172A] border border-[#E2E8F0] font-bold px-5 py-2.5 rounded-full transition-all"
                  >
                    Explore Courses
                  </GlassButton>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default LearnerMilestonesBanner;
