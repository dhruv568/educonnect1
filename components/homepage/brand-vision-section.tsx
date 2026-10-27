"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Sparkles, GraduationCap, Users, Globe2, Lightbulb } from "lucide-react";
import { GlassButton } from "@/components/glass/glass-button";
import { OFFICIAL_COMPANY_INFO } from "@/lib/company";
import visionPoster from "@/public/images/educonnects-vision-poster-neeraj-shrivastava.jpg";

export function BrandVisionSection() {
  const pillars = [
    {
      icon: Users,
      title: "Empower Learners",
      desc: "Direct access to verified mentors, personalized pacing, and tailored study roadmaps for every student.",
    },
    {
      icon: GraduationCap,
      title: "Support Educators",
      desc: "Empower teachers with full syllabus autonomy, fair compensation, and high-performance virtual tools.",
    },
    {
      icon: Globe2,
      title: "Expand Opportunities",
      desc: "Break geographical boundaries with seamless interactive live classes and on-demand video learning.",
    },
    {
      icon: Lightbulb,
      title: "Create Brighter Futures",
      desc: "Equal access to exceptional education, building confident lifelong learners and accomplished mentors.",
    },
  ];

  return (
    <section className="py-20 lg:py-28 bg-[#F8FAFC] border-b border-[#E2E8F0] font-sans relative overflow-hidden">
      {/* Subtle Background Glow Orbs */}
      <div className="absolute top-1/2 -translate-y-1/2 left-0 w-80 h-80 bg-[#16805B]/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 -translate-y-1/2 right-0 w-80 h-80 bg-[#F2C14E]/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-14 items-center">
          {/* Left Column: Brand Vision & Core Mission Copy */}
          <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
            {/* Pill Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#F0FAF5] border border-emerald-200 text-[#16805B] text-xs font-black uppercase tracking-wider shadow-2xs">
              <Sparkles className="h-3.5 w-3.5 text-[#16805B]" />
              <span>Our Vision In Two Words</span>
            </div>

            {/* Main Headline */}
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-[#0F172A] tracking-tight leading-[1.15]">
              Better Learning. <br />
              <span className="text-[#16805B]">Brighter Tomorrows.</span>
            </h2>

            {/* Narrative Explanation */}
            <p className="text-base sm:text-lg text-[#64748B] leading-relaxed max-w-2xl mx-auto lg:mx-0">
              Founded by {OFFICIAL_COMPANY_INFO.founder}, EduConnects is built on the belief that quality education must be directly accessible to every learner, everywhere. We connect ambitious learners with verified educators to build stronger, happier futures together.
            </p>

            {/* 4 Core Pillars Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 text-left">
              {pillars.map((pillar, idx) => {
                const IconComp = pillar.icon;
                return (
                  <div
                    key={idx}
                    className="p-4 rounded-2xl bg-white border border-[#E2E8F0] shadow-xs hover:border-[#16805B]/40 transition-colors space-y-2"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-xl bg-[#F0FAF5] text-[#16805B]">
                        <IconComp className="h-4 w-4" />
                      </div>
                      <h3 className="text-sm font-extrabold text-[#0F172A]">{pillar.title}</h3>
                    </div>
                    <p className="text-xs text-[#64748B] leading-relaxed pl-0.5">
                      {pillar.desc}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3.5 pt-4">
              <Link href="/find-teachers" className="w-full sm:w-auto">
                <GlassButton
                  variant="primary"
                  size="md"
                  className="w-full sm:w-auto bg-[#16805B] hover:bg-[#0D5C41] active:bg-[#09422F] text-white shadow-md text-sm font-extrabold px-6 py-2.5 rounded-full transition-all"
                  rightIcon={<ArrowRight className="h-4 w-4" />}
                >
                  Explore Educators
                </GlassButton>
              </Link>

              <Link href="/teacher" className="w-full sm:w-auto">
                <GlassButton
                  variant="secondary"
                  size="md"
                  className="w-full sm:w-auto bg-white hover:bg-[#0D5C41] hover:text-white active:bg-[#09422F] text-[#0F172A] border border-[#E2E8F0] text-sm font-bold px-6 py-2.5 rounded-full transition-all"
                >
                  Become an Educator
                </GlassButton>
              </Link>
            </div>
          </div>

          {/* Right Column: Premium Photo 1 Brand Artwork Card */}
          <div className="lg:col-span-5">
            <div className="relative mx-auto max-w-md lg:max-w-none">
              {/* Outer Glow Ring */}
              <div className="absolute -inset-2 bg-gradient-to-tr from-[#16805B]/20 via-[#F2C14E]/20 to-[#16805B]/10 rounded-[2.2rem] blur-lg -z-10" />

              {/* Card Container with 1:1 Aspect Ratio preserved */}
              <div className="p-3 sm:p-4 rounded-3xl bg-white border border-[#E2E8F0] shadow-2xl space-y-3 relative overflow-hidden">
                <div className="relative aspect-square w-full rounded-2xl overflow-hidden bg-[#FBF7EE] border border-[#E2E8F0]">
                  <Image
                    src={visionPoster}
                    alt="EduConnects Vision Poster featuring Founder Neeraj Shrivastava - Better Learning, Brighter Tomorrows"
                    priority
                    className="w-full h-full object-contain"
                  />
                </div>

                {/* Bottom Caption Pill */}
                <div className="px-3 py-2 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] flex items-center justify-between text-xs text-[#64748B]">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-[#16805B]" />
                    <span className="font-bold text-[#0F172A]">Learn • Grow • Belong</span>
                  </div>
                  <span className="font-semibold text-[#16805B] text-[11px] uppercase tracking-wider">
                    EduConnects Core Vision
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
