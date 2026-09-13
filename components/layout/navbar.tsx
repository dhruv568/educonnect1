"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { GraduationCap, Menu, X, LogIn, UserPlus, LogOut, User, LayoutDashboard } from "lucide-react";
import { GlassButton } from "@/components/glass/glass-button";
import { UserSession } from "@/types/auth";
import { getLiveDomain } from "@/lib/app-url";

export function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userSession, setUserSession] = useState<UserSession | null>(null);

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
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleLogout = async () => {
    const wasTeacher = userSession?.role === "TEACHER";
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      setUserSession(null);
      setMobileMenuOpen(false);
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

  const getDashboardPath = (session: UserSession) => {
    if (session.role === "TEACHER") return "/teacher/dashboard";
    if (session.role === "ADMIN") return "/admin/dashboard";
    return "/student/dashboard";
  };

  const getDashboardLabel = (session: UserSession) => {
    if (session.role === "TEACHER") return "Educator Portal";
    if (session.role === "ADMIN") return "Admin Dashboard";
    return "Learner Dashboard";
  };

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 ${
          isScrolled
            ? "bg-white/95 backdrop-blur-md border-b border-[#DCE5E4] shadow-sm py-3"
            : "bg-transparent py-4"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="p-2 rounded-xl bg-[#0B4F4B] text-[#F2C14E] shadow-sm group-hover:scale-105 transition-transform">
              <GraduationCap className="h-6 w-6" />
            </div>
            <span className="text-xl font-black text-[#102A2A] tracking-tight">
              EDU<span className="text-[#0B4F4B]">CONNECTS</span>
            </span>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-8 text-sm font-semibold text-[#102A2A]">
            <Link href="/find-teachers" className="hover:text-[#0B4F4B] transition-colors">
              Find an Educator
            </Link>
            <Link href="/courses" className="hover:text-[#0B4F4B] transition-colors">
              Explore Courses
            </Link>
            <a href="/#how-it-works" className="hover:text-[#0B4F4B] transition-colors">
              How It Works
            </a>
            <a href={getLiveDomain()} className="hover:text-[#0B4F4B] transition-colors flex items-center gap-1.5 text-red-600 font-bold">
              <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
              🔴 Live
            </a>
            <Link href="/teacher" className="hover:text-[#0B4F4B] transition-colors text-[#1B6863] font-bold">
              Become an Educator
            </Link>
          </nav>

          {/* Desktop Action Buttons */}
          <div className="hidden lg:flex items-center gap-3">
            {!userSession ? (
              <>
                <Link href="/login">
                  <GlassButton
                    variant="ghost"
                    size="sm"
                    leftIcon={<LogIn className="h-4 w-4 text-[#5D7373]" />}
                  >
                    Login
                  </GlassButton>
                </Link>
                <Link href="/register">
                  <GlassButton
                    variant="primary"
                    size="sm"
                    className="bg-[#0B4F4B] hover:bg-[#073F3C] text-white rounded-full px-5 font-bold"
                    leftIcon={<UserPlus className="h-4 w-4" />}
                  >
                    Get Started
                  </GlassButton>
                </Link>
              </>
            ) : (
              <>
                <Link href={getDashboardPath(userSession)}>
                  <GlassButton variant="primary" size="sm" className="bg-[#0B4F4B] text-white">
                    {getDashboardLabel(userSession)}
                  </GlassButton>
                </Link>
                <Link href="/profile">
                  <GlassButton variant="secondary" size="sm" leftIcon={<User className="h-4 w-4" />}>
                    Profile
                  </GlassButton>
                </Link>
                <GlassButton variant="ghost" size="sm" onClick={handleLogout} leftIcon={<LogOut className="h-4 w-4" />}>
                  Logout
                </GlassButton>
              </>
            )}
          </div>

          {/* Mobile Hamburger Toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2.5 rounded-xl bg-[#F5F7F8] border border-[#DCE5E4] text-[#102A2A] hover:bg-[#DCE5E4] transition-colors"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </header>
    </>
  );
}
