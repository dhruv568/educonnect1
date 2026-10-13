"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { FloatingNavbar } from "@/components/homepage/floating-navbar";
import { PremiumFooter } from "@/components/homepage/premium-footer";
import { GlassCard } from "@/components/glass/glass-card";
import { GlassBadge } from "@/components/glass/glass-badge";
import { GlassButton } from "@/components/glass/glass-button";
import {
  GraduationCap,
  ShieldCheck,
  Heart,
  Users,
  Sparkles,
  Award,
  BookOpen,
  Video,
  CheckCircle2,
  Clock,
  ArrowRight,
  Target,
  FileCheck,
  Headphones,
  Star,
} from "lucide-react";

type AboutThemeMode = "main" | "learner" | "educator";

interface AboutThemeConfig {
  containerBg: string;
  blob1Bg: string;
  blob2Bg: string;
  badge: {
    bg: string;
    border: string;
    text: string;
    icon: string;
  };
  headingGradient: string;
  heroText: string;
  statsCard: {
    border: string;
    hoverBorder: string;
    numberText: string;
  };
  founder: {
    border: string;
    gradientVia: string;
    radialColor: string;
    portraitBorder: string;
    badgeBg: string;
    badgeBorder: string;
    badgeText: string;
    leadershipBadge: string;
    subtitleText: string;
    highlightBox: string;
    highlightText: string;
    visionCardBorder: string;
    visionIconBg: string;
    visionIconText: string;
    taglineBorder: string;
    taglineText: string;
  };
  interactivePedagogyTag: string;
  philosophyBadge: string;
  cardBorder: string;
  pillars: {
    pillar1: { bg: string; text: string };
    pillar2: { bg: string; text: string };
    pillar3: { bg: string; text: string };
  };
  trustBadge: {
    bg: string;
    text: string;
  };
  verification: {
    stage1: string;
    stage2: string;
    stage3: string;
    stage4: string;
    badgeText: string;
    checkIcon: string;
  };
  faculty: {
    ring: string;
    subjectText: string;
  };
  ctaBanner: {
    bg: string;
    border: string;
    subtitle: string;
    primaryBtnText: string;
    primaryBtnHover: string;
  };
  navbarVariant: "default" | "student" | "teacher";
  footerVariant: "default" | "student" | "teacher";
}

