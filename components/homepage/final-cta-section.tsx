"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight, BookOpen } from "lucide-react";
import { GlassButton } from "@/components/glass/glass-button";

export function FinalCtaSection() {
  return (
    <section className="py-20 lg:py-24 bg-[#16805B] text-white border-b border-[#0D5C41] font-sans relative overflow-hidden">
      {/* Background Subtle Accent Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3/4 h-64 bg-[#F2C14E]/10 blur-3xl rounded-full pointer-events-none" />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center space-y-6 relative z-10">
        <span className="px-3.5 py-1.5 rounded-full bg-[#F0FAF5] text-[#16805B] text-xs font-black uppercase tracking-wider">
          TAKE YOUR NEXT STEP
        </span>

        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight text-white">
          Ready to start learning?
        </h2>

        <p className="text-base sm:text-lg text-emerald-100/90 max-w-xl mx-auto font-normal leading-relaxed">
          Find the right educators, explore courses and discover new ways to grow with EduConnects.
        </p>

        <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link href="/find-teachers" className="w-full sm:w-auto">
            <GlassButton
              variant="primary"
              size="lg"
              className="w-full sm:w-auto bg-[#0D5C41] hover:bg-[#09422F] active:bg-[#09422F] text-white border border-emerald-400/40 font-extrabold px-8 py-3.5 rounded-full shadow-xl text-sm transition-all"
              rightIcon={<ArrowRight className="h-4.5 w-4.5" />}
            >
              Find an Educator →
            </GlassButton>
          </Link>

          <Link href="/courses" className="w-full sm:w-auto">
            <GlassButton
              variant="secondary"
              size="lg"
              className="w-full sm:w-auto bg-white/10 hover:bg-[#0D5C41] active:bg-[#09422F] text-white border border-white/20 font-bold px-7 py-3.5 rounded-full text-sm transition-all"
              leftIcon={<BookOpen className="h-4.5 w-4.5" />}
            >
              Explore Courses
            </GlassButton>
          </Link>
        </div>
      </div>
    </section>
  );
}
