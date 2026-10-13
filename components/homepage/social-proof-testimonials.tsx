"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GlassCard } from "@/components/glass/glass-card";
import { GlassBadge } from "@/components/glass/glass-badge";
import { GlassButton } from "@/components/glass/glass-button";
import {
  Star,
  Quote,
  CheckCircle2,
  Trophy,
  Users,
  Award,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  BookOpen,
} from "lucide-react";
import Link from "next/link";

export interface SocialProofTestimonialsProps {}

export function SocialProofTestimonials(_props: SocialProofTestimonialsProps = {}) {
  const [activeFilter, setActiveFilter] = useState<"ALL" | "DEMO" | "LIVE" | "LMS">("ALL");

  const testimonials = [
    {
      id: 1,
      name: "Arjun Mehta",
      role: "12th Grade CBSE STEM",
      avatar: "/images/educators/male-1.jpg",
      model: "LIVE",
      modelLabel: "Live Class Slots",
      badgeVariant: "indigo" as const,
      achievement: "Scored 98% in CBSE Board Math",
      achievementIcon: Trophy,
      rating: 5,
      tutor: "Mr. Rahul Sharma",
      quote:
        "The live interactive whiteboard made differential calculus finally make sense. In school I was always too shy to raise my hand, but here I asked 10+ questions every slot without feeling judged.",
    },
    {
      id: 2,
      name: "Priya Sharma",
      role: "NEET Medical Aspirant",
      avatar: "/images/educators/female-1.jpg",
      model: "DEMO",
      modelLabel: "1-on-1 Demo Session",
      badgeVariant: "blue" as const,
      achievement: "170/180 in NEET Physics Section",
      achievementIcon: Award,
      rating: 5,
      tutor: "Dr. Vikramaditya Sen",
      quote:
        "Booking a 1-on-1 trial session first was the best decision. Dr. Vikramaditya analyzed my weak areas in mechanics and created a custom roadmap. No other platform gave me this level of focused personal attention.",
    },
    {
      id: 3,
      name: "David Chen",
      role: "College Freshman & Coder",
      avatar: "/images/educators/male-2.jpg",
      model: "LMS",
      modelLabel: "Pre-recorded LMS Course",
      badgeVariant: "emerald" as const,
      achievement: "Built 4 Full-Stack Projects",
      achievementIcon: Sparkles,
      rating: 5,
      tutor: "Meenakshi Sundaram",
      quote:
        "The pre-recorded Python & Data Structures curriculum is unmatched. Every module comes with practical downloadable workbooks and auto-graded code challenges that solidified my understanding.",
    },
    {
      id: 4,
      name: "Ananya Verma",
      role: "10th ICSE Board Topper",
      avatar: "/images/educators/female-2.jpg",
      model: "LIVE",
      modelLabel: "Live Class Slots",
      badgeVariant: "indigo" as const,
      achievement: "Rank 1 in Science Olympiad",
      achievementIcon: Trophy,
      rating: 5,
      tutor: "Dr. Rahul Sharma",
      quote:
        "My grades jumped from 78% to 95% in just 4 months. EduConnects's pay-per-class model meant we didn't have to lock into huge annual contracts, yet the teaching was world-class.",
    },
  ];

  const filteredTestimonials =
    activeFilter === "ALL"
      ? testimonials
      : testimonials.filter((t) => t.model === activeFilter);

  return (
    <section id="success-stories" className="py-20 lg:py-28 bg-[#F0FAF5]/40 border-b border-[#E2E8F0] relative overflow-hidden font-sans scroll-mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 space-y-12 sm:space-y-16">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#F0FAF5] border border-emerald-200 text-[#16805B] text-xs font-black uppercase tracking-wider">
            <Sparkles className="h-3.5 w-3.5 text-[#16805B]" />
            <span>PROVEN ACADEMIC RESULTS</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-[#0F172A] tracking-tight">
            Success Stories
          </h2>
          <p className="text-sm sm:text-base text-[#64748B]">
            Discover how learners turn difficult concepts into academic strengths through verified educators and personalized learning models on EduConnects.
          </p>
        </div>

        {/* Supporting Achievement Image Showcase */}
        <div className="max-w-4xl mx-auto rounded-3xl overflow-hidden border border-[#E2E8F0] shadow-md bg-white">
          <div className="grid grid-cols-1 md:grid-cols-12 items-center">
            <div className="md:col-span-5 self-stretch relative overflow-hidden bg-[#F0FAF5] flex items-center justify-center p-3 sm:p-4 md:p-3.5">
              <img
                src="/images/learner-hero.jpeg"
                alt="Learners celebrating academic success and milestones"
                className="w-full h-auto max-h-full object-contain object-center rounded-xl sm:rounded-2xl"
              />
            </div>
            <div className="md:col-span-7 p-6 sm:p-8 space-y-2.5 text-left">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F0FAF5] text-[#16805B] text-[11px] font-bold border border-emerald-200">
                <Trophy className="h-3.5 w-3.5 text-[#16805B]" />
                <span>Learner Milestone Accomplishments</span>
              </div>
              <h3 className="text-lg sm:text-xl font-black text-[#0F172A]">
                Empowering learners to reach their highest potential
              </h3>
              <p className="text-xs sm:text-sm text-[#64748B] leading-relaxed">
                From board exam preparation to cutting-edge technical skills, EduConnects provides the 1-on-1 mentorship and structured learning environment that enables learners to thrive.
              </p>
            </div>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center justify-center gap-2 overflow-x-auto pb-2">
          {[
            { key: "ALL", label: "All Experiences" },
            { key: "DEMO", label: "1-on-1 Sessions" },
            { key: "LIVE", label: "Live Classes" },
            { key: "LMS", label: "Recorded LMS" },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveFilter(tab.key as any)}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                activeFilter === tab.key
                  ? "bg-[#16805B] text-white shadow-md"
                  : "bg-white text-[#0F172A] border border-[#E2E8F0] hover:bg-[#F0FAF5] hover:text-[#0D5C41]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Testimonials Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
          <AnimatePresence mode="wait">
            {filteredTestimonials.map((item) => {
              const AchIcon = item.achievementIcon;
              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 15 }}
                  transition={{ duration: 0.3 }}
                >
                  <GlassCard
                    className="p-6 sm:p-7 border border-[#E2E8F0] bg-white shadow-md flex flex-col justify-between h-full space-y-6 rounded-3xl"
                  >
                    <div className="space-y-4">
                      {/* Top Header */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <img
                            src={item.avatar}
                            alt={item.name}
                            className="w-12 h-12 rounded-full object-cover ring-2 ring-[#16805B]/20 shrink-0"
                          />
                          <div>
                            <h4 className="text-sm font-black text-[#0F172A]">{item.name}</h4>
                            <p className="text-[11px] text-[#64748B] font-medium">{item.role}</p>
                          </div>
                        </div>
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#F0FAF5] text-[#16805B] border border-emerald-200">
                          {item.modelLabel}
                        </span>
                      </div>

                      {/* Achievement Ribbon */}
                      <div className="flex items-center gap-2 p-2.5 rounded-xl bg-[#FBF7EE] border border-[#F2C14E]/40 text-[#0F172A] text-xs font-bold">
                        <AchIcon className="h-4 w-4 text-[#16805B] shrink-0" />
                        <span className="truncate">{item.achievement}</span>
                      </div>

                      {/* Quote */}
                      <div className="relative pt-1">
                        <Quote className="h-6 w-6 text-[#16805B]/20 absolute -top-2 -left-1 pointer-events-none" />
                        <p className="text-xs sm:text-sm text-[#64748B] leading-relaxed font-normal pl-4 italic">
                          &ldquo;{item.quote}&rdquo;
                        </p>
                      </div>
                    </div>

                    {/* Bottom Metadata */}
                    <div className="pt-4 border-t border-[#E2E8F0] flex items-center justify-between text-[11px]">
                      <div className="flex items-center text-amber-500">
                        {Array.from({ length: item.rating }).map((_, i) => (
                          <Star key={i} className="h-3.5 w-3.5 fill-amber-400" />
                        ))}
                      </div>
                      <span className="text-[#64748B] font-medium">Educator: {item.tutor}</span>
                    </div>
                  </GlassCard>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {/* CTA Bar */}
        <div className="p-6 sm:p-8 rounded-3xl bg-[#16805B] text-white flex flex-col sm:flex-row items-center justify-between gap-6 shadow-xl border border-[#0D5C41]">
          <div className="space-y-1 text-center sm:text-left">
            <h3 className="text-lg sm:text-xl font-black">Experience the difference with personalized guidance.</h3>
            <p className="text-xs sm:text-sm text-emerald-100/90">Connect with a verified educator, discuss your syllabus, and get a tailored learning roadmap.</p>
          </div>
          <Link href="/find-teachers" className="shrink-0 w-full sm:w-auto">
            <GlassButton
              variant="primary"
              size="md"
              rightIcon={<ArrowRight className="h-4 w-4 text-white" />}
              className="w-full sm:w-auto bg-[#0D5C41] hover:bg-[#09422F] active:bg-[#09422F] text-white border border-emerald-400/40 font-extrabold px-6 py-2.5 rounded-full shadow-md transition-all"
            >
              Find an Educator
            </GlassButton>
          </Link>
        </div>
      </div>
    </section>
  );
}