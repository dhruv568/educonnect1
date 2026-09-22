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
  Users,
  TrendingUp,
  HeartHandshake,
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

  // Role-tailored messaging
  const getPrimarySupportingText = () => {
    if (roleContext === "student") {
      return "Thank you for being a part of EduConnects. Keep learning, growing and moving forward.";
    }
    if (roleContext === "teacher") {
      return "Thank you for being part of the EduConnects educator community. We hope to see you again soon.";
    }
    if (roleContext === "admin") {
      return "Your administrative session has ended successfully and securely.";
    }
    return "Thank you for being a part of EduConnects.";
  };

  const getSecondaryText = () => {
    if (roleContext === "teacher") {
      return "Your educator session has ended. Thank you for empowering learners and shaping the future of education!";
    }
    if (roleContext === "admin") {
      return "Your session and administrative credentials have been safely cleared.";
    }
    return "Your session has ended successfully and securely. We hope to see you again soon!";
  };

  // 4 Educational Reassurance Highlights
  const reassuranceItems = [
    {
      icon: BookOpen,
      title: "Keep Learning",
      description: "Continue exploring courses and learning resources.",
      iconBg: "bg-blue-50 text-blue-600 border-blue-100",
    },
    {
      icon: Users,
      title: "Find Educators",
      description: "Connect with educators and discover new learning opportunities.",
      iconBg: "bg-teal-50 text-teal-600 border-teal-100",
    },
    {
      icon: TrendingUp,
      title: "Track Your Growth",
      description: "Continue building your skills and academic progress.",
      iconBg: "bg-indigo-50 text-indigo-600 border-indigo-100",
    },
    {
      icon: HeartHandshake,
      title: "Stay Connected",
      description: "Be part of the EduConnects learning community.",
      iconBg: "bg-sky-50 text-sky-600 border-sky-100",
    },
  ];

  // Map roleContext to Footer variant
  const footerVariant = roleContext === "teacher" ? "teacher" : roleContext === "student" ? "student" : "default";

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50 text-slate-900 flex flex-col justify-between selection:bg-blue-100 selection:text-blue-900">
      {/* Top Header Navigation */}
      <header className="w-full bg-white/90 border-b border-slate-200/80 backdrop-blur-md sticky top-0 z-30 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Official Brand Logo with Tagline: EduConnects - Learn • Grow • Belong */}
            <Logo
              variant="compact"
              size="md"
              roleContext={roleContext}
              href={homeUrl}
              priority
            />
          </div>

          <Link
            href={homeUrl}
            className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors bg-slate-100/80 hover:bg-slate-200/80 px-3.5 py-2 rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            aria-label="Back to Home Page"
          >
            <Home className="h-4 w-4 text-slate-500" />
            <span>Back to Home</span>
          </Link>
        </div>
      </header>

      {/* Main Content Body */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-14 lg:py-16 flex flex-col justify-center">
        {/* Main Connected Hero Composition */}
        <section className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center mb-16 sm:mb-20">
          {/* Left Column: Premium 3D Educational Illustration */}
          <div className="lg:col-span-6 xl:col-span-6 flex justify-center order-1 lg:order-1">
            <div className="relative w-full max-w-lg lg:max-w-none group">
              {/* Soft Ambient Radial Glow Backdrop */}
              <div className="absolute -inset-4 bg-gradient-to-tr from-blue-100/70 via-teal-50/50 to-indigo-100/60 rounded-3xl blur-2xl opacity-70 -z-10 group-hover:opacity-90 transition-opacity duration-500" />

              {/* Illustration Container */}
              <div className="relative overflow-hidden rounded-3xl bg-white/60 border border-slate-200/70 shadow-xl shadow-slate-200/40 p-3 sm:p-4 backdrop-blur-xs">
                <Image
                  src="/images/logout-illustration.jpg"
                  alt="EduConnects - Learning Journey Continues"
                  width={1200}
                  height={900}
                  priority
                  className="w-full h-auto object-contain rounded-2xl transform group-hover:scale-[1.01] transition-transform duration-500 ease-out"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 500px, 600px"
                />

                {/* Subtle Floating Tagline Overlay Badge */}
                <div className="absolute top-6 left-6 bg-white/90 backdrop-blur-md border border-slate-200/80 shadow-md px-3.5 py-1.5 rounded-full flex items-center gap-2 text-xs font-bold text-slate-700">
                  <Sparkles className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                  <span>Your learning journey continues</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Integrated Logout Text & Actions */}
          <div className="lg:col-span-6 xl:col-span-6 space-y-6 order-2 lg:order-2 text-left">
            {/* Status Pill Badge */}
            <div>
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-200/80 text-blue-700 text-xs sm:text-sm font-bold shadow-2xs">
                <CheckCircle2 className="h-4 w-4 text-blue-600 shrink-0" />
                <span>You have been safely signed out</span>
              </div>
            </div>

            {/* Typography Stack */}
            <div className="space-y-3">
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 tracking-tight leading-tight">
                You’ve Been Logged Out 👋
              </h1>
              <p className="text-lg sm:text-xl font-bold text-slate-800 leading-snug">
                {getPrimarySupportingText()}
              </p>
              <p className="text-sm sm:text-base text-slate-600 leading-relaxed font-normal max-w-lg">
                {getSecondaryText()}
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5 pt-2">
              <Link
                href={homeUrl}
                className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-2xl font-bold text-sm text-white bg-blue-600 hover:bg-blue-700 active:scale-[0.98] shadow-md shadow-blue-600/20 transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                <Home className="h-4.5 w-4.5" />
                <span>Back to Home</span>
              </Link>

              <Link
                href={loginUrl}
                className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-2xl font-bold text-sm text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-300/90 active:scale-[0.98] shadow-xs transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                <LogIn className="h-4.5 w-4.5 text-slate-500" />
                <span>Login Again</span>
              </Link>
            </div>
          </div>
        </section>

        {/* Supporting Educational Reassurance Section */}
        <section className="w-full pt-8 border-t border-slate-200/60">
          <div className="text-center mb-8 space-y-1">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Learn • Grow • Belong
            </span>
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900">
              Keep Moving Forward with EduConnects
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {reassuranceItems.map((item, idx) => {
              const IconComponent = item.icon;
              return (
                <div
                  key={idx}
                  className="bg-white/80 border border-slate-200/70 rounded-2xl p-5 hover:border-blue-200 hover:bg-white hover:shadow-md transition-all duration-200 shadow-2xs flex flex-col justify-between group"
                >
                  <div className="space-y-3">
                    <div
                      className={`w-10 h-10 rounded-xl border flex items-center justify-center group-hover:scale-110 transition-transform ${item.iconBg}`}
                    >
                      <IconComponent className="h-5 w-5" />
                    </div>
                    <h3 className="text-sm font-bold text-slate-800 tracking-tight">
                      {item.title}
                    </h3>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      {item.description}
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
