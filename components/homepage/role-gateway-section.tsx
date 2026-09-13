"use client";

import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { GlassCard } from "@/components/glass/glass-card";
import { GlassBadge } from "@/components/glass/glass-badge";
import { GlassButton } from "@/components/glass/glass-button";
import {
  GraduationCap,
  BookOpen,
  ArrowRight,
  Video,
  CheckCircle2,
  Sparkles,
  Award,
} from "lucide-react";
import { getStudentDomain, getEducatorDomain } from "@/lib/app-url";

export function RoleGatewaySection() {
  const studentUrl = getStudentDomain() + "/";
  const educatorUrl = getEducatorDomain() + "/";

  return (
    <section className="py-16 sm:py-24 bg-gradient-to-b from-transparent via-blue-50/50 to-transparent relative z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-700 text-xs font-black uppercase tracking-widest">
            <Sparkles className="h-3.5 w-3.5 text-blue-600" />
            <span>Tailored Experiences</span>
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 tracking-tight">
            How would you like to experience{" "}
            <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
              EduConnects?
            </span>
          </h2>
          <p className="text-base sm:text-lg text-slate-600 leading-relaxed">
            Choose your path to access dedicated tools, learning discovery, classroom features, or educator publishing tools.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-10 items-stretch">
          {/* STUDENT GATEWAY CARD */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="flex"
          >
            <GlassCard
              glowColor="rgba(16, 185, 129, 0.2)"
              className="p-8 sm:p-10 border-2 border-emerald-500/20 hover:border-emerald-500/50 transition-all flex flex-col justify-between w-full shadow-xl relative group overflow-hidden bg-white/80"
            >
              <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-bl from-emerald-500/10 via-transparent to-transparent rounded-bl-full pointer-events-none" />

              <div className="space-y-6 relative z-10">
                <div className="flex items-center justify-between">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-600 shadow-inner group-hover:scale-110 transition-transform">
                    <BookOpen className="h-7 w-7" />
                  </div>
                  <GlassBadge variant="emerald" size="md">
                    FOR LEARNERS
                  </GlassBadge>
                </div>

                <div className="space-y-2">
                  <h3 className="text-2xl sm:text-3xl font-black text-slate-900">
                    I am a Learner
                  </h3>
                  <p className="text-sm text-emerald-700 font-semibold">
                    Master subjects, attend live interactive classes & ace your exams
                  </p>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed pt-1">
                    Discover verified subject specialists, book 1-on-1 trial demos with zero commitment, attend LiveKit video classrooms with shared whiteboards, and track course certificates.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>Free 1-on-1 Trial Demos</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>Live Whiteboard & Quizzes</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>Verified Top Tutors</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>Self-Paced Video LMS</span>
                  </div>
                </div>
              </div>

              <div className="pt-8 mt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center gap-3 relative z-10">
                <Link href={studentUrl} className="w-full sm:w-auto flex-1">
                  <GlassButton
                    variant="primary"
                    size="lg"
                    className="w-full bg-emerald-600 hover:bg-emerald-700 border-emerald-500 shadow-emerald-600/20"
                    rightIcon={<ArrowRight className="h-4 w-4" />}
                  >
                    Enter Learner Portal
                  </GlassButton>
                </Link>
                <Link href="/student/login" className="w-full sm:w-auto">
                  <GlassButton
                    variant="secondary"
                    size="lg"
                    className="w-full text-slate-700 border-slate-200"
                  >
                    Learner Login
                  </GlassButton>
                </Link>
              </div>
            </GlassCard>
          </motion.div>

          {/* TEACHER GATEWAY CARD */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="flex"
          >
            <GlassCard
              glowColor="rgba(99, 102, 241, 0.2)"
              className="p-8 sm:p-10 border-2 border-indigo-500/20 hover:border-indigo-500/50 transition-all flex flex-col justify-between w-full shadow-xl relative group overflow-hidden bg-white/80"
            >
              <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-bl from-indigo-500/10 via-transparent to-transparent rounded-bl-full pointer-events-none" />

              <div className="space-y-6 relative z-10">
                <div className="flex items-center justify-between">
                  <div className="w-14 h-14 rounded-2xl bg-indigo-100 flex items-center justify-center text-indigo-600 shadow-inner group-hover:scale-110 transition-transform">
                    <GraduationCap className="h-7 w-7" />
                  </div>
                  <GlassBadge variant="indigo" size="md">
                    FOR EDUCATORS
                  </GlassBadge>
                </div>

                <div className="space-y-2">
                  <h3 className="text-2xl sm:text-3xl font-black text-slate-900">
                    I am an Educator
                  </h3>
                  <p className="text-sm text-indigo-700 font-semibold">
                    Build your teaching brand, host live sessions & scale your revenue
                  </p>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed pt-1">
                    Set your custom rates, publish pre-recorded video curricula, host automated live class bookings with HD WebRTC, and receive 100% transparent direct bank payouts.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                    <CheckCircle2 className="h-4 w-4 text-indigo-600 shrink-0" />
                    <span>Custom Hourly Rates</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                    <CheckCircle2 className="h-4 w-4 text-indigo-600 shrink-0" />
                    <span>LMS Course Publisher</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                    <CheckCircle2 className="h-4 w-4 text-indigo-600 shrink-0" />
                    <span>Live Interactive Room</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                    <CheckCircle2 className="h-4 w-4 text-indigo-600 shrink-0" />
                    <span>Fast Automated Payouts</span>
                  </div>
                </div>
              </div>

              <div className="pt-8 mt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center gap-3 relative z-10">
                <Link href={educatorUrl} className="w-full sm:w-auto flex-1">
                  <GlassButton
                    variant="primary"
                    size="lg"
                    className="w-full bg-indigo-600 hover:bg-indigo-700 border-indigo-500 shadow-indigo-600/20"
                    rightIcon={<ArrowRight className="h-4 w-4" />}
                  >
                    Enter Educator Portal
                  </GlassButton>
                </Link>
                <Link href="/teacher/login" className="w-full sm:w-auto">
                  <GlassButton
                    variant="secondary"
                    size="lg"
                    className="w-full text-slate-700 border-slate-200"
                  >
                    Educator Login
                  </GlassButton>
                </Link>
              </div>
            </GlassCard>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
