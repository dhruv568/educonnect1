"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { FloatingNavbar } from "@/components/homepage/floating-navbar";
import { PremiumFooter } from "@/components/homepage/premium-footer";
import { GlassCard } from "@/components/glass/glass-card";
import { GlassBadge } from "@/components/glass/glass-badge";
import { GlassButton } from "@/components/glass/glass-button";
import { TrainingSeatModal } from "@/components/educator/training-seat-modal";
import {
  GraduationCap,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Video,
  BookOpen,
  Users,
  Award,
  ShieldCheck,
  Calendar,
  Clock,
  Target,
  FileCheck,
  Laptop,
  TrendingUp,
  MessageSquare,
  HelpCircle,
  ChevronDown,
  Zap,
  Layers,
  Lightbulb,
  Check,
  UserCheck,
  Flame,
  Globe,
  Star,
  Compass,
} from "lucide-react";

export default function TeachersTrainingProgramPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState("Teacher");
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);
  const [programConfig, setProgramConfig] = useState<{
    batchDate: string;
    hasExplicitBatchDate: boolean;
    seatsNotice: string;
    hasExplicitSeats: boolean;
    price: number;
    requiresPayment: boolean;
  }>({
    batchDate: "Next Batch Starting Soon",
    hasExplicitBatchDate: false,
    seatsNotice: "Seats for the upcoming batch are limited.",
    hasExplicitSeats: false,
    price: 0,
    requiresPayment: false,
  });

  // Load dynamic configuration from API
  useEffect(() => {
    fetch("/api/teacher/training/config")
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (json?.data) {
          setProgramConfig({
            batchDate: json.data.batchDate || "Next Batch Starting Soon",
            hasExplicitBatchDate: Boolean(json.data.hasExplicitBatchDate),
            seatsNotice: json.data.seatsNotice || "Seats for the upcoming batch are limited.",
            hasExplicitSeats: Boolean(json.data.hasExplicitSeats),
            price: json.data.price || 0,
            requiresPayment: Boolean(json.data.requiresPayment),
          });
        }
      })
      .catch(() => {});
  }, []);

  const openReservation = (roleDefault = "Teacher") => {
    setSelectedRole(roleDefault);
    setModalOpen(true);
  };

  // 10 Core Curriculum Points as strictly specified
  const curriculumPoints = [
    {
      number: "01",
      title: "Conduct engaging online classes",
      desc: "Master live classroom delivery, interactive whiteboard engagement, dynamic student polling, and keeping remote learners fully focused.",
      icon: Video,
      color: "from-teal-500 to-teal-600",
    },
    {
      number: "02",
      title: "Design your own online course",
      desc: "Structure coherent, modular learning syllabi that turn your subject mastery into bite-sized, high-retention recorded or hybrid curricula.",
      icon: BookOpen,
      color: "from-teal-500 to-teal-600",
    },
    {
      number: "03",
      title: "Prepare digital teaching content",
      desc: "Create professional slide decks, annotated worksheets, digital practice packs, and visual assets without complex technical tools.",
      icon: Laptop,
      color: "from-teal-600 to-green-600",
    },
    {
      number: "04",
      title: "Give and manage learner assignments",
      desc: "Set meaningful homework tasks, project milestones, and weekly self-assessment quizzes that reinforce classroom learning.",
      icon: FileCheck,
      color: "from-green-600 to-teal-700",
    },
    {
      number: "05",
      title: "Check assignments and provide feedback",
      desc: "Develop rapid rubric-based marking systems, personalized video/audio critiques, and constructive guidance that inspires improvement.",
      icon: CheckCircle2,
      color: "from-teal-500 to-teal-600",
    },
    {
      number: "06",
      title: "Track learner performance and progress",
      desc: "Use actionable performance metrics, attendance signals, and diagnostic insights to identify learning gaps early.",
      icon: TrendingUp,
      color: "from-teal-600 to-teal-700",
    },
    {
      number: "07",
      title: "Communicate professionally with learners",
      desc: "Establish clear communication protocols, parental updates, office hours, and prompt Q&A support that builds lifelong credibility.",
      icon: MessageSquare,
      color: "from-teal-600 to-teal-600",
    },
    {
      number: "08",
      title: "Keep learners engaged and motivated",
      desc: "Apply evidence-based gamification techniques, milestone rewards, and interactive discussions that ensure high course completion.",
      icon: Flame,
      color: "from-green-500 to-teal-600",
    },
    {
      number: "09",
      title: "Build a structured online teaching system",
      desc: "Organize lesson plans, class notes, recording archives, and session scheduling into an effortless, repeatable workflow.",
      icon: Layers,
      color: "from-teal-500 to-teal-600",
    },
    {
      number: "10",
      title: "Take the first step toward becoming an Online Educator",
      desc: "Transition from local classroom confines to a recognized, scalable online teaching brand with nationwide reach and verified credentials.",
      icon: GraduationCap,
      color: "from-teal-700 to-green-700",
    },
  ];

  // The 4-step progressive transformation
  const transformationSteps = [
    {
      phase: "Phase 1",
      step: "Learn",
      tagline: "Foundations & Tools",
      desc: "Understand digital classroom pedagogies, lesson streaming tools, whiteboard workflows, and student engagement psychology.",
      icon: Lightbulb,
      highlight: "Mindset & Setup",
    },
    {
      phase: "Phase 2",
      step: "Practice",
      tagline: "Hands-On Drills",
      desc: "Simulate live interactive sessions in a safe environment, test screen-sharing setups, and practice delivering structured digital lessons.",
      icon: Laptop,
      highlight: "Safe Rehearsals",
    },
    {
      phase: "Phase 3",
      step: "Implement",
      tagline: "System & Course Build",
      desc: "Publish your first digital course syllabus, upload practice materials, establish your evaluation rubric, and set learner schedules.",
      icon: Target,
      highlight: "Real Curriculum",
    },
    {
      phase: "Phase 4",
      step: "Teach",
      tagline: "Live Online Educator",
      desc: "Step confidently before real learners, conduct impactful live classes, manage learner cohorts, and grow your digital teaching impact.",
      icon: GraduationCap,
      highlight: "National Reach",
    },
  ];

  // Who is this for personas
  const targetPersonas = [
    {
      title: "School Teachers",
      subtitle: "Expand Beyond School Hours",
      desc: "Turn your classroom lesson planning into high-quality online courses and reach students across state boards without leaving your current job.",
      avatar: "/images/educators/female-1.png",
      tag: "School Faculty",
    },
    {
      title: "Private Tutors",
      subtitle: "Scale Your Tuition Practice",
      desc: "Break free from 5-km home-tuition radius limitations. Conduct HD group classes and 1-on-1 sessions for students all over India.",
      avatar: "/images/educators/male-1.png",
      tag: "Home & Private Tutors",
    },
    {
      title: "Coaching Trainers",
      subtitle: "Systematize Test Prep",
      desc: "Deliver competitive exam coaching (JEE, NEET, Olympiads, CBSE) with structured digital tests, doubt solving, and analytics.",
      avatar: "/images/educators/male-3.png",
      tag: "Institute Trainers",
    },
    {
      title: "Subject Experts",
      subtitle: "Monetize Niche Expertise",
      desc: "Whether you specialize in Coding, Vedic Maths, Languages, Commerce, or Music, turn your deep subject knowledge into an online academy.",
      avatar: "/images/educators/female-3.png",
      tag: "Domain Specialists",
    },
  ];

  // FAQs
  const programFaqs = [
    {
      q: "Do I need prior online teaching experience to join?",
      a: "No. This program is intentionally built for educators who have domain knowledge and classroom experience but want step-by-step practical guidance to master digital tools, online classroom delivery, and learner management.",
    },
    {
      q: "What equipment or hardware do I need?",
      a: "A basic laptop or desktop with a functioning webcam, microphone (even earphone mic works), and a steady internet connection. We will guide you through cost-effective digital writing pads and lighting options during the sessions.",
    },
    {
      q: "How are the 15 days structured?",
      a: "The 15 days blend live interactive training sessions, practical drill assignments, syllabus template workshops, and personalized feedback. You will actively build your digital teaching assets rather than just watching lectures.",
    },
    {
      q: "Will I be able to teach on EduConnects after completing the program?",
      a: "Yes! Completing this program gives you direct fast-track onboarding onto EduConnects as an independent Educator, allowing you to launch courses and conduct 1-on-1 or group live classes with verified credentials.",
    },
    {
      q: "When does the next batch start?",
      a: "Batches are organized frequently in small cohorts to ensure individual attention. Next batch starts soon — reserving your seat now ensures you receive the orientation schedule and batch time options.",
    },
  ];

  return (
    <div data-theme="educator" className="min-h-screen flex flex-col bg-[#F0FDFA]/50 relative overflow-hidden font-sans selection:bg-[#0F766E] selection:text-white">
      {/* 1. EDUCATOR PORTAL HEADER */}
      <FloatingNavbar variant="teacher" />

      <main className="flex-1 pt-24 sm:pt-28 pb-20">
        {/* ========================================================================= */}
        {/* SECTION 1: HERO */}
        {/* ========================================================================= */}
        <section className="relative overflow-hidden pt-8 sm:pt-14 pb-16 lg:pb-24">
          {/* Subtle Ambient Brand Glows */}
          <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-[#0F766E]/15 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute top-1/3 -right-24 w-[400px] h-[300px] bg-[#2DD4BF]/15 rounded-full blur-3xl pointer-events-none" />

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
              {/* Left Column: Hero Copy & Main CTAs */}
              <div className="lg:col-span-7 space-y-6 sm:space-y-7 text-center lg:text-left">
                {/* Badge */}
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#0F766E]/10 border border-[#0F766E]/25 text-[#115E59] text-xs sm:text-sm font-bold shadow-xs">
                  <Sparkles className="h-4 w-4 text-[#0F766E]" />
                  <span>EduConnects Educator Academy</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-[#2DD4BF]" />
                  <span className="text-[#0F766E] font-extrabold">15-Day Intensive</span>
                </div>

                {/* Main Hero Headline */}
                <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black tracking-tight text-slate-900 leading-[1.12]">
                  Turn Your Knowledge &amp; Experience{" "}
                  <span className="text-[#0F766E] underline decoration-[#2DD4BF]/40 underline-offset-8">
                    Into Online Teaching
                  </span>
                </h1>

                {/* Subheadline (Exact text from user prompt) */}
                <p className="text-base sm:text-lg md:text-xl text-slate-700 leading-relaxed max-w-2xl mx-auto lg:mx-0 font-medium">
                  You already have the knowledge. You already have the experience. Now learn how to take your teaching online.
                </p>

                {/* Batch & Urgency Micro-Notice */}
                <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3 text-xs sm:text-sm font-semibold text-slate-700">
                  <div className="flex items-center gap-2 bg-white px-3.5 py-1.5 rounded-xl border border-teal-200/80 shadow-xs text-[#115E59]">
                    <Calendar className="h-4 w-4 text-[#0F766E]" />
                    <span>{programConfig.batchDate}</span>
                  </div>
                  <div className="flex items-center gap-2 bg-white px-3.5 py-1.5 rounded-xl border border-teal-200/80 shadow-xs text-[#115E59]">
                    <Clock className="h-4 w-4 text-[#2DD4BF]" />
                    <span>{programConfig.seatsNotice}</span>
                  </div>
                </div>

                {/* Hero CTAs */}
                <div className="pt-2 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
                  {/* Primary CTA (Exact text) */}
                  <button
                    type="button"
                    onClick={() => openReservation("Teacher")}
                    className="w-full sm:w-auto px-7 py-4 rounded-2xl bg-gradient-to-r from-[#0F766E] to-[#115E59] hover:from-[#137150] hover:to-[#094732] text-white font-extrabold text-sm sm:text-base shadow-xl hover:shadow-2xl transition-all duration-200 flex items-center justify-center gap-3 cursor-pointer group hover:-translate-y-0.5"
                  >
                    <span>Join EduConnects’ 15-Day Teachers Training Program</span>
                    <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform text-[#2DD4BF]" />
                  </button>

                  {/* Secondary CTA */}
                  <button
                    type="button"
                    onClick={() => {
                      const el = document.getElementById("curriculum-section");
                      if (el) el.scrollIntoView({ behavior: "smooth" });
                    }}
                    className="w-full sm:w-auto px-6 py-4 rounded-2xl bg-white hover:bg-teal-50/70 text-[#115E59] border border-teal-200/90 font-bold text-sm sm:text-base shadow-xs hover:shadow-md transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <BookOpen className="h-4 w-4 text-[#0F766E]" />
                    <span>View Curriculum</span>
                  </button>
                </div>

                {/* Key Benefits Checklist */}
                <div className="pt-3 border-t border-teal-200/50 flex flex-wrap items-center justify-center lg:justify-start gap-y-2 gap-x-5 text-xs text-slate-650 font-medium">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-[#0F766E]" /> 100% Practical &amp; Interactive
                  </span>
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-[#0F766E]" /> Live Classroom Drills
                  </span>
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-[#0F766E]" /> Fast-Track Verified Onboarding
                  </span>
                </div>
              </div>

              {/* Right Column: Visual Showcase Card */}
              <div className="lg:col-span-5 relative">
                <div className="relative mx-auto max-w-md lg:max-w-none">
                  {/* Decorative Frame Glow */}
                  <div className="absolute -inset-2 rounded-3xl bg-gradient-to-tr from-[#0F766E]/30 via-[#2DD4BF]/20 to-[#115E59]/30 blur-xl opacity-75" />

                  {/* Main Visual Card */}
                  <div className="relative rounded-3xl bg-white/95 border border-teal-100 shadow-2xl p-6 sm:p-8 space-y-6">
                    {/* Visual Header with Educator Profile */}
                    <div className="flex items-center gap-4 pb-5 border-b border-slate-100">
                      <div className="relative w-16 h-16 rounded-2xl overflow-hidden border-2 border-[#0F766E]/30 shadow-md shrink-0 bg-[#F0FDFA]">
                        <Image
                          src="/images/educators/male-3.png"
                          alt="Educator Mentorship"
                          fill
                          className="object-cover object-top"
                          sizes="64px"
                        />
                      </div>
                      <div>
                        <div className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-[#0F766E] bg-[#F0FDFA] px-2.5 py-0.5 rounded-full mb-1">
                          <ShieldCheck className="h-3 w-3" /> Live Mentorship
                        </div>
                        <h2 className="text-base font-bold text-slate-900 leading-snug">
                          Practical 15-Day Transition
                        </h2>
                        <p className="text-xs text-slate-650">From Classroom to Digital Academy</p>
                      </div>
                    </div>

                    {/* Highlights Metric Pill Grid */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-[#F0FDFA] p-3.5 rounded-2xl border border-teal-100 space-y-1">
                        <div className="text-2xl font-black text-[#115E59]">15 Days</div>
                        <div className="text-xs font-semibold text-slate-650">Focused Training</div>
                      </div>
                      <div className="bg-[#F0FDFA] p-3.5 rounded-2xl border border-teal-100 space-y-1">
                        <div className="text-2xl font-black text-[#0F766E]">10 Pillars</div>
                        <div className="text-xs font-semibold text-slate-650">Hands-on Mastery</div>
                      </div>
                      <div className="bg-[#F0FDFA] p-3.5 rounded-2xl border border-teal-100 space-y-1">
                        <div className="text-2xl font-black text-[#115E59]">HD Live</div>
                        <div className="text-xs font-semibold text-slate-650">Classroom Studio</div>
                      </div>
                      <div className="bg-[#F0FDFA] p-3.5 rounded-2xl border border-teal-100 space-y-1">
                        <div className="text-2xl font-black text-[#0F766E]">1-on-1</div>
                        <div className="text-xs font-semibold text-slate-650">Expert Feedback</div>
                      </div>
                    </div>

                    {/* Quote Pill */}
                    <div className="p-4 rounded-2xl bg-gradient-to-br from-[#115E59] to-[#0F766E] text-white text-xs leading-relaxed font-medium shadow-md">
                      <div className="flex items-center gap-2 font-bold text-teal-200 mb-1.5">
                        <Sparkles className="h-4 w-4 text-[#2DD4BF]" />
                        <span>Ready to Teach Online</span>
                      </div>
                      “Teaching online is not about learning complex coding — it's about translating your real-world subject mastery into engaging digital student experiences.”
                    </div>

                    {/* Quick Button */}
                    <button
                      type="button"
                      onClick={() => openReservation("Teacher")}
                      className="w-full py-3 rounded-xl bg-[#F0FDFA] hover:bg-teal-100/70 text-[#115E59] border border-teal-200 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-colors cursor-pointer"
                    >
                      <span>RESERVE MY SEAT FOR NEXT BATCH</span>
                      <ArrowRight className="h-3.5 w-3.5 text-[#0F766E]" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* SECTION 2: PROGRAM INTRODUCTION */}
        {/* ========================================================================= */}
        <section className="py-16 sm:py-20 bg-white border-y border-teal-100/80 relative">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto text-center space-y-4 mb-14">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#F0FDFA] border border-teal-200 text-[#115E59] text-xs font-bold uppercase tracking-wider">
                <GraduationCap className="h-3.5 w-3.5 text-[#0F766E]" />
                <span>Program Introduction</span>
              </div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-slate-900 tracking-tight">
                Designed for Confident, Professional Online Teaching
              </h2>
              {/* Program Introduction copy as explicitly specified */}
              <p className="text-base sm:text-lg text-slate-700 leading-relaxed font-medium">
                This is a practical 15-day training program for teachers, tutors, trainers, and subject experts who want to confidently conduct online classes and manage learners professionally.
              </p>
            </div>

            {/* Persona Target Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {targetPersonas.map((persona) => (
                <div
                  key={persona.title}
                  className="bg-[#F0FDFA]/70 rounded-3xl border border-teal-200/70 p-6 flex flex-col justify-between hover:bg-white hover:border-[#0F766E]/40 hover:shadow-xl transition-all duration-300 group"
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-[#0F766E] bg-white px-2.5 py-1 rounded-full border border-teal-100">
                        {persona.tag}
                      </span>
                      <div className="relative w-10 h-10 rounded-full overflow-hidden border border-teal-200 bg-white">
                        <Image
                          src={persona.avatar}
                          alt={persona.title}
                          fill
                          className="object-cover"
                          sizes="40px"
                        />
                      </div>
                    </div>

                    <div>
                      <h3 className="text-lg font-bold text-slate-900 group-hover:text-[#115E59] transition-colors">
                        {persona.title}
                      </h3>
                      <p className="text-xs font-semibold text-[#0F766E] mt-0.5">
                        {persona.subtitle}
                      </p>
                    </div>

                    <p className="text-xs text-slate-650 leading-relaxed font-normal">
                      {persona.desc}
                    </p>
                  </div>

                  <div className="pt-4 mt-4 border-t border-teal-200/40">
                    <button
                      type="button"
                      onClick={() => openReservation(persona.title)}
                      className="text-xs font-bold text-[#115E59] hover:text-[#0F766E] inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <span>Join as {persona.title.split(" ")[0]}</span>
                      <ArrowRight className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* SECTION 3: IN JUST 15 DAYS, LEARN HOW TO */}
        {/* ========================================================================= */}
        <section id="curriculum-section" className="py-16 sm:py-24 relative overflow-hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto text-center space-y-4 mb-16">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#0F766E]/10 border border-[#0F766E]/30 text-[#115E59] text-xs font-extrabold uppercase tracking-wider">
                <CheckCircle2 className="h-4 w-4 text-[#0F766E]" />
                <span>10 Practical Pillars</span>
              </div>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 tracking-tight">
                In Just 15 Days, Learn How To
              </h2>
              <p className="text-base sm:text-lg text-slate-700 leading-relaxed max-w-2xl mx-auto font-medium">
                Every session is structured for immediate application. No generic theory — practical skills you will implement in your very next class.
              </p>
            </div>

            {/* 10 Curriculum Points Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-7">
              {curriculumPoints.map((item) => {
                const IconComponent = item.icon;
                return (
                  <div
                    key={item.number}
                    className="bg-white rounded-3xl p-6 sm:p-7 border border-teal-100/90 shadow-sm hover:shadow-xl hover:border-[#0F766E]/40 transition-all duration-300 flex flex-col justify-between group hover:-translate-y-1"
                  >
                    <div className="space-y-4">
                      {/* Number badge and Icon */}
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-black text-teal-800 bg-[#F0FDFA] px-2.5 py-1 rounded-xl border border-teal-200">
                          MODULE {item.number}
                        </span>
                        <div className="w-11 h-11 rounded-2xl bg-[#F0FDFA] border border-teal-200/80 flex items-center justify-center group-hover:bg-[#0F766E] transition-colors duration-300">
                          <IconComponent className="h-5 w-5 text-[#0F766E] group-hover:text-white transition-colors duration-300" />
                        </div>
                      </div>

                      {/* Title (Exact item text from prompt) */}
                      <h3 className="text-lg sm:text-xl font-bold text-slate-900 group-hover:text-[#115E59] transition-colors leading-snug">
                        {item.title}
                      </h3>

                      {/* Description */}
                      <p className="text-xs sm:text-sm text-slate-650 leading-relaxed font-normal">
                        {item.desc}
                      </p>
                    </div>

                    <div className="pt-4 mt-5 border-t border-slate-100 flex items-center gap-2 text-xs font-semibold text-[#0F766E]">
                      <Check className="h-3.5 w-3.5" />
                      <span>Ready to implement by Day {item.number}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Middle Section CTA Trigger */}
            <div className="mt-14 text-center">
              <button
                type="button"
                onClick={() => openReservation("Teacher")}
                className="inline-flex items-center gap-3 px-8 py-4 rounded-2xl bg-gradient-to-r from-[#0F766E] to-[#115E59] hover:from-[#137150] hover:to-[#094732] text-white font-extrabold text-sm sm:text-base shadow-xl hover:shadow-2xl transition-all cursor-pointer hover:-translate-y-0.5"
              >
                <span>RESERVE MY SEAT FOR THE 15-DAY INTENSIVE</span>
                <ArrowRight className="h-4 w-4 text-[#2DD4BF]" />
              </button>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* SECTION 4: VISUAL “FROM TEACHER TO ONLINE EDUCATOR” SECTION */}
        {/* ========================================================================= */}
        <section className="py-16 sm:py-24 bg-gradient-to-b from-[#115E59] via-[#094732] to-[#115E59] text-white relative overflow-hidden">
          {/* Subtle Ambient Shapes */}
          <div className="absolute top-0 left-1/4 w-[600px] h-[300px] bg-[#2DD4BF]/15 blur-3xl rounded-full pointer-events-none" />
          <div className="absolute bottom-0 right-1/4 w-[600px] h-[300px] bg-[#0F766E]/20 blur-3xl rounded-full pointer-events-none" />

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 space-y-16">
            {/* Header */}
            <div className="max-w-3xl mx-auto text-center space-y-4">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 border border-white/20 text-teal-200 text-xs font-bold uppercase tracking-wider">
                <Sparkles className="h-4 w-4 text-[#2DD4BF]" />
                <span>The 4-Step Transformation Path</span>
              </div>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-white">
                From Teacher to Online Educator
              </h2>
              {/* Stepper Heading */}
              <div className="inline-flex items-center flex-wrap justify-center gap-2 sm:gap-4 text-base sm:text-xl md:text-2xl font-extrabold text-teal-200 pt-2">
                <span className="bg-white/10 px-3 py-1 rounded-xl">Learn</span>
                <span className="text-[#2DD4BF]">→</span>
                <span className="bg-white/10 px-3 py-1 rounded-xl">Practice</span>
                <span className="text-[#2DD4BF]">→</span>
                <span className="bg-white/10 px-3 py-1 rounded-xl">Implement</span>
                <span className="text-[#2DD4BF]">→</span>
                <span className="bg-white/10 px-3 py-1 rounded-xl text-white border border-[#2DD4BF]/50">Teach</span>
              </div>
            </div>

            {/* 4 Stepper Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {transformationSteps.map((step, idx) => {
                const StepIcon = step.icon;
                return (
                  <div
                    key={step.step}
                    className="relative bg-white/10 backdrop-blur-md rounded-3xl p-6 sm:p-7 border border-white/15 hover:border-[#2DD4BF]/60 hover:bg-white/15 transition-all duration-300 flex flex-col justify-between"
                  >
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black uppercase tracking-wider text-teal-300">
                          {step.phase}
                        </span>
                        <span className="text-xs font-bold text-teal-100 bg-white/15 px-2.5 py-0.5 rounded-full">
                          Step 0{idx + 1}
                        </span>
                      </div>

                      <div className="w-12 h-12 rounded-2xl bg-[#0F766E] flex items-center justify-center shadow-md">
                        <StepIcon className="h-6 w-6 text-white" />
                      </div>

                      <div>
                        <h3 className="text-2xl font-black text-white">{step.step}</h3>
                        <p className="text-xs font-semibold text-teal-300 mt-0.5">
                          {step.tagline}
                        </p>
                      </div>

                      <p className="text-xs sm:text-sm text-teal-100/90 leading-relaxed font-normal">
                        {step.desc}
                      </p>
                    </div>

                    <div className="pt-4 mt-4 border-t border-white/10 text-[11px] font-bold text-teal-300 uppercase tracking-wider">
                      ★ {step.highlight}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Core Message Callout Box (Exact required quote) */}
            <div className="max-w-4xl mx-auto bg-white/10 backdrop-blur-md rounded-3xl p-8 sm:p-10 border border-[#2DD4BF]/40 shadow-2xl text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-[#0F766E] text-[#2DD4BF] flex items-center justify-center mx-auto shadow-sm">
                <Sparkles className="h-6 w-6" />
              </div>

              <blockquote className="text-lg sm:text-xl md:text-2xl font-bold text-white leading-relaxed italic">
                “You don&apos;t need to start from zero. Your knowledge + experience can become the foundation of your online teaching journey. EduConnects gives you the practical framework and guidance to take that next step.”
              </blockquote>

              <p className="text-xs sm:text-sm font-semibold text-teal-300 uppercase tracking-wider">
                — EduConnects Educator Academy Philosophy
              </p>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* SECTION 5: “WHY WAIT?” SECTION */}
        {/* ========================================================================= */}
        <section className="py-16 sm:py-24 bg-[#F0FDFA]/80 relative overflow-hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto text-center space-y-4 mb-16">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-rose-50 border border-rose-200 text-rose-800 text-xs font-extrabold uppercase tracking-wider">
                <Clock className="h-4 w-4 text-rose-600" />
                <span>The Timing is Now</span>
              </div>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 tracking-tight">
                Why Wait?
              </h2>
              <p className="text-base sm:text-lg text-slate-700 leading-relaxed font-medium">
                The shift to online education is already here. Dedicated educators who step up now build the strongest learner communities.
              </p>
            </div>

            {/* Three Pillar Cards (Exact required texts) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              {/* Card 1 */}
              <div className="bg-white rounded-3xl p-8 border border-teal-100/90 shadow-md hover:shadow-xl transition-all duration-300 space-y-4 text-center md:text-left group">
                <div className="w-14 h-14 rounded-2xl bg-[#F0FDFA] border border-teal-200 flex items-center justify-center mx-auto md:mx-0 group-hover:bg-[#0F766E] transition-colors">
                  <Users className="h-7 w-7 text-[#0F766E] group-hover:text-white transition-colors" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 leading-snug">
                  “Every day, students are looking for better teachers and better learning experiences online.”
                </h3>
                <p className="text-xs sm:text-sm text-slate-650 leading-relaxed">
                  Learners across cities and towns are no longer satisfied with passive video libraries. They actively crave empathetic, skilled live educators who can clarify their doubts in real time.
                </p>
              </div>

              {/* Card 2 */}
              <div className="bg-white rounded-3xl p-8 border border-teal-100/90 shadow-md hover:shadow-xl transition-all duration-300 space-y-4 text-center md:text-left group">
                <div className="w-14 h-14 rounded-2xl bg-[#F0FDFA] border border-teal-200 flex items-center justify-center mx-auto md:mx-0 group-hover:bg-[#0F766E] transition-colors">
                  <Target className="h-7 w-7 text-[#0F766E] group-hover:text-white transition-colors" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 leading-snug">
                  “Your students could be waiting for you.”
                </h3>
                <p className="text-xs sm:text-sm text-slate-650 leading-relaxed">
                  Your teaching methodology, voice, and unique explanations could be the exact breakthrough a struggling learner needs right now. Don&apos;t let geography keep you apart.
                </p>
              </div>

              {/* Card 3 */}
              <div className="bg-white rounded-3xl p-8 border border-teal-100/90 shadow-md hover:shadow-xl transition-all duration-300 space-y-4 text-center md:text-left group">
                <div className="w-14 h-14 rounded-2xl bg-[#F0FDFA] border border-teal-200 flex items-center justify-center mx-auto md:mx-0 group-hover:bg-[#0F766E] transition-colors">
                  <Globe className="h-7 w-7 text-[#0F766E] group-hover:text-white transition-colors" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 leading-snug">
                  “Don&apos;t keep your knowledge limited to one classroom.”
                </h3>
                <p className="text-xs sm:text-sm text-slate-650 leading-relaxed">
                  Physical classrooms hold 30 to 40 chairs. A structured online system enables you to touch hundreds of lives, build a lasting legacy, and multiply your earning potential.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* SECTION 6: CTA SECTION */}
        {/* ========================================================================= */}
        <section className="py-16 sm:py-24 bg-white border-y border-teal-100/80 relative">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-gradient-to-br from-[#115E59] to-[#0F766E] rounded-3xl p-8 sm:p-12 lg:p-16 text-white relative overflow-hidden shadow-2xl">
              {/* Background Accents */}
              <div className="absolute top-0 right-0 w-96 h-96 bg-[#2DD4BF]/20 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-96 h-96 bg-[#083F2C]/40 rounded-full blur-3xl pointer-events-none" />

              <div className="relative z-10 max-w-3xl mx-auto text-center space-y-6">
                {/* Micro Subhead */}
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/15 border border-white/25 text-teal-200 text-xs sm:text-sm font-bold uppercase tracking-wider">
                  <Sparkles className="h-4 w-4 text-[#2DD4BF]" />
                  <span>15 Days | Practical Training | Educator-Focused Sessions</span>
                </div>

                {/* Main Headline */}
                <h2 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-white leading-tight">
                  Start Your Online Teaching Journey in 15 Days.
                </h2>

                {/* Urgency Line */}
                <p className="text-base sm:text-lg text-teal-100 font-semibold">
                  {programConfig.seatsNotice}
                </p>

                {/* Exact Required Buttons */}
                <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
                  {/* Button 1: JOIN THE 15-DAY TRAINING */}
                  <button
                    type="button"
                    onClick={() => openReservation("Teacher")}
                    className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-white text-[#115E59] hover:bg-teal-50 font-black text-sm sm:text-base tracking-wide shadow-xl hover:shadow-2xl transition-all duration-200 flex items-center justify-center gap-3 cursor-pointer hover:-translate-y-0.5"
                  >
                    <span>JOIN THE 15-DAY TRAINING</span>
                    <ArrowRight className="h-5 w-5 text-[#0F766E]" />
                  </button>

                  {/* Button 2: RESERVE MY SEAT */}
                  <button
                    type="button"
                    onClick={() => openReservation("Teacher")}
                    className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-[#083F2C]/80 hover:bg-[#083F2C] text-white border-2 border-[#2DD4BF] font-black text-sm sm:text-base tracking-wide shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center gap-3 cursor-pointer hover:-translate-y-0.5"
                  >
                    <ShieldCheck className="h-5 w-5 text-[#2DD4BF]" />
                    <span>RESERVE MY SEAT</span>
                  </button>
                </div>

                {/* Micro guarantees */}
                <div className="pt-6 flex flex-wrap items-center justify-center gap-6 text-xs text-teal-200/90 font-medium">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-[#2DD4BF]" /> Zero Technical Prerequisite
                  </span>
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-[#2DD4BF]" /> 100% Educator Focused
                  </span>
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-[#2DD4BF]" /> Fast-Track Verification
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* SECTION 7: FREQUENTLY ASKED QUESTIONS */}
        {/* ========================================================================= */}
        <section className="py-16 sm:py-20 bg-[#F0FDFA]/50">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center space-y-3 mb-12">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-100/80 text-[#115E59] text-xs font-bold uppercase tracking-wider">
                <HelpCircle className="h-3.5 w-3.5 text-[#0F766E]" />
                <span>Frequently Asked Questions</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                Everything You Need to Know
              </h2>
            </div>

            <div className="space-y-3.5">
              {programFaqs.map((faq, idx) => {
                const isOpen = openFaqIndex === idx;
                return (
                  <div
                    key={faq.q}
                    className="bg-white rounded-2xl border border-teal-100/90 overflow-hidden shadow-xs transition-all"
                  >
                    <button
                      type="button"
                      onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                      className="w-full p-5 sm:p-6 text-left flex items-center justify-between gap-4 font-bold text-slate-900 hover:text-[#115E59] transition-colors cursor-pointer"
                    >
                      <span className="text-sm sm:text-base">{faq.q}</span>
                      <ChevronDown
                        className={`h-5 w-5 text-[#0F766E] shrink-0 transition-transform duration-200 ${
                          isOpen ? "rotate-180" : ""
                        }`}
                      />
                    </button>
                    <AnimatePresence>
                      {isOpen && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2 }}
                          className="px-5 sm:px-6 pb-5 sm:pb-6 text-xs sm:text-sm text-slate-650 leading-relaxed border-t border-slate-50 pt-3"
                        >
                          {faq.a}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* SECTION 8: FINAL CTA */}
        {/* ========================================================================= */}
        <section className="py-20 sm:py-28 bg-white relative overflow-hidden text-center border-t border-teal-100">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-7 relative z-10">
            {/* The 3 Core Value Statements */}
            <div className="space-y-2">
              <h3 className="text-2xl sm:text-3xl md:text-4xl font-black text-slate-800 tracking-tight">
                Your Knowledge Has Value.
              </h3>
              <h3 className="text-2xl sm:text-3xl md:text-4xl font-black text-slate-800 tracking-tight">
                Your Experience Has Value.
              </h3>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-[#0F766E] tracking-tight pt-1">
                Now Take It Online.
              </h2>
            </div>

            {/* Subheading & Invitation */}
            <div className="space-y-2 max-w-2xl mx-auto">
              <p className="text-lg sm:text-xl font-bold text-slate-900">
                Join EduConnects Teachers Training Program Today.
              </p>
              <p className="text-sm sm:text-base font-semibold text-[#115E59] bg-[#F0FDFA] py-2 px-4 rounded-xl inline-block border border-teal-200/80">
                Next Batch Starting Soon — Reserve Your Seat Now.
              </p>
            </div>

            {/* Final Action Triggers */}
            <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                type="button"
                onClick={() => openReservation("Teacher")}
                className="w-full sm:w-auto px-9 py-4 rounded-2xl bg-gradient-to-r from-[#0F766E] to-[#115E59] hover:from-[#137150] hover:to-[#094732] text-white font-extrabold text-base shadow-xl hover:shadow-2xl transition-all duration-200 flex items-center justify-center gap-3 cursor-pointer group hover:-translate-y-0.5"
              >
                <span>RESERVE MY SEAT NOW</span>
                <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform text-[#2DD4BF]" />
              </button>

              <Link
                href="/teacher"
                className="w-full sm:w-auto px-7 py-4 rounded-2xl bg-white hover:bg-[#F0FDFA] text-slate-700 border border-slate-200 font-bold text-base shadow-xs hover:shadow-md transition-all duration-200 flex items-center justify-center gap-2"
              >
                <span>Explore Educator Portal</span>
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* 2. EDUCATOR FOOTER */}
      <PremiumFooter variant="teacher" />

      {/* 3. INTERACTIVE SEAT RESERVATION MODAL */}
      <TrainingSeatModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        programConfig={programConfig}
        defaultRole={selectedRole}
      />
    </div>
  );
}
