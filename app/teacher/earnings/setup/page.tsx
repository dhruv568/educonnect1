"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, ShieldCheck, CheckCircle2, CreditCard, Sparkles, ExternalLink } from "lucide-react";
import { BackButton } from "@/components/ui/back-button";
import { BackToHomeButton } from "@/components/ui/back-to-home-button";

export default function TeacherPayoutSetupPage() {
  const [account, setAccount] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [onboarding, setOnboarding] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAccount() {
      try {
        const res = await fetch("/api/teacher/earnings");
        const json = await res.json();
        if (res.ok) {
          setAccount(json.data.payoutAccount);
        }
      } catch {
        // Error
      } finally {
        setLoading(false);
      }
    }
    fetchAccount();
  }, []);

  const handleStartOnboarding = async () => {
    setOnboarding(true);
    setMsg(null);
    try {
      const res = await fetch("/api/teacher/earnings/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Onboarding failed.");

      setAccount(json.data.payoutAccount);
      setMsg("Cashfree Split Payout Account activated successfully!");
    } catch (err: any) {
      setMsg(err.message || "Onboarding error.");
    } finally {
      setOnboarding(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-10 flex flex-col items-center">
      <div className="w-full max-w-xl space-y-6">
        <div className="flex items-center justify-between">
          <BackButton
            fallbackUrl="/teacher/earnings"
            label="Back to Earnings"
            variant="dark"
          />
          <BackToHomeButton variant="dark" />
        </div>

        <div className="bg-slate-900/80 border border-slate-800/90 rounded-3xl p-8 backdrop-blur-xl shadow-2xl space-y-6">
          <div className="text-center space-y-2">
            <div className="w-14 h-14 rounded-full bg-teal-500/20 text-teal-400 border border-teal-500/30 flex items-center justify-center mx-auto mb-2">
              <CreditCard className="w-7 h-7" />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Set Up Teacher Payouts</h1>
            <p className="text-xs text-slate-400">
              Onboard your Cashfree Split Account to receive direct settlements.
            </p>
          </div>

          {/* Steps */}
          <div className="space-y-3">
            {[
              { step: 1, title: "Account Information", desc: "EduConnects educator verification complete" },
              { step: 2, title: "Cashfree Split Onboarding", desc: "Payout vendor metadata registration" },
              { step: 3, title: "KYC Verification", desc: "Secure Cashfree partner check" },
              { step: 4, title: "Active Settlements", desc: "Automatic payout transfers enabled" },
            ].map((s) => (
              <div
                key={s.step}
                className="flex items-center gap-3 p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800/80"
              >
                <div
                  className={`w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center ${
                    account?.status === "ACTIVE" || s.step <= 2
                      ? "bg-[#0F766E] text-white"
                      : "bg-slate-800 text-slate-400"
                  }`}
                >
                  {s.step}
                </div>
                <div className="text-xs">
                  <p className="font-semibold text-slate-200">{s.title}</p>
                  <p className="text-slate-500">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {msg && (
            <p className="text-xs text-center font-medium text-emerald-400 bg-emerald-500/10 p-3 rounded-xl border border-emerald-500/20">
              {msg}
            </p>
          )}

          {/* CTA */}
          {account?.status === "ACTIVE" ? (
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-center space-y-2">
              <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-emerald-400">
                <CheckCircle2 className="w-4 h-4" /> Cashfree Split Account Active
              </div>
              <p className="text-[11px] text-slate-400 font-mono">Account ID: {account.providerAccountId}</p>
            </div>
          ) : (
            <button
              onClick={handleStartOnboarding}
              disabled={onboarding}
              className="w-full py-4 bg-gradient-to-r from-[#0F766E] to-[#115E59] hover:from-[#115E59] hover:to-[#0F766E] text-white font-bold rounded-2xl shadow-lg shadow-teal-700/25 flex items-center justify-center gap-2 text-sm transition-all disabled:opacity-50 cursor-pointer"
            >
              {onboarding ? "Connecting Cashfree Split..." : "Activate Cashfree Split Payout Account"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
