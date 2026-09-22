"use client";

import React, { useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  CheckCircle2,
  Home,
  LogIn,
  BookOpen,
  Sparkles,
  ShieldCheck,
  GraduationCap,
  Users,
  Award,
  Video,
  BarChart2,
  ArrowRight,
} from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { Footer } from "@/components/layout/footer";
import {
  getHomeUrl,
  getLearnerDomain,
  getEducatorDomain,
  getLearnerSubdomainUrl,
  getEducatorSubdomainUrl,
} from "@/lib/app-url";

export type LogoutRoleContext = "student" | "teacher" | "admin" | "default";

export interface LogoutPageProps {
  roleContext?: LogoutRoleContext;
  customHomeUrl?: string;
  customLoginUrl?: string;
}

export function LogoutPage({
  roleContext = "default",
  customHomeUrl,
  customLoginUrl,
}: LogoutPageProps) {
  // Session invalidation and browser back-button defense on mount
  useEffect(() => {
    // 1. Fire server-side logout endpoint to invalidate session cookies
    fetch("/api/auth/logout", {
      method: "POST",
      cache: "no-store",
    }).catch(() => {});

    // 2. Clear client storage
    if (typeof window !== "undefined") {
      try {
        sessionStorage.removeItem("educonnect_auth");
        localStorage.removeItem("educonnect_auth");
      } catch {}
      window.dispatchEvent(new Event("educonnect_auth_changed"));

      // 3. Prevent Back Button restoration of protected content
      window.history.pushState(null, "", window.location.href);
      const handlePopState = () => {
        window.history.pushState(null, "", window.location.href);
      };

      const handlePageShow = (event: PageTransitionEvent) => {
        if (event.persisted) {
          fetch("/api/auth/logout", { method: "POST", cache: "no-store" }).catch(() => {});
        }
      };

      window.addEventListener("popstate", handlePopState);
      window.addEventListener("pageshow", handlePageShow);

      return () => {
        window.removeEventListener("popstate", handlePopState);
        window.removeEventListener("pageshow", handlePageShow);
      };
    }
  }, []);

  // Determine role-specific URLs
  const getHomeDestination = () => {
    if (customHomeUrl) return customHomeUrl;
    if (roleContext === "student") return getLearnerDomain();
    if (roleContext === "teacher") return getEducatorDomain();
    return getHomeUrl();
  };

  const getLoginDestination = () => {
    if (customLoginUrl) return customLoginUrl;
    if (roleContext === "student") return getLearnerSubdomainUrl("/student/login");
    if (roleContext === "teacher") return getEducatorSubdomainUrl("/teacher/login");
    if (roleContext === "admin") return "/admin/login";
    return "/login";
  };

  const homeUrl = getHomeDestination();
  const loginUrl = getLoginDestination();

  // Role portal badge configurations
  const getRoleBadge = () => {
    switch (roleContext) {
      case "student":
        return {
          label: "Learner Portal",
          badgeBg: "bg-blue-50 text-blue-700 border-blue-200",
          accentColor: "from-blue-600 to-indigo-600",
          buttonBg: "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/20",
          outlineBtn: "border-blue-200 text-blue-700 hover:bg-blue-50",
          illustration: "/images/courses-learning.png",
          altText: "EduConnects Learning Platform",
        };
      case "teacher":
        return {
          label: "Educator Portal",
          badgeBg: "bg-emerald-50 text-emerald-800 border-emerald-200",
          accentColor: "from-emerald-700 to-teal-700",
          buttonBg: "bg-[#16805B] hover:bg-[#0D5C41] text-white shadow-emerald-700/20",
          outlineBtn: "border-emerald-300 text-[#0D5C41] hover:bg-emerald-50",
          illustration: "/images/courses-learning.png",
          altText: "EduConnects Educator Workspace",
        };
      case "admin":
        return {
          label: "Admin Portal",
          badgeBg: "bg-amber-50 text-amber-800 border-amber-200",
          accentColor: "from-amber-600 to-amber-700",
          buttonBg: "bg-amber-600 hover:bg-amber-700 text-white shadow-amber-600/20",
          outlineBtn: "border-amber-300 text-amber-800 hover:bg-amber-50",
          illustration: "/images/courses-learning.png",
          altText: "EduConnects Platform Administration",
        };
      default:
        return {
          label: "EduConnects",
          badgeBg: "bg-teal-50 text-teal-800 border-teal-200",
          accentColor: "from-teal-600 to-emerald-600",
          buttonBg: "bg-[#0F5C5A] hover:bg-[#083F3D] text-white shadow-teal-700/20",
          outlineBtn: "border-slate-300 text-slate-700 hover:bg-slate-100",
          illustration: "/images/courses-learning.png",
          altText: "EduConnects Education System",
        };
    }
  };

  const badgeConfig = getRoleBadge();

  // Role-tailored messaging
  const getRoleMessage = () => {
    if (roleContext === "student") {
      return "Your learning session has ended successfully. We hope to see you back on your learning journey soon!";
    }
    if (roleContext === "teacher") {
      return "Your educator session has ended successfully. Thank you for empowering learners and shaping the future of education!";
    }
    if (roleContext === "admin") {
      return "Your administrative session has ended successfully and securely. We hope to see you again soon!";
    }
    return "Your session has ended successfully. We hope to see you again soon!";
  };

  // Role-tailored feature section cards
  const getFeatureCards = () => {
    if (roleContext === "student") {
      return [
        {
          icon: Video,
          title: "Interactive Live Classes",
          description: "Engage in real-time video sessions with expert tutors and peer discussions.",
        },
        {
          icon: BookOpen,
          title: "Structured LMS Content",
          description: "Access recorded lectures, quizzes, homework, and verified learning materials anytime.",
        },
        {
          icon: Award,
          title: "Progress & Certificates",
          description: "Track your academic performance and earn industry-recognized course certificates.",
        },
      ];
    }
    if (roleContext === "teacher") {
      return [
        {
          icon: GraduationCap,
          title: "Educator Studio",
          description: "Publish comprehensive courses, build curriculum modules, and set learning milestones.",
        },
        {
          icon: BarChart2,
          title: "Student Analytics",
          description: "Gain deep insights into class attendance, assignment completion, and student progress.",
        },
        {
          icon: Users,
          title: "Global Community",
          description: "Connect with passionate educators and inspire thousands of students nationwide.",
        },
      ];
    }
    if (roleContext === "admin") {
      return [
        {
          icon: ShieldCheck,
          title: "Enterprise Security",
          description: "Role-based access control, encrypted session verification, and continuous security auditing.",
        },
        {
          icon: BarChart2,
          title: "Real-Time System Insights",
          description: "Monitor platform activity, user activity metrics, active classrooms, and revenue streams.",
        },
        {
          icon: Sparkles,
          title: "Platform Governance",
          description: "Comprehensive administration tools for staff management, course approval, and configuration.",
        },
      ];
    }
    return [
      {
        icon: BookOpen,
        title: "Learn Anywhere",
        description: "Access top-tier educational courses and interactive classes across any device.",
      },
      {
        icon: GraduationCap,
        title: "Expert Instructors",
        description: "Learn from verified educators and subject matter experts with real-world experience.",
      },
      {
        icon: ShieldCheck,
        title: "Trusted Environment",
        description: "A secure, modern learning ecosystem built for students, teachers, and institutions.",
      },
    ];
  };

  const featureCards = getFeatureCards();

  // Map roleContext to Footer variant
  const footerVariant = roleContext === "teacher" ? "teacher" : roleContext === "student" ? "student" : "default";

  return (
    <div className="min-h-screen bg-slate-50/80 text-slate-900 flex flex-col justify-between selection:bg-teal-100 selection:text-teal-900">
      {/* Top Header Navigation */}
      <header className="w-full bg-white/90 border-b border-slate-200/80 backdrop-blur-md sticky top-0 z-30 shadow-xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Official Brand Logo with Tagline: EduConnects - Learn • Grow • Belong */}
            <Logo
              variant="compact"
              size="md"
              roleContext={roleContext}
              href={homeUrl}
              priority
            />
            {roleContext !== "default" && (
              <span
                className={`hidden sm:inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide uppercase border ${badgeConfig.badgeBg}`}
              >
                {badgeConfig.label}
              </span>
            )}
          </div>

          <Link
            href={homeUrl}
            className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors bg-slate-100/80 hover:bg-slate-200/80 px-3.5 py-2 rounded-xl"
            aria-label="Back to Home Page"
          >
            <Home className="h-4 w-4 text-slate-500" />
            <span className="hidden xs:inline">Back to Home</span>
          </Link>
        </div>
      </header>

      {/* Main Content Body */}
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-10 sm:py-16 flex flex-col justify-center items-center">
        {/* Main Card Container */}
        <div className="w-full bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-10 md:p-12 shadow-xl shadow-slate-200/50 flex flex-col items-center text-center backdrop-blur-xs">
          {/* Sign-out Confirmation Pill */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-50 border border-emerald-200/90 text-emerald-800 text-xs sm:text-sm font-bold mb-6 shadow-2xs">
            <CheckCircle2 className="h-4.5 w-4.5 text-emerald-600 shrink-0" />
            <span>You have been safely signed out</span>
          </div>

          {/* Large Supportive Education Visual Area */}
          <div className="relative w-full max-w-lg h-44 sm:h-56 md:h-64 rounded-2xl overflow-hidden mb-8 bg-gradient-to-br from-slate-100 via-teal-50/40 to-slate-100 border border-slate-200/60 shadow-inner group flex items-center justify-center">
            <Image
              src={badgeConfig.illustration}
              alt={badgeConfig.altText}
              fill
              priority
              className="object-contain p-4 group-hover:scale-105 transition-transform duration-500 ease-out"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 512px, 512px"
            />
            {/* Subtle Overlay Gradient for Depth */}
            <div className="absolute inset-0 bg-gradient-to-t from-white/40 via-transparent to-transparent pointer-events-none" />

            {/* Decorative Floating Badges matching EduConnects Design System */}
            <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-md px-3 py-1 rounded-full text-[11px] font-bold text-slate-700 shadow-md border border-slate-200/80 flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-amber-500" />
              <span>EduConnects</span>
            </div>

            <div className="absolute bottom-3 right-3 bg-white/95 backdrop-blur-md px-3 py-1 rounded-full text-[11px] font-bold text-slate-700 shadow-md border border-slate-200/80 flex items-center gap-1.5">
              <GraduationCap className="h-3.5 w-3.5 text-teal-600" />
              <span>Learn • Grow • Belong</span>
            </div>
          </div>

          {/* Centered Friendly Logout Message */}
          <div className="space-y-3 max-w-xl mx-auto mb-8">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-slate-900 tracking-tight leading-tight">
              You’ve Been Logged Out 👋
            </h1>
            <p className="text-base sm:text-lg font-semibold text-slate-700">
              Thank you for being a part of EduConnects.
            </p>
            <p className="text-xs sm:text-sm text-slate-500 leading-relaxed font-normal max-w-md mx-auto">
              {getRoleMessage()}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 w-full sm:w-auto">
            <Link
              href={homeUrl}
              className={`w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-2xl font-bold text-sm tracking-wide transition-all duration-200 active:scale-98 shadow-md hover:shadow-lg ${badgeConfig.buttonBg}`}
            >
              <Home className="h-4.5 w-4.5" />
              <span>Back to Home</span>
            </Link>

            <Link
              href={loginUrl}
              className={`w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-2xl font-bold text-sm tracking-wide transition-all duration-200 active:scale-98 bg-white border ${badgeConfig.outlineBtn} shadow-xs`}
            >
              <LogIn className="h-4.5 w-4.5" />
              <span>Login Again</span>
            </Link>
          </div>
        </div>

        {/* Small Supportive Feature / Value Section */}
        <section className="w-full mt-12 sm:mt-16">
          <div className="text-center mb-6">
            <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-400">
              Why Stay Connected With EduConnects
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 w-full">
            {featureCards.map((card, idx) => {
              const IconComponent = card.icon;
              return (
                <div
                  key={idx}
                  className="bg-white/80 border border-slate-200/70 rounded-2xl p-5 hover:border-slate-300 hover:bg-white transition-all duration-200 shadow-xs flex flex-col justify-between group"
                >
                  <div className="space-y-3">
                    <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center text-[#0F5C5A] group-hover:scale-110 transition-transform">
                      <IconComponent className="h-5 w-5" />
                    </div>
                    <h3 className="text-sm font-bold text-slate-800 tracking-tight">
                      {card.title}
                    </h3>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      {card.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </main>

      {/* Full Professional EduConnects Website Footer */}
      <Footer showCta={false} variant={footerVariant} />
    </div>
  );
}

export default LogoutPage;
