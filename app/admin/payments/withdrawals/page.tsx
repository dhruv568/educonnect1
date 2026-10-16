"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  IndianRupee,
  RefreshCw,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  ArrowDownCircle,
  Building2,
  Smartphone,
  X,
  AlertCircle,
  CheckCircle,
  Loader2,
  ExternalLink,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
} from "lucide-react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { AdminBreadcrumb } from "@/components/ui/admin-breadcrumb";
import { Card } from "@/components/ui/card";
import { formatCurrency } from "@/lib/currency";

export default function AdminWithdrawalsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [page, setPage] = useState(1);

  // Modals state
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<any>(null);
  const [actionType, setActionType] = useState<"APPROVE" | "REJECT" | "MANUAL_COMPLETE" | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [referenceId, setReferenceId] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [runningMonthlyJob, setRunningMonthlyJob] = useState(false);

  const handleRunMonthlyPayouts = async () => {
    if (!confirm("Are you sure you want to run the automated monthly educator payout job? (25% Platform Fee, ₹2,500 minimum net balance requirement)")) {
      return;
    }
    setRunningMonthlyJob(true);
    try {
      const res = await fetch("/api/admin/payments/payouts/monthly", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dryRun: false }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to run monthly payouts");
      alert(`Monthly payouts executed successfully! Processed: ${json.data?.result?.processedCount}, Disbursed: ₹${json.data?.result?.totalDisbursedRupees}, Platform Fee (25%): ₹${json.data?.result?.totalPlatformFeeRupees}`);
      fetchWithdrawals();
    } catch (err: any) {
      alert(`Error running monthly payouts: ${err.message}`);
    } finally {
      setRunningMonthlyJob(false);
    }
  };

  useEffect(() => {
    fetchWithdrawals();
  }, [search, statusFilter, page]);

  const fetchWithdrawals = async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams();
      if (search) q.set("search", search);
      if (statusFilter !== "ALL") q.set("status", statusFilter);
      q.set("page", page.toString());
      q.set("limit", "15");

      const res = await fetch(`/api/admin/payments/withdrawals?${q.toString()}`);
      const json = await res.json();
      if (res.ok) {
        setData(json.data);
      }
    } catch {
      // Error
    } finally {
      setLoading(false);
    }
  };

  const openActionModal = (withdrawal: any, type: "APPROVE" | "REJECT" | "MANUAL_COMPLETE") => {
    setSelectedWithdrawal(withdrawal);
    setActionType(type);
    setAdminNotes("");
    setRejectionReason("");
    setReferenceId("");
    setActionMessage(null);
  };

  const closeActionModal = () => {
    setSelectedWithdrawal(null);
    setActionType(null);
    setActionLoading(false);
  };

  const handleActionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWithdrawal || !actionType) return;

    setActionLoading(true);
    setActionMessage(null);

    try {
      let endpoint = "";
      let payload: any = {};

      if (actionType === "APPROVE") {
        endpoint = `/api/admin/payments/withdrawals/${selectedWithdrawal.id}/approve`;
        payload = { adminNotes, autoDisburse: true };
      } else if (actionType === "REJECT") {
        if (!rejectionReason.trim()) {
          throw new Error("Rejection reason is required.");
        }
        endpoint = `/api/admin/payments/withdrawals/${selectedWithdrawal.id}/reject`;
        payload = { rejectionReason: rejectionReason.trim() };
      } else if (actionType === "MANUAL_COMPLETE") {
        if (!referenceId.trim()) {
          throw new Error("Bank Reference / UTR is required.");
        }
        endpoint = `/api/admin/payments/withdrawals/${selectedWithdrawal.id}/manual-complete`;
        payload = { referenceId: referenceId.trim(), adminNotes };
      }

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Action failed.");
      }

      setActionMessage({
        text: json.data?.message || "Action processed successfully.",
        type: "success",
      });

      fetchWithdrawals();

      setTimeout(() => {
        closeActionModal();
      }, 1500);
    } catch (err: any) {
      setActionMessage({ text: err.message || "Operation failed", type: "error" });
    } finally {
      setActionLoading(false);
    }
  };

  const items: any[] = data?.items || [];
  const total = data?.total || 0;
  const totalPages = data?.totalPages || 1;

  // Compute metrics from items or total
  const pendingCount = items.filter((i) => i.status === "PENDING").length;
  const processingCount = items.filter((i) => i.status === "PROCESSING" || i.status === "APPROVED").length;
  const completedCount = items.filter((i) => i.status === "COMPLETED").length;
  const rejectedCount = items.filter((i) => i.status === "REJECTED" || i.status === "FAILED").length;

  const getBadgeClass = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "PENDING":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "APPROVED":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "PROCESSING":
        return "bg-purple-50 text-purple-700 border-purple-200 animate-pulse";
      case "REJECTED":
        return "bg-rose-50 text-rose-700 border-rose-200";
      case "FAILED":
        return "bg-red-50 text-red-700 border-red-200";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  return (
    <DashboardLayout
      role="ADMIN"
      userName="System Administrator"
      userEmail="educonnects.com@gmail.com"
    >
      <div className="p-6 md:p-10 space-y-8 max-w-7xl mx-auto">
        {/* Breadcrumb & Navigation */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <AdminBreadcrumb
              items={[
                { label: "Finance & Accounting", href: "/admin/payments" },
                { label: "Educator Withdrawals" },
              ]}
            />
            <div className="flex items-center gap-3 mt-2">
              <Link
                href="/admin/payments"
                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
                title="Back to Financial Ledger"
              >
                <ArrowLeft className="w-4 h-4" />
              </Link>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
                <ArrowDownCircle className="w-7 h-7 text-[#0B4F4B]" /> Educator Withdrawal Management
              </h1>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Review, approve, and disburse educator payouts via automated Cashfree Payouts or manual settlement.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleRunMonthlyPayouts}
              disabled={runningMonthlyJob}
              className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 shadow-sm transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <IndianRupee className={`w-3.5 h-3.5 ${runningMonthlyJob ? "animate-spin" : ""}`} />
              {runningMonthlyJob ? "Executing Job..." : "Run Monthly Payouts (10th)"}
            </button>
            <button
              onClick={fetchWithdrawals}
              className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2 shadow-sm transition-all"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
            </button>
            <Link
              href="/admin/payments"
              className="px-4 py-2 bg-[#0B4F4B] text-white rounded-xl text-xs font-semibold hover:bg-[#083a37] shadow-sm transition-all"
            >
              Financial Ledger
            </Link>
          </div>
        </div>

        {/* Metrics Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <Card className="p-5 border-slate-200 bg-white shadow-sm space-y-1">
            <div className="flex justify-between items-center text-xs font-semibold text-slate-500">
              <span>Pending Requests</span>
              <Clock className="w-4 h-4 text-amber-500" />
            </div>
            <p className="text-2xl font-black text-slate-900">{pendingCount}</p>
            <p className="text-[11px] text-amber-600 font-medium">Awaiting admin review</p>
          </Card>

          <Card className="p-5 border-slate-200 bg-white shadow-sm space-y-1">
            <div className="flex justify-between items-center text-xs font-semibold text-slate-500">
              <span>Processing / Approved</span>
              <ShieldCheck className="w-4 h-4 text-purple-500" />
            </div>
            <p className="text-2xl font-black text-slate-900">{processingCount}</p>
            <p className="text-[11px] text-purple-600 font-medium">In transfer pipeline</p>
          </Card>

          <Card className="p-5 border-slate-200 bg-white shadow-sm space-y-1">
            <div className="flex justify-between items-center text-xs font-semibold text-slate-500">
              <span>Disbursed & Completed</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            </div>
            <p className="text-2xl font-black text-slate-900">{completedCount}</p>
            <p className="text-[11px] text-emerald-600 font-medium">Ledger debited & settled</p>
          </Card>

          <Card className="p-5 border-slate-200 bg-white shadow-sm space-y-1">
            <div className="flex justify-between items-center text-xs font-semibold text-slate-500">
              <span>Rejected / Failed</span>
              <X className="w-4 h-4 text-rose-500" />
            </div>
            <p className="text-2xl font-black text-slate-900">{rejectedCount}</p>
            <p className="text-[11px] text-rose-600 font-medium">Escrow hold released</p>
          </Card>
        </div>

        {/* Filters & Search Toolbar */}
        <Card className="p-4 border-slate-200 bg-white shadow-sm space-y-4">
          <div className="flex flex-col md:flex-row gap-3 justify-between items-center">
            {/* Status Filter Tabs */}
            <div className="flex flex-wrap gap-1.5 w-full md:w-auto">
              {[
                { label: "All", value: "ALL" },
                { label: "Pending", value: "PENDING" },
                { label: "Approved", value: "APPROVED" },
                { label: "Processing", value: "PROCESSING" },
                { label: "Completed", value: "COMPLETED" },
                { label: "Rejected", value: "REJECTED" },
                { label: "Failed", value: "FAILED" },
              ].map((tab) => (
                <button
                  key={tab.value}
                  onClick={() => {
                    setStatusFilter(tab.value);
                    setPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    statusFilter === tab.value
                      ? "bg-[#0B4F4B] text-white shadow-sm"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div className="relative w-full md:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search educator, ID, reference..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:border-[#0B4F4B] outline-none transition-all"
              />
            </div>
          </div>
        </Card>

        {/* Requests Table */}
        <Card className="border-slate-200 bg-white shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-[#0B4F4B]" />
              <p className="text-xs">Loading withdrawal requests...</p>
            </div>
          ) : items.length === 0 ? (
            <div className="p-12 text-center text-slate-500 space-y-2">
              <ArrowDownCircle className="w-8 h-8 text-slate-300 mx-auto" />
              <h3 className="text-sm font-bold text-slate-700">No Withdrawal Requests Found</h3>
              <p className="text-xs text-slate-400">
                {statusFilter !== "ALL"
                  ? `No requests match status filter "${statusFilter}".`
                  : "No educators have submitted withdrawal requests yet."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider bg-slate-50">
                    <th className="py-3 px-5">Educator</th>
                    <th className="py-3 px-5">Requested At</th>
                    <th className="py-3 px-5">Amount</th>
                    <th className="py-3 px-5">Method</th>
                    <th className="py-3 px-5">Destination Details</th>
                    <th className="py-3 px-5">Status</th>
                    <th className="py-3 px-5">Reference / UTR</th>
                    <th className="py-3 px-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {items.map((item) => {
                    const educatorUser = item.teacher?.user;
                    const educatorName = educatorUser?.profile
                      ? `${educatorUser.profile.firstName} ${educatorUser.profile.lastName}`
                      : educatorUser?.email || "Unknown Educator";

                    return (
                      <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                        {/* Educator Info */}
                        <td className="py-4 px-5">
                          <div className="font-semibold text-slate-900">{educatorName}</div>
                          <div className="text-[11px] text-slate-400">{educatorUser?.email}</div>
                        </td>

                        {/* Date */}
                        <td className="py-4 px-5 text-slate-600 text-[11px]">
                          {new Date(item.requestedAt).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>

                        {/* Amount */}
                        <td className="py-4 px-5 font-bold text-slate-900">
                          {formatCurrency(item.amountPaise / 100)}
                        </td>

                        {/* Payout Method */}
                        <td className="py-4 px-5">
                          <span className="inline-flex items-center gap-1.5 font-medium text-slate-700">
                            {item.payoutMethod === "UPI" ? (
                              <>
                                <Smartphone className="w-3.5 h-3.5 text-blue-500" /> UPI
                              </>
                            ) : (
                              <>
                                <Building2 className="w-3.5 h-3.5 text-emerald-600" /> Bank Transfer
                              </>
                            )}
                          </span>
                        </td>

                        {/* Destination */}
                        <td className="py-4 px-5 text-[11px] text-slate-600 font-mono">
                          {item.payoutMethod === "UPI" ? (
                            item.upiId || "N/A"
                          ) : (
                            <div>
                              <div>{item.accountNumber ? `••••${item.accountNumber.slice(-4)}` : "N/A"}</div>
                              <div className="text-[10px] text-slate-400 font-sans">
                                {item.bankName} ({item.ifscCode})
                              </div>
                            </div>
                          )}
                        </td>

                        {/* Status */}
                        <td className="py-4 px-5">
                          <span
                            className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold border ${getBadgeClass(
                              item.status
                            )}`}
                          >
                            {item.status}
                          </span>
                        </td>

                        {/* Ref / UTR */}
                        <td className="py-4 px-5 text-slate-500 font-mono text-[11px]">
                          {item.providerReferenceId || item.providerTransferId || "—"}
                        </td>

                        {/* Actions */}
                        <td className="py-4 px-5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {item.status === "PENDING" && (
                              <>
                                <button
                                  onClick={() => openActionModal(item, "APPROVE")}
                                  className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-[11px] shadow-sm transition-colors"
                                  title="Approve and initiate Cashfree Payout"
                                >
                                  Approve
                                </button>
                                <button
                                  onClick={() => openActionModal(item, "MANUAL_COMPLETE")}
                                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-900 text-white font-semibold text-[11px] transition-colors"
                                  title="Mark as paid manually with external UTR"
                                >
                                  Manual
                                </button>
                                <button
                                  onClick={() => openActionModal(item, "REJECT")}
                                  className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-semibold text-[11px] transition-colors"
                                  title="Reject request and restore educator balance"
                                >
                                  Reject
                                </button>
                              </>
                            )}

                            {(item.status === "APPROVED" || item.status === "PROCESSING") && (
                              <button
                                onClick={() => openActionModal(item, "MANUAL_COMPLETE")}
                                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-900 text-white font-semibold text-[11px] transition-colors"
                                title="Mark as paid with external UTR if gateway webhook is delayed"
                              >
                                Complete Manually
                              </button>
                            )}

                            {item.status === "COMPLETED" && (
                              <span className="text-[11px] text-emerald-600 font-bold flex items-center justify-end gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Settled
                              </span>
                            )}

                            {(item.status === "REJECTED" || item.status === "FAILED") && (
                              <span
                                className="text-[11px] text-slate-400 max-w-[120px] truncate"
                                title={item.rejectionReason || item.failureReason}
                              >
                                {item.rejectionReason || item.failureReason || "Closed"}
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination Footer */}
          {totalPages > 1 && (
            <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>
                Showing page {page} of {totalPages} ({total} total records)
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </Card>

        {/* Action Modals */}
        {selectedWithdrawal && actionType && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
            <div className="w-full max-w-md bg-white border border-slate-200 rounded-3xl p-6 md:p-8 space-y-5 shadow-2xl relative">
              <button
                onClick={closeActionModal}
                className="absolute top-6 right-6 text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  {actionType === "APPROVE" && "Approve Withdrawal Request"}
                  {actionType === "REJECT" && "Reject Withdrawal Request"}
                  {actionType === "MANUAL_COMPLETE" && "Manual Settlement Confirmation"}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Request Amount:{" "}
                  <strong className="text-slate-800 font-bold">
                    {formatCurrency(selectedWithdrawal.amountPaise / 100)}
                  </strong>{" "}
                  via {selectedWithdrawal.payoutMethod}
                </p>
              </div>

              {actionMessage && (
                <div
                  className={`p-3 rounded-xl text-xs flex items-start gap-2 ${
                    actionMessage.type === "success"
                      ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                      : "bg-rose-50 text-rose-800 border border-rose-200"
                  }`}
                >
                  {actionMessage.type === "success" ? (
                    <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  )}
                  <span>{actionMessage.text}</span>
                </div>
              )}

              <form onSubmit={handleActionSubmit} className="space-y-4">
                {actionType === "APPROVE" && (
                  <div className="space-y-3 text-xs">
                    <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1 text-slate-600">
                      <div>
                        <strong>Destination:</strong>{" "}
                        {selectedWithdrawal.payoutMethod === "UPI"
                          ? selectedWithdrawal.upiId
                          : `${selectedWithdrawal.accountNumber} (${selectedWithdrawal.ifscCode})`}
                      </div>
                      <div>
                        <strong>Action:</strong> Triggers Cashfree Payout transfer. If test mode is active,
                        executes simulated payout and records ledger debit.
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="font-semibold text-slate-700">Admin Notes (Optional)</label>
                      <input
                        type="text"
                        value={adminNotes}
                        onChange={(e) => setAdminNotes(e.target.value)}
                        placeholder="Internal notes or approval memo..."
                        className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs focus:border-[#0B4F4B] outline-none"
                      />
                    </div>
                  </div>
                )}

                {actionType === "REJECT" && (
                  <div className="space-y-3 text-xs">
                    <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 space-y-1">
                      <p className="font-semibold">Balance Restoration Guarantee:</p>
                      <p>
                        Rejecting will immediately release the {formatCurrency(selectedWithdrawal.amountPaise / 100)} hold
                        back to the educator's available balance.
                      </p>
                    </div>
                    <div className="space-y-1.5">
                      <label className="font-semibold text-slate-700">
                        Rejection Reason <span className="text-rose-500">*</span>
                      </label>
                      <textarea
                        required
                        rows={3}
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        placeholder="Explain why this request is being rejected..."
                        className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs focus:border-rose-500 outline-none"
                      />
                    </div>
                  </div>
                )}

                {actionType === "MANUAL_COMPLETE" && (
                  <div className="space-y-3 text-xs">
                    <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-slate-600 space-y-1">
                      <p>
                        Use this when you have manually transferred the funds to the educator via netbanking or UPI app.
                      </p>
                    </div>
                    <div className="space-y-1.5">
                      <label className="font-semibold text-slate-700">
                        Bank UTR / Transaction Reference <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={referenceId}
                        onChange={(e) => setReferenceId(e.target.value)}
                        placeholder="e.g. UTR123456789 or UPI RRN"
                        className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs font-mono focus:border-[#0B4F4B] outline-none"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="font-semibold text-slate-700">Internal Settlement Notes</label>
                      <input
                        type="text"
                        value={adminNotes}
                        onChange={(e) => setAdminNotes(e.target.value)}
                        placeholder="Optional disbursement notes..."
                        className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs focus:border-[#0B4F4B] outline-none"
                      />
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={closeActionModal}
                    className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold text-xs transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className={`px-5 py-2 rounded-xl text-white font-bold text-xs shadow-sm flex items-center gap-1.5 transition-all cursor-pointer ${
                      actionType === "APPROVE"
                        ? "bg-emerald-600 hover:bg-emerald-700"
                        : actionType === "REJECT"
                        ? "bg-rose-600 hover:bg-rose-700"
                        : "bg-[#0B4F4B] hover:bg-[#083a37]"
                    } disabled:opacity-50`}
                  >
                    {actionLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    {actionType === "APPROVE" && "Approve & Payout"}
                    {actionType === "REJECT" && "Confirm Rejection"}
                    {actionType === "MANUAL_COMPLETE" && "Confirm Settlement"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
