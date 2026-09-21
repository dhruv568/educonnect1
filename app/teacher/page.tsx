"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { FloatingNavbar } from "@/components/homepage/floating-navbar";
import { PromotionalBannerCarousel } from "@/components/banners/promotional-banner-carousel";
import { PremiumFooter } from "@/components/homepage/premium-footer";
import { EducatorHeroSlideshow } from "@/components/homepage/educator-hero-slideshow";
import { GlassCard } from "@/components/glass/glass-card";
import { GlassBadge } from "@/components/glass/glass-badge";
import { GlassButton } from "@/components/glass/glass-button";
import { AuthModal } from "@/components/shared/auth-modal";
import {
  GraduationCap,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Video,
  BookOpen,
  IndianRupee,
  Calendar,
  BarChart2,
  Users,
  CheckCircle2,
  Clock,
  Award,
  ChevronDown,
  Layers,
  Upload,
  Globe,
  Settings,
  HelpCircle,
  FileCheck,
  Zap,
  TrendingUp,
  Star,
  LayoutDashboard,
} from "lucide-react";
import { formatCurrency } from "@/lib/currency";
import { UserRole, UserSession } from "@/types/auth";
import { isEducatorRole } from "@/lib/auth/roles";

export default function TeacherLandingPage() {
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);
  const [userSession, setUserSession] = useState<UserSession | null>(null);

  // Interactive Earnings Calculator State
  const [hourlyRate, setHourlyRate] = useState(300);
  const [hoursPerWeek, setHoursPerWeek] = useState(12);
  const [coursesSoldPerMonth, setCoursesSoldPerMonth] = useState(10);
  const [courseAvgPrice, setCourseAvgPrice] = useState(1499);

  // Check auth status
  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (json?.data?.user) {
          setUserSession(json.data.user);
        }
      })
      .catch(() => {});
  }, []);

  // Calculate estimated monthly income (assuming 4.3 weeks/month + LMS course revenue)
  const monthlyLiveHours = hoursPerWeek * 4.3;
  const liveIncome = monthlyLiveHours * hourlyRate;
  const courseIncome = coursesSoldPerMonth * courseAvgPrice;
  const totalEstimatedMonthly = Math.round(liveIncome + courseIncome);

  const teacherBenefits = [
    {
      icon: Award,
      title: "Complete Curriculum Freedom",
      desc: "Create courses, set your own syllabi, attach practice PDFs, and teach your own signature methodology.",
      badge: "Full IP Ownership",
    },
    {
      icon: IndianRupee,
      title: "Set Your Own Pricing",
      desc: "Set your own hourly rate and course fees. Track real-time earnings with transparent platform commission.",
      badge: "Keep Majority Revenue",
    },
    {
      icon: Calendar,
      title: "Flexible Scheduling",
      desc: "Define your working days, block personal hours, and open 1-on-1 trial or group live class slots at your convenience.",
      badge: "Total Control",
    },
    {
      icon: Video,
      title: "Built-In Live Classroom",
      desc: "No third-party subscriptions required. Conduct HD live classes with digital whiteboard, chat, and screen share.",
      badge: "Zero Setup Cost",
    },
    {
      icon: Globe,
      title: "Direct Learner Platform",
      desc: "Gain instant visibility to thousands of active learners searching for expert educators across subjects.",
      badge: "Instant Reach",
    },
    {
      icon: TrendingUp,
      title: "Detailed Educator Analytics",
      desc: "Track learner retention, lesson completion rates, revenue charts, and review scores in your educator portal.",
      badge: "Data-Driven Growth",
    },
  ];

  const howItWorksSteps = [
    {
      step: "01",
      title: "Create Educator Profile",
      desc: "Register your account, outline your academic background, headline, teaching subjects, and hourly rate.",
      icon: GraduationCap,
    },
    {
      step: "02",
      title: "Pay Registration Fee",
      desc: "Complete the educator registration fee via Cashfree to verify your application and activate your onboarding.",
      icon: IndianRupee,
    },
    {
      step: "03",
      title: "Admin Verification",
      desc: "Submit identity and qualification documents for verification to earn the verified educator trust badge.",
      icon: ShieldCheck,
    },
    {
      step: "04",
      title: "Schedule Classes & Build Courses",
      desc: "Upload structured video lessons, set weekly live class availability, or offer 1-on-1 trial demo slots.",
      icon: BookOpen,
    },
    {
      step: "05",
      title: "Teach & Automated Payouts",
      desc: "Conduct interactive classes inside the browser and receive automated weekly direct bank deposits via Cashfree.",
      icon: Award,
    },
  ];

  const teacherTestimonials = [
    {
      name: "Dr. Kavita Deshmukh",
      role: "Senior Mathematics Educator",
      location: "New Delhi",
      avatar: "/images/educators/female-1.png",
      rating: 5,
      achievement: "₹84,000 / mo Avg. Earnings",
      subjects: "JEE Advanced Calculus",
      quote:
        "Transitioning from offline coaching centers to EduConnects was the best career decision I've made. I teach 15 hours weekly from my study, enjoy complete syllabus autonomy, and receive automatic weekly bank deposits.",
    },
    {
      name: "Prof. Vikramaditya Sen",
      role: "Physics Mentor & Olympiad Coach",
      location: "Bangalore",
      avatar: "/images/educators/male-1.png",
      rating: 5,
      achievement: "240+ Active Learners",
      subjects: "Mechanics & Electromagnetism",
      quote:
        "The built-in live classroom with interactive whiteboard is smoother than any third-party app I used. My students love live problem-solving, and on-demand video course sales provide reliable passive revenue.",
    },
    {
      name: "Meenakshi Sundaram",
      role: "Computer Science & AI Instructor",
      location: "Hyderabad",
      avatar: "/images/educators/meenakshi-sundaram.jpg",
      rating: 5,
      achievement: "₹1,15,000+ Gross Monthly Revenue",
      subjects: "Python & Data Structures",
      quote:
        "Combining weekend live batches with self-paced LMS modules helped me scale to students across 8 states without burning out. EduConnects manages all the streaming and billing seamlessly.",
    },
  ];

  const teacherFaqs = [
    {
      question: "Why is there an Educator Registration Fee?",
      answer:
        "The nominal registration fee ensures serious, verified educator applications and prevents automated spam. It covers document verification overhead and grants full access to the Educator Dashboard, live digital classroom, and course publishing suite. Learners are never charged any registration fee.",
    },
    {
      question: "How do I become a verified educator on EduConnects?",
      answer:
        "Simply sign up as an educator, complete your professional profile (headline, subjects, experience, hourly rate), pay the registration fee, and submit your educational degrees or certificates in our multi-step onboarding portal. Our administration team audits each application within 24-48 hours.",
    },
    {
      question: "How do live classes work for educators?",
      answer:
        "You define your weekly availability and schedule live class slots (1-on-1 or group). When a learner books, both of you receive instant notifications. At class time, enter the built-in live classroom directly from your dashboard with HD video, interactive whiteboard, and chat.",
    },
    {
      question: "How do I create and sell on-demand video courses?",
      answer:
        "Our course builder allows you to organize your curriculum into sections, upload high-definition video lessons with automated video processing, attach supplementary PDF study notes, set a course price, and publish to the platform.",
    },
    {
      question: "How and when do I receive payouts?",
      answer:
        "All earnings from enrolled courses and completed live sessions are logged in your Educator Ledger. Payouts are transferred automatically to your verified bank account via Cashfree Payouts without manual invoicing.",
    },
    {
      question: "Can I offer both 1-on-1 trial demos and group classes?",
      answer:
        "Yes! You can configure introductory demo sessions for new learners to assess fit, as well as recurring group classes with custom capacity limits (e.g. 5 to 30 learners per class).",
    },
    {
      question: "Can I teach on EduConnects part-time alongside a full-time job?",
      answer:
        "Absolutely. You have 100% control over your availability calendar. Set your schedule for evenings, weekends, or specific hours that fit your personal lifestyle.",
    },
  ];

  return (
    <div data-theme="educator" className="min-h-screen flex flex-col bg-[#F0FAF5]/30 relative overflow-hidden font-sans text-slate-900">
      {/* 1. Educator-Oriented Role Navbar */}
      <FloatingNavbar variant="teacher" />

      <main className="flex-1">
        {/* Global Promotional Banner Carousel */}
        <PromotionalBannerCarousel placement="EDUCATORS" />

        {/* ========================================================================= */}
        {/* 1. HERO SECTION WITH BACKGROUND SLIDESHOW */}
        {/* ========================================================================= */}
        <section className="relative pt-6 sm:pt-10 lg:pt-12 pb-16 lg:pb-24 overflow-hidden bg-gradient-to-b from-[#F0FAF5] via-white to-[#F0FAF5]/50">
          {/* 5-Slide Educator Background Slideshow */}
          <EducatorHeroSlideshow />

          {/* Subtle Accent Glow Elements */}
          <div className="absolute top-20 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[500px] pointer-events-none -z-10">
            <div className="absolute top-10 left-10 w-96 h-96 bg-[#16805B]/10 rounded-full blur-3xl" />
            <div className="absolute top-20 right-10 w-96 h-96 bg-[#35A979]/10 rounded-full blur-3xl" />
          </div>

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
              {/* Left Column: Copy & CTAs */}
              <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#E6F7F0] border border-[#A7F3D0] text-[#0D5C41] text-xs font-extrabold uppercase tracking-wider shadow-2xs">
                  <Sparkles className="h-3.5 w-3.5 text-[#16805B]" />
                  <span>The Platform Built for Independent Educators</span>
                </div>

                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight leading-[1.15]">
                  <span className="block">Connect. Teach. Grow.</span>
                  <span className="block text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-700 mt-2 sm:mt-2.5">
                    Turn Knowledge Into
                  </span>
                  <span className="block text-3xl sm:text-4xl lg:text-5xl font-black bg-gradient-to-r from-[#16805B] via-[#0D5C41] to-[#16805B] bg-clip-text text-transparent mt-0.5 sm:mt-1">
                    Impact
                  </span>
                </h1>

                <p className="text-base sm:text-lg text-slate-700 max-w-2xl mx-auto lg:mx-0 leading-relaxed font-medium">
                  Build your verified educator brand, conduct high-definition live classes in the browser, sell recorded video courses, and receive automated direct bank payouts.
                </p>

                {/* Hero CTAs */}
                <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3 sm:gap-4 pt-2">
                  {userSession && isEducatorRole(userSession.role) ? (
                    <Link href="/teacher/dashboard" className="w-full sm:w-auto">
                      <button className="w-full sm:w-auto px-7 py-3.5 rounded-xl font-bold text-white bg-[#16805B] hover:bg-[#0D5C41] shadow-xl shadow-emerald-900/20 text-sm flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer">
                        <LayoutDashboard className="h-4 w-4 text-emerald-100" />
                        <span>Go to Educator Dashboard</span>
                      </button>
                    </Link>
                  ) : (
                    <>
                      <Link href="/teacher/login" className="w-full sm:w-auto">
                        <button className="w-full sm:w-auto px-7 py-3.5 rounded-xl font-bold text-white bg-[#16805B] hover:bg-[#0D5C41] shadow-xl shadow-emerald-900/20 text-sm flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer">
                          <span>Educator Login</span>
                          <ArrowRight className="h-4 w-4" />
                        </button>
                      </Link>
                      <Link href="/teacher/register" className="w-full sm:w-auto">
                        <button className="w-full sm:w-auto px-6 py-3.5 rounded-xl font-bold text-[#0D5C41] bg-[#F0FAF5] hover:bg-[#E2F7ED] border border-[#A7F3D0] shadow-sm text-sm flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer">
                          <span>Become an Educator</span>
                          <ArrowRight className="h-4 w-4" />
                        </button>
                      </Link>
                    </>
                  )}

                  <a href="#how-it-works" className="w-full sm:w-auto">
                    <button className="w-full sm:w-auto px-6 py-3.5 rounded-xl font-bold text-slate-800 bg-white hover:bg-[#F0FAF5] border border-slate-300 shadow-sm text-sm flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer">
                      <FileCheck className="h-4 w-4 text-[#16805B]" />
                      <span>How It Works?</span>
                    </button>
                  </a>
                </div>

                {/* Educator Trust Stats */}
                <div className="pt-6 border-t border-slate-200/90 grid grid-cols-3 gap-4 text-left max-w-lg mx-auto lg:mx-0">
                  <div>
                    <div className="text-2xl lg:text-3xl font-black text-[#16805B]">85%+</div>
                    <div className="text-xs text-slate-600 font-bold">Revenue Share</div>
                  </div>
                  <div>
                    <div className="text-2xl lg:text-3xl font-black text-slate-900">Direct</div>
                    <div className="text-xs text-slate-600 font-bold">Cashfree Payouts</div>
                  </div>
                  <div>
                    <div className="text-2xl lg:text-3xl font-black text-[#0D5C41]">100%</div>
                    <div className="text-xs text-slate-600 font-bold">Content Ownership</div>
                  </div>
                </div>
              </div>

              {/* Right Column: Interactive Educator Dashboard Preview Card */}
              <div className="lg:col-span-5 relative">
                <div className="relative mx-auto max-w-md lg:max-w-none">
                  <GlassCard
                    glowColor="rgba(22, 128, 91, 0.4)"
                    className="p-6 border-2 border-white/30 shadow-2xl space-y-5 rounded-3xl bg-white/95 backdrop-blur-xl"
                  >
                    {/* Header with Verification Status */}
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <div className="flex items-center gap-3">
                        <img
                          src="/images/educators/female-1.png"
                          alt="Dr. Kavita Deshmukh"
                          className="w-10 h-10 rounded-2xl object-cover ring-2 ring-[#16805B]/40 shadow-sm"
                        />
                        <div>
                          <div className="text-xs font-black text-slate-900">Dr. Kavita Deshmukh</div>
                          <div className="text-[10px] text-slate-500 font-semibold">Senior Mathematics Educator</div>
                        </div>
                      </div>
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-[#F0FAF5] text-[#0D5C41] border border-[#A7F3D0] flex items-center gap-1">
                        <ShieldCheck className="h-3 w-3 text-[#16805B]" />
                        Verified
                      </span>
                    </div>

                    {/* Educator Metrics Row Preview */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3.5 rounded-2xl bg-[#F0FAF5] border border-[#A7F3D0] space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-extrabold uppercase text-[#0D5C41]">This Month</span>
                          <IndianRupee className="h-3.5 w-3.5 text-[#16805B]" />
                        </div>
                        <div className="text-xl font-black text-slate-900">₹72,400</div>
                        <div className="text-[10px] text-slate-500 font-medium">+18% vs last month</div>
                      </div>

                      <div className="p-3.5 rounded-2xl bg-emerald-50/80 border border-emerald-100 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-extrabold uppercase text-[#0D5C41]">Enrolled Learners</span>
                          <Users className="h-3.5 w-3.5 text-[#16805B]" />
                        </div>
                        <div className="text-xl font-black text-slate-900">148</div>
                        <div className="text-[10px] text-slate-500 font-medium">Active learners</div>
                      </div>
                    </div>

                    {/* Upcoming Class Schedule Snippet */}
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                        <span className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-[#16805B]" />
                          Next Live Session
                        </span>
                        <span className="text-[10px] bg-[#F0FAF5] text-[#0D5C41] border border-[#A7F3D0] font-bold px-2 py-0.5 rounded-md">
                          Starts in 25m
                        </span>
                      </div>
                      <div className="text-xs font-extrabold text-slate-900">
                        JEE Advanced: Calculus Problem Solving Batch A
                      </div>
                      <div className="text-[11px] text-slate-500 flex items-center justify-between pt-1">
                        <span>18 / 20 Learners Confirmed</span>
                        <span className="font-bold text-[#16805B]">Enter Classroom →</span>
                      </div>
                    </div>
                  </GlassCard>

                  {/* Floating Trust Badge */}
                  <div className="absolute -bottom-5 -right-5 bg-white p-3.5 rounded-2xl shadow-xl border border-slate-200/90 flex items-center gap-3 hidden sm:flex">
                    <div className="p-2 bg-[#F0FAF5] text-[#16805B] rounded-xl border border-[#A7F3D0]">
                      <Zap className="h-5 w-5" />
                    </div>
                    <div className="text-left">
                      <div className="text-xs font-extrabold text-slate-900">Zero Technical Overhead</div>
                      <div className="text-[10px] text-slate-500 font-medium">We host, stream, and process payments</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 2. EDUCATOR FEATURES & CORE CAPABILITIES */}
        {/* ========================================================================= */}
        <section id="courses" className="py-20 bg-white border-y border-slate-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
            <div className="text-center max-w-3xl mx-auto space-y-3">
              <GlassBadge variant="educator">YOUR COMPLETE EDUCATOR TOOLKIT</GlassBadge>
              <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
                Everything to Run a Thriving Online Teaching Business
              </h2>
              <p className="text-sm sm:text-base text-slate-600">
                Teach live, publish recorded courses, set your rates, and let EduConnects handle the heavy lifting.
              </p>
            </div>

            {/* Feature 1: Profile & Platform Listing */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
              <div className="lg:col-span-6 space-y-5">
                <div className="p-3 bg-[#F0FAF5] text-[#0D5C41] border border-[#A7F3D0] rounded-2xl w-fit">
                  <GraduationCap className="h-6 w-6 text-[#16805B]" />
                </div>
                <h3 className="text-2xl sm:text-3xl font-black text-slate-900">
                  Build Your Verified Educator Brand
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Stand out in our learner search directory with verified credentials, custom headlines, subject specializations, and direct booking links.
                </p>
                <div className="space-y-2.5 text-xs sm:text-sm text-slate-700 font-semibold">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-[#16805B] shrink-0" />
                    <span>Display verified degrees, certificates, and years of experience</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-[#16805B] shrink-0" />
                    <span>Set custom hourly rates in ₹ INR for live 1-on-1 tutoring</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-[#16805B] shrink-0" />
                    <span>Collect ratings and reviews from verified attending learners</span>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-6">
                <div className="p-6 rounded-3xl bg-slate-50 border border-slate-200/90 shadow-lg space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                    <span className="text-xs font-bold uppercase text-slate-500">Platform Search Preview</span>
                    <span className="text-xs font-bold text-[#0D5C41]">⭐ 4.98 (84 Reviews)</span>
                  </div>
                  <div className="space-y-2">
                    <div className="text-sm font-extrabold text-slate-900">
                      Senior STEM Educator & Olympiad Coach
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {["Mathematics", "Physics", "Calculus", "Competitive Exam Prep"].map((s) => (
                        <span key={s} className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#F0FAF5] text-[#0D5C41] border border-[#A7F3D0]">
                          {s}
                        </span>
                      ))}
                    </div>
                    <p className="text-xs text-slate-600 pt-1 leading-relaxed">
                      "10+ years coaching learners for CBSE board exams, JEE Advanced, and International Math Olympiads."
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Feature 2: Structured Course Creation */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
              <div className="lg:col-span-6 order-2 lg:order-1">
                <div className="p-6 rounded-3xl bg-slate-50 border border-slate-200/90 shadow-lg space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2 text-xs font-bold text-slate-700">
                    <span>LMS Course Builder</span>
                    <span className="text-[#16805B]">Status: Published</span>
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="p-3 bg-white rounded-xl border border-slate-200 flex items-center justify-between font-bold">
                      <span>Section 1: Functions, Limits & Continuity</span>
                      <span className="text-slate-400">4 Video Lessons</span>
                    </div>
                    <div className="p-3 bg-white rounded-xl border border-slate-200 flex items-center justify-between font-bold">
                      <span>Section 2: Differential Calculus & Applications</span>
                      <span className="text-slate-400">6 Video Lessons</span>
                    </div>
                    <div className="p-3 bg-white rounded-xl border border-slate-200 flex items-center justify-between font-bold">
                      <span>Section 3: Integral Calculus & Area Under Curves</span>
                      <span className="text-slate-400">5 Video Lessons</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-6 order-1 lg:order-2 space-y-5">
                <div className="p-3 bg-[#F0FAF5] text-[#0D5C41] border border-[#A7F3D0] rounded-2xl w-fit">
                  <BookOpen className="h-6 w-6 text-[#16805B]" />
                </div>
                <h3 className="text-2xl sm:text-3xl font-black text-slate-900">
                  Publish On-Demand Video Courses
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Turn your knowledge into evergreen revenue. Upload HD lessons, organize structured curriculum sections, and attach practice exercises.
                </p>
                <div className="space-y-2.5 text-xs sm:text-sm text-slate-700 font-semibold">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-[#16805B] shrink-0" />
                    <span>Fast video uploads with automated streaming encoding</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-[#16805B] shrink-0" />
                    <span>Set one-time course purchase pricing in ₹ INR</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-[#16805B] shrink-0" />
                    <span>Automatic learner progress tracking and completion certificates</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Feature 3: Live Classes & Availability Scheduler */}
            <div id="live-classes" className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
              <div className="lg:col-span-6 space-y-5">
                <div className="p-3 bg-[#F0FAF5] text-[#0D5C41] border border-[#A7F3D0] rounded-2xl w-fit">
                  <Video className="h-6 w-6 text-[#16805B]" />
                </div>
                <h3 className="text-2xl sm:text-3xl font-black text-slate-900">
                  Schedule Live Classes with Built-In Whiteboard
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Host 1-on-1 private tutorials or high-capacity group classes directly in the browser with real-time WebRTC video.
                </p>
                <div className="space-y-2.5 text-xs sm:text-sm text-slate-700 font-semibold">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-[#16805B] shrink-0" />
                    <span>Interactive whiteboard with pen, shapes, and drawing permission control</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-[#16805B] shrink-0" />
                    <span>In-session group chat and instant homework PDF sharing</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-[#16805B] shrink-0" />
                    <span>Automated learner attendance tracking and session logs</span>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-6">
                <div className="p-6 rounded-3xl bg-slate-900 text-white shadow-xl space-y-4">
                  <div className="flex items-center justify-between text-xs border-b border-slate-800 pb-3 font-semibold">
                    <span>Weekly Availability Schedule</span>
                    <span className="text-[#35A979]">● 6 Slots Available This Week</span>
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="p-3 bg-slate-800/80 rounded-xl flex items-center justify-between">
                      <span>Mon, Wed, Fri (4:00 PM - 7:00 PM)</span>
                      <span className="text-[#35A979] font-mono">1-on-1 Demos</span>
                    </div>
                    <div className="p-3 bg-slate-800/80 rounded-xl flex items-center justify-between">
                      <span>Saturday (10:00 AM - 1:00 PM)</span>
                      <span className="text-[#35A979] font-mono">Group Live Class (Max 20)</span>
                    </div>
                    <div className="p-3 bg-slate-800/80 rounded-xl flex items-center justify-between">
                      <span>Sunday (11:00 AM - 1:00 PM)</span>
                      <span className="text-[#35A979] font-mono">Doubt Resolution Clinic</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 3. INTERACTIVE EARNINGS CALCULATOR */}
        {/* ========================================================================= */}
        <section id="earnings" className="py-20 lg:py-28 bg-slate-50 border-b border-slate-200">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
            <div className="text-center max-w-2xl mx-auto space-y-3">
              <GlassBadge variant="educator">TRANSPARENT EDUCATOR ECONOMICS</GlassBadge>
              <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
                Estimate Your Monthly Teaching Income
              </h2>
              <p className="text-sm text-slate-600">
                You set your own rates and course prices. Use our real-time calculator to project your monthly earnings.
              </p>
            </div>

            <GlassCard className="p-8 sm:p-10 rounded-3xl border border-slate-200 bg-white shadow-xl space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Left: Inputs & Sliders */}
                <div className="space-y-6">
                  {/* Hourly Rate Slider & Direct Input */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                        Live Class Hourly Rate (₹)
                      </label>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-500">₹</span>
                        <input
                          type="number"
                          min={1}
                          max={10000}
                          value={hourlyRate}
                          onChange={(e) => setHourlyRate(Math.max(1, Number(e.target.value) || 0))}
                          className="w-24 px-2 py-0.5 text-sm font-black text-[#0D5C41] border border-slate-200 rounded-lg text-right outline-none focus:ring-1 focus:ring-[#16805B]"
                        />
                        <span className="text-xs font-bold text-slate-500">/hr</span>
                      </div>
                    </div>
                    <input
                      type="range"
                      min={100}
                      max={5000}
                      step={1}
                      value={hourlyRate}
                      onChange={(e) => setHourlyRate(Number(e.target.value))}
                      className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#16805B]"
                    />
                    <div className="flex justify-between text-[10px] text-slate-400 font-semibold">
                      <span>₹100/hr</span>
                      <span>₹2,500/hr</span>
                      <span>₹5,000/hr</span>
                    </div>
                  </div>

                  {/* Hours Per Week */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                        Live Teaching Hours / Week
                      </label>
                      <span className="text-base font-black text-[#0D5C41]">{hoursPerWeek} hrs/wk</span>
                    </div>
                    <input
                      type="range"
                      min={2}
                      max={40}
                      step={1}
                      value={hoursPerWeek}
                      onChange={(e) => setHoursPerWeek(Number(e.target.value))}
                      className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#16805B]"
                    />
                    <div className="flex justify-between text-[10px] text-slate-400 font-semibold">
                      <span>2 hrs</span>
                      <span>20 hrs</span>
                      <span>40 hrs</span>
                    </div>
                  </div>

                  {/* Course Sales Per Month */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                        Course Enrollments / Month
                      </label>
                      <span className="text-base font-black text-[#0D5C41]">{coursesSoldPerMonth} sales</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={1}
                      value={coursesSoldPerMonth}
                      onChange={(e) => setCoursesSoldPerMonth(Number(e.target.value))}
                      className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#16805B]"
                    />
                    <div className="flex justify-between text-[10px] text-slate-400 font-semibold">
                      <span>0</span>
                      <span>50</span>
                      <span>100</span>
                    </div>
                  </div>
                </div>

                {/* Right: Projected Breakdown Card */}
                <div className="p-7 rounded-3xl bg-gradient-to-br from-[#0D5C41] via-[#16805B] to-[#083827] text-white flex flex-col justify-between space-y-6 shadow-xl">
                  <div className="space-y-2">
                    <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#A7F3D0]">
                      Estimated Gross Monthly Revenue
                    </span>
                    <div className="text-4xl sm:text-5xl font-black text-white">
                      {formatCurrency(totalEstimatedMonthly)}
                    </div>
                    <p className="text-xs text-[#A7F3D0] leading-relaxed pt-1">
                      Based on {hoursPerWeek} hrs/week live classes + {coursesSoldPerMonth} monthly course enrollments.
                    </p>
                  </div>

                  <div className="space-y-2 pt-4 border-t border-[#35A979]/30 text-xs">
                    <div className="flex items-center justify-between text-[#A7F3D0]">
                      <span>Live Tutoring Income:</span>
                      <span className="font-bold text-white">{formatCurrency(Math.round(liveIncome))}</span>
                    </div>
                    <div className="flex items-center justify-between text-[#A7F3D0]">
                      <span>Recorded Course Income:</span>
                      <span className="font-bold text-white">{formatCurrency(Math.round(courseIncome))}</span>
                    </div>
                  </div>

                  <Link href="/teacher/register" className="w-full">
                    <GlassButton
                      variant="educator"
                      className="w-full justify-center shadow-lg font-black text-xs"
                      rightIcon={<ArrowRight className="h-4 w-4" />}
                    >
                      Start Teaching as an Educator
                    </GlassButton>
                  </Link>
                </div>
              </div>
            </GlassCard>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 4. STEP-BY-STEP HOW IT WORKS FLOW */}
        {/* ========================================================================= */}
        <section id="how-it-works" className="py-20 lg:py-28 bg-white border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
            <div className="text-center max-w-2xl mx-auto space-y-3">
              <GlassBadge variant="educator">SIMPLE & TRANSPARENT ONBOARDING</GlassBadge>
              <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
                How Becoming an Educator Works?
              </h2>
              <p className="text-sm text-slate-600">
                From initial registration to your first live class, our streamlined process gets you teaching quickly.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
              {howItWorksSteps.map((s, idx) => {
                const IconComp = s.icon;
                return (
                  <div
                    key={idx}
                    className="p-6 rounded-3xl bg-slate-50 border border-slate-200 hover:border-[#35A979] hover:shadow-lg transition-all space-y-4 relative flex flex-col justify-between"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-2xl font-black text-[#16805B]/40">{s.step}</span>
                        <div className="p-2.5 rounded-xl bg-[#F0FAF5] text-[#0D5C41] border border-[#A7F3D0]">
                          <IconComp className="h-5 w-5 text-[#16805B]" />
                        </div>
                      </div>
                      <h3 className="text-base font-black text-slate-900">{s.title}</h3>
                      <p className="text-xs text-slate-600 leading-relaxed">{s.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Direct Section Link to Educator Benefits */}
            <div className="pt-2 text-center">
              <a
                href="#benefits"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#F0FAF5] hover:bg-[#E3F8ED] text-[#0D5C41] border border-[#A7F3D0] text-xs sm:text-sm font-bold transition-all shadow-2xs hover:shadow-xs group"
              >
                <span>Explore All Educator Benefits</span>
                <span className="text-base group-hover:translate-y-0.5 transition-transform">↓</span>
              </a>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 5. TEACHER BENEFITS GRID */}
        {/* ========================================================================= */}
        <section id="benefits" className="py-20 bg-slate-50 border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
            <div className="text-center max-w-2xl mx-auto space-y-3">
              <GlassBadge variant="educator">EDUCATOR ADVANTAGES</GlassBadge>
              <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
                Why Top Educators Choose EduConnects?
              </h2>
              <p className="text-sm text-slate-600">
                Built specifically for independent educators, coaches, and subject experts.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {teacherBenefits.map((b, idx) => {
                const IconComp = b.icon;
                return (
                  <GlassCard
                    key={idx}
                    className="p-7 rounded-3xl border border-slate-200 bg-white hover:border-[#35A979] hover:shadow-xl transition-all flex flex-col justify-between space-y-4"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="p-3 bg-[#F0FAF5] text-[#0D5C41] border border-[#A7F3D0] rounded-2xl w-fit">
                          <IconComp className="h-6 w-6 text-[#16805B]" />
                        </div>
                        <span className="text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">
                          {b.badge}
                        </span>
                      </div>
                      <h3 className="text-lg font-black text-slate-900">{b.title}</h3>
                      <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">{b.desc}</p>
                    </div>
                  </GlassCard>
                );
              })}
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 6. EDUCATOR SUCCESS STORIES */}
        {/* ========================================================================= */}
        <section id="success-stories" className="py-20 bg-slate-50 border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
            <div className="text-center max-w-2xl mx-auto space-y-3">
              <GlassBadge variant="educator">PROVEN EDUCATOR SUCCESS</GlassBadge>
              <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
                Join Top Educators Earning on EduConnects
              </h2>
              <p className="text-sm text-slate-600 leading-relaxed">
                See how independent educators across India are building thriving online teaching careers with complete curriculum autonomy.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {teacherTestimonials.map((t, idx) => (
                <GlassCard
                  key={idx}
                  className="p-7 rounded-3xl border border-slate-200 bg-white shadow-md hover:shadow-xl transition-all duration-300 flex flex-col justify-between"
                >
                  <div className="space-y-4">
                    {/* Star Rating */}
                    <div className="flex items-center gap-1 text-amber-500">
                      {[...Array(t.rating)].map((_, i) => (
                        <Star key={i} className="w-4 h-4 fill-amber-400 stroke-amber-400" />
                      ))}
                    </div>

                    <p className="text-xs sm:text-sm text-slate-700 italic leading-relaxed">
                      &ldquo;{t.quote}&rdquo;
                    </p>

                    <div className="px-3 py-1.5 rounded-xl bg-[#F0FAF5] border border-[#A7F3D0] text-[#0D5C41] text-xs font-bold w-fit">
                      🎯 {t.achievement}
                    </div>
                  </div>

                  <div className="pt-6 border-t border-slate-100 flex items-center gap-3 mt-4">
                    <img
                      src={t.avatar}
                      alt={t.name}
                      className="w-11 h-11 rounded-full object-cover ring-2 ring-[#16805B]/30"
                    />
                    <div>
                      <div className="text-xs font-extrabold text-slate-900">{t.name}</div>
                      <div className="text-[10px] text-slate-500">{t.role} • {t.location}</div>
                      <div className="text-[10px] text-[#0D5C41] font-semibold">{t.subjects}</div>
                    </div>
                  </div>
                </GlassCard>
              ))}
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 7. TEACHER FAQ ACCORDION */}
        {/* ========================================================================= */}
        <section id="faq" className="py-20 lg:py-28 bg-white">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
            <div className="text-center space-y-3">
              <GlassBadge variant="educator">EDUCATOR FAQ</GlassBadge>
              <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
                Frequently Asked Questions for Educators
              </h2>
              <p className="text-sm text-slate-600">
                Have questions before applying? Here is everything you need to know.
              </p>
            </div>

            <div className="space-y-4">
              {teacherFaqs.map((faq, idx) => {
                const isOpen = openFaqIndex === idx;
                return (
                  <div
                    key={idx}
                    className="border border-slate-200 rounded-2xl overflow-hidden bg-slate-50/50 transition-colors"
                  >
                    <button
                      onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                      className="w-full p-5 text-left flex items-center justify-between gap-4 font-bold text-sm sm:text-base text-slate-900 hover:text-[#16805B] transition-colors"
                    >
                      <span>{faq.question}</span>
                      <ChevronDown
                        className={`w-5 h-5 text-slate-500 shrink-0 transition-transform duration-300 ${
                          isOpen ? "rotate-180 text-[#16805B]" : ""
                        }`}
                      />
                    </button>
                    {isOpen && (
                      <div className="p-5 pt-0 text-xs sm:text-sm text-slate-600 leading-relaxed border-t border-slate-100 bg-white">
                        {faq.answer}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 8. FINAL CALL TO ACTION */}
        {/* ========================================================================= */}
        <section className="py-20 bg-gradient-to-br from-[#0D5C41] via-[#16805B] to-[#083827] text-white relative overflow-hidden">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center space-y-6 relative z-10">
            <span className="px-3.5 py-1.5 rounded-full bg-[#0D5C41]/50 backdrop-blur-md text-[#A7F3D0] text-xs font-bold uppercase tracking-wider border border-[#35A979]/40">
              Join EduConnects Educator Network
            </span>

            <h2 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight">
              Ready to Inspire as an Educator?
            </h2>

            <p className="text-sm sm:text-base text-[#F0FAF5] max-w-xl mx-auto font-medium">
              Create your profile, submit your verification documents, and start earning by teaching learners across India and beyond.
            </p>

            <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/teacher/login" className="w-full sm:w-auto">
                <GlassButton
                  variant="educator"
                  size="lg"
                  className="w-full sm:w-auto shadow-xl"
                  rightIcon={<ArrowRight className="h-4 w-4" />}
                >
                  Educator Login
                </GlassButton>
              </Link>

              <Link href="/teacher/register" className="w-full sm:w-auto">
                <GlassButton
                  variant="ghost"
                  size="lg"
                  className="w-full sm:w-auto text-white border border-white/30 hover:bg-white/10"
                >
                  Become an Educator
                </GlassButton>
              </Link>

              <a href="#how-it-works" className="w-full sm:w-auto">
                <GlassButton
                  variant="ghost"
                  size="lg"
                  className="w-full sm:w-auto text-white border border-white/30 hover:bg-white/10"
                >
                  How It Works?
                </GlassButton>
              </a>
            </div>

            <div className="pt-6 flex items-center justify-center gap-6 text-xs text-[#A7F3D0]">
              <span>✓ Nominal Registration Fee</span>
              <span>•</span>
              <span>✓ Verified Educator Badge</span>
              <span>•</span>
              <span>✓ Automated Cashfree bank transfers</span>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <PremiumFooter />

      {/* Auth Modal Trigger */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        initialRole="TEACHER"
      />
    </div>
  );
}

