"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  IndianRupee,
  TrendingUp,
  Clock,
  CheckCircle2,
  ShieldCheck,
  ArrowRight,
  ListFilter,
  CreditCard,
  ArrowDownCircle,
  Building2,
  Smartphone,
  X,
  AlertCircle,
  CheckCircle,
  Loader2,
  HelpCircle,
  ExternalLink,
} from "lucide-react";
import { formatCurrency } from "@/lib/currency";
import { BackButton } from "@/components/ui/back-button";
import { BackToHomeButton } from "@/components/ui/back-to-home-button";

export default function TeacherEarningsPage() {
  const [data, setData] = useState<any>(null);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingWithdrawals, setLoadingWithdrawals] = useState(true);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [payoutMethod, setPayoutMethod] = useState<"BANK_TRANSFER" | "UPI">("BANK_TRANSFER");
  const [withdrawAmount, setWithdrawAmount] = useState<string>("");
  const [upiIdInput, setUpiIdInput] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

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
        if (json.data?.payoutDetails?.upiId) {
          setUpiIdInput(json.data.payoutDetails.upiId);
        }
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
    pendingAmount: 0,
    availableAmount: 0,
    refundedAmount: 0,
  };

  const payoutAccount = data?.payoutAccount || { status: "NOT_STARTED" };
  const payoutDetails = data?.payoutDetails || {};

  // Check if educator has an active withdrawal in progress
  const activeWithdrawal = withdrawals.find((w) =>
    ["PENDING", "APPROVED", "PROCESSING"].includes(w.status)
  );

  const canWithdraw = summary.availableAmount >= 500 && !activeWithdrawal;

  const handleOpenModal = () => {
    setFormError(null);
    setFormSuccess(null);
    setWithdrawAmount("");
    if (payoutDetails.upiId) {
      setUpiIdInput(payoutDetails.upiId);
    }
    // Default to Bank if bank details exist, else UPI
    if (payoutDetails.accountNumber) {
      setPayoutMethod("BANK_TRANSFER");
    } else if (payoutDetails.upiId) {
      setPayoutMethod("UPI");
    }
    setIsModalOpen(true);
  };

  const handleQuickAmount = (amt: number) => {
    setWithdrawAmount(amt.toString());
    setFormError(null);
  };

  const handleMaxAmount = () => {
    setWithdrawAmount(Math.floor(summary.availableAmount).toString());
    setFormError(null);
  };

  const handleSubmitWithdrawal = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    const amountNum = parseFloat(withdrawAmount);
    if (isNaN(amountNum) || amountNum < 500) {
      setFormError("Minimum withdrawal amount is ₹500.");
      return;
    }

    if (amountNum > summary.availableAmount) {
      setFormError(
        `Amount cannot exceed your available balance of ${formatCurrency(summary.availableAmount)}.`
      );
      return;
    }

    if (payoutMethod === "BANK_TRANSFER") {
      if (!payoutDetails.accountNumber || !payoutDetails.ifscCode) {
        setFormError("Please configure your bank account number and IFSC code before requesting a bank transfer.");
        return;
      }
    } else if (payoutMethod === "UPI") {
      const trimmedUpi = upiIdInput.trim();
      const upiRegex = /^[\w.\-_]{2,256}@[a-zA-Z]{2,64}$/;
      if (!trimmedUpi || !upiRegex.test(trimmedUpi)) {
        setFormError("Please enter a valid UPI ID (e.g. yourname@okhdfcbank).");
        return;
      }
    }

    setSubmitting(true);
    try {
      const idempotencyKey = `wd_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      const res = await fetch("/api/teacher/withdraw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: amountNum,
          payoutMethod,
          upiId: payoutMethod === "UPI" ? upiIdInput.trim() : undefined,
          idempotencyKey,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to submit withdrawal request.");
      }

      setFormSuccess(
        `Withdrawal request for ${formatCurrency(amountNum)} submitted successfully. Funds are held in escrow pending admin settlement.`
      );
      // Refresh earnings summary and withdrawal history
      fetchEarnings();
      fetchWithdrawalHistory();

      setTimeout(() => {
        setIsModalOpen(false);
      }, 2000);
    } catch (err: any) {
      setFormError(err.message || "An unexpected error occurred.");
    } finally {
      setSubmitting(false);
    }
  };

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
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-10 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-800/80 pb-6">
        <div>
          <div className="flex items-center gap-2.5 mb-3">
            <BackButton fallbackUrl="/teacher/dashboard" label="Back to Dashboard" variant="dark" />
            <BackToHomeButton variant="dark" />
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
            <IndianRupee className="w-8 h-8 text-emerald-400" /> Educator Earnings & Withdrawals
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Real-time track of your course sales, live class earnings, commission, and bank/UPI payouts.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleOpenModal}
            disabled={!canWithdraw}
            className={`px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all shadow-lg ${
              canWithdraw
                ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/25 hover:shadow-emerald-600/40 cursor-pointer"
                : "bg-slate-800 text-slate-500 border border-slate-700/50 cursor-not-allowed"
            }`}
          >
            <ArrowDownCircle className="w-4 h-4" /> Withdraw Funds
          </button>
          <Link
            href="/teacher/earnings/transactions"
            className="px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-xs font-bold text-slate-300 flex items-center gap-2 transition-all shadow-sm"
          >
            <ListFilter className="w-4 h-4 text-slate-400" /> Transaction Ledger
          </Link>
          <Link
            href="/teacher/earnings/setup"
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#0F766E] to-[#115E59] hover:from-[#115E59] hover:to-[#0F766E] text-xs font-bold text-white flex items-center gap-2 transition-all shadow-lg shadow-teal-700/20"
          >
            <CreditCard className="w-4 h-4" /> Split Payouts
          </Link>
        </div>
      </div>

      {/* Active Withdrawal Banner if any */}
      {activeWithdrawal && (
        <div className="p-4 rounded-2xl bg-amber-950/30 border border-amber-800/40 text-amber-200 text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Clock className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              You have an active withdrawal request of{" "}
              <strong className="text-white font-semibold">
                {formatCurrency(activeWithdrawal.amountPaise / 100)}
              </strong>{" "}
              ({activeWithdrawal.status}). Additional withdrawals are temporarily disabled until processed.
            </span>
          </div>
          <span className="text-[11px] text-amber-400 font-mono bg-amber-900/40 px-2.5 py-1 rounded-lg border border-amber-800/60">
            Status: {activeWithdrawal.status}
          </span>
        </div>
      )}

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="p-6 rounded-3xl bg-slate-900/70 border border-slate-800/80 backdrop-blur-xl space-y-2 shadow-xl">
          <div className="flex justify-between items-center text-slate-400 text-xs font-semibold">
            <span>Total Gross Earnings</span>
            <IndianRupee className="w-4 h-4 text-teal-400" />
          </div>
          <p className="text-3xl font-black text-white">{formatCurrency(summary.totalEarnings)}</p>
          <p className="text-[11px] text-teal-400 font-medium flex items-center gap-1">
            <TrendingUp className="w-3 h-3" /> Cumulative earnings to date
          </p>
        </div>

        <div className="p-6 rounded-3xl bg-slate-900/70 border border-slate-800/80 backdrop-blur-xl space-y-2 shadow-xl">
          <div className="flex justify-between items-center text-slate-400 text-xs font-semibold">
            <span>This Month</span>
            <TrendingUp className="w-4 h-4 text-teal-300" />
          </div>
          <p className="text-3xl font-black text-teal-300">{formatCurrency(summary.thisMonthEarnings)}</p>
          <p className="text-[11px] text-slate-400">Current calendar month sales</p>
        </div>

        <div className="p-6 rounded-3xl bg-slate-900/70 border border-slate-800/80 backdrop-blur-xl space-y-2 shadow-xl">
          <div className="flex justify-between items-center text-slate-400 text-xs font-semibold">
            <span>Pending Payout</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-3xl font-black text-amber-400">{formatCurrency(summary.pendingAmount)}</p>
          <p className="text-[11px] text-slate-400">In escrow or processing</p>
        </div>

        <div className="p-6 rounded-3xl bg-slate-900/70 border border-slate-800/80 backdrop-blur-xl space-y-3 shadow-xl relative overflow-hidden">
          <div className="flex justify-between items-center text-slate-400 text-xs font-semibold">
            <span>Available for Payout</span>
            <CheckCircle2 className="w-4 h-4 text-teal-400" />
          </div>
          <div>
            <p className="text-3xl font-black text-teal-400">{formatCurrency(summary.availableAmount)}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Eligible for instant withdrawal (Min ₹500)</p>
          </div>
          <button
            onClick={handleOpenModal}
            disabled={!canWithdraw}
            className={`w-full py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              canWithdraw
                ? "bg-[#0F766E] hover:bg-[#115E59] text-white shadow-md shadow-teal-700/30"
                : "bg-slate-800 text-slate-500 border border-slate-700/50 cursor-not-allowed"
            }`}
          >
            <ArrowDownCircle className="w-3.5 h-3.5" />
            {canWithdraw ? "Request Withdrawal" : summary.availableAmount < 500 ? "Min ₹500 Required" : "Payout In Progress"}
          </button>
        </div>
      </div>

      {/* Payout Account Status Banner */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-teal-950/60 via-slate-900/80 to-slate-900/70 border border-teal-800/40 backdrop-blur-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-teal-400" />
            <h3 className="text-base font-bold text-white">Cashfree Automated Payouts Enabled</h3>
          </div>
          <p className="text-xs text-slate-300">
            Withdraw your earned balance directly to your bank account via IMPS/NEFT or instantly to your UPI ID.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/teacher/onboarding"
            className="px-4 py-2 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all shadow-sm flex items-center gap-1.5"
          >
            Update Bank/UPI Details <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
          </Link>
        </div>
      </div>

      {/* Withdrawal Requests History Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Clock className="w-5 h-5 text-teal-400" /> Withdrawal & Payout History
          </h2>
          <span className="text-xs text-slate-400">{withdrawals.length} request(s)</span>
        </div>

        <div className="rounded-3xl bg-slate-900/70 border border-slate-800/80 backdrop-blur-xl overflow-hidden shadow-xl">
          {loadingWithdrawals ? (
            <div className="p-10 flex items-center justify-center text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin text-teal-400 mr-2" /> Loading withdrawal records...
            </div>
          ) : withdrawals.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-slate-800/80 text-slate-400 flex items-center justify-center mx-auto">
                <ArrowDownCircle className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-semibold text-slate-300">No Withdrawal Requests Yet</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                When your available balance reaches ₹500 or more, you can submit a withdrawal request to transfer earnings to your bank account or UPI ID.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-[11px] font-semibold text-slate-400 uppercase tracking-wider bg-slate-950/40">
                    <th className="py-3.5 px-6">Date</th>
                    <th className="py-3.5 px-6">Amount</th>
                    <th className="py-3.5 px-6">Method</th>
                    <th className="py-3.5 px-6">Destination</th>
                    <th className="py-3.5 px-6">Status</th>
                    <th className="py-3.5 px-6">Reference / UTR</th>
                    <th className="py-3.5 px-6">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-xs">
                  {withdrawals.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-4 px-6 text-slate-300 font-medium">
                        {new Date(item.requestedAt).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="py-4 px-6 font-bold text-white">
                        {formatCurrency(item.amountPaise / 100)}
                      </td>
                      <td className="py-4 px-6">
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-300">
                          {item.payoutMethod === "UPI" ? (
                            <>
                              <Smartphone className="w-3.5 h-3.5 text-blue-400" /> UPI
                            </>
                          ) : (
                            <>
                              <Building2 className="w-3.5 h-3.5 text-emerald-400" /> Bank Transfer
                            </>
                          )}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-slate-300 font-mono text-[11px]">
                        {item.payoutMethod === "UPI" ? (
                          item.upiId || "N/A"
                        ) : (
                          <span>
                            {item.accountNumber ? `••••${item.accountNumber.slice(-4)}` : "N/A"}{" "}
                            {item.ifscCode && `(${item.ifscCode})`}
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
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Withdraw Funds Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 space-y-6 shadow-2xl relative">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-6 right-6 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <ArrowDownCircle className="w-6 h-6 text-emerald-400" /> Withdraw Funds
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Disburse your available earnings directly to your bank account or UPI ID.
              </p>
            </div>

            {/* Available Balance Box */}
            <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between">
              <div>
                <p className="text-[11px] text-slate-400 font-medium">Available to Withdraw</p>
                <p className="text-2xl font-black text-teal-400">{formatCurrency(summary.availableAmount)}</p>
              </div>
              <button
                type="button"
                onClick={handleMaxAmount}
                className="px-3 py-1.5 rounded-xl bg-teal-950/60 hover:bg-teal-900/60 border border-teal-700/50 text-[11px] font-bold text-teal-300 transition-colors cursor-pointer"
              >
                Withdraw All
              </button>
            </div>

            {formError && (
              <div className="p-3.5 rounded-xl bg-rose-950/50 border border-rose-800/60 text-rose-300 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span>{formError}</span>
              </div>
            )}

            {formSuccess && (
              <div className="p-3.5 rounded-xl bg-emerald-950/50 border border-emerald-800/60 text-emerald-300 text-xs flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>{formSuccess}</span>
              </div>
            )}

            <form onSubmit={handleSubmitWithdrawal} className="space-y-5">
              {/* Method Selector */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300">Select Payout Destination</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setPayoutMethod("BANK_TRANSFER")}
                    className={`p-3 rounded-2xl border text-left transition-all flex flex-col gap-1 ${
                      payoutMethod === "BANK_TRANSFER"
                        ? "bg-emerald-950/30 border-emerald-500 text-white shadow-md shadow-emerald-500/10"
                        : "bg-slate-950/40 border-slate-800 text-slate-400 hover:border-slate-700"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold text-xs">
                      <Building2 className="w-4 h-4 text-emerald-400" /> Bank Transfer
                    </div>
                    <span className="text-[10px] text-slate-400">IMPS / NEFT settlement</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPayoutMethod("UPI")}
                    className={`p-3 rounded-2xl border text-left transition-all flex flex-col gap-1 ${
                      payoutMethod === "UPI"
                        ? "bg-blue-950/30 border-blue-500 text-white shadow-md shadow-blue-500/10"
                        : "bg-slate-950/40 border-slate-800 text-slate-400 hover:border-slate-700"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold text-xs">
                      <Smartphone className="w-4 h-4 text-blue-400" /> Instant UPI
                    </div>
                    <span className="text-[10px] text-slate-400">VPA handle payout</span>
                  </button>
                </div>
              </div>

              {/* Destination Details Display */}
              {payoutMethod === "BANK_TRANSFER" ? (
                <div className="p-3.5 rounded-2xl bg-slate-950/40 border border-slate-800 space-y-1.5 text-xs">
                  <div className="flex justify-between text-slate-400">
                    <span>Account Holder:</span>
                    <span className="text-slate-200 font-medium">
                      {payoutDetails.accountHolderName || "Not configured"}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Bank & IFSC:</span>
                    <span className="text-slate-200 font-medium">
                      {payoutDetails.bankName || "—"} ({payoutDetails.ifscCode || "N/A"})
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Account Number:</span>
                    <span className="text-slate-200 font-mono font-medium">
                      {payoutDetails.accountNumber
                        ? `•••• •••• ${payoutDetails.accountNumber.slice(-4)}`
                        : "Missing"}
                    </span>
                  </div>
                  {(!payoutDetails.accountNumber || !payoutDetails.ifscCode) && (
                    <div className="pt-2">
                      <Link
                        href="/teacher/onboarding"
                        className="text-[11px] text-emerald-400 hover:underline flex items-center gap-1"
                      >
                        Configure bank details in profile <ExternalLink className="w-3 h-3" />
                      </Link>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-300">Educator UPI ID (VPA)</label>
                  <input
                    type="text"
                    value={upiIdInput}
                    onChange={(e) => setUpiIdInput(e.target.value)}
                    placeholder="e.g. yourname@okhdfcbank"
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-blue-500 text-white text-xs outline-none transition-colors"
                  />
                  <p className="text-[10px] text-slate-500">
                    Payout will be sent directly to this UPI address.
                  </p>
                </div>
              )}

              {/* Amount Input */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs font-semibold text-slate-300">
                  <span>Withdrawal Amount (₹)</span>
                  <span className="text-[11px] text-slate-400 font-normal">Min: ₹500</span>
                </div>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-slate-400 font-bold text-sm">₹</span>
                  <input
                    type="number"
                    min="500"
                    max={summary.availableAmount}
                    step="1"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    placeholder="Enter amount (min ₹500)"
                    className="w-full pl-8 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-teal-500 text-white font-bold text-sm outline-none transition-colors"
                  />
                </div>

                {/* Quick Selection Chips */}
                <div className="flex items-center gap-2 pt-1">
                  {[500, 1000, 2500, 5000].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => handleQuickAmount(amt)}
                      disabled={amt > summary.availableAmount}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-colors ${
                        amt > summary.availableAmount
                          ? "bg-slate-900 border-slate-800 text-slate-600 cursor-not-allowed"
                          : "bg-slate-900 border-slate-700/80 text-slate-300 hover:bg-slate-800 cursor-pointer"
                      }`}
                    >
                      ₹{amt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={submitting || !!formSuccess}
                className="w-full py-3 rounded-2xl bg-[#0F766E] hover:bg-[#115E59] text-white font-bold text-xs transition-all shadow-lg shadow-teal-700/25 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Submitting Request...
                  </>
                ) : (
                  <>
                    <ArrowDownCircle className="w-4 h-4" /> Confirm & Withdraw Funds
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
