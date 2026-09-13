"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  GraduationCap,
  ChevronDown,
  Menu,
  X,
  LogIn,
  UserPlus,
  LogOut,
  User,
  LayoutDashboard,
  Users,
  BookOpen,
  Grid,
  Award,
  HelpCircle,
  ShieldCheck,
} from "lucide-react";
import { GlassButton } from "@/components/glass/glass-button";
import { UserSession } from "@/types/auth";
import { getMainDomain, getLiveDomain } from "@/lib/app-url";

export interface FloatingNavbarProps {
  variant?: "default" | "student" | "teacher";
}

export function FloatingNavbar({ variant }: FloatingNavbarProps = {}) {
  const pathname = usePathname();
  const router = useRouter();

  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [exploreDropdownOpen, setExploreDropdownOpen] = useState(false);
  const [moreDropdownOpen, setMoreDropdownOpen] = useState(false);
  const [userSession, setUserSession] = useState<UserSession | null>(null);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const moreDropdownRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

  const checkAuthStatus = async () => {
    try {
      const res = await fetch("/api/auth/me");
      if (res.ok) {
        const json = await res.json();
        if (json.data?.user) {
          setUserSession(json.data.user);
          return;
        }
      }
      setUserSession(null);
    } catch {
      setUserSession(null);
    }
  };

  useEffect(() => {
    checkAuthStatus();
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close dropdowns & mobile menu when clicking outside or pressing Escape
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (dropdownRef.current && !dropdownRef.current.contains(target)) {
        setExploreDropdownOpen(false);
      }
      if (moreDropdownRef.current && !moreDropdownRef.current.contains(target)) {
        setMoreDropdownOpen(false);
      }
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(target)) {
        setMobileOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setExploreDropdownOpen(false);
        setMoreDropdownOpen(false);
        setMobileOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const handleLogout = async () => {
    const wasTeacher = userSession?.role === "TEACHER";
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      setUserSession(null);
      setMobileOpen(false);
      if (wasTeacher) {
        window.location.href = "/teacher/logout";
      }
    } catch {
      setUserSession(null);
      if (wasTeacher) {
        window.location.href = "/teacher/logout";
      }
    }
  };

  const handleHowItWorksClick = (e: React.MouseEvent) => {
    setMobileOpen(false);
    if (pathname === "/") {
      e.preventDefault();
      const el = document.getElementById("how-it-works");
      if (el) {
        el.scrollIntoView({ behavior: "smooth" });
      }
    } else {
      router.push("/#how-it-works");
    }
  };

  const isLearner =
    variant === "student" ||
    pathname === "/student" ||
    pathname?.startsWith("/student/") ||
    (typeof window !== "undefined" &&
      (window.location.hostname.startsWith("learners.") ||
        window.location.hostname.startsWith("learner.") ||
        window.location.hostname.startsWith("students.") ||
        window.location.hostname.startsWith("student.")));

  const isEducator =
    variant === "teacher" ||
    pathname === "/teacher" ||
    pathname?.startsWith("/teacher/") ||
    (typeof window !== "undefined" &&
      (window.location.hostname.startsWith("educators.") ||
        window.location.hostname.startsWith("educator.") ||
        window.location.hostname.startsWith("teachers.") ||
        window.location.hostname.startsWith("teacher.")));

  const getDashboardPath = (session: UserSession) => {
    if (session.role === "TEACHER" || isEducator) return "/teacher/dashboard";
    if (session.role === "ADMIN") return "/admin/dashboard";
    return "/student/dashboard";
  };

  const getDashboardLabel = (session: UserSession) => {
    if (session.role === "TEACHER" || isEducator) return "Educator Portal";
    if (session.role === "ADMIN") return "Admin Dashboard";
    return "Learner Portal";
  };

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? "bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs py-2.5 sm:py-3"
            : "bg-white/80 backdrop-blur-xs border-b border-slate-200/50 py-3 sm:py-3.5"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-3 sm:gap-4">
          {/* ========================================================================= */}
          {/* 1. LEFT: LOGO & ROLE CONTEXT BADGE */}
          {/* ========================================================================= */}
          <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
            <Link
              href={getMainDomain() + "/"}
              className="flex items-center gap-2.5 group shrink-0"
              onClick={() => setMobileOpen(false)}
            >
              <div
                className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shadow-xs transition-transform group-hover:scale-105 shrink-0 ${
                  isLearner
                    ? "bg-[#3157D5] text-white"
                    : isEducator
                    ? "bg-[#16805B] text-white"
                    : "bg-[#0F5C5A] text-[#F2C14E]"
                }`}
              >
                <GraduationCap className="h-5 w-5 sm:h-5.5 sm:w-5.5" />
              </div>
              <div className="flex flex-col">
                <span className="text-base sm:text-lg font-black text-slate-900 tracking-tight leading-none">
                  EDU
                  <span
                    className={
                      isLearner
                        ? "text-[#3157D5]"
                        : isEducator
                        ? "text-[#16805B]"
                        : "text-[#0F5C5A]"
                    }
                  >
                    CONNECTS
                  </span>
                </span>
                <span className="text-[10px] font-semibold text-slate-500 tracking-wide mt-0.5">
                  {isLearner
                    ? "Learner Portal"
                    : isEducator
                    ? "Educator Network"
                    : "Learn • Grow • Belong"}
                </span>
              </div>
            </Link>

            {/* Clean Context Role Badge */}
            {isLearner && (
              <span className="hidden sm:inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#F3F6FF] text-[#3157D5] border border-[#BFDBFE] shadow-2xs whitespace-nowrap">
                Learner
              </span>
            )}
            {isEducator && (
              <span className="hidden sm:inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#F0FAF5] text-[#16805B] border border-[#A7F3D0] shadow-2xs whitespace-nowrap">
                Educator
              </span>
            )}
          </div>

          {/* ========================================================================= */}
          {/* 2. CENTER: PRIMARY NAVIGATION (ZERO 2-LINE WRAPS) */}
          {/* ========================================================================= */}
          <nav className="hidden lg:flex items-center gap-1 xl:gap-2 text-sm font-semibold text-slate-700">
            {isEducator ? (
              /* EDUCATOR NAVIGATION */
              <>
                <a
                  href="#courses"
                  className="px-3 py-1.5 rounded-lg hover:text-[#16805B] hover:bg-[#F0FAF5] transition-colors whitespace-nowrap"
                >
                  Teaching Toolkit
                </a>
                <a
                  href="#earnings"
                  className="px-3 py-1.5 rounded-lg hover:text-[#16805B] hover:bg-[#F0FAF5] transition-colors whitespace-nowrap"
                >
                  Earnings Calculator
                </a>
                <a
                  href="#how-it-works"
                  onClick={handleHowItWorksClick}
                  className="px-3 py-1.5 rounded-lg hover:text-[#16805B] hover:bg-[#F0FAF5] transition-colors whitespace-nowrap"
                >
                  How It Works
                </a>
                <a
                  href={getLiveDomain()}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:text-[#16805B] hover:bg-[#F0FAF5] transition-colors whitespace-nowrap group"
                >
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
                  </span>
                  <span className="font-bold text-red-600 group-hover:text-red-700">Live</span>
                </a>

                {/* More Dropdown for Educator */}
                <div className="relative" ref={moreDropdownRef}>
                  <button
                    onClick={() => setMoreDropdownOpen(!moreDropdownOpen)}
                    onMouseEnter={() => setMoreDropdownOpen(true)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg hover:text-[#16805B] hover:bg-[#F0FAF5] transition-colors whitespace-nowrap focus:outline-none"
                    aria-expanded={moreDropdownOpen}
                  >
                    <span>More</span>
                    <ChevronDown
                      className={`h-3.5 w-3.5 text-slate-500 transition-transform duration-200 ${
                        moreDropdownOpen ? "rotate-180 text-[#16805B]" : ""
                      }`}
                    />
                  </button>

                  <AnimatePresence>
                    {moreDropdownOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 6, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 6, scale: 0.98 }}
                        transition={{ duration: 0.15 }}
                        onMouseLeave={() => setMoreDropdownOpen(false)}
                        className="absolute top-full left-0 mt-1 w-60 bg-white rounded-2xl border border-slate-200 shadow-xl p-2 space-y-1 z-50"
                      >
                        <a
                          href="#benefits"
                          onClick={() => setMoreDropdownOpen(false)}
                          className="flex items-start gap-2.5 p-2 rounded-xl hover:bg-[#F0FAF5] transition-colors group"
                        >
                          <div className="p-1.5 rounded-lg bg-[#F0FAF5] text-[#16805B] group-hover:bg-[#16805B] group-hover:text-white transition-colors shrink-0">
                            <Award className="h-4 w-4" />
                          </div>
                          <div>
                            <div className="text-xs font-bold text-slate-900 group-hover:text-[#16805B] transition-colors">
                              Advantages & Benefits
                            </div>
                            <div className="text-[11px] text-slate-500 font-normal">
                              Why top educators teach with us
                            </div>
                          </div>
                        </a>

                        <a
                          href="#faq"
                          onClick={() => setMoreDropdownOpen(false)}
                          className="flex items-start gap-2.5 p-2 rounded-xl hover:bg-[#F0FAF5] transition-colors group"
                        >
                          <div className="p-1.5 rounded-lg bg-slate-100 text-slate-700 group-hover:bg-[#16805B] group-hover:text-white transition-colors shrink-0">
                            <HelpCircle className="h-4 w-4" />
                          </div>
                          <div>
                            <div className="text-xs font-bold text-slate-900 group-hover:text-[#16805B] transition-colors">
                              Frequently Asked Questions
                            </div>
                            <div className="text-[11px] text-slate-500 font-normal">
                              Verification, payouts, and classes
                            </div>
                          </div>
                        </a>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </>
            ) : isLearner ? (
              /* LEARNER NAVIGATION */
              <>
                <a
                  href="#courses"
                  className="px-3 py-1.5 rounded-lg hover:text-[#2563EB] hover:bg-blue-50/70 transition-colors whitespace-nowrap"
                >
                  Courses
                </a>
                <Link
                  href="/find-teachers"
                  className="px-3 py-1.5 rounded-lg hover:text-[#2563EB] hover:bg-blue-50/70 transition-colors whitespace-nowrap"
                >
                  Find Teachers
                </Link>
                <a
                  href="#live-classes"
                  className="px-3 py-1.5 rounded-lg hover:text-[#2563EB] hover:bg-blue-50/70 transition-colors whitespace-nowrap"
                >
                  Live Classes
                </a>
                <a
                  href="#how-it-works"
                  onClick={handleHowItWorksClick}
                  className="px-3 py-1.5 rounded-lg hover:text-[#2563EB] hover:bg-blue-50/70 transition-colors whitespace-nowrap"
                >
                  How It Works
                </a>
                <a
                  href={getLiveDomain()}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:text-[#2563EB] hover:bg-blue-50/70 transition-colors whitespace-nowrap group"
                >
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
                  </span>
                  <span className="font-bold text-red-600 group-hover:text-red-700">Live</span>
                </a>

                {/* More Dropdown for Learner */}
                <div className="relative" ref={moreDropdownRef}>
                  <button
                    onClick={() => setMoreDropdownOpen(!moreDropdownOpen)}
                    onMouseEnter={() => setMoreDropdownOpen(true)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg hover:text-[#2563EB] hover:bg-blue-50/70 transition-colors whitespace-nowrap focus:outline-none"
                    aria-expanded={moreDropdownOpen}
                  >
                    <span>More</span>
                    <ChevronDown
                      className={`h-3.5 w-3.5 text-slate-500 transition-transform duration-200 ${
                        moreDropdownOpen ? "rotate-180 text-[#2563EB]" : ""
                      }`}
                    />
                  </button>

                  <AnimatePresence>
                    {moreDropdownOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 6, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 6, scale: 0.98 }}
                        transition={{ duration: 0.15 }}
                        onMouseLeave={() => setMoreDropdownOpen(false)}
                        className="absolute top-full left-0 mt-1 w-60 bg-white rounded-2xl border border-slate-200 shadow-xl p-2 space-y-1 z-50"
                      >
                        <a
                          href="#benefits"
                          onClick={() => setMoreDropdownOpen(false)}
                          className="flex items-start gap-2.5 p-2 rounded-xl hover:bg-blue-50/70 transition-colors group"
                        >
                          <div className="p-1.5 rounded-lg bg-blue-100 text-blue-700 shrink-0">
                            <ShieldCheck className="h-4 w-4" />
                          </div>
                          <div>
                            <div className="text-xs font-bold text-slate-900 group-hover:text-[#2563EB]">
                              Why EduConnects
                            </div>
                            <div className="text-[11px] text-slate-500 font-normal">
                              Verified tutors & student protection
                            </div>
                          </div>
                        </a>

                        <a
                          href="#faq"
                          onClick={() => setMoreDropdownOpen(false)}
                          className="flex items-start gap-2.5 p-2 rounded-xl hover:bg-blue-50/70 transition-colors group"
                        >
                          <div className="p-1.5 rounded-lg bg-slate-100 text-slate-700 shrink-0">
                            <HelpCircle className="h-4 w-4" />
                          </div>
                          <div>
                            <div className="text-xs font-bold text-slate-900 group-hover:text-[#2563EB]">
                              Frequently Asked Questions
                            </div>
                            <div className="text-[11px] text-slate-500 font-normal">
                              Demo sessions, refunds, and tools
                            </div>
                          </div>
                        </a>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </>
            ) : (
              /* MAIN PLATFORM NAVIGATION */
              <>
                {/* Explore Dropdown */}
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setExploreDropdownOpen(!exploreDropdownOpen)}
                    onMouseEnter={() => setExploreDropdownOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:text-[#0F5C5A] hover:bg-slate-100/70 transition-colors whitespace-nowrap focus:outline-none"
                    aria-expanded={exploreDropdownOpen}
                  >
                    <span>Explore</span>
                    <ChevronDown
                      className={`h-3.5 w-3.5 text-slate-500 transition-transform duration-200 ${
                        exploreDropdownOpen ? "rotate-180 text-[#0F5C5A]" : ""
                      }`}
                    />
                  </button>

                  <AnimatePresence>
                    {exploreDropdownOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 6, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 6, scale: 0.98 }}
                        transition={{ duration: 0.15 }}
                        onMouseLeave={() => setExploreDropdownOpen(false)}
                        className="absolute top-full left-0 mt-1 w-72 bg-white rounded-2xl border border-slate-200 shadow-xl p-2.5 space-y-1 z-50"
                      >
                        <Link
                          href="/find-teachers"
                          onClick={() => setExploreDropdownOpen(false)}
                          className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-slate-50 transition-colors group"
                        >
                          <div className="p-2 rounded-lg bg-teal-50 text-[#0F5C5A] group-hover:bg-[#0F5C5A] group-hover:text-white transition-colors shrink-0">
                            <Users className="h-4 w-4" />
                          </div>
                          <div>
                            <div className="text-xs font-bold text-slate-900 group-hover:text-[#0F5C5A] transition-colors">
                              Find an Educator
                            </div>
                            <div className="text-[11px] text-slate-500 font-normal mt-0.5">
                              Search certified tutors by subject and mode.
                            </div>
                          </div>
                        </Link>

                        <Link
                          href="/courses"
                          onClick={() => setExploreDropdownOpen(false)}
                          className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-slate-50 transition-colors group"
                        >
                          <div className="p-2 rounded-lg bg-amber-50 text-[#B8860B] group-hover:bg-[#F2C14E] group-hover:text-slate-900 transition-colors shrink-0">
                            <BookOpen className="h-4 w-4" />
                          </div>
                          <div>
                            <div className="text-xs font-bold text-slate-900 group-hover:text-[#0F5C5A] transition-colors">
                              Explore Courses
                            </div>
                            <div className="text-[11px] text-slate-500 font-normal mt-0.5">
                              Browse structured video courses.
                            </div>
                          </div>
                        </Link>

                        <Link
                          href="/courses"
                          onClick={() => setExploreDropdownOpen(false)}
                          className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-slate-50 transition-colors group"
                        >
                          <div className="p-2 rounded-lg bg-slate-100 text-slate-600 group-hover:bg-[#0F5C5A] group-hover:text-white transition-colors shrink-0">
                            <Grid className="h-4 w-4" />
                          </div>
                          <div>
                            <div className="text-xs font-bold text-slate-900 group-hover:text-[#0F5C5A] transition-colors">
                              Browse Subjects
                            </div>
                            <div className="text-[11px] text-slate-500 font-normal mt-0.5">
                              Academic, test-prep, and technical subjects.
                            </div>
                          </div>
                        </Link>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <Link
                  href="/student"
                  className="px-3 py-1.5 rounded-lg hover:text-[#0F5C5A] hover:bg-slate-100/70 transition-colors whitespace-nowrap"
                >
                  For Learners
                </Link>
                <Link
                  href="/teacher"
                  className="px-3 py-1.5 rounded-lg hover:text-[#0F5C5A] hover:bg-slate-100/70 transition-colors whitespace-nowrap"
                >
                  For Educators
                </Link>
                <a
                  href="#how-it-works"
                  onClick={handleHowItWorksClick}
                  className="px-3 py-1.5 rounded-lg hover:text-[#0F5C5A] hover:bg-slate-100/70 transition-colors whitespace-nowrap"
                >
                  How It Works
                </a>
                <a
                  href={getLiveDomain()}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:text-[#0F5C5A] hover:bg-slate-100/70 transition-colors whitespace-nowrap group"
                >
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
                  </span>
                  <span className="font-bold text-red-600 group-hover:text-red-700">Live</span>
                </a>
              </>
            )}
          </nav>

          {/* ========================================================================= */}
          {/* 3. RIGHT: CONTEXT SWITCHER, LOGIN & PRIMARY CTA */}
          {/* ========================================================================= */}
          <div className="hidden lg:flex items-center gap-2.5 xl:gap-3 shrink-0">
            {/* Subtle Role Switcher Pill */}
            {isEducator ? (
              <Link
                href="/student"
                className="hidden xl:inline-flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-[#16805B] px-3 py-1.5 rounded-xl border border-slate-200 hover:border-[#A7F3D0] bg-slate-50/80 hover:bg-[#F0FAF5] transition-all whitespace-nowrap shadow-2xs"
              >
                Learner Portal →
              </Link>
            ) : isLearner ? (
              <Link
                href="/teacher"
                className="hidden xl:inline-flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-[#3157D5] px-3 py-1.5 rounded-xl border border-slate-200 hover:border-[#BFDBFE] bg-slate-50/80 hover:bg-[#F3F6FF] transition-all whitespace-nowrap shadow-2xs"
              >
                Teach on EduConnects →
              </Link>
            ) : null}

            {(isEducator || isLearner) && (
              <div className="hidden xl:block h-4 w-px bg-slate-200" />
            )}

            {!userSession ? (
              <>
                <Link
                  href={
                    isEducator
                      ? "/teacher/login"
                      : isLearner
                      ? "/student/login"
                      : "/login"
                  }
                  className="text-sm font-semibold text-slate-700 hover:text-slate-950 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors whitespace-nowrap"
                >
                  Login
                </Link>
                <Link
                  href={
                    isEducator
                      ? "/teacher/register"
                      : isLearner
                      ? "/student/register"
                      : "/register"
                  }
                >
                  <button
                    className={`h-9.5 px-4 sm:px-5 rounded-xl text-sm font-bold shadow-xs hover:shadow-md transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                      isLearner
                        ? "bg-[#3157D5] hover:bg-[#243B9B] text-white shadow-blue-500/25"
                        : isEducator
                        ? "bg-[#16805B] hover:bg-[#0D5C41] text-white shadow-emerald-700/25"
                        : "bg-[#0F5C5A] hover:bg-[#083F3D] text-white shadow-teal-900/20"
                    }`}
                  >
                    <UserPlus className="h-4 w-4" />
                    <span>
                      {isEducator
                        ? "Start Teaching"
                        : isLearner
                        ? "Start Learning"
                        : "Get Started"}
                    </span>
                  </button>
                </Link>
              </>
            ) : (
              <>
                <Link href={getDashboardPath(userSession)}>
                  <button
                    className={`h-9.5 px-4 rounded-xl text-sm font-bold text-white shadow-xs transition-all flex items-center gap-1.5 ${
                      isLearner
                        ? "bg-[#3157D5] hover:bg-[#243B9B]"
                        : isEducator
                        ? "bg-[#16805B] hover:bg-[#0D5C41]"
                        : "bg-[#0F5C5A] hover:bg-[#083F3D]"
                    }`}
                  >
                    <LayoutDashboard className="h-4 w-4" />
                    <span>{getDashboardLabel(userSession)}</span>
                  </button>
                </Link>
                <Link
                  href="/profile"
                  className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                  aria-label="Profile"
                >
                  <User className="h-4 w-4" />
                </Link>
                <button
                  onClick={handleLogout}
                  className="p-2 rounded-xl text-slate-600 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                  aria-label="Logout"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </>
            )}
          </div>

          {/* Mobile Hamburger Menu Button */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="lg:hidden p-2 rounded-xl bg-[#F5F7F8] border border-[#DCE5E4] text-[#102A2A] hover:bg-[#DCE5E4] transition-colors"
            aria-label="Toggle mobile menu"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </header>

      {/* Mobile Menu Drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <div className="fixed inset-0 z-40 lg:hidden overflow-hidden" ref={mobileMenuRef}>
            {/* Backdrop overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-xs"
            />

            {/* Menu Drawer */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
              className="relative top-16 mx-3 sm:mx-6 bg-white rounded-3xl border border-[#DCE5E4] shadow-2xl p-6 space-y-5 max-h-[calc(100vh-5rem)] overflow-y-auto"
            >
              {/* Navigation Links */}
              <nav className="flex flex-col space-y-3 font-semibold text-[#102A2A] text-sm">
                {isEducator ? (
                  <>
                    <div className="text-xs font-black uppercase text-[#16805B] tracking-wider px-2 py-1.5 rounded-lg bg-[#F0FAF5] flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#16805B]" />
                      Educator Network
                    </div>
                    <a
                      href="#courses"
                      onClick={() => setMobileOpen(false)}
                      className="py-2 px-2 hover:bg-[#F0FAF5] hover:text-[#16805B] rounded-xl border-b border-[#DCE5E4]"
                    >
                      Teaching Toolkit
                    </a>
                    <a
                      href="#earnings"
                      onClick={() => setMobileOpen(false)}
                      className="py-2 px-2 hover:bg-[#F0FAF5] hover:text-[#16805B] rounded-xl border-b border-[#DCE5E4]"
                    >
                      Earnings Calculator
                    </a>
                    <a
                      href="#how-it-works"
                      onClick={handleHowItWorksClick}
                      className="py-2 px-2 hover:bg-[#F0FAF5] hover:text-[#16805B] rounded-xl border-b border-[#DCE5E4]"
                    >
                      How It Works
                    </a>
                    <a
                      href="#benefits"
                      onClick={() => setMobileOpen(false)}
                      className="py-2 px-2 hover:bg-[#F0FAF5] hover:text-[#16805B] rounded-xl border-b border-[#DCE5E4]"
                    >
                      Advantages
                    </a>
                    <a
                      href="#faq"
                      onClick={() => setMobileOpen(false)}
                      className="py-2 px-2 hover:bg-[#F0FAF5] hover:text-[#16805B] rounded-xl border-b border-[#DCE5E4]"
                    >
                      FAQ
                    </a>
                    <a
                      href={getLiveDomain()}
                      onClick={() => setMobileOpen(false)}
                      className="py-2 px-2 hover:bg-[#F0FAF5] rounded-xl border-b border-[#DCE5E4] flex items-center justify-between"
                    >
                      <span>Live Events</span>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-600">
                        <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
                        🔴 Live
                      </span>
                    </a>
                    <Link
                      href="/student"
                      onClick={() => setMobileOpen(false)}
                      className="py-2 px-2 hover:bg-[#F3F6FF] rounded-xl text-[#3157D5] font-bold"
                    >
                      Learner Portal →
                    </Link>
                  </>
                ) : isLearner ? (
                  <>
                    <div className="text-xs font-black uppercase text-[#3157D5] tracking-wider px-2 py-1.5 rounded-lg bg-[#F3F6FF] flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#3157D5]" />
                      Learner Experience
                    </div>
                    <div className="pb-2 border-b border-[#DCE5E4] space-y-2">
                      <div className="text-xs font-black uppercase text-[#5D7373] tracking-wider px-2">
                        Explore
                      </div>
                      <Link
                        href="/find-teachers"
                        onClick={() => setMobileOpen(false)}
                        className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-[#F3F6FF] text-[#102A2A] font-bold"
                      >
                        <Users className="h-4 w-4 text-[#3157D5]" />
                        Find an Educator
                      </Link>
                      <Link
                        href="/courses"
                        onClick={() => setMobileOpen(false)}
                        className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-[#F3F6FF] text-[#102A2A] font-bold"
                      >
                        <BookOpen className="h-4 w-4 text-[#3157D5]" />
                        Explore Courses
                      </Link>
                    </div>
                    <a
                      href="#live-classes"
                      onClick={() => setMobileOpen(false)}
                      className="py-2 px-2 hover:bg-[#F3F6FF] hover:text-[#3157D5] rounded-xl border-b border-[#DCE5E4]"
                    >
                      Live Classes
                    </a>
                    <a
                      href="#courses"
                      onClick={() => setMobileOpen(false)}
                      className="py-2 px-2 hover:bg-[#F3F6FF] hover:text-[#3157D5] rounded-xl border-b border-[#DCE5E4]"
                    >
                      Courses
                    </a>
                    <a
                      href="#how-it-works"
                      onClick={handleHowItWorksClick}
                      className="py-2 px-2 hover:bg-[#F3F6FF] hover:text-[#3157D5] rounded-xl border-b border-[#DCE5E4]"
                    >
                      How It Works
                    </a>
                    <a
                      href="#benefits"
                      onClick={() => setMobileOpen(false)}
                      className="py-2 px-2 hover:bg-[#F3F6FF] hover:text-[#3157D5] rounded-xl border-b border-[#DCE5E4]"
                    >
                      Why EduConnects
                    </a>
                    <a
                      href="#faq"
                      onClick={() => setMobileOpen(false)}
                      className="py-2 px-2 hover:bg-[#F3F6FF] hover:text-[#3157D5] rounded-xl border-b border-[#DCE5E4]"
                    >
                      FAQ
                    </a>
                    <a
                      href={getLiveDomain()}
                      onClick={() => setMobileOpen(false)}
                      className="py-2 px-2 hover:bg-[#F3F6FF] rounded-xl border-b border-[#DCE5E4] flex items-center justify-between"
                    >
                      <span>Live Events</span>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-600">
                        <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
                        🔴 Live
                      </span>
                    </a>
                    <Link
                      href="/teacher"
                      onClick={() => setMobileOpen(false)}
                      className="py-2 px-2 hover:bg-[#F0FAF5] rounded-xl text-[#16805B] font-bold"
                    >
                      Teach on EduConnects →
                    </Link>
                  </>
                ) : (
                  <>
                    <div className="pb-2 border-b border-[#DCE5E4] space-y-2">
                      <div className="text-xs font-black uppercase text-[#5D7373] tracking-wider px-2">
                        Explore
                      </div>
                      <Link
                        href="/find-teachers"
                        onClick={() => setMobileOpen(false)}
                        className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-[#F5F7F8] text-[#102A2A] font-bold"
                      >
                        <Users className="h-4 w-4 text-[#0F5C5A]" />
                        Find an Educator
                      </Link>
                      <Link
                        href="/courses"
                        onClick={() => setMobileOpen(false)}
                        className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-[#F5F7F8] text-[#102A2A] font-bold"
                      >
                        <BookOpen className="h-4 w-4 text-[#B8860B]" />
                        Explore Courses
                      </Link>
                      <Link
                        href="/courses"
                        onClick={() => setMobileOpen(false)}
                        className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-[#F5F7F8] text-[#102A2A] font-bold"
                      >
                        <Grid className="h-4 w-4 text-[#5D7373]" />
                        Browse Subjects
                      </Link>
                    </div>

                    <Link
                      href="/student"
                      onClick={() => setMobileOpen(false)}
                      className="py-2 px-2 hover:bg-[#F5F7F8] rounded-xl border-b border-[#DCE5E4]"
                    >
                      For Learners
                    </Link>
                    <Link
                      href="/teacher"
                      onClick={() => setMobileOpen(false)}
                      className="py-2 px-2 hover:bg-[#F5F7F8] rounded-xl border-b border-[#DCE5E4]"
                    >
                      For Educators
                    </Link>
                    <a
                      href="#how-it-works"
                      onClick={handleHowItWorksClick}
                      className="py-2 px-2 hover:bg-[#F5F7F8] rounded-xl border-b border-[#DCE5E4]"
                    >
                      How It Works
                    </a>
                    <a
                      href={getLiveDomain()}
                      onClick={() => setMobileOpen(false)}
                      className="py-2 px-2 hover:bg-[#F5F7F8] rounded-xl border-b border-[#DCE5E4] flex items-center justify-between"
                    >
                      <span>Live Events</span>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-600">
                        <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
                        🔴 Live
                      </span>
                    </a>
                  </>
                )}
              </nav>

              {/* Mobile Auth CTAs */}
              <div className="pt-2 border-t border-[#DCE5E4] flex flex-col gap-2.5">
                {!userSession ? (
                  <>
                    <Link
                      href={
                        isEducator
                          ? "/teacher/login"
                          : isLearner
                          ? "/student/login"
                          : "/login"
                      }
                      onClick={() => setMobileOpen(false)}
                    >
                      <GlassButton variant="secondary" className="w-full justify-center text-sm font-bold">
                        Login
                      </GlassButton>
                    </Link>
                    <Link
                      href={
                        isEducator
                          ? "/teacher/register"
                          : isLearner
                          ? "/student/register"
                          : "/register"
                      }
                      onClick={() => setMobileOpen(false)}
                    >
                      <GlassButton
                        variant={
                          isLearner ? "learner" : isEducator ? "educator" : "primary"
                        }
                        className="w-full justify-center text-white text-sm font-bold"
                      >
                        {isEducator
                          ? "Start Teaching"
                          : isLearner
                          ? "Start Learning"
                          : "Get Started"}
                      </GlassButton>
                    </Link>
                  </>
                ) : (
                  <>
                    <Link href={getDashboardPath(userSession)} onClick={() => setMobileOpen(false)}>
                      <GlassButton
                        variant={
                          isLearner ? "learner" : isEducator ? "educator" : "primary"
                        }
                        className="w-full justify-center text-white text-sm"
                      >
                        {getDashboardLabel(userSession)}
                      </GlassButton>
                    </Link>
                    <Link href="/profile" onClick={() => setMobileOpen(false)}>
                      <GlassButton variant="secondary" className="w-full justify-center text-sm">
                        Profile
                      </GlassButton>
                    </Link>
                    <GlassButton
                      variant="ghost"
                      className="w-full justify-center text-sm text-[#5D7373]"
                      onClick={handleLogout}
                    >
                      Logout
                    </GlassButton>
                  </>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