const THEME_CONFIGS: Record<AboutThemeMode, AboutThemeConfig> = {
  main: {
    containerBg: "bg-[#F2FAF8]/40",
    blob1Bg: "bg-[#0F5C5A]/10",
    blob2Bg: "bg-[#16706E]/10",
    badge: {
      bg: "bg-[#E6F0EF]",
      border: "border-[#DCE5E4]",
      text: "text-[#0F5C5A]",
      icon: "text-[#0F5C5A]",
    },
    headingGradient: "bg-gradient-to-r from-[#0F5C5A] via-[#16706E] to-[#083F3D] bg-clip-text text-transparent",
    heroText: "text-slate-600 font-normal",
    statsCard: {
      border: "border-[#DCE5E4]/80",
      hoverBorder: "hover:border-[#0F5C5A]/30",
      numberText: "text-[#0F5C5A]",
    },
    founder: {
      border: "border-teal-500/20",
      gradientVia: "via-[#06302E]/90",
      radialColor: "rgba(15,92,90,0.25)",
      portraitBorder: "border-teal-400/40",
      badgeBg: "bg-teal-950/80",
      badgeBorder: "border-teal-400/30",
      badgeText: "text-teal-300",
      leadershipBadge: "bg-teal-500/20 border-teal-400/40 text-teal-200",
      subtitleText: "text-teal-100",
      highlightBox: "bg-teal-950/60 border-teal-400/30",
      highlightText: "text-teal-200",
      visionCardBorder: "border-teal-400/20",
      visionIconBg: "bg-teal-500/20",
      visionIconText: "text-teal-300",
      taglineBorder: "border-teal-500/30",
      taglineText: "text-teal-200",
    },
    interactivePedagogyTag: "text-teal-300",
    philosophyBadge: "text-[#0F5C5A]",
    cardBorder: "border-[#DCE5E4]/80 hover:border-[#0F5C5A]/30",
    pillars: {
      pillar1: { bg: "bg-[#E6F0EF]", text: "text-[#0F5C5A]" },
      pillar2: { bg: "bg-[#EAF5F4]", text: "text-[#16706E]" },
      pillar3: { bg: "bg-[#E6F0EF]", text: "text-[#083F3D]" },
    },
    trustBadge: {
      bg: "bg-[#E6F0EF]",
      text: "text-[#0F5C5A]",
    },
    verification: {
      stage1: "text-[#0F5C5A] bg-[#E6F0EF] border-[#DCE5E4]",
      stage2: "text-[#16706E] bg-[#EAF5F4] border-[#CDE5E3]",
      stage3: "text-[#0F5C5A] bg-[#E6F0EF] border-[#DCE5E4]",
      stage4: "text-[#083F3D] bg-slate-100 border-slate-200",
      badgeText: "text-[#0F5C5A]",
      checkIcon: "text-teal-600",
    },
    faculty: {
      ring: "ring-[#0F5C5A]/25",
      subjectText: "text-[#0F5C5A]",
    },
    ctaBanner: {
      bg: "bg-gradient-to-r from-[#083F3D] via-[#0F5C5A] to-[#083F3D]",
      border: "border-[#1B6863]/40",
      subtitle: "text-teal-100",
      primaryBtnText: "text-[#083F3D]",
      primaryBtnHover: "hover:bg-teal-50",
    },
    navbarVariant: "default",
    footerVariant: "default",
  },
  educator: {
    containerBg: "bg-[#F0FAF5]/40",
    blob1Bg: "bg-[#16805B]/10",
    blob2Bg: "bg-[#35A979]/10",
    badge: {
      bg: "bg-[#E6F7F0]",
      border: "border-[#A7F3D0]",
      text: "text-[#0D5C41]",
      icon: "text-[#16805B]",
    },
    headingGradient: "bg-gradient-to-r from-[#16805B] via-[#0D5C41] to-[#16805B] bg-clip-text text-transparent",
    heroText: "text-slate-700 font-normal",
    statsCard: {
      border: "border-[#A7F3D0]/60",
      hoverBorder: "hover:border-[#16805B]/40",
      numberText: "text-[#16805B]",
    },
    founder: {
      border: "border-emerald-500/20",
      gradientVia: "via-emerald-950/85",
      radialColor: "rgba(22,128,91,0.25)",
      portraitBorder: "border-emerald-400/40",
      badgeBg: "bg-emerald-950/80",
      badgeBorder: "border-emerald-400/30",
      badgeText: "text-emerald-300",
      leadershipBadge: "bg-emerald-500/20 border-emerald-400/40 text-emerald-200",
      subtitleText: "text-emerald-100",
      highlightBox: "bg-emerald-950/60 border-emerald-400/30",
      highlightText: "text-emerald-200",
      visionCardBorder: "border-emerald-400/20",
      visionIconBg: "bg-emerald-500/20",
      visionIconText: "text-emerald-300",
      taglineBorder: "border-emerald-500/30",
      taglineText: "text-emerald-200",
    },
    interactivePedagogyTag: "text-emerald-400",
    philosophyBadge: "text-[#16805B]",
    cardBorder: "border-[#A7F3D0]/60 hover:border-[#16805B]/30",
    pillars: {
      pillar1: { bg: "bg-[#E6F7F0]", text: "text-[#16805B]" },
      pillar2: { bg: "bg-[#E8F8F2]", text: "text-[#0D5C41]" },
      pillar3: { bg: "bg-[#E6F7F0]", text: "text-[#35A979]" },
    },
    trustBadge: {
      bg: "bg-[#E6F7F0]",
      text: "text-[#16805B]",
    },
    verification: {
      stage1: "text-[#16805B] bg-[#E6F7F0] border-[#A7F3D0]",
      stage2: "text-[#0D5C41] bg-[#E8F8F2] border-[#A7F3D0]",
      stage3: "text-[#16805B] bg-[#E6F7F0] border-[#A7F3D0]",
      stage4: "text-[#0D5C41] bg-slate-100 border-slate-200",
      badgeText: "text-[#16805B]",
      checkIcon: "text-emerald-500",
    },
    faculty: {
      ring: "ring-[#16805B]/25",
      subjectText: "text-[#16805B]",
    },
    ctaBanner: {
      bg: "bg-gradient-to-r from-[#0D5C41] via-[#16805B] to-[#0D5C41]",
      border: "border-[#16805B]/40",
      subtitle: "text-emerald-100",
      primaryBtnText: "text-[#0D5C41]",
      primaryBtnHover: "hover:bg-emerald-50",
    },
    navbarVariant: "teacher",
    footerVariant: "teacher",
  },
  learner: {
    containerBg: "bg-[#F0FAF5]/40",
    blob1Bg: "bg-[#16805B]/10",
    blob2Bg: "bg-[#35A979]/10",
    badge: {
      bg: "bg-[#E6F7F0]",
      border: "border-[#A7F3D0]",
      text: "text-[#0D5C41]",
      icon: "text-[#16805B]",
    },
    headingGradient: "bg-gradient-to-r from-[#16805B] via-[#0D5C41] to-[#16805B] bg-clip-text text-transparent",
    heroText: "text-slate-700 font-normal",
    statsCard: {
      border: "border-[#A7F3D0]/60",
      hoverBorder: "hover:border-[#16805B]/40",
      numberText: "text-[#16805B]",
    },
    founder: {
      border: "border-emerald-500/20",
      gradientVia: "via-emerald-950/85",
      radialColor: "rgba(22,128,91,0.25)",
      portraitBorder: "border-emerald-400/40",
      badgeBg: "bg-emerald-950/80",
      badgeBorder: "border-emerald-400/30",
      badgeText: "text-emerald-300",
      leadershipBadge: "bg-emerald-500/20 border-emerald-400/40 text-emerald-200",
      subtitleText: "text-emerald-100",
      highlightBox: "bg-emerald-950/60 border-emerald-400/30",
      highlightText: "text-emerald-200",
      visionCardBorder: "border-emerald-400/20",
      visionIconBg: "bg-emerald-500/20",
      visionIconText: "text-emerald-300",
      taglineBorder: "border-emerald-500/30",
      taglineText: "text-emerald-200",
    },
    interactivePedagogyTag: "text-emerald-400",
    philosophyBadge: "text-[#16805B]",
    cardBorder: "border-[#A7F3D0]/60 hover:border-[#16805B]/30",
    pillars: {
      pillar1: { bg: "bg-[#E6F7F0]", text: "text-[#16805B]" },
      pillar2: { bg: "bg-[#E8F8F2]", text: "text-[#0D5C41]" },
      pillar3: { bg: "bg-[#E6F7F0]", text: "text-[#35A979]" },
    },
    trustBadge: {
      bg: "bg-[#E6F7F0]",
      text: "text-[#16805B]",
    },
    verification: {
      stage1: "text-[#16805B] bg-[#E6F7F0] border-[#A7F3D0]",
      stage2: "text-[#0D5C41] bg-[#E8F8F2] border-[#A7F3D0]",
      stage3: "text-[#16805B] bg-[#E6F7F0] border-[#A7F3D0]",
      stage4: "text-[#0D5C41] bg-slate-100 border-slate-200",
      badgeText: "text-[#16805B]",
      checkIcon: "text-emerald-500",
    },
    faculty: {
      ring: "ring-[#16805B]/25",
      subjectText: "text-[#16805B]",
    },
    ctaBanner: {
      bg: "bg-gradient-to-r from-[#0D5C41] via-[#16805B] to-[#0D5C41]",
      border: "border-[#16805B]/40",
      subtitle: "text-emerald-100",
      primaryBtnText: "text-[#0D5C41]",
      primaryBtnHover: "hover:bg-emerald-50",
    },
    navbarVariant: "student",
    footerVariant: "student",
  },
};

