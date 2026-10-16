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
import { isEducatorRole, isLearnerRole } from "@/lib/auth/roles";
import { isSafeRedirectPath, sanitizeRedirectUrl } from "@/lib/auth/redirect-validator";
import { Logo } from "@/components/brand/logo";
import { PhoneOtpLoginCard } from "@/components/auth/phone-otp-login-card";
import { LogIn, Mail, Phone, Lock, ArrowRight, Sparkles, AlertCircle } from "lucide-react";

export default function LoginPage() {
  const [authMethod, setAuthMethod] = useState<"EMAIL" | "PHONE">("EMAIL");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);

  const router = useRouter();
  const { showToast } = useToast();

  // Authentication & Back-Button (bfcache) Protection
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
            const isLearnerHost =
              typeof window !== "undefined" &&
              (window.location.hostname.startsWith("learners.") ||
                window.location.hostname.startsWith("learner.") ||
                window.location.hostname.startsWith("students.") ||
                window.location.hostname.startsWith("student."));

            const isEducatorHost =
              typeof window !== "undefined" &&
              (window.location.hostname.startsWith("educator.") ||
                window.location.hostname.startsWith("educators.") ||
                window.location.hostname.startsWith("teacher.") ||
                window.location.hostname.startsWith("teachers."));

            const searchParams = new URLSearchParams(window.location.search);
            const returnTarget = searchParams.get("returnTo") || searchParams.get("redirectTo");
            const safeDestination = returnTarget && isSafeRedirectPath(returnTarget)
              ? sanitizeRedirectUrl(returnTarget)
              : null;

            if (isLearnerHost) {
              if (isLearnerRole(role)) {
                window.location.replace(safeDestination || "/dashboard");
              }
              return;
            }

            if (isEducatorHost) {
              if (isEducatorRole(role)) {
                window.location.replace(safeDestination || "/dashboard");
              }
              return;
            }

            if (safeDestination && (isLearnerRole(role) || isEducatorRole(role) || role === "ADMIN")) {
              window.location.replace(safeDestination);
              return;
            }

            if (isEducatorRole(role)) {
              window.location.replace(isEducatorHost ? "/dashboard" : "/teacher/dashboard");
            } else if (isLearnerRole(role)) {
              window.location.replace(isLearnerHost ? "/dashboard" : "/student/dashboard");
            } else if (role === "ADMIN") {
              window.location.replace("/admin");
            } else if (role === "STAFF") {
              window.location.replace("/staff/dashboard");
            } else {
              window.location.replace("/");
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
        document.cookie = "admin_pending_otp=; path=/; max-age=0;";
      }
    } catch {}

    const onPageShow = (event: PageTransitionEvent) => {
      checkAuthenticatedState();
    };

    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const searchParams = new URLSearchParams(window.location.search);
      const returnParam = searchParams.get("returnTo") || searchParams.get("redirectTo");
      const safeReturn = returnParam && isSafeRedirectPath(returnParam) ? sanitizeRedirectUrl(returnParam) : undefined;

      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, returnTo: safeReturn, redirectTo: safeReturn }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Login failed.");

      if (data.data?.requiresVerification || data.data?.requiresOtp) {
        showToast("Verification Code Sent ✉️", "Please enter the 6-digit OTP code sent to your email to complete login.", "info");
        const fallbackTarget = safeReturn
          ? `/verify-email?email=${encodeURIComponent(email)}&returnTo=${encodeURIComponent(safeReturn)}&redirectTo=${encodeURIComponent(safeReturn)}`
          : `/verify-email?email=${encodeURIComponent(email)}`;
        router.push(data.data.redirectPath || fallbackTarget);
      } else {
        showToast("Welcome Back!", `Signed in as ${data.data.user.firstName || "User"}`, "success");
        window.location.replace(data.data.redirectPath || safeReturn || "/");
      }
    } catch (err: any) {
      showToast("Authentication Error", err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 relative overflow-hidden font-sans">
      <FloatingNavbar />

      <main className="flex-1 pt-32 pb-20 max-w-5xl mx-auto px-4 sm:px-6 w-full flex items-center">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center w-full">
          {/* Left Column: Social Proof & Feature Highlights */}
          <div className="lg:col-span-6 space-y-6 hidden lg:block">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#16805B]/10 border border-[#16805B]/20 text-[#16805B] text-xs font-bold uppercase tracking-wider">
              <Sparkles className="h-3.5 w-3.5 text-[#16805B]" />
              <span>Welcome Back to EduConnects</span>
            </div>

            <div className="space-y-3">
              <h1 className="text-4xl font-black text-slate-900 tracking-tight leading-tight">
                Continue Your <br />
                <span className="bg-gradient-to-r from-[#0D5C41] via-[#16805B] to-[#35A979] bg-clip-text text-transparent">
                  Learning Momentum
                </span>
              </h1>
              <p className="text-sm text-slate-600 leading-relaxed">
                Access your personalized dashboard, live class schedule, 1-on-1 demo sessions, and recorded course library.
              </p>
            </div>

            {/* Testimonial Quote Card */}
            <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-sm space-y-3">
              <div className="flex items-center gap-3">
                <img
                  src="https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&auto=format&fit=crop&q=80"
                  alt="Student"
                  className="w-10 h-10 rounded-full object-cover ring-2 ring-[#16805B]/20"
                />
                <div>
                  <div className="text-xs font-bold text-slate-900">Priya Sharma</div>
                  <div className="text-[11px] text-slate-500">NEET Physics Aspirant (Score 170/180)</div>
                </div>
              </div>
              <p className="text-xs text-slate-600 italic leading-relaxed">
                &ldquo;Booking 1-on-1 trial demos first gave me total confidence in my tutor before any commitment. My physics score skyrocketed.&rdquo;
              </p>
            </div>

            {/* Trust Badges */}
            <div className="flex items-center gap-4 text-xs font-bold text-slate-600">
              <span className="flex items-center gap-1 text-[#16805B]">
                ★ 4.95 Rating
              </span>
              <span>•</span>
              <span className="flex items-center gap-1 text-[#16805B]">
                15,000+ Students
              </span>
              <span>•</span>
              <span className="flex items-center gap-1 text-[#0D5C41]">
                850+ Verified Tutors
              </span>
            </div>
          </div>

          {/* Right Column: Form */}
          <div className="lg:col-span-6 max-w-md mx-auto w-full space-y-6">
            <div className="text-center lg:text-left space-y-2">
              <div className="flex justify-center lg:justify-start">
                <Logo variant="compact" size="lg" href="/" priority />
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900">Sign In to EduConnects</h2>
              <p className="text-xs text-slate-500">Access your Teacher or Student Dashboard</p>
            </div>

            <GlassCard glowColor="rgba(22, 128, 91, 0.15)" className="p-7 sm:p-8 border border-white/90 shadow-xl space-y-6">
              {sessionExpired && (
                <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Your session has expired. Please sign in again to continue.</span>
                </div>
              )}

              {/* Method Switch: Email & Password vs Phone OTP */}
              <div className="flex p-1 bg-emerald-50/70 rounded-2xl border border-emerald-100">
                <button
                  type="button"
                  onClick={() => setAuthMethod("EMAIL")}
                  className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    authMethod === "EMAIL"
                      ? "bg-white text-[#16805B] shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Mail className="h-3.5 w-3.5" />
                  <span>Email & Password</span>
                </button>
                <button
                  type="button"
                  onClick={() => setAuthMethod("PHONE")}
                  className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    authMethod === "PHONE"
                      ? "bg-white text-[#16805B] shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Phone className="h-3.5 w-3.5" />
                  <span>Phone OTP</span>
                </button>
              </div>

              {authMethod === "EMAIL" ? (
                <form onSubmit={handleLogin} className="space-y-4">
                  <Input
                    label="Email Address"
                    type="email"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    leftIcon={<Mail className="h-4 w-4" />}
                  />

                  <Input
                    label="Password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    leftIcon={<Lock className="h-4 w-4" />}
                  />

                  <div className="flex items-center justify-between text-xs font-semibold">
                    <Link href="/forgot-password" className="text-[#16805B] hover:text-[#0D5C41] hover:underline">
                      Forgot password?
                    </Link>
                    <Link href="/register" className="text-slate-500 hover:text-slate-900">
                      Need an account?
                    </Link>
                  </div>

                  <GlassButton
                    type="submit"
                    variant="primary"
                    className="w-full mt-2"
                    isLoading={loading}
                    rightIcon={<ArrowRight className="h-4 w-4" />}
                  >
                    Sign In
                  </GlassButton>
                </form>
              ) : (
                <PhoneOtpLoginCard roleContext="general" />
              )}
            </GlassCard>

          </div>
        </div>
      </main>

      <PremiumFooter />
    </div>
  );
}
