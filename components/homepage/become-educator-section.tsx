"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Award, BookOpen, Video, TrendingUp, Star, Quote } from "lucide-react";
import { GlassButton } from "@/components/glass/glass-button";

export function BecomeEducatorSection() {
  const educatorFeatures = [
    "Create courses",
    "Share your expertise",
    "Teach learners",
    "Grow your educational presence",
  ];

  return (
    <section className="py-20 lg:py-28 bg-[#FBF7EE] border-b border-[#E2E8F0] font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="p-8 sm:p-12 lg:p-16 rounded-3xl bg-[#16805B] text-white shadow-2xl relative overflow-hidden">
          {/* Background Glow Orbs */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-[#F2C14E]/10 blur-3xl rounded-full pointer-events-none" />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center relative z-10">
            {/* Left Copy */}
            <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
              <span className="text-xs font-black text-emerald-200 uppercase tracking-widest px-3.5 py-1.5 rounded-full bg-white/10 border border-white/20">
                TEACH ON EduConnects
              </span>

              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight">
                Your knowledge can help someone grow.
              </h2>

              <p className="text-base sm:text-lg text-emerald-100/90 max-w-xl mx-auto lg:mx-0 font-normal leading-relaxed">
                Create courses, teach learners and build your presence through EduConnects. Set your own rates, host live classes, and receive automated payouts.
              </p>

              {/* Feature Checklist */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs sm:text-sm font-bold text-white max-w-lg mx-auto lg:mx-0 text-left">
                {educatorFeatures.map((feat, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <CheckCircle2 className="h-4.5 w-4.5 text-emerald-300 shrink-0" />
                    <span>{feat}</span>
                  </div>
                ))}
              </div>

              {/* CTA */}
              <div className="pt-4 flex justify-center lg:justify-start">
                <Link href="/teacher">
                  <GlassButton
                    variant="primary"
                    size="lg"
                    className="bg-[#0D5C41] hover:bg-[#09422F] active:bg-[#09422F] text-white border border-emerald-400/40 font-extrabold px-8 py-3.5 rounded-full shadow-xl text-sm transition-all"
                    rightIcon={<ArrowRight className="h-4.5 w-4.5" />}
                  >
                    Become an Educator →
                  </GlassButton>
                </Link>
              </div>
            </div>

            {/* Right Column Graphics */}
            <div className="lg:col-span-5 space-y-4">
              {/* Teacher Testimonial Card */}
              <div className="p-5 sm:p-6 rounded-3xl bg-[#0D5C41] border border-[#16805B]/50 shadow-xl space-y-3.5 text-left relative backdrop-blur-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src="/images/educators/kavita-deshmukh.jpg"
                      alt="Dr. Kavita Deshmukh"
                      className="w-11 h-11 rounded-2xl object-cover object-top ring-2 ring-emerald-400/40 shadow-md shrink-0"
                    />
                    <div className="min-w-0">
                      <h4 className="text-sm font-black text-white leading-tight truncate">Dr. Kavita Deshmukh</h4>
                      <p className="text-xs text-emerald-100/70 font-medium truncate">Senior Mathematics Educator</p>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-2xl bg-[#16805B] text-[#F2C14E] shrink-0 shadow-inner">
                    <Quote className="h-4 w-4" />
                  </div>
                </div>

                <p className="text-xs sm:text-[13px] text-emerald-100/90 leading-relaxed italic">
                  &ldquo;Teaching on EduConnects gave me 100% curriculum autonomy and dependable automated payouts. My live problem-solving batches fill up within days.&rdquo;
                </p>

                <div className="flex items-center justify-between pt-2 border-t border-[#16805B]/40 text-xs">
                  <div className="flex items-center gap-1 text-[#F2C14E]">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className="h-3.5 w-3.5 fill-[#F2C14E]" />
                    ))}
                  </div>
                  <span className="text-[11px] font-bold text-emerald-200">5.0 Verified Educator</span>
                </div>
              </div>

              {/* Full IP Ownership Card */}
              <div className="p-6 rounded-3xl bg-[#0D5C41] border border-[#16805B]/50 shadow-xl space-y-4 text-left">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-2xl bg-[#16805B] text-[#F2C14E]">
                    <Award className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-white">Full IP Ownership</h3>
                    <p className="text-xs text-emerald-100/70">Your courses & content remain 100% yours</p>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-[#16805B]/60 border border-emerald-500/30 space-y-2 text-xs text-emerald-100/80">
                  <div className="flex justify-between font-bold text-white">
                    <span>Platform Commission:</span>
                    <span className="text-[#F2C14E]">Fair & Transparent</span>
                  </div>
                  <div className="flex justify-between font-bold text-white">
                    <span>Direct Bank Deposit:</span>
                    <span>Automated Cashfree Payouts</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
