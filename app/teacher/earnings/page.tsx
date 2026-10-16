"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  IndianRupee,
  TrendingUp,
  Clock,
  CheckCircle2,
  ShieldCheck,
  ListFilter,
  CreditCard,
  Building2,
  Smartphone,
  AlertCircle,
  CheckCircle,
  Loader2,
  Calendar,
  AlertOctagon,
  ArrowUpRight,
  ExternalLink,
  Percent,
} from "lucide-react";
import { formatCurrency } from "@/lib/currency";
import { BackButton } from "@/components/ui/back-button";
import { BackToHomeButton } from "@/components/ui/back-to-home-button";
import {
  MIN_PAYOUT_RUPEES,
  PLATFORM_FEE_PERCENT,
  NET_PAYOUT_PERCENT,
} from "@/lib/withdrawal-config";

export default function TeacherEarningsPage() {
  const [data, setData] = useState<any>(null);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingWithdrawals, setLoadingWithdrawals] = useState(true);

  useEffect(() => {
    fetchEarnings();
    fetchWithdrawalHistory();
  }, []);

  async function fetchEarnings() {
    try {
      const res = await fetch("/api/teacher/earnings");
      const json = await res.json();
      if (res.ok) {
        setData(json.data);
      }
    } catch {
      // Error
    } finally {
      setLoading(false);
    }
  }

  async function fetchWithdrawalHistory() {
    setLoadingWithdrawals(true);
    try {
      const res = await fetch("/api/teacher/withdraw");
      const json = await res.json();
      if (res.ok) {
        setWithdrawals(json.data?.withdrawals || []);
      }
    } catch {
      // Error
    } finally {
      setLoadingWithdrawals(false);
    }
  }

  const summary = data?.summary || {
    totalEarnings: 0,
    thisMonthEarnings: 0,
    platformFeeDeducted: 0,
    currentPlatformFee: 0,
    netEligibleBalance: 0,
    availableAmount: 0,
    pendingAmount: 0,
    minPayoutRequirement: MIN_PAYOUT_RUPEES,
    isEligibleForPayout: false,
    nextPayoutDateFormatted: "10th of every month",
    lastPayout: null,
  };

  const payoutDetails = data?.payoutDetails || {};
  const minPayout = summary.minPayoutRequirement || MIN_PAYOUT_RUPEES;
  const netBalance = summary.netEligibleBalance ?? summary.availableAmount ?? 0;
  const feePercent = data?.platformFeePercent ?? PLATFORM_FEE_PERCENT;
  const netPercent = data?.netPayoutPercent ?? NET_PAYOUT_PERCENT;
  const isEligible = netBalance >= minPayout;
  const nextPayoutDate = summary.nextPayoutDateFormatted || "10th of every month";
  const lastPayout = summary.lastPayout;

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "COMPLETED":
      case "PAID":
        return "bg-emerald-950/80 text-emerald-300 border-emerald-800";
      case "PENDING":
        return "bg-amber-950/80 text-amber-300 border-amber-800";
      case "APPROVED":
        return "bg-blue-950/80 text-blue-300 border-blue-800";
      case "PROCESSING":
        return "bg-teal-950/80 text-teal-300 border-teal-800 animate-pulse";
      case "REJECTED":
        return "bg-rose-950/80 text-rose-300 border-rose-800";
      case "FAILED":
        return "bg-red-950/80 text-red-300 border-red-800";
      default:
        return "bg-slate-800 text-slate-300 border-slate-700";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
        <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6 md:p-10 space-y-6 sm:space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-800/80 pb-6">
        <div>
          <div className="flex items-center gap-2.5 mb-3">
            <BackButton fallbackUrl="/teacher/dashboard" label="Back to Dashboard" variant="dark" />
            <BackToHomeButton variant="dark" />
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
            <IndianRupee className="w-8 h-8 text-emerald-400" /> Educator Earnings & Monthly Payouts
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Automated monthly educator payouts scheduled for the 10th of every month with 25% platform fee deduction.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/teacher/earnings/transactions"
            className="px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-xs font-bold text-slate-300 flex items-center gap-2 transition-all shadow-sm"
          >
            <ListFilter className="w-4 h-4 text-slate-400" /> Transaction Ledger
          </Link>
          <Link
            href="/teacher/onboarding"
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#0F766E] to-[#115E59] hover:from-[#115E59] hover:to-[#0F766E] text-xs font-bold text-white flex items-center gap-2 transition-all shadow-lg shadow-teal-700/20"
          >
            <CreditCard className="w-4 h-4" /> Bank Account Details
          </Link>
        </div>
      </div>

      {/* Monthly Payout Schedule Notice Banner */}
      <div className="p-5 rounded-3xl bg-gradient-to-r from-teal-950/80 via-slate-900/90 to-slate-900/80 border border-teal-800/50 backdrop-blur-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-xl">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2.5">
            <Calendar className="w-5 h-5 text-teal-400 shrink-0" />
            <h3 className="text-base font-bold text-white">
              Automated Monthly Payout Schedule: 10th of Every Month
            </h3>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-900/60 text-teal-300 border border-teal-700/50">
              Next: {nextPayoutDate}
            </span>
          </div>
          <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
            EduConnects automatically calculates and disburses your net earnings ({netPercent}%) directly to your verified bank account on the 10th of every month. No manual withdrawal request is required.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 shrink-0">
          <div className="px-4 py-2 rounded-2xl bg-slate-950/60 border border-slate-800 text-xs">
            <span className="text-slate-400 block text-[10px]">Minimum Payout Threshold</span>
            <span className="text-white font-extrabold text-sm">{formatCurrency(minPayout)}</span>
          </div>
        </div>
      </div>

      {/* Primary Metrics Grid: Earnings Breakdown */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Total Gross Earnings */}
        <div className="p-6 rounded-3xl bg-slate-900/70 border border-slate-800/80 backdrop-blur-xl space-y-2 shadow-xl">
          <div className="flex justify-between items-center text-slate-400 text-xs font-semibold">
            <span>Total Earnings</span>
            <IndianRupee className="w-4 h-4 text-teal-400" />
          </div>
          <p className="text-3xl font-black text-white">{formatCurrency(summary.totalEarnings)}</p>
          <p className="text-[11px] text-teal-400 font-medium flex items-center gap-1">
            <TrendingUp className="w-3 h-3" /> Cumulative gross earnings (100%)
          </p>
        </div>

        {/* Platform Fee (25%) */}
        <div className="p-6 rounded-3xl bg-slate-900/70 border border-slate-800/80 backdrop-blur-xl space-y-2 shadow-xl">
          <div className="flex justify-between items-center text-slate-400 text-xs font-semibold">
            <span>Platform Fee ({feePercent}%)</span>
            <Percent className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-3xl font-black text-amber-400">
            {formatCurrency(summary.currentPlatformFee || (summary.totalEarnings * feePercent) / 100)}
          </p>
          <p className="text-[11px] text-slate-400">
            Deducted once before monthly payout
          </p>
        </div>

        {/* Net Eligible Balance (75%) */}
        <div className="p-6 rounded-3xl bg-slate-900/70 border border-teal-700/40 backdrop-blur-xl space-y-2 shadow-xl relative overflow-hidden">
          <div className="flex justify-between items-center text-slate-300 text-xs font-semibold">
            <span>Net Eligible Balance ({netPercent}%)</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-3xl font-black text-emerald-400">{formatCurrency(netBalance)}</p>
          <p className="text-[11px] text-slate-300 font-medium">
            Net payout amount after 25% fee
          </p>
        </div>

        {/* Minimum Balance Status & Next Cycle Card */}
        <div className="p-6 rounded-3xl bg-slate-900/70 border border-slate-800/80 backdrop-blur-xl space-y-2 shadow-xl">
          <div className="flex justify-between items-center text-slate-400 text-xs font-semibold">
            <span>Minimum Requirement</span>
            <Building2 className="w-4 h-4 text-teal-400" />
          </div>
          <p className="text-3xl font-black text-white">{formatCurrency(minPayout)}</p>
          <div className="pt-0.5">
            {isEligible ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-800/50">
                <CheckCircle className="w-3 h-3" /> Eligible for next payout
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded-md border border-amber-800/50">
                <Clock className="w-3 h-3" /> Carries forward to next cycle
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Threshold / Payout Status Banner */}
      {!isEligible && netBalance > 0 && (
        <div className="p-4 rounded-2xl bg-amber-950/30 border border-amber-800/40 text-amber-200 text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              Your current net eligible balance of <strong>{formatCurrency(netBalance)}</strong> is below the minimum payout requirement of <strong>{formatCurrency(minPayout)}</strong>. This balance will safely carry forward to the next monthly cycle on <strong>{nextPayoutDate}</strong>.
            </span>
          </div>
          <span className="text-[11px] text-amber-400 font-mono bg-amber-900/40 px-2.5 py-1 rounded-lg border border-amber-800/60 shrink-0">
            Status: Carry Forward
          </span>
        </div>
      )}

      {/* Last Payout & Verified Bank Snapshot */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Last Payout Snapshot */}
        <div className="p-6 rounded-3xl bg-slate-900/70 border border-slate-800/80 backdrop-blur-xl space-y-4 shadow-xl">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-teal-400" /> Last Payout Information
            </h3>
            {lastPayout && (
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${getStatusBadgeClass(lastPayout.status)}`}>
                {lastPayout.status}
              </span>
            )}
          </div>

          {lastPayout ? (
            <div className="space-y-3">
              <div className="flex items-baseline justify-between border-b border-slate-800/60 pb-3">
                <span className="text-xs text-slate-400">Net Disbursed Amount:</span>
                <span className="text-2xl font-black text-white">{formatCurrency(lastPayout.amountRupees)}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs text-slate-300">
                <div>
                  <span className="text-[10px] text-slate-400 block">Gross Earnings</span>
                  <span className="font-semibold">{formatCurrency(lastPayout.grossRupees)}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Platform Fee (25%)</span>
                  <span className="font-semibold text-amber-400">{formatCurrency(lastPayout.feeRupees)}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Payout Date</span>
                  <span className="font-semibold">
                    {new Date(lastPayout.requestedAt).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Bank Reference / UTR</span>
                  <span className="font-mono text-[11px] text-teal-300 truncate block">
                    {lastPayout.providerReferenceId || "—"}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-6 text-center text-slate-400 text-xs space-y-1">
              <Clock className="w-8 h-8 mx-auto text-slate-600 mb-2" />
              <p className="font-semibold text-slate-300">No previous payouts processed yet.</p>
              <p className="text-slate-500 text-[11px]">Your eligible earnings will be automatically disbursed on the 10th of every month.</p>
            </div>
          )}
        </div>

        {/* Verified Bank Account Snapshot */}
        <div className="p-6 rounded-3xl bg-slate-900/70 border border-slate-800/80 backdrop-blur-xl space-y-4 shadow-xl flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" /> Verified Payout Bank Account
              </h3>
              <Link
                href="/teacher/onboarding"
                className="text-[11px] text-teal-400 hover:text-teal-300 flex items-center gap-1 font-semibold"
              >
                Update <ArrowUpRight className="w-3 h-3" />
              </Link>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Account Holder:</span>
                <span className="text-white font-medium">{payoutDetails.accountHolderName || "Configured in KYC"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Bank & IFSC:</span>
                <span className="text-white font-medium">
                  {payoutDetails.bankName || "Bank"} ({payoutDetails.ifscCode || "N/A"})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Account Number:</span>
                <span className="text-emerald-400 font-mono font-medium">
                  {payoutDetails.accountNumber ? `•••• •••• ${payoutDetails.accountNumber.slice(-4)}` : "Missing"}
                </span>
              </div>
              {payoutDetails.upiId && (
                <div className="flex justify-between">
                  <span className="text-slate-400">UPI ID:</span>
                  <span className="text-blue-400 font-mono">{payoutDetails.upiId}</span>
                </div>
              )}
            </div>
          </div>

          <p className="text-[11px] text-slate-400 leading-relaxed">
            Payouts are deposited automatically via IMPS/NEFT bank transfer on the 10th of every month. Ensure your bank details are verified.
          </p>
        </div>
      </div>

      {/* Payout History Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Clock className="w-5 h-5 text-teal-400" /> Monthly Payout History
          </h2>
          <span className="text-xs text-slate-400">{withdrawals.length} payout cycle(s)</span>
        </div>

        <div className="rounded-3xl bg-slate-900/70 border border-slate-800/80 backdrop-blur-xl overflow-hidden shadow-xl">
          {loadingWithdrawals ? (
            <div className="p-10 flex items-center justify-center text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin text-teal-400 mr-2" /> Loading payout records...
            </div>
          ) : withdrawals.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-slate-800/80 text-slate-400 flex items-center justify-center mx-auto">
                <Calendar className="w-6 h-6 text-teal-400" />
              </div>
              <h3 className="text-sm font-semibold text-slate-300">No Monthly Payouts Yet</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Automatic payouts are scheduled for the 10th of every month when your net eligible balance reaches {formatCurrency(minPayout)} or more.
              </p>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-[11px] font-semibold text-slate-400 uppercase tracking-wider bg-slate-950/40">
                      <th className="py-3.5 px-6">Payout Date</th>
                      <th className="py-3.5 px-6">Total Earnings</th>
                      <th className="py-3.5 px-6">Platform Fee (25%)</th>
                      <th className="py-3.5 px-6">Net Payout (75%)</th>
                      <th className="py-3.5 px-6">Destination</th>
                      <th className="py-3.5 px-6">Status</th>
                      <th className="py-3.5 px-6">Reference / UTR</th>
                      <th className="py-3.5 px-6">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-xs">
                    {withdrawals.map((item) => {
                      const grossAmt = item.grossAmount ?? ((item.amountPaise || 0) / 75);
                      const feeAmt = item.platformFeeAmount ?? (grossAmt * 0.25);
                      const netAmt = item.netPayoutAmount ?? ((item.amountPaise || 0) / 100);

                      return (
                        <tr key={item.id} className="hover:bg-slate-800/30 transition-colors">
                          <td className="py-4 px-6 text-slate-300 font-medium">
                            {new Date(item.requestedAt).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </td>
                          <td className="py-4 px-6 text-slate-300">
                            {formatCurrency(grossAmt)}
                          </td>
                          <td className="py-4 px-6 text-amber-400">
                            {formatCurrency(feeAmt)}
                          </td>
                          <td className="py-4 px-6 font-bold text-emerald-400">
                            {formatCurrency(netAmt)}
                          </td>
                          <td className="py-4 px-6 text-slate-300 font-mono text-[11px]">
                            {item.payoutMethod === "UPI" && item.upiId ? (
                              <span className="flex items-center gap-1">
                                <Smartphone className="w-3.5 h-3.5 text-blue-400" /> {item.upiId}
                              </span>
                            ) : (
                              <span className="flex items-center gap-1">
                                <Building2 className="w-3.5 h-3.5 text-emerald-400" />
                                {item.accountNumber ? `••••${item.accountNumber.slice(-4)}` : "Bank"}
                                {item.ifscCode && ` (${item.ifscCode})`}
                              </span>
                            )}
                          </td>
                          <td className="py-4 px-6">
                            <span
                              className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold border ${getStatusBadgeClass(
                                item.status
                              )}`}
                            >
                              {item.status}
                            </span>
                          </td>
                          <td className="py-4 px-6 text-slate-400 font-mono text-[11px]">
                            {item.providerReferenceId || item.providerTransferId || "—"}
                          </td>
                          <td className="py-4 px-6 text-slate-400 text-[11px] max-w-xs truncate">
                            {item.rejectionReason ? (
                              <span className="text-rose-400">Rejected: {item.rejectionReason}</span>
                            ) : item.failureReason ? (
                              <span className="text-red-400">Failed: {item.failureReason}</span>
                            ) : item.adminNotes ? (
                              item.adminNotes
                            ) : (
                              "—"
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card List */}
              <div className="md:hidden divide-y divide-slate-800/60">
                {withdrawals.map((item) => {
                  const grossAmt = item.grossAmount ?? ((item.amountPaise || 0) / 75);
                  const feeAmt = item.platformFeeAmount ?? (grossAmt * 0.25);
                  const netAmt = item.netPayoutAmount ?? ((item.amountPaise || 0) / 100);

                  return (
                    <div key={item.id} className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="text-[10px] text-slate-400 block font-semibold">
                            {new Date(item.requestedAt).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </span>
                          <p className="text-lg font-black text-emerald-400 mt-0.5">
                            {formatCurrency(netAmt)}
                          </p>
                        </div>
                        <span
                          className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold border shrink-0 ${getStatusBadgeClass(
                            item.status
                          )}`}
                        >
                          {item.status}
                        </span>
                      </div>

                      <div className="bg-slate-950/60 rounded-xl p-3 border border-slate-800/80 text-xs space-y-1.5">
                        <div className="flex justify-between text-slate-300">
                          <span className="text-slate-400 text-[11px]">Gross Earnings:</span>
                          <span>{formatCurrency(grossAmt)}</span>
                        </div>
                        <div className="flex justify-between text-slate-300">
                          <span className="text-slate-400 text-[11px]">Platform Fee (25%):</span>
                          <span className="text-amber-400">{formatCurrency(feeAmt)}</span>
                        </div>
                        <div className="flex justify-between text-slate-300">
                          <span className="text-slate-400 text-[11px]">Net Disbursed:</span>
                          <span className="font-bold text-emerald-400">{formatCurrency(netAmt)}</span>
                        </div>
                        {(item.providerReferenceId || item.providerTransferId) && (
                          <div className="pt-1 text-[10px] text-slate-400 font-mono truncate">
                            Ref: {item.providerReferenceId || item.providerTransferId}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