function detectTheme(): AboutThemeMode {
  if (typeof window === "undefined") return "main";

  const params = new URLSearchParams(window.location.search);
  const themeParam = (
    params.get("theme") ||
    params.get("site") ||
    params.get("role") ||
    params.get("portal") ||
    ""
  ).toLowerCase();

  if (["learner", "learners", "student", "students"].includes(themeParam)) {
    return "learner";
  }
  if (["educator", "educators", "teacher", "teachers"].includes(themeParam)) {
    return "educator";
  }
  if (["main", "default", "home"].includes(themeParam)) {
    return "main";
  }

  const hostname = window.location.hostname.toLowerCase();
  if (
    hostname.startsWith("learners.") ||
    hostname.startsWith("learner.") ||
    hostname.startsWith("students.") ||
    hostname.startsWith("student.")
  ) {
    return "learner";
  }
  if (
    hostname.startsWith("educators.") ||
    hostname.startsWith("educator.") ||
    hostname.startsWith("teachers.") ||
    hostname.startsWith("teacher.")
  ) {
    return "educator";
  }

  if (typeof document !== "undefined" && document.referrer) {
    try {
      const refUrl = new URL(document.referrer);
      const refHost = refUrl.hostname.toLowerCase();
      const refPath = refUrl.pathname.toLowerCase();
      if (
        refHost.startsWith("learners.") ||
        refHost.startsWith("learner.") ||
        refHost.startsWith("students.") ||
        refHost.startsWith("student.") ||
        refPath.startsWith("/student") ||
        refPath.startsWith("/exam")
      ) {
        return "learner";
      }
      if (
        refHost.startsWith("educators.") ||
        refHost.startsWith("educator.") ||
        refHost.startsWith("teachers.") ||
        refHost.startsWith("teacher.") ||
        refPath.startsWith("/teacher")
      ) {
        return "educator";
      }
    } catch {
      // Ignore invalid referrer URL
    }
  }

  return "main";
}

