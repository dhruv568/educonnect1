"use client";

import React, { useState, useEffect } from "react";
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
  ShieldCheck,
  Lock,
  Mail,
  ArrowRight,
  Shield,
  Activity,
  KeyRound,
  FileCode2,
  Server,
  Fingerprint,
  Eye,
  EyeOff,
} from "lucide-react";

export default function AdminLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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
            if (role === "ADMIN") {
              window.location.replace("/admin");
              return;
            } else if (role === "STAFF") {
              window.location.replace("/staff/dashboard");
              return;
            } else if (isEducatorRole(role)) {
              window.location.replace("/teacher/dashboard");
              return;
            } else if (isLearnerRole(role)) {
              window.location.replace("/student/dashboard");
              return;
            } else {
              window.location.replace("/admin");
              return;
            }
          }
        }
      } catch {}

      // If admin has only entered password and is waiting for OTP verification:
      // Return them to the OTP verification step rather than creating another attempt.
      try {
        const searchParams = new URLSearchParams(window.location.search);
        if (searchParams.get("restart") === "true") {
          document.cookie = "admin_pending_otp=; path=/; max-age=0;";
          return;
        }

        const cookies = typeof document !== "undefined" ? document.cookie.split(";").map((c) => c.trim()) : [];
        const pendingOtpCookie = cookies.find((c) => c.startsWith("admin_pending_otp="));
        if (pendingOtpCookie) {
          const pendingEmail = decodeURIComponent(pendingOtpCookie.split("=")[1] || "educonnects.com@gmail.com");
          window.location.replace(`/verify-email?email=${encodeURIComponent(pendingEmail)}&redirectTo=/admin`);
          return;
        }
      } catch {}
    };

    checkAuthenticatedState();

    const onPageShow = (event: PageTransitionEvent) => {
      checkAuthenticatedState();
    };

    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, []);

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      showToast("Password Required", "Please enter your admin password.", "error");
      return;
    }
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Admin login failed.");

      if (data.data?.user?.role && data.data?.user?.role !== "ADMIN") {
        throw new Error("Access denied: Account does not possess Administrative privileges.");
      }

      if (data.data?.requiresVerification || data.data?.requiresOtp) {
        showToast("Verification Code Dispatched ✉️", "A 6-digit OTP has been sent to your authorized admin email.", "info");
        const targetEmail = data.data?.user?.email || email.trim();
        router.push(`/verify-email?email=${encodeURIComponent(targetEmail)}&redirectTo=/admin`);
        return;
      }

      // Admin MUST NEVER be granted dashboard access without completing OTP verification
      throw new Error("Mandatory two-factor OTP verification is required to complete Admin login.");
    } catch (err: any) {
      showToast("Authorization Error", err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-white relative overflow-hidden">
      {/* Ambient Cyber Grid & Glow Backdrop */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(59,130,246,0.18),rgba(255,255,255,0))] pointer-events-none" />
      <div className="absolute top-1/4 -left-48 w-96 h-96 bg-blue-600/10 blur-[100px] rounded-full pointer-events-none" />
      <div className="absolute bottom-1/4 -right-48 w-96 h-96 bg-indigo-600/10 blur-[100px] rounded-full pointer-events-none" />

      {/* Floating Header */}
      <FloatingNavbar />

      <main className="flex-1 pt-28 sm:pt-36 pb-20 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 w-full relative z-10 flex items-center">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center w-full">
          {/* Left Column: Security Showcase & Governance Telemetry */}
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/25 text-blue-400 text-xs font-bold uppercase tracking-wider backdrop-blur-md">
              <ShieldCheck className="h-4 w-4 text-blue-400" />
              <span>EduConnects Core Governance Portal</span>
            </div>

            <div className="space-y-3">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight">
                Restricted System <br />
                <span className="bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent">
                  Administration Gateway
                </span>
              </h1>
              <p className="text-sm sm:text-base text-slate-300 max-w-xl leading-relaxed">
                Centralized management for instructor verification audits, escrow payouts, WebRTC classroom monitoring, and platform curriculum governance.
              </p>
            </div>

            {/* Security Pillars Visual Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800/90 backdrop-blur-md space-y-2 group hover:border-blue-500/40 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400">
                    <Shield className="h-5 w-5" />
                  </div>
                  <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Enforced
                  </span>
                </div>
                <h4 className="text-sm font-bold text-white">256-bit TLS Gateway</h4>
                <p className="text-xs text-slate-400">Hardware-level session tokens and cryptographic request signing.</p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800/90 backdrop-blur-md space-y-2 group hover:border-indigo-500/40 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400">
                    <Fingerprint className="h-5 w-5" />
                  </div>
                  <span className="text-[10px] font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/20">
                    2FA Ready
                  </span>
                </div>
                <h4 className="text-sm font-bold text-white">Multi-Factor OTP</h4>
                <p className="text-xs text-slate-400">Time-sensitive verification challenge delivered to authorized admin inbox.</p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800/90 backdrop-blur-md space-y-2 group hover:border-purple-500/40 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400">
                    <FileCode2 className="h-5 w-5" />
                  </div>
                  <span className="text-[10px] font-bold text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full">
                    Immutable
                  </span>
                </div>
                <h4 className="text-sm font-bold text-white">Audit Trail Logging</h4>
                <p className="text-xs text-slate-400">Every administrative query, state mutation, and approval is recorded.</p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800/90 backdrop-blur-md space-y-2 group hover:border-emerald-500/40 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400">
                    <Server className="h-5 w-5" />
                  </div>
                  <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                    99.98% SLA
                  </span>
                </div>
                <h4 className="text-sm font-bold text-white">Telemetry & Health</h4>
                <p className="text-xs text-slate-400">Live database query latency and WebRTC socket connection health.</p>
              </div>
            </div>

            {/* Active Security Pulse Banner */}
            <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 text-xs text-slate-300">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
              </span>
              <span className="font-medium">
                System Governance Status: <strong className="text-white">Active & Fully Monitored</strong>
              </span>
            </div>
          </div>

          {/* Right Column: High-Security Auth Console Form */}
          <div className="lg:col-span-5">
            <GlassCard
              dark
              glowColor="rgba(59, 130, 246, 0.25)"
              className="p-6 sm:p-8 border border-slate-700/80 shadow-2xl bg-slate-900/90 backdrop-blur-2xl space-y-6"
            >
              <div className="space-y-3 pb-3 border-b border-slate-800">
                <Logo
                  variant="compact"
                  size="md"
                  theme="dark"
                  roleContext="admin"
                  href="/"
                  showTagline={true}
                  tagline="Learn • Grow • Belong"
                  priority
                />
                <div className="flex items-center gap-2 pt-1">
                  <div className="p-2 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-md">
                    <KeyRound className="h-4 w-4" />
                  </div>
                  <h2 className="text-xl font-black text-white tracking-tight">Admin Authentication</h2>
                </div>
                <p className="text-xs text-slate-400">Enter authorized admin email to receive a dynamic 6-digit OTP</p>
              </div>

              <form onSubmit={handleAdminLogin} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
                    Admin Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-blue-400" />
                    <input
                      type="email"
                      placeholder="educonnects.com@gmail.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      style={{ color: "#ffffff", WebkitTextFillColor: "#ffffff" }}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-800 text-white placeholder:text-slate-400 text-sm rounded-xl border border-slate-600 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/30 font-medium transition-all dark-input-crisp"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
                    Admin Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-blue-400" />
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      style={{ color: "#ffffff", WebkitTextFillColor: "#ffffff" }}
                      className="w-full pl-10 pr-10 py-2.5 bg-slate-800 text-white placeholder:text-slate-400 text-sm rounded-xl border border-slate-600 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/30 font-medium transition-all dark-input-crisp"
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1 transition-colors"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <GlassButton
                  type="submit"
                  variant="primary"
                  className="w-full mt-3 py-3 font-extrabold text-sm shadow-lg shadow-blue-600/20"
                  isLoading={loading}
                  rightIcon={<ShieldCheck className="h-4 w-4" />}
                >
                  Send Admin Verification OTP
                </GlassButton>
              </form>

              {/* Developer Fast-Fill Assistant */}
              <div className="pt-4 border-t border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-bold text-slate-400 uppercase tracking-wider">Authorized Admin Account:</span>
                  <span className="text-[10px] text-emerald-400 font-mono font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    2FA REQUIRED
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setEmail("educonnects.com@gmail.com");
                  }}
                  className="w-full py-2 px-3 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 text-blue-300 hover:text-blue-200 text-xs font-bold transition-all flex items-center justify-center gap-2 group"
                >
                  <span>Auto-fill Admin Email</span>
                  <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
                </button>
              </div>

              <p className="text-[10px] text-center text-slate-500 leading-normal">
                Access to this gateway is monitored and logged under strict governance protocols.
              </p>
            </GlassCard>
          </div>
        </div>
      </main>

      {/* Premium Footer with student CTA omitted on admin portal */}
      <PremiumFooter showCta={false} />
    </div>
  );
}
