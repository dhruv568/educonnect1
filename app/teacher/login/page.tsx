"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FloatingNavbar } from "@/components/homepage/floating-navbar";
import { PremiumFooter } from "@/components/homepage/premium-footer";
import { GlassCard } from "@/components/glass/glass-card";
import { GlassBadge } from "@/components/glass/glass-badge";
import { GlassButton } from "@/components/glass/glass-button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { isEducatorRole } from "@/lib/auth/roles";
import { Logo } from "@/components/brand/logo";
import {
  Mail,
  Lock,
  ArrowRight,
  GraduationCap,
  Sparkles,
  TrendingUp,
  Video,
  ShieldCheck,
  IndianRupee,
  AlertCircle,
} from "lucide-react";

export default function TeacherLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);

  const router = useRouter();
  const { showToast } = useToast();

  // Authentication & Session Protection
  useEffect(() => {
    const checkAuthenticatedState = async () => {
      try {
        const res = await fetch("/api/auth/me", {
          cache: "no-store",
          headers: { Pragma: "no-cache" },
        });
        if (res.ok) {
          const json = await res.json();
          if (json?.data?.user) {
            const role = json.data.user.role;
            if (isEducatorRole(role)) {
              const isSubdomain = typeof window !== "undefined" && (window.location.hostname.startsWith("educator") || window.location.hostname.startsWith("teacher"));
              window.location.replace(isSubdomain ? "/dashboard" : "/teacher/dashboard");
              return;
            }
          }
        }
      } catch {}
    };

    checkAuthenticatedState();

    try {
      const searchParams = new URLSearchParams(window.location.search);
      if (searchParams.get("expired") === "true" || searchParams.get("reason") === "expired") {
        setSessionExpired(true);
      }
      if (searchParams.get("restart") === "true") {
        document.cookie = "educonnects_pending_otp=; path=/; max-age=0;";
      }
    } catch {}

    const onPageShow = () => {
      checkAuthenticatedState();
    };

    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Educator login failed. Please verify your credentials.");

      if (data.data?.requiresVerification || data.data?.requiresOtp) {
        showToast(
          "Verification Code Sent ✉️",
          "Please enter the 6-digit OTP code sent to your email to complete login.",
          "info"
        );
        if (data.data?.redirectPath) {
          router.push(data.data.redirectPath);
        } else {
          const isSubdomain = typeof window !== "undefined" && (window.location.hostname.startsWith("educator") || window.location.hostname.startsWith("teacher"));
          const target = isSubdomain ? "/dashboard" : "/teacher/dashboard";
          router.push(`/verify-email?email=${encodeURIComponent(email)}&redirectTo=${encodeURIComponent(target)}`);
        }
      } else {
        showToast("Welcome Back!", `Signed in as ${data.data?.user?.firstName || "Educator"}`, "success");
        // Strictly redirect to Educator Dashboard
        const isSubdomain = typeof window !== "undefined" && (window.location.hostname.startsWith("educator") || window.location.hostname.startsWith("teacher"));
        const target = data.data?.redirectPath || (isSubdomain ? "/dashboard" : "/teacher/dashboard");
        window.location.replace(target);
      }
    } catch (err: any) {
      showToast("Authentication Error", err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div data-theme="educator" className="min-h-screen flex flex-col bg-[#F0FDFA]/40 relative overflow-hidden font-sans">
      {/* Educator Navbar */}
      <FloatingNavbar variant="teacher" />

      <main className="flex-1 pt-28 sm:pt-32 pb-20 max-w-5xl mx-auto px-4 sm:px-6 w-full flex items-center">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center w-full">
          {/* Left Column: Educator Highlights */}
          <div className="lg:col-span-6 space-y-6 hidden lg:block">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#F0FDFA] border border-[#99F6E4] text-[#115E59] text-xs font-black uppercase tracking-wider shadow-2xs">
              <Sparkles className="h-3.5 w-3.5 text-[#0F766E]" />
              <span>Verified Educator Portal</span>
            </div>

            <div className="space-y-3">
              <h1 className="text-4xl font-black text-slate-900 tracking-tight leading-tight">
                Manage Your <br />
                <span className="bg-gradient-to-r from-[#0F766E] via-[#115E59] to-[#0F766E] bg-clip-text text-transparent">
                  Teaching Business
                </span>
              </h1>
              <p className="text-sm text-slate-600 leading-relaxed font-medium">
                Access your schedule, launch HD live classrooms, publish structured LMS video courses, and monitor automated direct bank payouts.
              </p>
            </div>

            {/* Feature Bullets */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-3 text-xs font-bold text-slate-700">
                <div className="p-2 rounded-xl bg-[#F0FDFA] text-[#0F766E] border border-[#99F6E4]">
                  <IndianRupee className="h-4 w-4" />
                </div>
                <span>Keep 85%+ of your revenue with automated Cashfree bank transfers</span>
              </div>
              <div className="flex items-center gap-3 text-xs font-bold text-slate-700">
                <div className="p-2 rounded-xl bg-[#F0FDFA] text-[#0F766E] border border-[#99F6E4]">
                  <Video className="h-4 w-4" />
                </div>
                <span>Built-in HD interactive classroom with whiteboards &amp; attendance tracking</span>
              </div>
              <div className="flex items-center gap-3 text-xs font-bold text-slate-700">
                <div className="p-2 rounded-xl bg-[#F0FDFA] text-[#0F766E] border border-[#99F6E4]">
                  <ShieldCheck className="h-4 w-4" />
                </div>
                <span>Verified educator trust badge to stand out in platform discovery</span>
              </div>
            </div>

            {/* Indian Educator Testimonial Snippet */}
            <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-sm space-y-2">
              <div className="flex items-center gap-3">
                <img
                  src="/images/educators/male-1.png"
                  alt="Prof. Vikramaditya Sen"
                  className="w-10 h-10 rounded-full object-cover ring-2 ring-[#0F766E]/30"
                />
                <div>
                  <div className="text-xs font-black text-slate-900">Prof. Vikramaditya Sen</div>
                  <div className="text-[10px] text-slate-500 font-semibold">Physics Mentor &amp; Olympiad Coach • Bangalore</div>
                </div>
              </div>
              <p className="text-xs text-slate-600 italic leading-relaxed">
                &ldquo;EduConnects eliminated all scheduling and payment friction. I teach motivated students with complete curriculum autonomy.&rdquo;
              </p>
            </div>
          </div>

          {/* Right Column: Educator Sign In Card */}
          <div className="lg:col-span-6 max-w-md mx-auto w-full space-y-6">
            <div className="text-center lg:text-left space-y-2">
              <div className="flex justify-center lg:justify-start">
                <Logo variant="compact" size="md" roleContext="teacher" href="/teacher" priority />
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                Educator Sign In
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Enter your educator credentials to access your teaching dashboard
              </p>
            </div>

            <GlassCard
              glowColor="rgba(15, 118, 110, 0.15)"
              className="p-7 sm:p-8 border border-white/90 shadow-xl space-y-6 bg-white/95"
            >
              {sessionExpired && (
                <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Your session has expired. Please sign in again to continue.</span>
                </div>
              )}

              <form onSubmit={handleLogin} className="space-y-4">
                <Input
                  label="Educator Email Address"
                  type="email"
                  placeholder="educator@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  leftIcon={<Mail className="h-4 w-4 text-[#0F766E]" />}
                />

                <Input
                  label="Password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  leftIcon={<Lock className="h-4 w-4 text-[#0F766E]" />}
                />

                <div className="flex items-center justify-between text-xs font-bold">
                  <Link href="/forgot-password" className="text-[#0F766E] hover:text-[#115E59] hover:underline">
                    Forgot password?
                  </Link>
                  <Link href="/teacher/register" className="text-slate-600 hover:text-[#115E59]">
                    Become an Educator →
                  </Link>
                </div>

                <GlassButton
                  type="submit"
                  variant="educator"
                  className="w-full mt-2 text-white font-black text-sm shadow-md"
                  isLoading={loading}
                  rightIcon={<ArrowRight className="h-4 w-4" />}
                >
                  Sign In to Educator Portal
                </GlassButton>
              </form>

              <div className="pt-2 text-center text-xs text-slate-500 border-t border-slate-100 font-medium">
                New to EduConnects?{" "}
                <Link href="/teacher/register" className="text-[#0F766E] hover:text-[#115E59] hover:underline font-bold">
                  Register as an Educator →
                </Link>
              </div>
            </GlassCard>
          </div>
        </div>
      </main>

      <PremiumFooter />
    </div>
  );
}
