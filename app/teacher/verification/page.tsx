"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { StatusBadge } from "@/components/ui/status-badge";
import { BackButton } from "@/components/ui/back-button";
import { useToast } from "@/components/ui/toast";
import { VerificationStatus, VerificationHistoryItem } from "@/types/auth";
import {
  ShieldCheck,
  Clock,
  XCircle,
  AlertOctagon,
  ArrowRight,
  RefreshCw,
  Mail,
  History,
  FileEdit,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Info,
} from "lucide-react";

export default function TeacherVerificationStatusPage() {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);

  const [statusData, setStatusData] = useState<{
    emailVerified: boolean;
    verificationStatus: VerificationStatus;
    submittedAt: string | null;
    verifiedAt: string | null;
    rejectedAt: string | null;
    suspendedAt: string | null;
    rejectionReason: string | null;
    suspensionReason: string | null;
    history: VerificationHistoryItem[];
  }>({
    emailVerified: false,
    verificationStatus: "PENDING",
    submittedAt: null,
    verifiedAt: null,
    rejectedAt: null,
    suspendedAt: null,
    rejectionReason: null,
    suspensionReason: null,
    history: [],
  });

  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/teacher/verification/status");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to fetch verification status");
      setStatusData(json.data);
    } catch (err: any) {
      showToast("Error", err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout role="TEACHER">
        <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
          <Loader2 className="h-10 w-10 text-[#0B4F4B] animate-spin" />
          <p className="text-sm font-semibold text-slate-600">Loading Verification Status...</p>
        </div>
      </DashboardLayout>
    );
  }

  const { verificationStatus, submittedAt, verifiedAt, rejectionReason, suspensionReason, history } = statusData;

  return (
    <DashboardLayout role="TEACHER">
      <div className="space-y-8 max-w-4xl mx-auto pb-16 font-sans">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <BackButton
              fallbackUrl="/teacher/dashboard"
              label="Back to Dashboard"
              variant="default"
              className="mb-3"
            />
            <h1 className="text-2xl lg:text-3xl font-black text-slate-900 tracking-tight">
              Teacher Verification Dashboard
            </h1>
            <p className="text-xs lg:text-sm text-slate-500 mt-1">
              EduConnects Administrative Credential & Verification Status
            </p>
          </div>
          <button
            onClick={fetchStatus}
            className="p-3 rounded-2xl bg-white border border-slate-200 text-slate-600 hover:text-[#0B4F4B] hover:border-[#0B4F4B] transition-colors shadow-2xs"
            title="Refresh Status"
          >
            <RefreshCw className="h-5 w-5" />
          </button>
        </div>

        {/* ========================================================================= */}
        {/* 1. VERIFIED STATE */}
        {/* ========================================================================= */}
        {verificationStatus === "VERIFIED" && (
          <div className="bg-white rounded-3xl border border-emerald-200 shadow-sm p-6 sm:p-8 space-y-6 overflow-hidden">
            <div className="bg-emerald-50/80 border border-emerald-100 p-6 rounded-2xl flex items-start gap-4 sm:gap-5">
              <div className="p-3.5 bg-emerald-600 text-white rounded-2xl shadow-md shadow-emerald-600/20 shrink-0">
                <ShieldCheck className="h-8 w-8" />
              </div>
              <div className="space-y-2 flex-1">
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="text-xl sm:text-2xl font-black text-emerald-950">
                    Congratulations! You are a Verified Educator
                  </h2>
                  <StatusBadge status="VERIFIED" />
                </div>
                <p className="text-xs sm:text-sm text-emerald-800 leading-relaxed font-medium">
                  Your identity documents, educational qualifications, and teacher credentials have been thoroughly reviewed and approved by EduConnects Platform Governance.
                </p>
                {verifiedAt && (
                  <p className="text-xs font-bold text-emerald-700">
                    Verified Date: {new Date(verifiedAt).toLocaleDateString()}
                  </p>
                )}
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-emerald-950 text-white flex flex-col sm:flex-row items-center justify-between gap-4 shadow-md">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
                <span className="text-xs font-bold text-emerald-100">
                  Your profile is published on the Public Teacher Platform catalog!
                </span>
              </div>
              <Link href="/teacher/dashboard">
                <button className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-extrabold transition-colors shadow-sm whitespace-nowrap">
                  Go to Teacher Dashboard
                </button>
              </Link>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 2. PENDING STATE */}
        {/* ========================================================================= */}
        {verificationStatus === "PENDING" && (
          <div className="bg-white rounded-3xl border border-amber-200 shadow-sm p-6 sm:p-8 space-y-6 overflow-hidden">
            <div className="bg-amber-50/80 border border-amber-100 p-6 rounded-2xl flex items-start gap-4 sm:gap-5">
              <div className="p-3.5 bg-amber-500 text-white rounded-2xl shadow-md shadow-amber-500/20 shrink-0">
                <Clock className="h-8 w-8 animate-pulse" />
              </div>
              <div className="space-y-2 flex-1">
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="text-xl sm:text-2xl font-black text-amber-950">
                    Application Under Review
                  </h2>
                  <StatusBadge status="PENDING" />
                </div>
                <div className="p-4 rounded-xl bg-white border border-amber-200/90 text-sm font-semibold text-amber-950 leading-relaxed shadow-2xs">
                  Thank You for applying. We shall verify your documents, and if they meet our policy requirements, the next round will proceed. You will be informed through our official email, WhatsApp, or via call.
                </div>
                {submittedAt && (
                  <p className="text-xs font-bold text-amber-700">
                    Submitted Date: {new Date(submittedAt).toLocaleDateString()}
                  </p>
                )}
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900 text-white flex flex-col sm:flex-row items-center justify-between gap-4 shadow-md">
              <div className="flex items-center gap-3 text-xs text-slate-300 font-medium">
                <Info className="h-5 w-5 text-amber-400 shrink-0" />
                <span>Need to update your details or add missing documents?</span>
              </div>
              <Link href="/teacher/onboarding">
                <button className="px-6 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/20 text-xs font-extrabold transition-colors flex items-center gap-2 whitespace-nowrap">
                  <FileEdit className="h-4 w-4" />
                  Edit Application Details
                </button>
              </Link>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 3. REJECTED STATE */}
        {/* ========================================================================= */}
        {verificationStatus === "REJECTED" && (
          <div className="bg-white rounded-3xl border border-rose-200 shadow-sm p-6 sm:p-8 space-y-6 overflow-hidden">
            {/* Header Banner */}
            <div className="bg-gradient-to-r from-rose-50 via-rose-50/50 to-white border border-rose-100 p-6 rounded-2xl flex items-start gap-4 sm:gap-5">
              <div className="p-3.5 bg-rose-600 text-white rounded-2xl shadow-md shadow-rose-600/20 shrink-0">
                <XCircle className="h-8 w-8" />
              </div>
              <div className="space-y-2 flex-1">
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="text-xl sm:text-2xl font-black text-rose-950">
                    Application Requires Changes
                  </h2>
                  <StatusBadge status="REJECTED" />
                </div>
                <p className="text-xs sm:text-sm text-rose-800 leading-relaxed font-medium">
                  Your recent application was reviewed by our verification team and requires corrections or additional information before approval.
                </p>
              </div>
            </div>

            {/* Rejection Reason Alert Box */}
            {rejectionReason && (
              <div className="p-5 rounded-2xl bg-[#FFF5F5] border border-rose-200 space-y-2.5">
                <div className="flex items-center gap-2 text-xs font-black text-rose-700 uppercase tracking-wider">
                  <AlertCircle className="h-4 w-4 text-rose-600" />
                  <span>Administrator Rejection Reason</span>
                </div>
                <div className="p-4 rounded-xl bg-white border border-rose-200/90 text-sm font-semibold text-rose-950 leading-relaxed shadow-2xs">
                  "{rejectionReason}"
                </div>
              </div>
            )}

            {/* Action Banner */}
            <div className="p-5 sm:p-6 rounded-2xl bg-slate-900 text-white flex flex-col sm:flex-row items-center justify-between gap-4 shadow-md">
              <div className="flex items-center gap-3 text-xs sm:text-sm text-slate-200 font-bold text-center sm:text-left">
                <Info className="h-5 w-5 text-rose-400 shrink-0 hidden sm:block" />
                <span>You can correct your documents and resubmit your application immediately.</span>
              </div>
              <Link href="/teacher/onboarding" className="w-full sm:w-auto">
                <button className="w-full sm:w-auto px-6 py-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-extrabold transition-all flex items-center justify-center gap-2 shadow-md hover:scale-[1.02]">
                  <span>Update Profile & Resubmit</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </Link>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 4. SUSPENDED STATE */}
        {/* ========================================================================= */}
        {verificationStatus === "SUSPENDED" && (
          <div className="bg-[#073F3C] text-white rounded-3xl border border-[#1B6863] shadow-xl p-6 sm:p-8 space-y-6 overflow-hidden">
            <div className="bg-[#052C2A] border border-[#1B6863] p-6 rounded-2xl flex items-start gap-4 sm:gap-5">
              <div className="p-3.5 bg-rose-600 text-white rounded-2xl shadow-md shrink-0">
                <AlertOctagon className="h-8 w-8" />
              </div>
              <div className="space-y-2 flex-1">
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="text-xl sm:text-2xl font-black text-white">
                    Account Temporarily Suspended
                  </h2>
                  <StatusBadge status="SUSPENDED" />
                </div>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  Your teacher account on EduConnects has been temporarily suspended by system administrators. Platform visibility and live class hosting are currently restricted.
                </p>
              </div>
            </div>

            {suspensionReason && (
              <div className="p-5 rounded-2xl bg-[#0B4F4B]/80 border border-rose-500/40 space-y-2">
                <span className="text-xs font-black text-rose-400 uppercase tracking-wider block">
                  Administrative Reason:
                </span>
                <p className="text-sm font-semibold text-white italic">"{suspensionReason}"</p>
              </div>
            )}

            <div className="p-5 rounded-2xl bg-[#052C2A] border border-[#1B6863] flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-xs text-slate-300">
                <strong className="text-white">Account Data Preserved:</strong> Your course data, qualifications, and history remain intact.
              </div>
              <Link href="/contact">
                <button className="px-6 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/20 text-xs font-bold transition-colors flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Contact Platform Support
                </button>
              </Link>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* AUDIT HISTORY TIMELINE */}
        {/* ========================================================================= */}
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-6 sm:p-8 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-[#E6F0EF] text-[#0B4F4B]">
                <History className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900">Verification History & Audit Log</h3>
                <p className="text-xs text-slate-500">Record of all platform administrative status changes</p>
              </div>
            </div>
            {history.length > 0 && (
              <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-slate-100 text-slate-700">
                {history.length} {history.length === 1 ? "Event" : "Events"}
              </span>
            )}
          </div>

          {history.length === 0 ? (
            <p className="text-xs text-slate-500 italic py-4 text-center">No verification status changes recorded yet.</p>
          ) : (
            <div className="relative border-l-2 border-slate-200 ml-4 space-y-6 pl-6 pt-2 pb-2">
              {history.map((item, idx) => (
                <div key={item.id || idx} className="relative group">
                  {/* Connected Bullet */}
                  <div className="absolute -left-[31px] top-1.5 w-4 h-4 rounded-full border-2 border-white bg-[#0B4F4B] shadow-xs group-hover:scale-125 transition-transform" />

                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="text-xs font-bold text-slate-900 flex items-center gap-2">
                        <span>Status Changed:</span>
                        <StatusBadge status={item.previousStatus} size="sm" />
                        <span className="text-slate-400">→</span>
                        <StatusBadge status={item.newStatus} size="sm" />
                      </div>
                      <span className="text-[11px] font-semibold text-slate-500">
                        {new Date(item.createdAt).toLocaleString()}
                      </span>
                    </div>

                    {item.reason && (
                      <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs text-slate-700 font-medium leading-relaxed">
                        Reason: <span className="font-semibold text-slate-900">"{item.reason}"</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