interface AboutContentProps {
  initialTheme?: AboutThemeMode;
}

function AboutContent({ initialTheme }: AboutContentProps = {}) {
  const [themeMode, setThemeMode] = useState<AboutThemeMode>(() => {
    if (initialTheme) return initialTheme;
    return detectTheme();
  });

  useEffect(() => {
    if (initialTheme) {
      setThemeMode(initialTheme);
      return;
    }
    const updateTheme = () => {
      setThemeMode(detectTheme());
    };

    updateTheme();
    window.addEventListener("popstate", updateTheme);
    return () => window.removeEventListener("popstate", updateTheme);
  }, [initialTheme]);

  const theme = THEME_CONFIGS[themeMode] || THEME_CONFIGS.main;

  const stats = [
    { label: "Active Students", value: "15,000+", sub: "Enrolled globally" },
    { label: "Verified Educators", value: "850+", sub: "Audit certified" },
    { label: "Live Class Hours", value: "45,000+", sub: "Seamless WebRTC" },
    { label: "Average Rating", value: "4.95 / 5.0", sub: "12,000+ reviews" },
  ];

  const verificationStages = [
    {
      num: "01",
      title: "Academic Audit",
      desc: "Every educator's university degrees, STEM certifications, and institutional background are verified.",
      icon: FileCheck,
      color: theme.verification.stage1,
    },
    {
      num: "02",
      title: "Pedagogy Screening",
      desc: "Educators conduct a live mock teaching session to evaluate conceptual clarity and student empathy.",
      icon: Video,
      color: theme.verification.stage2,
    },
    {
      num: "03",
      title: "Hardware & AV Check",
      desc: "Instructors must pass high-definition audio, digital pen tablet, and fiber-connection tests.",
      icon: Headphones,
      color: theme.verification.stage3,
    },
    {
      num: "04",
      title: "Continuous Governance",
      desc: "Student ratings are monitored live, with escrow payouts held until session completion.",
      icon: ShieldCheck,
      color: theme.verification.stage4,
    },
  ];

  const facultySpotlight = [
    {
      name: "Dr. Rajeshwar Kulkarni",
      role: "Head of Physical Sciences",
      avatar: "/images/educators/male-2.png",
      subject: "Chemistry & Medical Prep",
      credential: "Ex-University Lecturer (19+ Yrs)",
      rating: "4.97",
      students: "1,400+ Mentored",
    },
    {
      name: "Sunita Natarajan, M.Sc.",
      role: "Lead STEM Instructor",
      avatar: "/images/educators/educator_02.jpg",
      subject: "Calculus & Olympiad Math",
      credential: "Senior STEM Coach (16+ Yrs)",
      rating: "4.94",
      students: "2,100+ Mentored",
    },
    {
      name: "Meenakshi Sundaram",
      role: "Computer Science Faculty",
      avatar: "/images/educators/educator_04.jpg",
      subject: "Algorithms & AI Foundations",
      credential: "Software Architect & Mentor (14+ Yrs)",
      rating: "4.93",
      students: "1,250+ Mentored",
    },
  ];

  return (
    <div
      data-theme={themeMode}
      className={`min-h-screen flex flex-col ${theme.containerBg} relative overflow-hidden font-sans transition-colors duration-200`}
    >
      {/* Background Decorative Ambient Blobs */}
      <div
        className={`liquid-blob-1 top-20 left-1/4 pointer-events-none ${theme.blob1Bg}`}
      />
      <div
        className={`liquid-blob-2 top-1/2 right-10 pointer-events-none ${theme.blob2Bg}`}
      />

      <FloatingNavbar variant={theme.navbarVariant} />

      <main className="flex-1 pt-32 pb-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full space-y-24 relative z-10">
        {/* ========================================================================= */}
        {/* 1. ABOUT THE FOUNDER SECTION (FIRST SECTION BEFORE ALL EXISTING CONTENT) */}
        {/* ========================================================================= */}
        <section
          className={`relative rounded-3xl overflow-hidden shadow-2xl border ${theme.founder.border} bg-slate-950`}
        >
          {/* Banner Background with Subtle Gradient Overlay */}
          <div className="absolute inset-0 -z-0">
            <img
              src="/images/educonnects-owner-banner.jpeg"
              alt="EduConnects Banner"
              className="w-full h-full object-cover object-center filter brightness-[0.45] scale-105 transition-transform duration-700 hover:scale-100"
            />
            <div
              className={`absolute inset-0 bg-gradient-to-r from-slate-950/95 ${theme.founder.gradientVia} to-slate-950/95`}
            />
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: `radial-gradient(circle at top right, ${theme.founder.radialColor}, transparent 50%)`,
              }}
            />
          </div>

          <div className="relative z-10 p-6 sm:p-10 lg:p-14 text-white">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
              {/* Founder Narrative & Vision/Mission Column */}
              <div className="lg:col-span-7 space-y-6">
                <div className="space-y-3">
                  <div
                    className={`inline-flex items-center gap-2 px-3 py-1 rounded-full ${theme.founder.leadershipBadge} text-xs font-bold uppercase tracking-wider`}
                  >
                    <GraduationCap className="h-3.5 w-3.5" />
                    <span>Leadership & Vision</span>
                  </div>

                  <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white">
                    About the Founder
                  </h2>

                  <p
                    className={`text-base sm:text-lg font-medium ${theme.founder.subtitleText} leading-relaxed`}
                  >
                    Neeraj Shrivastava, Founder of EduConnects, brings over a decade of experience across education, academic leadership, technology and entrepreneurship.
                  </p>

                  <p className="text-sm sm:text-base text-slate-200 leading-relaxed font-normal">
                    His journey began with B.Sc. in Mathematics (2002) and M.Sc. in Computer Science (2004). After preparing for the IAS in Delhi (2009–2011), he dedicated himself to education, working as a teacher at Aspirant International School and later at Rani Lakshmibai Public School, where he progressed from TGT to PGT. In 2023–24, he served as Principal at AVM Inter College, Lalitpur.
                  </p>

                  <div
                    className={`p-3.5 sm:p-4 rounded-2xl ${theme.founder.highlightBox} text-xs sm:text-sm font-semibold ${theme.founder.highlightText} leading-relaxed`}
                  >
                    His transition from student → teacher → academic leader → entrepreneur inspired the creation of EduConnects in 2026.
                  </div>
                </div>

                {/* Our Vision & Our Mission Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div
                    className={`p-4 sm:p-5 rounded-2xl bg-white/10 border ${theme.founder.visionCardBorder} backdrop-blur-md space-y-2`}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className={`p-1.5 rounded-lg ${theme.founder.visionIconBg} ${theme.founder.visionIconText}`}
                      >
                        <Target className="h-4 w-4" />
                      </div>
                      <h3 className="text-base sm:text-lg font-black text-white">
                        Our Vision
                      </h3>
                    </div>
                    <p className="text-xs sm:text-sm text-slate-200 leading-relaxed font-normal">
                      To connect learners, educators and opportunities through technology and make quality education more accessible.
                    </p>
                  </div>

                  <div
                    className={`p-4 sm:p-5 rounded-2xl bg-white/10 border ${theme.founder.visionCardBorder} backdrop-blur-md space-y-2`}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className={`p-1.5 rounded-lg ${theme.founder.visionIconBg} ${theme.founder.visionIconText}`}
                      >
                        <Heart className="h-4 w-4" />
                      </div>
                      <h3 className="text-base sm:text-lg font-black text-white">
                        Our Mission
                      </h3>
                    </div>
                    <p className="text-xs sm:text-sm text-slate-200 leading-relaxed font-normal">
                      To create a trusted ecosystem where students can find the right educators, educators can reach more learners, and everyone can learn, teach, grow and create opportunities together.
                    </p>
                  </div>
                </div>

                {/* Tagline */}
                <div
                  className={`pt-3 border-t ${theme.founder.taglineBorder} flex items-center justify-between flex-wrap gap-2 text-xs sm:text-sm font-bold ${theme.founder.taglineText}`}
                >
                  <span>EduConnects — Connecting Education. Creating Opportunities.</span>
                </div>
              </div>

              {/* Founder Portrait Column */}
              <div className="lg:col-span-5 flex flex-col items-center text-center">
                <div
                  className={`relative w-full max-w-[320px] sm:max-w-[360px] aspect-[4/5] rounded-3xl overflow-hidden shadow-2xl border-4 ${theme.founder.portraitBorder} bg-slate-900 group`}
                >
                  <img
                    src="/images/educonnect-owner-photo.jpeg"
                    alt="Neeraj Shrivastava - Founder of EduConnects"
                    className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/20 to-transparent" />
                  <div className="absolute bottom-4 left-4 right-4 text-left">
                    <span
                      className={`inline-block text-[10px] font-extrabold uppercase tracking-wider ${theme.founder.badgeText} ${theme.founder.badgeBg} px-2.5 py-0.5 rounded-full border ${theme.founder.badgeBorder} mb-1`}
                    >
                      Founder & Academic Leader
                    </span>
                    <div className="text-lg sm:text-xl font-black text-white">Neeraj Shrivastava</div>
                    <div className="text-xs text-slate-300 font-medium">Founder of EduConnects</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Hero Section */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div
            className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider shadow-2xs ${theme.badge.bg} ${theme.badge.border} ${theme.badge.text}`}
          >
            <Sparkles className={`h-3.5 w-3.5 ${theme.badge.icon}`} />
            <span>The EduConnects Vision</span>
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight leading-tight">
            Connecting Education for{" "}
            <span className={theme.headingGradient}>
              Every Curious Learner
            </span>
          </h1>
          <p
            className={`text-base sm:text-lg ${theme.heroText} leading-relaxed max-w-2xl mx-auto`}
          >
            EduConnects is built on the conviction that transparent flexible learning models, certified educators, and real-time interactive classrooms unlock academic excellence.
          </p>
        </div>

        {/* High-Impact Statistics Banner */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
          {stats.map((s, idx) => (
            <GlassCard
              key={idx}
              className={`p-6 text-center space-y-1 border-2 bg-white/90 shadow-xs transition-all ${theme.statsCard.border} ${theme.statsCard.hoverBorder}`}
            >
              <div
                className={`text-3xl sm:text-4xl font-black ${theme.statsCard.numberText}`}
              >
                {s.value}
              </div>
              <div className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                {s.label}
              </div>
              <p className="text-[11px] text-slate-500 font-medium">{s.sub}</p>
            </GlassCard>
          ))}
        </div>

        {/* Visual Story Split Section */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          {/* Left: Image Card with Floating Badges */}
          <div className="lg:col-span-6 relative">
            <div className="relative rounded-3xl overflow-hidden shadow-2xl border-4 border-white">
              <img
                src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800&auto=format&fit=crop&q=80"
                alt="Interactive Mentorship Session"
                className="w-full h-[380px] sm:h-[450px] object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />
              <div className="absolute bottom-6 left-6 right-6 text-white space-y-1">
                <span
                  className={`text-xs font-extrabold uppercase tracking-wider ${theme.interactivePedagogyTag}`}
                >
                  Interactive Pedagogy
                </span>
                <h4 className="text-lg font-bold">1-on-1 Mentorship That Actually Adapts</h4>
                <p className="text-xs text-slate-300">
                  Live whiteboard, real-time formula solving, and instant Q&A.
                </p>
              </div>
            </div>

            {/* Floating Trust Chip */}
            <div className="absolute -top-4 -right-4 bg-white p-3.5 rounded-2xl shadow-xl border border-slate-100 hidden sm:flex items-center gap-3">
              <div
                className={`p-2.5 rounded-xl ${theme.trustBadge.bg} ${theme.trustBadge.text}`}
              >
                <ShieldCheck className="h-6 w-6" />
              </div>
              <div>
                <div className="text-xs font-extrabold text-slate-900">100% Verified Tutors</div>
                <p className="text-[10px] text-slate-500">Zero Unvetted Profiles</p>
              </div>
            </div>
          </div>

          {/* Right: Core Pillars */}
          <div className="lg:col-span-6 space-y-6">
            <div className="space-y-3">
              <span
                className={`text-xs font-extrabold uppercase tracking-widest ${theme.philosophyBadge}`}
              >
                Our Core Philosophy
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Why EduConnects Was Created
              </h2>
              <p className="text-sm text-slate-600 leading-relaxed font-normal">
                Traditional tutoring platforms forced families into rigid, expensive annual subscriptions with little control over teaching quality. We built EduConnects around three transparent pillars:
              </p>
            </div>

            <div className="space-y-4">
              <div
                className={`flex items-start gap-4 p-4 rounded-2xl bg-white border ${theme.cardBorder} shadow-xs`}
              >
                <div
                  className={`p-2.5 rounded-xl shrink-0 ${theme.pillars.pillar1.bg} ${theme.pillars.pillar1.text}`}
                >
                  <Target className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">1. Flexibility Without Lock-In</h4>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    Choose 1-on-1 introductory demos, reserve individual live class slots, or purchase self-paced LMS courses with lifetime access.
                  </p>
                </div>
              </div>

              <div
                className={`flex items-start gap-4 p-4 rounded-2xl bg-white border ${theme.cardBorder} shadow-xs`}
              >
                <div
                  className={`p-2.5 rounded-xl shrink-0 ${theme.pillars.pillar2.bg} ${theme.pillars.pillar2.text}`}
                >
                  <Video className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">2. Built-in WebRTC Classroom</h4>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    No third-party app installations required. Enjoy built-in multi-party video, interactive shared whiteboard, and class chat directly in the browser.
                  </p>
                </div>
              </div>

              <div
                className={`flex items-start gap-4 p-4 rounded-2xl bg-white border ${theme.cardBorder} shadow-xs`}
              >
                <div
                  className={`p-2.5 rounded-xl shrink-0 ${theme.pillars.pillar3.bg} ${theme.pillars.pillar3.text}`}
                >
                  <Award className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">3. Transparent Academic Outcomes</h4>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    Track lesson milestones, complete auto-graded concept quizzes, and verify student attendance with automated reporting.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 4-Stage Educator Verification Process (Infographic Grid) */}
        <div className="space-y-8">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <span
              className={`text-xs font-extrabold uppercase tracking-widest ${theme.philosophyBadge}`}
            >
              Quality Assurance
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
              The 4-Stage Educator Verification Protocol
            </h2>
            <p className="text-xs sm:text-sm text-slate-600">
              Only the top 8% of applicants receive verified educator status on EduConnects.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {verificationStages.map((stage) => {
              const Icon = stage.icon;
              return (
                <GlassCard
                  key={stage.num}
                  className={`p-6 space-y-4 border-2 bg-white/90 shadow-xs flex flex-col justify-between transition-all ${theme.cardBorder}`}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className={`p-3 rounded-2xl border ${stage.color}`}>
                        <Icon className="h-6 w-6" />
                      </div>
                      <span className="text-2xl font-black text-slate-300">{stage.num}</span>
                    </div>
                    <h3 className="text-base font-bold text-slate-900">{stage.title}</h3>
                    <p className="text-xs text-slate-600 leading-relaxed">{stage.desc}</p>
                  </div>
                  <div
                    className={`pt-2 flex items-center gap-1.5 text-[11px] font-bold ${theme.verification.badgeText}`}
                  >
                    <CheckCircle2 className={`h-3.5 w-3.5 ${theme.verification.checkIcon}`} />
                    Audit Mandatory
                  </div>
                </GlassCard>
              );
            })}
          </div>
        </div>

        {/* Faculty & Educator Spotlight */}
        <div className="space-y-8">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <span
              className={`text-xs font-extrabold uppercase tracking-widest ${theme.philosophyBadge}`}
            >
              Faculty Spotlight
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
              Meet Some of Our Verified Educators
            </h2>
            <p className="text-xs sm:text-sm text-slate-600">
              Passionate educators dedicated to student clarity, confidence, and exam success.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {facultySpotlight.map((f, idx) => (
              <GlassCard
                key={idx}
                className={`p-6 space-y-4 border-2 bg-white/90 shadow-xs transition-all ${theme.cardBorder}`}
              >
                <div className="flex items-center gap-4">
                  <img
                    src={f.avatar}
                    alt={f.name}
                    className={`w-16 h-16 rounded-full object-cover ring-4 ${theme.faculty.ring}`}
                  />
                  <div>
                    <h3 className="text-base font-bold text-slate-900">{f.name}</h3>
                    <p className={`text-xs font-semibold ${theme.faculty.subjectText}`}>
                      {f.subject}
                    </p>
                    <p className="text-[11px] text-slate-500">{f.credential}</p>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs font-medium text-slate-600">
                  <span className="flex items-center gap-1 text-amber-500 font-bold">
                    <Star className="h-3.5 w-3.5 fill-amber-400" /> {f.rating} Rating
                  </span>
                  <span>{f.students}</span>
                </div>
              </GlassCard>
            ))}
          </div>
        </div>

        {/* Call to Action Banner */}
        <div
          className={`p-8 sm:p-12 rounded-3xl text-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl transition-all ${theme.ctaBanner.bg} ${theme.ctaBanner.border}`}
        >
          <div className="space-y-2 text-center md:text-left">
            <h3 className="text-2xl sm:text-3xl font-black">Ready to begin your learning journey?</h3>
            <p className={`text-sm max-w-lg ${theme.ctaBanner.subtitle}`}>
              Explore hundreds of verified tutors or book a trial demo session with zero commitment today.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <Link href="/find-teachers">
              <GlassButton
                variant="secondary"
                size="lg"
                className={`bg-white ${theme.ctaBanner.primaryBtnText} ${theme.ctaBanner.primaryBtnHover} font-bold shadow-md`}
              >
                Explore Teachers
              </GlassButton>
            </Link>
            <Link href={themeMode === "learner" ? "/courses" : "/register/teacher"}>
              <GlassButton
                variant={
                  themeMode === "learner"
                    ? "learner"
                    : themeMode === "educator"
                    ? "educator"
                    : "primary"
                }
                size="lg"
                className="border border-white/40 text-white hover:bg-white/10 font-bold"
              >
                {themeMode === "learner" ? "Explore Courses" : "Apply to Teach"}
              </GlassButton>
            </Link>
          </div>
        </div>
      </main>

      <PremiumFooter variant={theme.footerVariant} />
    </div>
  );
}

export default function AboutPage() {
  return <AboutContent />;
}
