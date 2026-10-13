"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  CheckCircle2,
  ArrowRight,
  Download,
  Copy,
  Check,
  BookOpen,
  Sparkles,
  ShieldCheck,
  User,
  Mail,
  Calendar,
  CreditCard,
  ExternalLink,
  Award,
  Zap,
  HelpCircle,
} from "lucide-react";
import { formatCurrency } from "@/lib/currency";
import { BackButton } from "@/components/ui/back-button";
import { BackToHomeButton } from "@/components/ui/back-to-home-button";
import Logo from "@/components/brand/logo";

function PaymentSuccessContent() {
  const searchParams = useSearchParams();
  const transactionId = searchParams.get("transactionId");
  const orderIdParam =
    searchParams.get("order_id") ||
    searchParams.get("orderId") ||
    searchParams.get("cf_order_id");
  const courseSlug = searchParams.get("slug") || searchParams.get("courseSlug");
  const courseId = searchParams.get("courseId");
  const isFree = searchParams.get("free") === "true";

  const [payment, setPayment] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [copiedTxId, setCopiedTxId] = useState(false);

  // Fetch authenticated user
  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => setCurrentUser(d?.data?.user || null))
      .catch(() => setCurrentUser(null));
  }, []);

  // Fetch or verify payment status
  useEffect(() => {
    async function fetchStatus() {
      setLoading(true);
      try {
        let targetTxId = transactionId;

        // If returned from Cashfree redirect with order_id, verify payment server-side
        if (orderIdParam) {
          const verifyRes = await fetch("/api/payments/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ order_id: orderIdParam }),
          });

          const verifyData = await verifyRes.json();
          if (!verifyRes.ok) {
            throw new Error(
              verifyData.error || "Server-side payment verification failed."
            );
          }

          targetTxId = verifyData.data?.transactionId || targetTxId;
        }

        if (targetTxId) {
          const res = await fetch(`/api/payments/${targetTxId}`);
          const data = await res.json();
          if (res.ok && data?.data?.transaction) {
            setPayment(data.data.transaction);
          }
        }
      } catch (err: any) {
        setVerifyError(err.message || "Failed to verify payment status.");
      } finally {
        setLoading(false);
      }
    }
    fetchStatus();
  }, [transactionId, orderIdParam]);

  // Handle copying Transaction ID
  const handleCopyTxId = (idToCopy: string) => {
    if (!idToCopy) return;
    navigator.clipboard.writeText(idToCopy);
    setCopiedTxId(true);
    setTimeout(() => setCopiedTxId(false), 2500);
  };

  // Derived values for course details
  const displayTitle =
    payment?.productTitle ||
    searchParams.get("title") ||
    "Enrolled EduConnects Course";
  const displayTeacher = payment?.teacherName || "EduConnects Educator";
  const displayAmount = payment ? payment.amount : searchParams.get("amount") || 0;
  const displayTxId =
    payment?.internalReference ||
    transactionId ||
    orderIdParam ||
    "TXN-EDU-" + Math.floor(100000 + Math.random() * 900000);
  const displayDate = payment?.createdAt
    ? new Date(payment.createdAt).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : new Date().toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });

  const startLearningHref = courseSlug
    ? `/learn/${courseSlug}`
    : currentUser
    ? "/student/courses"
    : "/student/login";

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-between p-4 sm:p-6 md:p-10 relative overflow-hidden selection:bg-emerald-500/30 selection:text-emerald-200">
      {/* Background Animated Ambient Glow & Particle Blobs */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-gradient-to-b from-blue-600/15 via-emerald-500/10 to-transparent blur-[140px] pointer-events-none rounded-full" />
      <div className="absolute -bottom-20 right-0 w-[450px] h-[450px] bg-teal-500/10 blur-[130px] pointer-events-none rounded-full" />
      <div className="absolute top-1/3 -left-20 w-[400px] h-[400px] bg-indigo-500/10 blur-[120px] pointer-events-none rounded-full" />

      {/* Decorative Floating Confetti Particle Animation */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[10%] left-[15%] w-3 h-3 bg-emerald-400/60 rounded-full animate-ping duration-1000" />
        <div className="absolute top-[15%] right-[20%] w-2.5 h-2.5 bg-blue-400/60 rotate-45 animate-pulse" />
        <div className="absolute top-[25%] left-[80%] w-3 h-3 bg-amber-400/60 rounded-sm animate-bounce" />
        <div className="absolute top-[35%] left-[10%] w-2 h-2 bg-indigo-400/60 rounded-full animate-ping" />
        <div className="absolute top-[50%] right-[10%] w-3 h-3 bg-teal-400/60 rotate-12 animate-pulse" />
      </div>

      <div className="w-full max-w-4xl relative z-10 space-y-8 my-auto">
        {/* Top Header Navigation */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pb-4 border-b border-slate-800/80">
          <div className="flex items-center gap-3">
            <Logo variant="horizontal" size="md" theme="dark" href="/" />
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>256-Bit SSL Encrypted Verification</span>
            </div>
            <BackToHomeButton variant="dark" />
          </div>
        </div>

        {/* Hero Success Animated Section */}
        <div className="text-center space-y-5">
          {/* Success Checkmark Badge */}
          <div className="relative inline-flex items-center justify-center">
            <div className="absolute inset-0 rounded-full bg-emerald-500/20 blur-xl animate-pulse" />
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-gradient-to-br from-emerald-500/30 via-emerald-600/20 to-slate-900 text-emerald-400 border border-emerald-500/40 flex items-center justify-center shadow-2xl shadow-emerald-500/30 relative z-10 transition-transform duration-300 hover:scale-105">
              <div className="w-16 h-16 sm:w-18 sm:h-18 rounded-2xl bg-emerald-500/20 flex items-center justify-center border border-emerald-400/30 shadow-inner">
                <CheckCircle2 className="w-10 h-10 sm:w-12 sm:h-12 text-emerald-400 stroke-[2.2]" />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-bold tracking-wide uppercase">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              {isFree ? "Free Access Activated" : "Payment Verified • Order Confirmed"}
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight leading-tight">
              {isFree ? "Enrollment Successful! 🎉" : "Payment Successful! 🎉"}
            </h1>

            <p className="text-base sm:text-lg text-slate-300 max-w-xl mx-auto leading-relaxed">
              {isFree
                ? "Congratulations! Your free course pass is active. Get ready to transform your skills."
                : "Thank you for your purchase with EduConnects! Your transaction has been confirmed and instant course access is active."}
            </p>
          </div>
        </div>

        {/* Status Verification Loader / Error Warning */}
        {loading ? (
          <div className="p-8 rounded-3xl bg-slate-900/60 border border-slate-800 backdrop-blur-xl text-center space-y-3">
            <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm font-semibold text-slate-300">
              Verifying payment with payment gateway...
            </p>
          </div>
        ) : verifyError ? (
          <div className="p-6 rounded-3xl bg-red-950/40 border border-red-900/60 backdrop-blur-xl text-left space-y-2">
            <p className="text-sm font-bold text-red-300 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-red-400" />
              Payment Verification Update
            </p>
            <p className="text-xs text-red-300/80 leading-relaxed">{verifyError}</p>
          </div>
        ) : null}

        {/* Main 2-Column Responsive Card Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Course Information & Next Steps (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            {/* Course Information Card */}
            <div className="p-6 sm:p-7 rounded-3xl bg-slate-900/80 border border-slate-800/90 backdrop-blur-xl shadow-2xl space-y-6 relative overflow-hidden group hover:border-slate-700/80 transition-all">
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 blur-3xl pointer-events-none" />

              <div className="flex items-start gap-4">
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-emerald-600/30 to-[#0D5C41]/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0 shadow-lg">
                  <BookOpen className="w-7 h-7 sm:w-8 sm:h-8" />
                </div>

                <div className="space-y-1 min-w-0 flex-1">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-300 text-[11px] font-semibold border border-emerald-500/20">
                    <Zap className="w-3 h-3 text-emerald-400" />
                    Enrolled Course
                  </div>
                  <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight leading-snug truncate">
                    {displayTitle}
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-400 flex items-center gap-1.5">
                    <span>Educator:</span>
                    <span className="text-slate-200 font-semibold">
                      {displayTeacher}
                    </span>
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800/80 flex items-center gap-3">
                  <Award className="w-5 h-5 text-emerald-400 shrink-0" />
                  <div className="text-xs">
                    <p className="font-bold text-slate-200">Lifetime Access</p>
                    <p className="text-slate-400 text-[11px]">Stream anytime, anywhere</p>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800/80 flex items-center gap-3">
                  <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
                  <div className="text-xs">
                    <p className="font-bold text-slate-200">Verified Certificate</p>
                    <p className="text-slate-400 text-[11px]">Earned upon completion</p>
                  </div>
                </div>
              </div>

              {/* What Happens Next Checklist */}
              <div className="pt-2 border-t border-slate-800/80 space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  What Happens Next?
                </h3>
                <ul className="space-y-2 text-xs sm:text-sm text-slate-300">
                  <li className="flex items-start gap-2.5">
                    <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                      ✓
                    </div>
                    <span>
                      <strong className="text-white">Instant Course Unlocking:</strong> Your
                      course modules and live room links are active immediately.
                    </span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                      ✓
                    </div>
                    <span>
                      <strong className="text-white">Download Resources:</strong> Access
                      supplementary notes, source code, and exercise files.
                    </span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <div className="w-5 h-5 rounded-full bg-teal-500/20 text-teal-300 flex items-center justify-center shrink-0 mt-0.5">
                      ✓
                    </div>
                    <span>
                      <strong className="text-white">Interactive Support:</strong> Ask
                      questions directly to {displayTeacher} in discussion threads.
                    </span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Learner Information Card */}
            <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800/90 backdrop-blur-xl space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                  <User className="w-4 h-4 text-emerald-400" />
                  Learner Information
                </h3>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[11px] font-semibold">
                  {currentUser ? "Active Learner" : "Guest Purchase"}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-1">
                <div className="space-y-1">
                  <span className="text-slate-400 flex items-center gap-1.5 font-medium">
                    <User className="w-3.5 h-3.5 text-slate-500" /> Learner Name
                  </span>
                  <p className="font-bold text-white text-sm truncate">
                    {currentUser?.name || "EduConnects Learner"}
                  </p>
                </div>

                <div className="space-y-1">
                  <span className="text-slate-400 flex items-center gap-1.5 font-medium">
                    <Mail className="w-3.5 h-3.5 text-slate-500" /> Email Address
                  </span>
                  <p className="font-bold text-white text-sm truncate">
                    {currentUser?.email || payment?.studentEmail || "Registered Account Email"}
                  </p>
                </div>
              </div>

              {!currentUser && !loading && (
                <div className="mt-4 p-4 rounded-2xl bg-emerald-950/60 border border-emerald-500/30 text-left space-y-2">
                  <p className="text-xs font-bold text-emerald-200">
                    Important: Complete Your Learner Registration
                  </p>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    To start watching your lessons and track your certificate progress, finish setting up your learner password.
                  </p>
                  <Link
                    href="/student/register"
                    className="inline-flex items-center gap-2 mt-1 px-4 py-2 bg-[#16805B] hover:bg-[#0D5C41] text-white text-xs font-bold rounded-xl shadow-md transition-all"
                  >
                    Complete Free Registration <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Order & Financial Summary (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            <div className="p-6 sm:p-7 rounded-3xl bg-slate-900/80 border border-slate-800/90 backdrop-blur-xl shadow-2xl space-y-5 relative">
              <div className="flex justify-between items-center border-b border-slate-800 pb-4">
                <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-emerald-400" />
                  Purchase Details
                </h3>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[11px] font-bold">
                  PAID ✓
                </span>
              </div>

              {/* Transaction ID with 1-Click Copy */}
              <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2">
                <div className="flex justify-between items-center text-xs text-slate-400 font-medium">
                  <span>Transaction / Order ID</span>
                  {copiedTxId && (
                    <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                      Copied!
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-xs font-bold text-slate-100 truncate select-all">
                    {displayTxId}
                  </span>
                  <button
                    onClick={() => handleCopyTxId(displayTxId)}
                    title="Copy Transaction ID"
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors shrink-0"
                  >
                    {copiedTxId ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Date & Gateway Info */}
              <div className="space-y-3 text-xs border-b border-slate-800 pb-4">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-500" /> Purchase Date
                  </span>
                  <span className="text-slate-200 font-medium">{displayDate}</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <CreditCard className="w-3.5 h-3.5 text-slate-500" /> Gateway
                  </span>
                  <span className="text-slate-200 font-medium">
                    Cashfree Payments (UPI / Card)
                  </span>
                </div>
              </div>

              {/* Price Breakdown */}
              <div className="space-y-2 text-xs">
                <div className="flex justify-between items-center text-slate-400">
                  <span>Course Subtotal</span>
                  <span>{formatCurrency(displayAmount)}</span>
                </div>

                <div className="flex justify-between items-center text-slate-400">
                  <span>GST / Processing Fees</span>
                  <span className="text-emerald-400 font-medium">Included (₹0)</span>
                </div>

                <div className="pt-3 border-t border-slate-800 flex justify-between items-center text-base font-extrabold">
                  <span className="text-white">Total Amount Paid</span>
                  <span className="text-emerald-400 text-lg font-black">
                    {formatCurrency(displayAmount)}
                  </span>
                </div>
              </div>

              {/* Print / View Receipt */}
              <div className="pt-2">
                <Link
                  href={
                    transactionId
                      ? `/student/payments/${transactionId}`
                      : "/student/payments"
                  }
                  className="w-full py-2.5 bg-slate-950 hover:bg-slate-800 text-slate-300 hover:text-white font-semibold rounded-xl text-xs border border-slate-800 flex items-center justify-center gap-2 transition-all"
                >
                  <Download className="w-3.5 h-3.5" /> View Official Receipt
                </Link>
              </div>
            </div>

            {/* Support Note */}
            <div className="p-4 rounded-2xl bg-slate-900/50 border border-slate-800 text-center space-y-1.5">
              <p className="text-xs text-slate-400 flex items-center justify-center gap-1.5">
                <HelpCircle className="w-3.5 h-3.5 text-emerald-400" /> Need help with your order?
              </p>
              <p className="text-[11px] text-slate-400">
                Contact EduConnects Support at{" "}
                <a
                  href="mailto:support@educonnects.co.in"
                  className="text-emerald-400 hover:underline font-medium"
                >
                  support@educonnects.co.in
                </a>
              </p>
            </div>
          </div>
        </div>

        {/* Action CTAs: Start Learning & Go to Dashboard */}
        <div className="pt-4 border-t border-slate-800/80 flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Link
            href={startLearningHref}
            className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-[#16805B] via-[#0D5C41] to-[#16805B] hover:opacity-95 text-white font-black rounded-2xl shadow-xl shadow-emerald-900/30 flex items-center justify-center gap-2.5 text-base transition-all group hover:scale-[1.02]"
          >
            <span>Start Learning Now</span>
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>

          <Link
            href="/student/dashboard"
            className="w-full sm:w-auto px-7 py-4 bg-slate-900 hover:bg-slate-800 text-slate-200 font-bold rounded-2xl text-base border border-slate-800 flex items-center justify-center gap-2 transition-all hover:border-slate-700"
          >
            <span>Go to Dashboard</span>
            <ExternalLink className="w-4 h-4 text-slate-400" />
          </Link>
        </div>
      </div>

      {/* Footer Branding */}
      <footer className="w-full max-w-4xl pt-8 pb-4 text-center text-xs text-slate-400 border-t border-slate-900 mt-8 relative z-10">
        <p>© {new Date().getFullYear()} EduConnects. All rights reserved. Learn Better. Teach Smarter.</p>
      </footer>
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400 text-sm font-semibold">
          Loading course thank you page...
        </div>
      }
    >
      <PaymentSuccessContent />
    </Suspense>
  );
}
