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
import { Logo } from "@/components/brand/logo";
import {
  Mail,
  Lock,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Sparkles,
  Video,
  Award,
} from "lucide-react";

export default function StudentLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

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
            if (isLearnerRole(role)) {
              window.location.replace("/student/dashboard");
            }
          }
        }
      } catch {}
    };

    checkAuthenticatedState();

    try {
      const searchParams = new URLSearchParams(window.location.search);
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
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Learner login failed.");

      if (data.data?.requiresVerification || data.data?.requiresOtp) {
        showToast(
          "Verification Code Sent ✉️",
          "Please enter the 6-digit OTP code sent to your email to complete login.",
          "info"
        );
        router.push(data.data.redirectPath || `/verify-email?email=${encodeURIComponent(email)}&redirectTo=/student/dashboard`);
      } else {
        showToast("Welcome Back!", `Signed in as ${data.data.user.firstName || "Learner"}`, "success");
        // Hard navigate to bypass client router cache
        const destination = data.data.redirectPath || "/student/dashboard";
        window.location.replace(destination);
      }
    } catch (err: any) {
      showToast("Authentication Error", err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 relative overflow-hidden font-sans">
      {/* Role-Specific Student Navbar */}
      <FloatingNavbar variant="student" />

      <main className="flex-1 pt-28 sm:pt-32 pb-20 max-w-5xl mx-auto px-4 sm:px-6 w-full flex items-center">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center w-full">
          {/* Left Column: Student Highlights & Social Proof */}
          <div className="lg:col-span-6 space-y-6 hidden lg:block">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#16805B]/10 border border-[#16805B]/20 text-[#16805B] text-xs font-bold uppercase tracking-wider">
              <BookOpen className="h-3.5 w-3.5 text-[#16805B]" />
              <span>Learner Portal</span>
            </div>

            <div className="space-y-3">
              <h1 className="text-4xl font-black text-slate-900 tracking-tight leading-tight">
                Resume Your <br />
                <span className="bg-gradient-to-r from-[#16805B] via-[#0D5C41] to-[#0A4732] bg-clip-text text-transparent">
                  Learning Journey
                </span>
              </h1>
              <p className="text-sm text-slate-600 leading-relaxed">
                Access your enrolled live classes, 1-on-1 sessions, self-paced video curricula, and verified certificates.
              </p>
            </div>

            {/* Feature Bullets */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-3 text-xs font-semibold text-slate-700">
                <div className="p-2 rounded-xl bg-emerald-100 text-[#16805B]">
                  <Video className="h-4 w-4" />
                </div>
                <span>Live interactive classrooms with whiteboard & live code sandbox</span>
              </div>
              <div className="flex items-center gap-3 text-xs font-semibold text-slate-700">
                <div className="p-2 rounded-xl bg-teal-100 text-teal-800">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
                <span>Direct 1-on-1 messaging & trial bookings with top verified educators</span>
              </div>
              <div className="flex items-center gap-3 text-xs font-semibold text-slate-700">
                <div className="p-2 rounded-xl bg-amber-100 text-amber-700">
                  <Award className="h-4 w-4" />
                </div>
                <span>Automated certificates and verifiable skill credentials upon completion</span>
              </div>
            </div>

            {/* Testimonial Quote */}
            <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-sm space-y-2">
              <div className="flex items-center gap-3">
                <img
                  src="/images/educators/educator_04.jpg"
                  alt="Learner"
                  className="w-9 h-9 rounded-full object-cover ring-2 ring-[#16805B]/30"
                />
                <div>
                  <div className="text-xs font-bold text-slate-900">Ananya Verma</div>
                  <div className="text-[10px] text-slate-500">Grade 11 CBSE • Physics & Math</div>
                </div>
              </div>
              <p className="text-xs text-slate-600 italic">
                &ldquo;EduConnects made it so easy to try out 2 different math mentors before enrolling. The live whiteboard is incredible!&rdquo;
              </p>
            </div>
          </div>

          {/* Right Column: Learner Login Form */}
          <div className="lg:col-span-6 max-w-md mx-auto w-full space-y-6">
            <div className="text-center lg:text-left space-y-2">
              <div className="flex justify-center lg:justify-start">
                <Logo variant="compact" size="md" roleContext="student" href="/" priority />
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900">
                Learner Sign In
              </h2>
              <p className="text-xs text-slate-500">
                Enter your credentials to access your EduConnects dashboard
              </p>
            </div>

            <GlassCard
              glowColor="rgba(22, 128, 91, 0.15)"
              className="p-7 sm:p-8 border border-white/90 shadow-xl space-y-6"
            >
              <form onSubmit={handleLogin} className="space-y-4">
                <Input
                  label="Learner Email Address"
                  type="email"
                  placeholder="learner@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  leftIcon={<Mail className="h-4 w-4 text-[#16805B]" />}
                />

                <Input
                  label="Password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  leftIcon={<Lock className="h-4 w-4 text-[#16805B]" />}
                />

                <div className="flex items-center justify-between text-xs font-semibold">
                  <Link href="/forgot-password" className="text-[#16805B] hover:underline">
                    Forgot password?
                  </Link>
                  <Link href="/student/register" className="text-slate-600 hover:text-[#16805B]">
                    Need an account?
                  </Link>
                </div>

                <GlassButton
                  type="submit"
                  variant="primary"
                  className="w-full mt-2 bg-[#16805B] hover:bg-[#0D5C41] border-[#16805B] shadow-[#16805B]/20 text-white"
                  isLoading={loading}
                  rightIcon={<ArrowRight className="h-4 w-4" />}
                >
                  Sign In as Learner
                </GlassButton>
              </form>
            </GlassCard>
          </div>
        </div>
      </main>

      <PremiumFooter />
    </div>
  );
}
