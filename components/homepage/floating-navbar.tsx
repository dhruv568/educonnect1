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
  ArrowRight,
  Settings,
  FileCheck,
  Video,
  Sparkles,
} from "lucide-react";
import { GlassButton } from "@/components/glass/glass-button";
import { UserSession } from "@/types/auth";
import { getMainDomain, getLiveDomain, getStudentDomain, getEducatorDomain } from "@/lib/app-url";
import { NotificationPopover } from "@/components/layout/notification-popover";

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
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [userSession, setUserSession] = useState<UserSession | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const moreDropdownRef = useRef<HTMLDivElement>(null);
  const profileDropdownRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

  // Authenticate strictly with server-truth (no-cache headers)
  const checkAuthStatus = async () => {
    try {
      const res = await fetch("/api/auth/me", {
        cache: "no-store",
        headers: { Pragma: "no-cache" },
      });
      if (res.ok) {
        const json = await res.json();
        if (json.data?.user) {
          setUserSession(json.data.user);
          setAuthLoading(false);
          return;
        }
      }
      setUserSession(null);
    } catch {
      setUserSession(null);
    } finally {
      setAuthLoading(false);
    }
  };

  useEffect(() => {
    checkAuthStatus();

    const handleScroll = () => {
      setScrolled(window.scrollY > 15);
    };
    window.addEventListener("scroll", handleScroll);

    // Synchronize authentication changes across tabs and components
    const onAuthChanged = () => {
      checkAuthStatus();
    };
    const onFocus = () => {
      checkAuthStatus();
    };

    window.addEventListener("educonnect_auth_changed", onAuthChanged);
    window.addEventListener("focus", onFocus);
    window.addEventListener("pageshow", onAuthChanged);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("educonnect_auth_changed", onAuthChanged);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("pageshow", onAuthChanged);
    };
  }, []);

  // Close dropdowns when clicking outside or pressing Escape
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (dropdownRef.current && !dropdownRef.current.contains(target)) {
        setExploreDropdownOpen(false);
      }
      if (moreDropdownRef.current && !moreDropdownRef.current.contains(target)) {
        setMoreDropdownOpen(false);
      }
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(target)) {
        setProfileDropdownOpen(false);
      }
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(target)) {
        setMobileOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setExploreDropdownOpen(false);
        setMoreDropdownOpen(false);
        setProfileDropdownOpen(false);
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

  // Logout invalidation with real server call & hard navigation
  const handleLogout = async () => {
    const role = userSession?.role;
    setUserSession(null);
    setProfileDropdownOpen(false);
    setMobileOpen(false);

    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        cache: "no-store",
        headers: { Pragma: "no-cache" },
      });
    } catch {}

    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("educonnect_auth_changed"));
    }

    // Role-specific hard redirect to flush router cache & memory
    if (role === "TEACHER") {
      window.location.replace("/teacher/logout");
    } else {
      window.location.replace("/");
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

  // Role-derived Portal Destinations & Labels (Strictly derived from server auth truth)
  const getDashboardPath = (session: UserSession) => {
    if (session.role === "TEACHER") return "/teacher/dashboard";
    if (session.role === "ADMIN") return "/admin";
    if (session.role === "STAFF") return "/staff/dashboard";
    return "/student/dashboard";
  };

  const getDashboardLabel = (session: UserSession) => {
    if (session.role === "TEACHER") return "Educator Portal";
    if (session.role === "ADMIN") return "Admin Governance";
    if (session.role === "STAFF") return "Staff Dashboard";
    return "Learner Portal";
  };

  const getUserInitials = (session: UserSession) => {
    if (session.firstName || session.lastName) {
      return `${session.firstName?.[0] || ""}${session.lastName?.[0] || ""}`.toUpperCase();
    }
    if (session.name) {
      const parts = session.name.trim().split(" ");
      if (parts.length >= 2) {
        return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
      }
      return session.name.slice(0, 2).toUpperCase();
    }
    return (session.email?.[0] || "U").toUpperCase();
  };

  const getUserDisplayName = (session: UserSession) => {
    if (session.name && session.name !== "User") return session.name;
    if (session.firstName) return `${session.firstName} ${session.lastName || ""}`.trim();
    if (session.email) return session.email.split("@")[0];
    return "My Account";
  };

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? "bg-white/95 backdrop-blur-md border-b border-slate-200/90 shadow-sm py-2 sm:py-2.5"
            : "bg-white/90 backdrop-blur-xs border-b border-slate-200/60 py-2.5 sm:py-3.5"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-3 sm:gap-4">
          {/* ========================================================================= */}
          {/* 1. BRAND LOGO & CONTEXT BADGE */}
          {/* ========================================================================= */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <Link
              href={isLearner ? "/student" : isEducator ? "/teacher" : getMainDomain() + "/"}
              className="flex items-center gap-2.5 group shrink-0"
              onClick={() => setMobileOpen(false)}
            >
              <div
                className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shadow-xs transition-transform group-hover:scale-105 shrink-0 ${
                  isLearner
                    ? "bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-blue-500/20"
                    : isEducator
                    ? "bg-gradient-to-br from-[#16805B] to-[#0D5C41] text-white shadow-emerald-600/20"
                    : "bg-gradient-to-br from-[#0B4F4B] to-[#073F3C] text-[#F2C14E] shadow-teal-900/20"
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
                        ? "text-blue-600"
                        : isEducator
                        ? "text-[#16805B]"
                        : "text-[#0B4F4B]"
                    }
                  >
                    CONNECTS
                  </span>
                </span>
                <span className="text-[10px] font-semibold text-slate-500 tracking-wide mt-0.5 hidden sm:block">
                  {isLearner
                    ? "Learner Gateway"
                    : isEducator
                    ? "Educator Network"
                    : "Learn • Grow • Belong"}
                </span>
              </div>
            </Link>

            {/* Context Tag */}
            {isLearner && (
              <span className="hidden md:inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200">
                Learner
              </span>
            )}
            {isEducator && (
              <span className="hidden md:inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                Educator
              </span>
            )}
          </div>

          {/* ========================================================================= */}
          {/* 2. CENTER PRIMARY NAVIGATION */}
          {/* ========================================================================= */}
          <nav className="hidden lg:flex items-center gap-1 xl:gap-2 text-sm font-semibold text-slate-700">
            {isEducator ? (
              /* EDUCATOR SPECIFIC NAVIGATION */
              <>
                <Link
                  href="/teacher#courses"
                  className="px-3 py-1.5 rounded-lg hover:text-[#16805B] hover:bg-emerald-50/70 transition-colors whitespace-nowrap"
                >
                  Teaching Toolkit
                </Link>
                <Link
                  href="/teacher#earnings"
                  className="px-3 py-1.5 rounded-lg hover:text-[#16805B] hover:bg-emerald-50/70 transition-colors whitespace-nowrap"
                >
                  Earnings Calculator
                </Link>
                <a
                  href="/teacher#how-it-works"
                  onClick={handleHowItWorksClick}
                  className="px-3 py-1.5 rounded-lg hover:text-[#16805B] hover:bg-emerald-50/70 transition-colors whitespace-nowrap"
                >
                  How It Works
                </a>
                <a
                  href={getLiveDomain()}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:text-[#16805B] hover:bg-emerald-50/70 transition-colors whitespace-nowrap group"
                >
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
                  </span>
                  <span className="font-bold text-red-600 group-hover:text-red-700">Live</span>
                </a>
              </>
            ) : isLearner ? (
              /* LEARNER SPECIFIC NAVIGATION */
              <>
                <Link
                  href="/find-teachers"
                  className="px-3 py-1.5 rounded-lg hover:text-blue-600 hover:bg-blue-50/70 transition-colors whitespace-nowrap"
                >
                  Find Educators
                </Link>
                <Link
                  href="/courses"
                  className="px-3 py-1.5 rounded-lg hover:text-blue-600 hover:bg-blue-50/70 transition-colors whitespace-nowrap"
                >
                  Explore Courses
                </Link>
                <Link
                  href="/student#benefits"
                  className="px-3 py-1.5 rounded-lg hover:text-blue-600 hover:bg-blue-50/70 transition-colors whitespace-nowrap"
                >
                  Why EduConnects
                </Link>
                <a
                  href={getLiveDomain()}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:text-blue-600 hover:bg-blue-50/70 transition-colors whitespace-nowrap group"
                >
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
                  </span>
                  <span className="font-bold text-red-600 group-hover:text-red-700">Live</span>
                </a>
              </>
            ) : (
              /* MAIN PLATFORM NAVIGATION */
              <>
                {/* Explore Dropdown */}
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setExploreDropdownOpen(!exploreDropdownOpen)}
                    onMouseEnter={() => setExploreDropdownOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:text-[#0B4F4B] hover:bg-slate-100/70 transition-colors whitespace-nowrap focus:outline-none"
                    aria-expanded={exploreDropdownOpen}
                  >
                    <span>Explore</span>
                    <ChevronDown
                      className={`h-3.5 w-3.5 text-slate-500 transition-transform duration-200 ${
                        exploreDropdownOpen ? "rotate-180 text-[#0B4F4B]" : ""
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
                          <div className="p-2 rounded-lg bg-teal-50 text-[#0B4F4B] group-hover:bg-[#0B4F4B] group-hover:text-white transition-colors shrink-0">
                            <Users className="h-4 w-4" />
                          </div>
                          <div>
                            <div className="text-xs font-bold text-slate-900 group-hover:text-[#0B4F4B] transition-colors">
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
                            <div className="text-xs font-bold text-slate-900 group-hover:text-[#0B4F4B] transition-colors">
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
                          <div className="p-2 rounded-lg bg-slate-100 text-slate-600 group-hover:bg-[#0B4F4B] group-hover:text-white transition-colors shrink-0">
                            <Grid className="h-4 w-4" />
                          </div>
                          <div>
                            <div className="text-xs font-bold text-slate-900 group-hover:text-[#0B4F4B] transition-colors">
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
                  className="px-3 py-1.5 rounded-lg hover:text-[#0B4F4B] hover:bg-slate-100/70 transition-colors whitespace-nowrap"
                >
                  For Learners
                </Link>
                <Link
                  href="/teacher"
                  className="px-3 py-1.5 rounded-lg hover:text-[#0B4F4B] hover:bg-slate-100/70 transition-colors whitespace-nowrap text-[#1B6863] font-bold"
                >
                  For Educators
                </Link>
                <a
                  href="#how-it-works"
                  onClick={handleHowItWorksClick}
                  className="px-3 py-1.5 rounded-lg hover:text-[#0B4F4B] hover:bg-slate-100/70 transition-colors whitespace-nowrap"
                >
                  How It Works
                </a>
                <a
                  href={getLiveDomain()}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:text-[#0B4F4B] hover:bg-slate-100/70 transition-colors whitespace-nowrap group"
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
          {/* 3. RIGHT: ROLE-AWARE ACTION CLUSTER */}
          {/* ========================================================================= */}
          <div className="hidden lg:flex items-center gap-3 shrink-0">
            {/* Context Switcher Link */}
            {isEducator ? (
              <Link
                href="/student"
                className="hidden xl:inline-flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-emerald-700 px-3 py-1.5 rounded-xl border border-slate-200 hover:border-emerald-200 bg-slate-50/80 hover:bg-emerald-50/50 transition-all whitespace-nowrap shadow-2xs"
              >
                Learner Portal →
              </Link>
            ) : isLearner ? (
              <Link
                href="/teacher"
                className="hidden xl:inline-flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-blue-700 px-3 py-1.5 rounded-xl border border-slate-200 hover:border-blue-200 bg-slate-50/80 hover:bg-blue-50/50 transition-all whitespace-nowrap shadow-2xs"
              >
                Teach on EduConnects →
              </Link>
            ) : null}

            {/* Separator if switcher shown */}
            {(isEducator || isLearner) && (
              <div className="hidden xl:block h-4 w-px bg-slate-200" />
            )}

            {/* STATE 1: Unauthenticated Visitor */}
            {!userSession ? (
              <div className="flex items-center gap-2 sm:gap-3">
                <Link
                  href={
                    isEducator
                      ? "/teacher/login"
                      : isLearner
                      ? "/student/login"
                      : "/login"
                  }
                  className="text-xs sm:text-sm font-bold text-slate-700 hover:text-slate-950 px-3.5 py-2 rounded-xl hover:bg-slate-100 transition-colors whitespace-nowrap"
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
                    className={`h-9 px-4 sm:px-5 rounded-xl text-xs sm:text-sm font-bold text-white shadow-xs hover:shadow-md transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer active:scale-95 ${
                      isLearner
                        ? "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-blue-500/20"
                        : isEducator
                        ? "bg-gradient-to-r from-[#16805B] to-[#0D5C41] hover:from-[#12684A] hover:to-[#0A4732] shadow-emerald-700/20"
                        : "bg-gradient-to-r from-[#0B4F4B] to-[#073F3C] hover:from-[#083F3D] hover:to-[#042423] shadow-teal-900/20"
                    }`}
                  >
                    <span>
                      {isEducator
                        ? "Start Teaching"
                        : isLearner
                        ? "Start Learning"
                        : "Get Started"}
                    </span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </Link>
              </div>
            ) : (
              /* STATE 2: Authenticated User (Strictly Role-Aware) */
              <div className="flex items-center gap-3">
                {/* A. Role-Specific Portal Button */}
                {userSession.role === "STUDENT" ? (
                  <Link href="/student/dashboard">
                    <button className="h-9 px-3.5 sm:px-4 rounded-xl text-xs sm:text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-xs hover:shadow-md transition-all flex items-center gap-2 active:scale-95">
                      <LayoutDashboard className="h-4 w-4 text-blue-100" />
                      <span>Learner Portal</span>
                    </button>
                  </Link>
                ) : userSession.role === "TEACHER" ? (
                  <Link href="/teacher/dashboard">
                    <button className="h-9 px-3.5 sm:px-4 rounded-xl text-xs sm:text-sm font-bold text-white bg-[#16805B] hover:bg-[#0D5C41] shadow-xs hover:shadow-md transition-all flex items-center gap-2 active:scale-95">
                      <LayoutDashboard className="h-4 w-4 text-emerald-100" />
                      <span>Educator Portal</span>
                    </button>
                  </Link>
                ) : userSession.role === "ADMIN" ? (
                  <Link href="/admin">
                    <button className="h-9 px-3.5 sm:px-4 rounded-xl text-xs sm:text-sm font-bold text-white bg-[#0B4F4B] hover:bg-[#073F3C] shadow-xs hover:shadow-md transition-all flex items-center gap-2 active:scale-95">
                      <LayoutDashboard className="h-4 w-4 text-[#F2C14E]" />
                      <span>Admin Governance</span>
                    </button>
                  </Link>
                ) : (
                  <Link href="/staff/dashboard">
                    <button className="h-9 px-3.5 sm:px-4 rounded-xl text-xs sm:text-sm font-bold text-white bg-[#0B4F4B] hover:bg-[#073F3C] shadow-xs hover:shadow-md transition-all flex items-center gap-2 active:scale-95">
                      <LayoutDashboard className="h-4 w-4 text-teal-100" />
                      <span>Staff Dashboard</span>
                    </button>
                  </Link>
                )}

                {/* B. Notification Bell Popover */}
                <div className="flex items-center">
                  <NotificationPopover />
                </div>

                {/* C. User Profile Account Menu */}
                <div className="relative" ref={profileDropdownRef}>
                  <button
                    onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                    className="flex items-center gap-2 p-1.5 sm:pr-2.5 rounded-xl hover:bg-slate-100/90 border border-slate-200/80 transition-all focus:outline-none"
                    aria-label="Account Menu"
                    aria-expanded={profileDropdownOpen}
                  >
                    {userSession.avatarUrl ? (
                      <img
                        src={userSession.avatarUrl}
                        alt={getUserDisplayName(userSession)}
                        className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg object-cover ring-1 ring-slate-200"
                      />
                    ) : (
                      <div
                        className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg text-white font-black text-xs flex items-center justify-center shadow-2xs ${
                          userSession.role === "STUDENT"
                            ? "bg-blue-600"
                            : userSession.role === "TEACHER"
                            ? "bg-[#16805B]"
                            : "bg-[#0B4F4B]"
                        }`}
                      >
                        {getUserInitials(userSession)}
                      </div>
                    )}

                    <div className="hidden xl:flex flex-col text-left">
                      <span className="text-xs font-bold text-slate-900 leading-tight truncate max-w-[110px]">
                        {getUserDisplayName(userSession)}
                      </span>
                      <span className="text-[10px] text-slate-500 font-medium leading-none">
                        {userSession.role === "STUDENT"
                          ? "Learner"
                          : userSession.role === "TEACHER"
                          ? "Educator"
                          : userSession.role === "ADMIN"
                          ? "Admin"
                          : "Staff"}
                      </span>
                    </div>

                    <ChevronDown
                      className={`h-3.5 w-3.5 text-slate-500 transition-transform duration-200 ${
                        profileDropdownOpen ? "rotate-180 text-slate-900" : ""
                      }`}
                    />
                  </button>

                  <AnimatePresence>
                    {profileDropdownOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 6, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 6, scale: 0.98 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 top-full mt-2 w-64 bg-white rounded-2xl border border-slate-200/90 shadow-2xl p-2 space-y-1 z-50 overflow-hidden"
                      >
                        {/* Dropdown Header */}
                        <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-100 space-y-1 mb-1">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-black text-slate-900 truncate">
                              {getUserDisplayName(userSession)}
                            </span>
                            <span
                              className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                                userSession.role === "STUDENT"
                                  ? "bg-blue-100 text-blue-700"
                                  : userSession.role === "TEACHER"
                                  ? "bg-emerald-100 text-emerald-700"
                                  : "bg-amber-100 text-amber-800"
                              }`}
                            >
                              {userSession.role === "STUDENT"
                                ? "Learner"
                                : userSession.role === "TEACHER"
                                ? "Educator"
                                : "Administrator"}
                            </span>
                          </div>
                          {userSession.email && (
                            <p className="text-[11px] text-slate-500 truncate">
                              {userSession.email}
                            </p>
                          )}
                        </div>

                        {/* Dropdown Links based on authenticated role */}
                        {userSession.role === "STUDENT" && (
                          <>
                            <Link
                              href="/student/dashboard"
                              onClick={() => setProfileDropdownOpen(false)}
                              className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:text-blue-700 hover:bg-blue-50/80 transition-colors"
                            >
                              <LayoutDashboard className="h-4 w-4 text-blue-600" />
                              <span>Learner Dashboard</span>
                            </Link>
                            <Link
                              href="/student/courses"
                              onClick={() => setProfileDropdownOpen(false)}
                              className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:text-blue-700 hover:bg-blue-50/80 transition-colors"
                            >
                              <BookOpen className="h-4 w-4 text-blue-600" />
                              <span>Enrolled Courses</span>
                            </Link>
                            <Link
                              href="/student/live-classes"
                              onClick={() => setProfileDropdownOpen(false)}
                              className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:text-blue-700 hover:bg-blue-50/80 transition-colors"
                            >
                              <Video className="h-4 w-4 text-blue-600" />
                              <span>My Live Classes</span>
                            </Link>
                          </>
                        )}

                        {userSession.role === "TEACHER" && (
                          <>
                            <Link
                              href="/teacher/dashboard"
                              onClick={() => setProfileDropdownOpen(false)}
                              className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:text-emerald-700 hover:bg-emerald-50/80 transition-colors"
                            >
                              <LayoutDashboard className="h-4 w-4 text-emerald-600" />
                              <span>Educator Dashboard</span>
                            </Link>
                            <Link
                              href="/teacher/live-classes"
                              onClick={() => setProfileDropdownOpen(false)}
                              className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:text-emerald-700 hover:bg-emerald-50/80 transition-colors"
                            >
                              <Video className="h-4 w-4 text-emerald-600" />
                              <span>Live Class Slots</span>
                            </Link>
                            <Link
                              href="/teacher/courses"
                              onClick={() => setProfileDropdownOpen(false)}
                              className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:text-emerald-700 hover:bg-emerald-50/80 transition-colors"
                            >
                              <BookOpen className="h-4 w-4 text-emerald-600" />
                              <span>Course Publisher</span>
                            </Link>
                            <Link
                              href="/teacher/verification"
                              onClick={() => setProfileDropdownOpen(false)}
                              className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:text-emerald-700 hover:bg-emerald-50/80 transition-colors"
                            >
                              <FileCheck className="h-4 w-4 text-emerald-600" />
                              <span>Verification Status</span>
                            </Link>
                          </>
                        )}

                        {(userSession.role === "ADMIN" || userSession.role === "STAFF") && (
                          <Link
                            href={userSession.role === "ADMIN" ? "/admin" : "/staff/dashboard"}
                            onClick={() => setProfileDropdownOpen(false)}
                            className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:text-teal-800 hover:bg-teal-50 transition-colors"
                          >
                            <LayoutDashboard className="h-4 w-4 text-[#0B4F4B]" />
                            <span>Governance Portal</span>
                          </Link>
                        )}

                        <Link
                          href="/profile"
                          onClick={() => setProfileDropdownOpen(false)}
                          className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:text-slate-950 hover:bg-slate-50 transition-colors"
                        >
                          <User className="h-4 w-4 text-slate-500" />
                          <span>Profile & Account</span>
                        </Link>

                        <div className="pt-1 mt-1 border-t border-slate-100">
                          <button
                            onClick={handleLogout}
                            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors text-left"
                          >
                            <LogOut className="h-4 w-4 text-rose-500" />
                            <span>Sign Out</span>
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            )}
          </div>

          {/* ========================================================================= */}
          {/* 4. MOBILE HAMBURGER BUTTON */}
          {/* ========================================================================= */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="lg:hidden p-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 hover:bg-slate-100 transition-colors"
            aria-label="Toggle mobile menu"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* 5. MOBILE & TABLET DRAWER */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {mobileOpen && (
          <div className="fixed inset-0 z-40 lg:hidden overflow-hidden" ref={mobileMenuRef}>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-xs"
            />

            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
              className="relative top-16 mx-3 sm:mx-6 bg-white rounded-3xl border border-slate-200 shadow-2xl p-5 space-y-4 max-h-[calc(100vh-5rem)] overflow-y-auto"
            >
              {/* Authenticated User Card in Mobile Drawer */}
              {userSession && (
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-xl text-white font-black text-sm flex items-center justify-center ${
                        userSession.role === "STUDENT"
                          ? "bg-blue-600"
                          : userSession.role === "TEACHER"
                          ? "bg-[#16805B]"
                          : "bg-[#0B4F4B]"
                      }`}
                    >
                      {getUserInitials(userSession)}
                    </div>
                    <div>
                      <div className="text-xs font-extrabold text-slate-900">
                        {getUserDisplayName(userSession)}
                      </div>
                      <div className="text-[11px] text-slate-500 truncate max-w-[160px]">
                        {userSession.email}
                      </div>
                    </div>
                  </div>
                  <span
                    className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                      userSession.role === "STUDENT"
                        ? "bg-blue-100 text-blue-700"
                        : userSession.role === "TEACHER"
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-amber-100 text-amber-800"
                    }`}
                  >
                    {userSession.role === "STUDENT"
                      ? "Learner"
                      : userSession.role === "TEACHER"
                      ? "Educator"
                      : "Admin"}
                  </span>
                </div>
              )}

              {/* Navigation Links */}
              <nav className="flex flex-col space-y-1 font-semibold text-slate-800 text-sm">
                {isEducator ? (
                  <>
                    <Link
                      href="/teacher#courses"
                      onClick={() => setMobileOpen(false)}
                      className="py-2 px-3 hover:bg-emerald-50 hover:text-emerald-700 rounded-xl"
                    >
                      Teaching Toolkit
                    </Link>
                    <Link
                      href="/teacher#earnings"
                      onClick={() => setMobileOpen(false)}
                      className="py-2 px-3 hover:bg-emerald-50 hover:text-emerald-700 rounded-xl"
                    >
                      Earnings Calculator
                    </Link>
                    <a
                      href="/teacher#how-it-works"
                      onClick={handleHowItWorksClick}
                      className="py-2 px-3 hover:bg-emerald-50 hover:text-emerald-700 rounded-xl"
                    >
                      How It Works
                    </a>
                    <a
                      href={getLiveDomain()}
                      onClick={() => setMobileOpen(false)}
                      className="py-2 px-3 hover:bg-emerald-50 rounded-xl flex items-center justify-between text-red-600 font-bold"
                    >
                      <span>Live Events</span>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-600">
                        🔴 Live
                      </span>
                    </a>
                  </>
                ) : isLearner ? (
                  <>
                    <Link
                      href="/find-teachers"
                      onClick={() => setMobileOpen(false)}
                      className="py-2 px-3 hover:bg-blue-50 hover:text-blue-700 rounded-xl"
                    >
                      Find Educators
                    </Link>
                    <Link
                      href="/courses"
                      onClick={() => setMobileOpen(false)}
                      className="py-2 px-3 hover:bg-blue-50 hover:text-blue-700 rounded-xl"
                    >
                      Explore Courses
                    </Link>
                    <Link
                      href="/student#benefits"
                      onClick={() => setMobileOpen(false)}
                      className="py-2 px-3 hover:bg-blue-50 hover:text-blue-700 rounded-xl"
                    >
                      Why EduConnects
                    </Link>
                    <a
                      href={getLiveDomain()}
                      onClick={() => setMobileOpen(false)}
                      className="py-2 px-3 hover:bg-blue-50 rounded-xl flex items-center justify-between text-red-600 font-bold"
                    >
                      <span>Live Events</span>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-600">
                        🔴 Live
                      </span>
                    </a>
                  </>
                ) : (
                  <>
                    <Link
                      href="/find-teachers"
                      onClick={() => setMobileOpen(false)}
                      className="flex items-center gap-2.5 py-2 px-3 rounded-xl hover:bg-slate-50"
                    >
                      <Users className="h-4 w-4 text-[#0B4F4B]" />
                      Find an Educator
                    </Link>
                    <Link
                      href="/courses"
                      onClick={() => setMobileOpen(false)}
                      className="flex items-center gap-2.5 py-2 px-3 rounded-xl hover:bg-slate-50"
                    >
                      <BookOpen className="h-4 w-4 text-amber-600" />
                      Explore Courses
                    </Link>
                    <Link
                      href="/student"
                      onClick={() => setMobileOpen(false)}
                      className="py-2 px-3 hover:bg-slate-50 rounded-xl"
                    >
                      For Learners
                    </Link>
                    <Link
                      href="/teacher"
                      onClick={() => setMobileOpen(false)}
                      className="py-2 px-3 hover:bg-slate-50 rounded-xl text-emerald-700 font-bold"
                    >
                      For Educators
                    </Link>
                    <a
                      href="#how-it-works"
                      onClick={handleHowItWorksClick}
                      className="py-2 px-3 hover:bg-slate-50 rounded-xl"
                    >
                      How It Works
                    </a>
                    <a
                      href={getLiveDomain()}
                      onClick={() => setMobileOpen(false)}
                      className="py-2 px-3 hover:bg-slate-50 rounded-xl flex items-center justify-between text-red-600 font-bold"
                    >
                      <span>Live Events</span>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-600">
                        🔴 Live
                      </span>
                    </a>
                  </>
                )}
              </nav>

              {/* Mobile Auth Actions */}
              <div className="pt-3 border-t border-slate-100 flex flex-col gap-2">
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
                      <button className="w-full py-2.5 rounded-xl border border-slate-200 text-slate-800 text-sm font-bold hover:bg-slate-50 transition-colors">
                        Login
                      </button>
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
                      <button
                        className={`w-full py-2.5 rounded-xl text-white text-sm font-bold shadow-xs transition-colors flex items-center justify-center gap-1.5 ${
                          isLearner
                            ? "bg-blue-600 hover:bg-blue-700"
                            : isEducator
                            ? "bg-[#16805B] hover:bg-[#0D5C41]"
                            : "bg-[#0B4F4B] hover:bg-[#073F3C]"
                        }`}
                      >
                        <span>
                          {isEducator
                            ? "Start Teaching"
                            : isLearner
                            ? "Start Learning"
                            : "Get Started"}
                        </span>
                        <ArrowRight className="h-4 w-4" />
                      </button>
                    </Link>
                  </>
                ) : (
                  <>
                    {/* Role-Specific Portal Button in Mobile */}
                    <Link
                      href={getDashboardPath(userSession)}
                      onClick={() => setMobileOpen(false)}
                    >
                      <button
                        className={`w-full py-2.5 rounded-xl text-white text-sm font-bold shadow-xs transition-colors flex items-center justify-center gap-2 ${
                          userSession.role === "STUDENT"
                            ? "bg-blue-600 hover:bg-blue-700"
                            : userSession.role === "TEACHER"
                            ? "bg-[#16805B] hover:bg-[#0D5C41]"
                            : "bg-[#0B4F4B] hover:bg-[#073F3C]"
                        }`}
                      >
                        <LayoutDashboard className="h-4 w-4" />
                        <span>{getDashboardLabel(userSession)}</span>
                      </button>
                    </Link>

                    <Link
                      href="/profile"
                      onClick={() => setMobileOpen(false)}
                      className="w-full py-2 rounded-xl text-slate-700 text-xs font-semibold hover:bg-slate-50 flex items-center justify-center gap-2 border border-slate-200"
                    >
                      <User className="h-3.5 w-3.5 text-slate-500" />
                      <span>Account Profile</span>
                    </Link>

                    <button
                      onClick={handleLogout}
                      className="w-full py-2 rounded-xl text-rose-600 text-xs font-semibold hover:bg-rose-50 flex items-center justify-center gap-2 border border-rose-100"
                    >
                      <LogOut className="h-3.5 w-3.5 text-rose-500" />
                      <span>Sign Out</span>
                    </button>
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
