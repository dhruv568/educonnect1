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
  Loader2,
} from "lucide-react";
import { GlassButton } from "@/components/glass/glass-button";
import { UserSession } from "@/types/auth";
import { isEducatorRole, isLearnerRole, isAdminRole } from "@/lib/auth/roles";
import {
  getMainDomain,
  getLiveDomain,
  getStudentDomain,
  getEducatorDomain,
  getLearnerSubdomainUrl,
  getEducatorSubdomainUrl,
} from "@/lib/app-url";
import { NotificationPopover } from "@/components/layout/notification-popover";
import { useToast } from "@/components/ui/toast";
import { Logo } from "@/components/brand/logo";
import Image from "next/image";
import officialLogo from "@/logo for educonnect.co.in.png";

export interface FloatingNavbarProps {
  variant?: "default" | "student" | "teacher";
}

export function FloatingNavbar({ variant }: FloatingNavbarProps = {}) {
  const pathname = usePathname();
  const router = useRouter();
  const { showToast } = useToast();

  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [exploreDropdownOpen, setExploreDropdownOpen] = useState(false);
  const [moreDropdownOpen, setMoreDropdownOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [userSession, setUserSession] = useState<UserSession | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

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

  // Automatically close dropdowns on page navigation
  useEffect(() => {
    setProfileDropdownOpen(false);
    setExploreDropdownOpen(false);
    setMoreDropdownOpen(false);
    setMobileOpen(false);
  }, [pathname]);

  // Close dropdowns when clicking outside or pressing Escape (supports touch & desktop)
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
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
    document.addEventListener("touchstart", handleClickOutside, { passive: true });
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  // Logout invalidation with real server call, visual loading state & hard navigation
  const handleLogout = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (isLoggingOut) return;
    setIsLoggingOut(true);

    const role = userSession?.role;

    try {
      const res = await fetch("/api/auth/logout", {
        method: "POST",
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
          Pragma: "no-cache",
        },
      });

      if (!res.ok) {
        throw new Error("Unable to sign out. Please try again.");
      }

      // 1. Invalidate client auth state
      setUserSession(null);
      setProfileDropdownOpen(false);
      setMobileOpen(false);

      // 2. Clear any browser storage (if any auth state was kept)
      if (typeof window !== "undefined") {
        try {
          sessionStorage.removeItem("educonnect_auth");
          localStorage.removeItem("educonnect_auth");
        } catch {}
        window.dispatchEvent(new Event("educonnect_auth_changed"));
      }

      // 3. Hard redirect to prevent bfcache / memory restoration & show dedicated logout page
      if (role === "TEACHER" || isEducatorRole(role)) {
        window.location.replace("/teacher/logout");
      } else if (isAdminRole(role) || role === "STAFF") {
        window.location.replace("/admin/logout");
      } else if (isLearnerRole(role)) {
        window.location.replace("/student/logout");
      } else {
        window.location.replace("/logout");
      }
    } catch (err: any) {
      setIsLoggingOut(false);
      showToast(
        "Sign Out Failed",
        err?.message || "Unable to sign out. Please try again.",
        "error"
      );
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
    (variant !== "default" &&
      variant !== "teacher" &&
      (pathname === "/student" ||
        pathname?.startsWith("/student/") ||
        (typeof window !== "undefined" &&
          (window.location.hostname.startsWith("learners.") ||
            window.location.hostname.startsWith("learner.") ||
            window.location.hostname.startsWith("students.") ||
            window.location.hostname.startsWith("student.")))));

  const isEducator =
    variant === "teacher" ||
    (variant !== "default" &&
      variant !== "student" &&
      (pathname === "/teacher" ||
        pathname?.startsWith("/teacher/") ||
        pathname === "/register/teacher" ||
        pathname?.startsWith("/register/teacher/") ||
        (typeof window !== "undefined" &&
          (window.location.hostname.startsWith("educators.") ||
            window.location.hostname.startsWith("educator.") ||
            window.location.hostname.startsWith("teachers.") ||
            window.location.hostname.startsWith("teacher.")))));

  const isMainWebsite = !isLearner && !isEducator;

  // Role-derived Portal Destinations & Labels (Strictly derived from server auth truth)
  const getDashboardPath = (session: UserSession) => {
    if (isEducatorRole(session.role)) return getEducatorSubdomainUrl("/teacher/dashboard");
    if (session.role === "ADMIN") return "/admin";
    if (session.role === "STAFF") return "/staff/dashboard";
    return getLearnerSubdomainUrl("/student/dashboard");
  };

  const getDashboardLabel = (session: UserSession) => {
    if (isEducatorRole(session.role)) return "Educator Portal";
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
          isLearner
            ? "bg-[#243B9B] border-b border-[#3157D5]/40 shadow-sm py-2.5 sm:py-3.5"
            : isEducator
            ? scrolled
              ? "bg-[#0D5C41]/95 backdrop-blur-md border-b border-[#16805B]/50 shadow-md py-2 sm:py-2.5"
              : "bg-[#0D5C41] border-b border-[#16805B]/30 shadow-xs py-2.5 sm:py-3"
            : isMainWebsite
            ? scrolled
              ? "bg-[#083F3D] border-b border-[#1B6863]/40 shadow-sm py-2 sm:py-2.5"
              : "bg-[#083F3D] border-b border-[#1B6863]/25 py-2.5 sm:py-3.5"
            : scrolled
              ? "bg-white/95 backdrop-blur-md border-b border-slate-200/90 shadow-sm py-2 sm:py-2.5"
              : "bg-white/90 backdrop-blur-xs border-b border-slate-200/60 py-2.5 sm:py-3.5"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-3 sm:gap-4">
          {/* ========================================================================= */}
          {/* 1. BRAND LOGO & CONTEXT BADGE */}
          {/* ========================================================================= */}
          {isEducator ? (
            <Link
              href="/teacher"
              onClick={() => setMobileOpen(false)}
              className="group flex items-center gap-2 sm:gap-2.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 rounded-xl select-none shrink-0"
              aria-label="EduConnects Educator Home"
            >
              <div className="relative h-10 sm:h-11 md:h-12 w-auto aspect-[3/2] flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-[1.03]">
                <Image
                  src={officialLogo}
                  alt="EduConnects"
                  width={1536}
                  height={1024}
                  priority
                  className="h-full w-auto max-h-full object-contain filter drop-shadow-[0_2px_8px_rgba(0,0,0,0.3)]"
                  sizes="(max-width: 640px) 80px, (max-width: 1024px) 100px, 120px"
                />
              </div>
              <div className="flex flex-col justify-center min-w-0 text-left">
                <span className="text-base sm:text-lg font-black tracking-tight leading-none text-white transition-opacity group-hover:opacity-95">
                  Edu<span className="text-[#35A979]">Connects</span>
                </span>
                <span className="text-[10px] sm:text-xs font-bold text-emerald-200 tracking-wide whitespace-nowrap mt-0.5">
                  Educator Portal
                </span>
              </div>
            </Link>
          ) : isLearner ? (
            <Link
              href="/student"
              onClick={() => setMobileOpen(false)}
              className="group flex items-center gap-2 sm:gap-2.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 rounded-xl select-none shrink-0"
              aria-label="EduConnects Learner Home"
            >
              <div className="relative h-10 sm:h-11 md:h-12 w-auto aspect-[3/2] flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-[1.03]">
                <Image
                  src={officialLogo}
                  alt="EduConnects"
                  width={1536}
                  height={1024}
                  priority
                  className="h-full w-auto max-h-full object-contain filter drop-shadow-[0_2px_8px_rgba(0,0,0,0.3)]"
                  sizes="(max-width: 640px) 80px, (max-width: 1024px) 100px, 120px"
                />
              </div>
              <div className="flex flex-col justify-center min-w-0 text-left">
                <span className="text-base sm:text-lg font-black tracking-tight leading-none text-white transition-opacity group-hover:opacity-95">
                  Edu<span className="text-[#667EEA]">Connects</span>
                </span>
                <span className="text-[10px] sm:text-xs font-bold text-blue-200 tracking-wide whitespace-nowrap mt-0.5">
                  Learner Portal
                </span>
              </div>
            </Link>
          ) : (
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              <Logo
                variant="compact"
                size="md"
                roleContext="default"
                theme={isMainWebsite ? "dark" : "auto"}
                href={getMainDomain() + "/"}
                showTagline
                tagline="Learn • Grow • Belong"
                onClick={() => setMobileOpen(false)}
                priority
              />
            </div>
          )}

          {/* ========================================================================= */}
          {/* 2. CENTER PRIMARY NAVIGATION */}
          {/* ========================================================================= */}
          <nav className={`hidden lg:flex items-center gap-1 xl:gap-2 text-sm font-semibold ${isLearner || isEducator || isMainWebsite ? "text-white" : "text-slate-700"}`}>
            {isEducator ? (
              /* EDUCATOR SPECIFIC NAVIGATION */
              <div className="flex items-center gap-1 xl:gap-1.5">
                {[
                  { label: "Home", href: "/teacher", targetId: null },
                  { label: "About Us", href: "/about", targetId: null },
                  { label: "How It Works?", href: "/teacher#how-it-works", targetId: "how-it-works" },
                  { label: "Training Program", href: "/teacher/training", targetId: null },
                  { label: "Contact Us", href: "/contact", targetId: null },
                ].map((item) => {
                  const isActive =
                    item.href === "/teacher"
                      ? pathname === "/teacher"
                      : item.href === "/teacher/training"
                      ? pathname === "/teacher/training" || pathname === "/training" || pathname === "/training-program" || pathname === "/teachers-training-program"
                      : item.href.startsWith("/") && !item.targetId
                      ? pathname === item.href
                      : false;

                  return (
                    <Link
                      key={item.label}
                      href={item.href}
                      onClick={(e) => {
                        if (item.targetId && pathname === "/teacher") {
                          e.preventDefault();
                          const el = document.getElementById(item.targetId);
                          if (el) {
                            el.scrollIntoView({ behavior: "smooth" });
                          }
                        }
                      }}
                      className={`px-3.5 py-2 rounded-xl text-sm font-medium transition-all duration-200 whitespace-nowrap ${
                        isActive
                          ? "bg-[#16805B] text-white font-semibold shadow-xs"
                          : "text-emerald-100/90 hover:text-white hover:bg-white/10"
                      }`}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            ) : isLearner ? (
              /* LEARNER SPECIFIC NAVIGATION */
              <>
                <Link
                  href="/student"
                  className={`px-3.5 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
                    pathname === "/student" || pathname === "/"
                      ? "bg-[#3157D5] text-white font-bold shadow-xs"
                      : "text-blue-100 hover:text-white hover:bg-[#3157D5]/50"
                  }`}
                >
                  Home
                </Link>
                <Link
                  href="/about"
                  className={`px-3.5 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
                    pathname === "/about"
                      ? "bg-[#3157D5] text-white font-bold shadow-xs"
                      : "text-blue-100 hover:text-white hover:bg-[#3157D5]/50"
                  }`}
                >
                  About Us
                </Link>
                <Link
                  href="/find-teachers"
                  className={`px-3.5 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
                    pathname === "/find-teachers"
                      ? "bg-[#3157D5] text-white font-bold shadow-xs"
                      : "text-blue-100 hover:text-white hover:bg-[#3157D5]/50"
                  }`}
                >
                  Find Educators
                </Link>
                <Link
                  href="/courses"
                  className={`px-3.5 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
                    pathname === "/courses"
                      ? "bg-[#3157D5] text-white font-bold shadow-xs"
                      : "text-blue-100 hover:text-white hover:bg-[#3157D5]/50"
                  }`}
                >
                  Explore Courses
                </Link>
                <Link
                  href="/exam"
                  className={`px-3.5 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
                    pathname === "/exam"
                      ? "bg-[#3157D5] text-white font-bold shadow-xs"
                      : "text-blue-100 hover:text-white hover:bg-[#3157D5]/50"
                  }`}
                >
                  Take Test
                </Link>
                <Link
                  href="/student#benefits"
                  className="px-3.5 py-1.5 rounded-lg text-blue-100 hover:text-white hover:bg-[#3157D5]/50 transition-colors whitespace-nowrap"
                >
                  Why EduConnects?
                </Link>
              </>
            ) : (
              /* MAIN PLATFORM NAVIGATION */
              <>
                <Link
                  href="/"
                  className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
                    pathname === "/"
                      ? "bg-[#0F5C5A] text-white font-bold shadow-xs"
                      : "text-teal-100 hover:text-white hover:bg-[#0F5C5A]/60"
                  }`}
                >
                  Home
                </Link>
                <Link
                  href="/about"
                  className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
                    pathname === "/about"
                      ? "bg-[#0F5C5A] text-white font-bold shadow-xs"
                      : "text-teal-100 hover:text-white hover:bg-[#0F5C5A]/60"
                  }`}
                >
                  About Us
                </Link>
                <a
                  href="https://learners.educonnects.co.in"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-lg text-teal-100 hover:text-white hover:bg-[#0F5C5A]/60 transition-colors whitespace-nowrap"
                >
                  For Learners
                </a>
                <a
                  href="https://educators.educonnects.co.in"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-lg text-teal-100 hover:text-white hover:bg-[#0F5C5A]/60 transition-colors whitespace-nowrap"
                >
                  For Educators
                </a>
                <Link
                  href="/#success-stories"
                  className="px-3 py-1.5 rounded-lg text-teal-100 hover:text-white hover:bg-[#0F5C5A]/60 transition-colors whitespace-nowrap"
                >
                  Success Stories
                </Link>
                <Link
                  href="/contact"
                  className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
                    pathname === "/contact"
                      ? "bg-[#0F5C5A] text-white font-bold shadow-xs"
                      : "text-teal-100 hover:text-white hover:bg-[#0F5C5A]/60"
                  }`}
                >
                  Contact Us
                </Link>
              </>
            )}
          </nav>

          {/* ========================================================================= */}
          {/* 3. RIGHT: ROLE-AWARE ACTION CLUSTER */}
          {/* ========================================================================= */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {isLearner ? (
              /* ========================================================================= */
              /* 3A. LEARNER RIGHT ACTION CLUSTER (INDEPENDENT, CLEAN, STRICT ORDER) */
              /* ========================================================================= */
              <div className="hidden lg:flex items-center gap-3 shrink-0">
              {userSession && isLearnerRole(userSession.role) ? (
                <div className="flex items-center gap-3">
                  <Link
                    href={getLearnerSubdomainUrl("/student/dashboard")}
                    className="h-9 px-4 rounded-xl text-xs sm:text-sm font-bold text-white bg-[#3157D5] hover:bg-[#1E3185] shadow-xs hover:shadow-md transition-all flex items-center gap-2 active:scale-95 cursor-pointer"
                  >
                    <LayoutDashboard className="h-4 w-4 text-blue-100" />
                    <span>Learner Dashboard</span>
                  </Link>
                  <button
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                    className="text-xs sm:text-sm font-bold text-blue-100 hover:text-white px-3 py-2 rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
                  >
                    Logout
                  </button>
                </div>
              ) : (
                <Link
                  href="/student/login"
                  className="text-xs sm:text-sm font-bold text-white bg-[#3157D5] hover:bg-[#1E3185] px-4 py-2 rounded-xl transition-colors whitespace-nowrap shadow-xs"
                >
                  Login
                </Link>
              )}
            </div>
          ) : isEducator ? (
            <div className="hidden lg:flex items-center gap-3 shrink-0">
              {userSession && isEducatorRole(userSession.role) ? (
                <div className="flex items-center gap-3">
                  <Link
                    href={getEducatorSubdomainUrl("/teacher/dashboard")}
                    className="h-10 px-4 rounded-xl text-sm font-semibold text-white bg-[#16805B] hover:bg-[#12684A] shadow-xs hover:shadow-md transition-all flex items-center gap-2 active:scale-95 cursor-pointer border border-[#35A979]/40"
                  >
                    <LayoutDashboard className="h-4 w-4 text-emerald-100" />
                    <span>Educator Dashboard</span>
                  </Link>

                  {/* Notification Bell Popover */}
                  <div className="flex items-center">
                    <NotificationPopover />
                  </div>

                  <button
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                    className="text-sm font-semibold text-emerald-200 hover:text-white px-3.5 py-2 rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
                  >
                    Logout
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <Link
                    href="/teacher/login"
                    className="px-4 py-2 rounded-xl text-sm font-semibold text-white/90 hover:text-white bg-transparent hover:bg-white/10 border border-white/20 hover:border-white/40 shadow-2xs transition-all duration-200 whitespace-nowrap cursor-pointer"
                  >
                    Educator Login
                  </Link>
                  <Link
                    href="/teacher/register"
                    className="h-10 px-5 rounded-xl text-sm font-semibold text-white bg-[#16805B] hover:bg-[#12684A] shadow-sm hover:shadow-md hover:shadow-emerald-950/25 transition-all duration-200 whitespace-nowrap flex items-center gap-1.5 cursor-pointer active:scale-[0.98] border border-emerald-400/30 group"
                  >
                    <span>Become an Educator</span>
                    <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                  </Link>
                </div>
              )}
            </div>
          ) : (
            <div className="hidden lg:flex items-center gap-3 shrink-0">
              {/* STATE 1: Unauthenticated Visitor */}
              {!userSession ? (
                <div className="flex items-center gap-2 sm:gap-3">
                  <Link
                    href="/login"
                    className="text-xs sm:text-sm font-bold text-slate-700 hover:text-[#083F3D] px-3.5 py-2 rounded-xl hover:bg-[#F2FAF8] transition-colors whitespace-nowrap"
                  >
                    Login
                  </Link>
                  <Link
                    href="/register"
                    className="h-9 px-4 sm:px-5 rounded-xl text-xs sm:text-sm font-bold text-white shadow-xs hover:shadow-md transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer active:scale-95 bg-gradient-to-r from-[#16805B] to-[#0D5C41] hover:from-[#12684A] hover:to-[#0A4732] shadow-emerald-700/20"
                  >
                    <span>Get Started</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              ) : (
                /* STATE 2: Authenticated User (Strictly Role-Aware) */
                <div className="flex items-center gap-3">
                  {/* A. Role-Specific Portal Button */}
                  {(userSession.role === "STUDENT" || isLearnerRole(userSession.role)) ? (
                    <Link
                      href={getLearnerSubdomainUrl("/student/dashboard")}
                      className="h-9 px-3.5 sm:px-4 rounded-xl text-xs sm:text-sm font-bold text-white bg-[#3157D5] hover:bg-[#243B9B] shadow-xs hover:shadow-md transition-all flex items-center gap-2 active:scale-95 cursor-pointer"
                    >
                      <LayoutDashboard className="h-4 w-4 text-blue-100" />
                      <span>Learner Portal</span>
                    </Link>
                  ) : (userSession.role === "TEACHER" || isEducatorRole(userSession.role)) ? (
                    <Link
                      href={getEducatorSubdomainUrl("/teacher/dashboard")}
                      className="h-9 px-3.5 sm:px-4 rounded-xl text-xs sm:text-sm font-bold text-white bg-[#16805B] hover:bg-[#0D5C41] shadow-xs hover:shadow-md transition-all flex items-center gap-2 active:scale-95 cursor-pointer"
                    >
                      <LayoutDashboard className="h-4 w-4 text-emerald-100" />
                      <span>Educator Portal</span>
                    </Link>
                  ) : userSession.role === "ADMIN" ? (
                    <Link
                      href="/admin"
                      className="h-9 px-3.5 sm:px-4 rounded-xl text-xs sm:text-sm font-bold text-white bg-[#0B4F4B] hover:bg-[#073F3C] shadow-xs hover:shadow-md transition-all flex items-center gap-2 active:scale-95 cursor-pointer"
                    >
                      <LayoutDashboard className="h-4 w-4 text-[#F2C14E]" />
                      <span>Admin Governance</span>
                    </Link>
                  ) : (
                    <Link
                      href="/staff/dashboard"
                      className="h-9 px-3.5 sm:px-4 rounded-xl text-xs sm:text-sm font-bold text-white bg-[#0B4F4B] hover:bg-[#073F3C] shadow-xs hover:shadow-md transition-all flex items-center gap-2 active:scale-95 cursor-pointer"
                    >
                      <LayoutDashboard className="h-4 w-4 text-teal-100" />
                      <span>Staff Dashboard</span>
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
                          isLearnerRole(userSession.role)
                            ? "bg-[#3157D5]"
                            : isEducatorRole(userSession.role)
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
                        {isLearnerRole(userSession.role)
                          ? "Learner"
                          : isEducatorRole(userSession.role)
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
                                isLearnerRole(userSession.role)
                                  ? "bg-blue-100 text-blue-700"
                                  : isEducatorRole(userSession.role)
                                  ? "bg-emerald-100 text-emerald-700"
                                  : "bg-amber-100 text-amber-800"
                              }`}
                            >
                              {isLearnerRole(userSession.role)
                                ? "Learner"
                                : isEducatorRole(userSession.role)
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
                        {(userSession.role === "STUDENT" || isLearnerRole(userSession.role)) && (
                          <>
                            <Link
                              href={getLearnerSubdomainUrl("/student/dashboard")}
                              className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:text-blue-700 hover:bg-blue-50/80 transition-colors cursor-pointer"
                            >
                              <LayoutDashboard className="h-4 w-4 text-blue-600" />
                              <span>Learner Dashboard</span>
                            </Link>
                            <Link
                              href={getLearnerSubdomainUrl("/student/courses")}
                              className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:text-blue-700 hover:bg-blue-50/80 transition-colors cursor-pointer"
                            >
                              <BookOpen className="h-4 w-4 text-blue-600" />
                              <span>Enrolled Courses</span>
                            </Link>
                            <Link
                              href={getLearnerSubdomainUrl("/student/live-classes")}
                              className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:text-blue-700 hover:bg-blue-50/80 transition-colors cursor-pointer"
                            >
                              <Video className="h-4 w-4 text-blue-600" />
                              <span>My Live Classes</span>
                            </Link>
                          </>
                        )}

                        {(userSession.role === "TEACHER" || isEducatorRole(userSession.role)) && (
                          <>
                            <Link
                              href={getEducatorSubdomainUrl("/teacher/dashboard")}
                              className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:text-emerald-700 hover:bg-emerald-50/80 transition-colors cursor-pointer"
                            >
                              <LayoutDashboard className="h-4 w-4 text-emerald-600" />
                              <span>Educator Dashboard</span>
                            </Link>
                            <Link
                              href={getEducatorSubdomainUrl("/teacher/live-classes")}
                              className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:text-emerald-700 hover:bg-emerald-50/80 transition-colors cursor-pointer"
                            >
                              <Video className="h-4 w-4 text-emerald-600" />
                              <span>Live Class Slots</span>
                            </Link>
                            <Link
                              href={getEducatorSubdomainUrl("/teacher/courses")}
                              className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:text-emerald-700 hover:bg-emerald-50/80 transition-colors cursor-pointer"
                            >
                              <BookOpen className="h-4 w-4 text-emerald-600" />
                              <span>Course Publisher</span>
                            </Link>
                            <Link
                              href={getEducatorSubdomainUrl("/teacher/verification")}
                              className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:text-emerald-700 hover:bg-emerald-50/80 transition-colors cursor-pointer"
                            >
                              <FileCheck className="h-4 w-4 text-emerald-600" />
                              <span>Verification Status</span>
                            </Link>
                          </>
                        )}

                        {isAdminRole(userSession.role) && (
                          <Link
                            href={userSession.role === "ADMIN" ? "/admin" : "/staff/dashboard"}
                            className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:text-teal-800 hover:bg-teal-50 transition-colors cursor-pointer"
                          >
                            <LayoutDashboard className="h-4 w-4 text-[#0B4F4B]" />
                            <span>Governance Portal</span>
                          </Link>
                        )}

                        <Link
                          href="/profile"
                          className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:text-slate-950 hover:bg-slate-50 transition-colors cursor-pointer"
                        >
                          <User className="h-4 w-4 text-slate-500" />
                          <span>Profile & Account</span>
                        </Link>

                        <div className="pt-1 mt-1 border-t border-slate-100">
                          <button
                            type="button"
                            onClick={(e) => handleLogout(e)}
                            disabled={isLoggingOut}
                            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors text-left cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                          >
                            {isLoggingOut ? (
                              <Loader2 className="h-4 w-4 animate-spin text-rose-500" />
                            ) : (
                              <LogOut className="h-4 w-4 text-rose-500" />
                            )}
                            <span>{isLoggingOut ? "Signing out..." : "Sign Out"}</span>
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            )}
          </div>
        )}

          {/* ========================================================================= */}
          {/* 4. MOBILE HAMBURGER BUTTON */}
          {/* ========================================================================= */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className={`lg:hidden p-2 rounded-xl border transition-colors ${
              isEducator
                ? "bg-white/10 border-white/20 text-white hover:bg-white/15"
                : isLearner
                ? "bg-[#3157D5] border-[#4268EA] text-white hover:bg-[#1E3185]"
                : isMainWebsite
                ? "bg-[#0F5C5A] border-[#1B6863] text-white hover:bg-[#16805B]"
                : "bg-slate-50 border-slate-200 text-slate-800 hover:bg-slate-100"
            }`}
            aria-label="Toggle mobile menu"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          </div>
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
              className={`relative top-16 mx-3 sm:mx-6 rounded-3xl shadow-2xl p-5 space-y-4 max-h-[calc(100vh-5rem)] overflow-y-auto ${
                isEducator
                  ? "bg-[#0D5C41] border border-[#16805B]/60 text-white"
                  : isLearner
                  ? "bg-[#243B9B] border border-[#3157D5]/60 text-white"
                  : isMainWebsite
                  ? "bg-[#083F3D] border border-[#1B6863]/60 text-white"
                  : "bg-white border border-slate-200"
              }`}
            >
              {/* Educator Mobile Drawer Brand Header */}
              {isEducator && (
                <div className="pb-3 mb-1 border-b border-[#16805B]/50 flex items-center justify-between">
                  <Link
                    href="/teacher"
                    onClick={() => setMobileOpen(false)}
                    className="group flex items-center gap-2.5"
                    aria-label="EduConnects Educator Home"
                  >
                    <div className="relative h-9 w-auto aspect-[3/2] flex items-center justify-center select-none shrink-0">
                      <Image
                        src={officialLogo}
                        alt="EduConnects"
                        width={1536}
                        height={1024}
                        priority
                        className="h-full w-auto max-h-full object-contain filter drop-shadow-[0_2px_6px_rgba(0,0,0,0.3)]"
                      />
                    </div>
                    <span className="text-base font-black tracking-tight leading-none text-white">
                      Edu<span className="text-[#35A979]">Connects</span>
                    </span>
                  </Link>
                  <span className="text-[10px] font-bold text-emerald-200 bg-[#16805B]/60 px-2.5 py-1 rounded-full border border-emerald-400/30">
                    Educator Portal
                  </span>
                </div>
              )}

              {/* Main Website Mobile Drawer Brand Header */}
              {isMainWebsite && (
                <div className="pb-3 mb-1 border-b border-[#1B6863]/60 flex items-center justify-between">
                  <Logo
                    size="md"
                    roleContext="default"
                    theme="dark"
                    href={getMainDomain() + "/"}
                    showTagline
                    tagline="Learn • Grow • Belong"
                    onClick={() => setMobileOpen(false)}
                    priority
                  />
                </div>
              )}

              {/* Authenticated User Card in Mobile Drawer */}
              {isEducator && userSession && isEducatorRole(userSession.role) && (
                <div className="p-3.5 rounded-2xl flex items-center justify-between bg-[#16805B]/40 border border-[#16805B]/60 text-white">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl text-white font-black text-sm flex items-center justify-center bg-[#16805B]">
                      {getUserInitials(userSession)}
                    </div>
                    <div>
                      <div className="text-xs font-extrabold text-white">
                        {getUserDisplayName(userSession)}
                      </div>
                      <div className="text-[11px] truncate max-w-[160px] text-emerald-200">
                        {userSession.email}
                      </div>
                    </div>
                  </div>
                  <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                    Educator
                  </span>
                </div>
              )}

              {isLearner && userSession && isLearnerRole(userSession.role) && (
                <div className="p-3.5 rounded-2xl flex items-center justify-between bg-[#1E3185] border border-blue-400/30 text-white">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl text-white font-black text-sm flex items-center justify-center bg-blue-600">
                      {getUserInitials(userSession)}
                    </div>
                    <div>
                      <div className="text-xs font-extrabold text-white">
                        {getUserDisplayName(userSession)}
                      </div>
                      <div className="text-[11px] truncate max-w-[160px] text-blue-200">
                        {userSession.email}
                      </div>
                    </div>
                  </div>
                  <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                    Learner
                  </span>
                </div>
              )}

              {/* Navigation Links */}
              <nav className={`flex flex-col space-y-1 font-semibold text-sm ${isEducator ? "text-white" : isLearner ? "text-white" : isMainWebsite ? "text-white" : "text-slate-800"}`}>
                {isEducator ? (
                  <>
                    {[
                      { label: "Home", href: "/teacher", targetId: null },
                      { label: "About Us", href: "/about", targetId: null },
                      { label: "How It Works?", href: "/teacher#how-it-works", targetId: "how-it-works" },
                      { label: "Training Program", href: "/teacher/training", targetId: null },
                      { label: "Contact Us", href: "/contact", targetId: null },
                    ].map((item) => {
                      const isActive =
                        item.href === "/teacher"
                          ? pathname === "/teacher"
                          : item.href === "/teacher/training"
                          ? pathname === "/teacher/training" || pathname === "/training" || pathname === "/training-program" || pathname === "/teachers-training-program"
                          : item.href.startsWith("/") && !item.targetId
                          ? pathname === item.href
                          : false;

                      return (
                        <Link
                          key={item.label}
                          href={item.href}
                          onClick={(e) => {
                            setMobileOpen(false);
                            if (item.targetId && pathname === "/teacher") {
                              e.preventDefault();
                              const el = document.getElementById(item.targetId);
                              if (el) {
                                el.scrollIntoView({ behavior: "smooth" });
                              }
                            }
                          }}
                          className={`py-2.5 px-3.5 rounded-xl text-sm font-medium transition-colors flex items-center justify-between ${
                            isActive
                              ? "bg-[#16805B] text-white font-semibold shadow-xs"
                              : "text-emerald-100/90 hover:text-white hover:bg-white/10"
                          }`}
                        >
                          <span>{item.label}</span>
                          {isActive && <span className="w-1.5 h-1.5 rounded-full bg-emerald-300" />}
                        </Link>
                      );
                    })}
                  </>
                ) : isLearner ? (
                  <>
                    <Link
                      href="/student"
                      onClick={() => setMobileOpen(false)}
                      className={`py-2.5 px-3.5 rounded-xl font-semibold transition-colors ${
                        pathname === "/student" || pathname === "/"
                          ? "bg-[#3157D5] text-white font-bold"
                          : "text-blue-100 hover:bg-[#3157D5]/50 hover:text-white"
                      }`}
                    >
                      Home
                    </Link>
                    <Link
                      href="/about"
                      onClick={() => setMobileOpen(false)}
                      className={`py-2.5 px-3.5 rounded-xl font-semibold transition-colors ${
                        pathname === "/about"
                          ? "bg-[#3157D5] text-white font-bold"
                          : "text-blue-100 hover:bg-[#3157D5]/50 hover:text-white"
                      }`}
                    >
                      About Us
                    </Link>
                    <Link
                      href="/find-teachers"
                      onClick={() => setMobileOpen(false)}
                      className={`py-2.5 px-3.5 rounded-xl font-semibold transition-colors ${
                        pathname === "/find-teachers"
                          ? "bg-[#3157D5] text-white font-bold"
                          : "text-blue-100 hover:bg-[#3157D5]/50 hover:text-white"
                      }`}
                    >
                      Find Educators
                    </Link>
                    <Link
                      href="/courses"
                      onClick={() => setMobileOpen(false)}
                      className={`py-2.5 px-3.5 rounded-xl font-semibold transition-colors ${
                        pathname === "/courses"
                          ? "bg-[#3157D5] text-white font-bold"
                          : "text-blue-100 hover:bg-[#3157D5]/50 hover:text-white"
                      }`}
                    >
                      Explore Courses
                    </Link>
                    <Link
                      href="/exam"
                      onClick={() => setMobileOpen(false)}
                      className={`py-2.5 px-3.5 rounded-xl font-semibold transition-colors ${
                        pathname === "/exam"
                          ? "bg-[#3157D5] text-white font-bold"
                          : "text-blue-100 hover:bg-[#3157D5]/50 hover:text-white"
                      }`}
                    >
                      Take Test
                    </Link>
                    <Link
                      href="/student#benefits"
                      onClick={() => setMobileOpen(false)}
                      className="py-2.5 px-3.5 rounded-xl font-semibold text-blue-100 hover:bg-[#3157D5]/50 hover:text-white transition-colors"
                    >
                      Why EduConnects?
                    </Link>
                  </>
                ) : (
                  <>
                    <Link
                      href="/"
                      onClick={() => setMobileOpen(false)}
                      className={`py-2.5 px-3.5 rounded-xl transition-colors ${
                        pathname === "/"
                          ? "bg-[#0F5C5A] text-white font-bold"
                          : "text-teal-100 hover:bg-[#0F5C5A]/60 hover:text-white"
                      }`}
                    >
                      Home
                    </Link>
                    <Link
                      href="/about"
                      onClick={() => setMobileOpen(false)}
                      className={`py-2.5 px-3.5 rounded-xl transition-colors ${
                        pathname === "/about"
                          ? "bg-[#0F5C5A] text-white font-bold"
                          : "text-teal-100 hover:bg-[#0F5C5A]/60 hover:text-white"
                      }`}
                    >
                      About Us
                    </Link>
                    <a
                      href="https://learners.educonnects.co.in"
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => setMobileOpen(false)}
                      className="py-2.5 px-3.5 rounded-xl text-teal-100 hover:bg-[#0F5C5A]/60 hover:text-white transition-colors flex items-center justify-between"
                    >
                      <span>For Learners</span>
                    </a>
                    <a
                      href="https://educators.educonnects.co.in"
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => setMobileOpen(false)}
                      className="py-2.5 px-3.5 rounded-xl text-teal-100 hover:bg-[#0F5C5A]/60 hover:text-white transition-colors flex items-center justify-between"
                    >
                      <span>For Educators</span>
                    </a>
                    <Link
                      href="/#success-stories"
                      onClick={() => setMobileOpen(false)}
                      className="py-2.5 px-3.5 rounded-xl text-teal-100 hover:bg-[#0F5C5A]/60 hover:text-white transition-colors"
                    >
                      Success Stories
                    </Link>
                    <Link
                      href="/contact"
                      onClick={() => setMobileOpen(false)}
                      className={`py-2.5 px-3.5 rounded-xl transition-colors ${
                        pathname === "/contact"
                          ? "bg-[#0F5C5A] text-white font-bold"
                          : "text-teal-100 hover:bg-[#0F5C5A]/60 hover:text-white"
                      }`}
                    >
                      Contact Us
                    </Link>
                  </>
                )}
              </nav>

              {/* Mobile Auth Actions */}
              {isLearner ? (
                <div className="pt-3 border-t border-blue-400/20 flex flex-col gap-2">
                  {userSession && isLearnerRole(userSession.role) ? (
                    <>
                      <Link
                        href={getLearnerSubdomainUrl("/student/dashboard")}
                        onClick={() => setMobileOpen(false)}
                        className="w-full py-2.5 rounded-xl bg-[#3157D5] hover:bg-[#1E3185] text-white text-sm font-bold shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <LayoutDashboard className="h-4 w-4" />
                        <span>Learner Dashboard</span>
                      </Link>
                      <button
                        type="button"
                        onClick={(e) => {
                          setMobileOpen(false);
                          handleLogout(e);
                        }}
                        disabled={isLoggingOut}
                        className="w-full py-2 rounded-xl text-blue-200 hover:text-white text-xs font-bold text-center cursor-pointer"
                      >
                        Logout
                      </button>
                    </>
                  ) : (
                    <Link
                      href="/student/login"
                      onClick={() => setMobileOpen(false)}
                      className="w-full py-2.5 rounded-xl bg-[#3157D5] hover:bg-[#1E3185] text-white text-sm font-bold transition-colors text-center cursor-pointer block shadow-xs"
                    >
                      Login
                    </Link>
                  )}
                </div>
              ) : isEducator ? (
                <div className="pt-3 border-t border-[#16805B]/40 flex flex-col gap-2.5">
                  {userSession && isEducatorRole(userSession.role) ? (
                    <>
                      <Link
                        href={getEducatorSubdomainUrl("/teacher/dashboard")}
                        onClick={() => setMobileOpen(false)}
                        className="w-full py-2.5 rounded-xl text-white text-sm font-semibold shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer bg-[#16805B] hover:bg-[#12684A] border border-emerald-400/30"
                      >
                        <LayoutDashboard className="h-4 w-4" />
                        <span>Educator Dashboard</span>
                      </Link>

                      <button
                        type="button"
                        onClick={(e) => {
                          setMobileOpen(false);
                          handleLogout(e);
                        }}
                        disabled={isLoggingOut}
                        className="w-full py-2 rounded-xl text-emerald-200 hover:text-white text-xs font-semibold flex items-center justify-center gap-2 border border-white/20 hover:bg-white/10 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {isLoggingOut ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin text-white" />
                        ) : (
                          <LogOut className="h-3.5 w-3.5 text-white" />
                        )}
                        <span>{isLoggingOut ? "Signing out..." : "Sign Out"}</span>
                      </button>
                    </>
                  ) : (
                    <>
                      <Link
                        href="/teacher/login"
                        onClick={() => setMobileOpen(false)}
                        className="w-full py-2.5 rounded-xl border border-white/25 text-white text-sm font-semibold hover:bg-white/10 transition-colors text-center cursor-pointer block shadow-2xs"
                      >
                        Educator Login
                      </Link>
                      <Link
                        href="/teacher/register"
                        onClick={() => setMobileOpen(false)}
                        className="w-full py-2.5 rounded-xl text-white text-sm font-semibold shadow-sm transition-colors flex items-center justify-center gap-1.5 cursor-pointer bg-[#16805B] hover:bg-[#12684A] border border-emerald-400/30"
                      >
                        <span>Become an Educator</span>
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </>
                  )}
                </div>
              ) : null}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
