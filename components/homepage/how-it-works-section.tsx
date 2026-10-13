"use client";

import React from "react";
import { Search, Compass, Rocket } from "lucide-react";

export function HowItWorksSection() {
  const steps = [
    {
      number: "01",
      title: "Tell Us What You Want to Learn",
      desc: "Choose a subject, skill, level or learning goal based on your current academic or professional needs.",
      icon: Search,
    },
    {
      number: "02",
      title: "Find the Right Educator",
      desc: "Discover verified educators who match your goals, subject, budget, and schedule. Connect with the right educator for personalized 1-on-1 learning.",
      icon: Compass,
    },
    {
      number: "03",
      title: "Start Learning",
      desc: "Connect directly with your tutor, enroll in your chosen course, and begin your journey towards academic mastery.",
      icon: Rocket,
    },
  ];

  return (
    <section id="how-it-works" className="py-20 lg:py-28 bg-white border-b border-[#E2E8F0] font-sans scroll-mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <span className="text-xs font-black text-[#16805B] uppercase tracking-widest px-3 py-1 rounded-full bg-[#F0FAF5]">
            SIMPLE 3-STEP PROCESS
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-[#0F172A] tracking-tight">
            How EduConnects Works
          </h2>
          <p className="text-sm sm:text-base text-[#64748B]">
            Getting started with EduConnects is quick, simple, and straightforward.
          </p>
        </div>

        {/* Supporting Learning & Connection Showcase */}
        <div className="max-w-4xl mx-auto rounded-3xl overflow-hidden border border-[#E2E8F0] shadow-sm bg-[#F8FAFC] relative">
          <div className="grid grid-cols-1 sm:grid-cols-12 items-center">
            <div className="sm:col-span-5 h-44 sm:h-52 relative overflow-hidden bg-[#F0FAF5]">
              <img
                src="https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&auto=format&fit=crop&q=80"
                alt="EduConnects seamless connection between learners and educators"
                className="w-full h-full object-cover object-center"
              />
            </div>
            <div className="sm:col-span-7 p-6 sm:p-8 space-y-2 text-left">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#16805B] bg-[#F0FAF5] px-2.5 py-1 rounded-full border border-emerald-200">
                Direct Connection
              </span>
              <h3 className="text-base sm:text-lg font-black text-[#0F172A]">
                Frictionless learning from day one
              </h3>
              <p className="text-xs sm:text-sm text-[#64748B] leading-relaxed">
                Connect directly with verified educators, schedule trial sessions, or jump straight into self-paced curricula without complex enrollment hurdles.
              </p>
            </div>
          </div>
        </div>

        {/* 3 Step Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          {steps.map((s, idx) => {
            const IconComp = s.icon;
            return (
              <div
                key={idx}
                className="p-8 rounded-3xl bg-[#F8FAFC] border border-[#E2E8F0] hover:border-[#16805B] hover:shadow-xl transition-all space-y-5 flex flex-col justify-between relative group"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-4xl font-black text-[#16805B]/30 group-hover:text-[#16805B] transition-colors">
                      {s.number}
                    </span>
                    <div className="p-3 rounded-2xl bg-white border border-[#E2E8F0] text-[#16805B] shadow-xs">
                      <IconComp className="h-6 w-6" />
                    </div>
                  </div>
                  <h3 className="text-xl font-black text-[#0F172A]">
                    {s.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-[#64748B] leading-relaxed">
                    {s.desc}
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
