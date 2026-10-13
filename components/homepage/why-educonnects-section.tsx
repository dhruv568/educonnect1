"use client";

import React from "react";
import { Target, Calendar, UserCheck, HeartHandshake } from "lucide-react";

export function WhyEduConnectsSection() {
  const benefits = [
    {
      icon: Target,
      title: "Personalized Learning",
      desc: "Find learning experiences tailored specifically to your academic goals, current level, and individual learning speed.",
    },
    {
      icon: Calendar,
      title: "Flexible Timing",
      desc: "Choose learning sessions that fit your schedule, with flexible timings for 1-on-1 classes and self-paced learning.",
    },
    {
      icon: UserCheck,
      title: "Verified Educators",
      desc: "Learn from verified educators with subject expertise and practical knowledge.",
    },
    {
      icon: HeartHandshake,
      title: "Track Your Progress",
      desc: "Monitor your learning, complete lessons, and stay on track toward your academic goals.",
    },
  ];

  return (
    <section className="py-20 lg:py-28 bg-[#F8FAFC] border-b border-[#E2E8F0] font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <span className="text-xs font-black text-[#16805B] uppercase tracking-widest px-3 py-1 rounded-full bg-[#F0FAF5]">
            REAL VALUE & FLEXIBILITY
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-[#0F172A] tracking-tight">
            Why choose EduConnects?
          </h2>
          <p className="text-sm sm:text-base text-[#64748B]">
            Designed with clarity, flexibility, and learner-first values at its core.
          </p>
        </div>

        {/* 4 Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {benefits.map((b, idx) => {
            const IconComp = b.icon;
            return (
              <div
                key={idx}
                className="p-7 rounded-3xl bg-white border border-[#E2E8F0] hover:border-[#16805B]/40 hover:shadow-xl transition-all space-y-4 flex flex-col justify-between group"
              >
                <div className="space-y-3">
                  <div className="p-3.5 rounded-2xl bg-[#F0FAF5] text-[#16805B] w-fit group-hover:bg-[#16805B] group-hover:text-white transition-colors">
                    <IconComp className="h-6 w-6" />
                  </div>
                  <h3 className="text-lg font-black text-[#0F172A]">
                    {b.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-[#64748B] leading-relaxed">
                    {b.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
