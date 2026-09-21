"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Printer,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Clock,
  XCircle,
  RotateCcw,
  Sparkles,
  Building2,
  Phone,
  FileText,
  CreditCard,
  Hash,
  ExternalLink,
  ArrowLeft,
} from "lucide-react";
import { formatCurrency } from "@/lib/currency";
import Logo from "@/components/brand/logo";
import { BackButton } from "@/components/ui/back-button";
import { BackToHomeButton } from "@/components/ui/back-to-home-button";

function formatReferenceNumber(ref?: string): string {
  if (!ref) return "";
  if (ref.length > 14) {
    const parts = ref.split("_");
    const lastPart = parts[parts.length - 1];
    if (lastPart && lastPart.length >= 4) {
      return `REF-${lastPart.toUpperCase().slice(-8)}`;
    }
    return `REF-${ref.slice(-8).toUpperCase()}`;
  }
  return ref;
}

export default function StudentPaymentReceiptPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [receipt, setReceipt] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Refund modal & submission state
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [refundReason, setRefundReason] = useState("");
  const [refundNotes, setRefundNotes] = useState("");
  const [submittingRefund, setSubmittingRefund] = useState(false);
  const [refundSuccessMsg, setRefundSuccessMsg] = useState<string | null>(null);
  const [refundErrorMsg, setRefundErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    async function fetchReceipt() {
      if (!id) return;
      try {
        const res = await fetch(`/api/student/payments/${id}`);
        const data = await res.json();
        if (res.ok && data.data?.receipt) {
          setReceipt(data.data.receipt);
        }
      } catch (err) {
        console.error("Failed to load receipt:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchReceipt();
  }, [id]);

  const handlePrint = () => {
    window.print();
  };

  const handleOpenRefundModal = () => {
    setRefundErrorMsg(null);
    setRefundReason("");
    setRefundNotes("");
    setShowRefundModal(true);
  };

  const handleSubmitRefundRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!receipt || submittingRefund) return;
    if (!refundReason.trim()) {
      setRefundErrorMsg("Please select a valid refund reason.");
      return;
    }

    setSubmittingRefund(true);
    setRefundErrorMsg(null);
    setRefundSuccessMsg(null);

    try {
      const res = await fetch("/api/payments/refund", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transactionId: receipt.id,
          reason: refundReason,
          notes: refundNotes,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || data.error || "Failed to submit refund request.");
      }

      setShowRefundModal(false);
      setRefundSuccessMsg(
        "Your refund request has been submitted successfully. Our team will review your request and update the refund status."
      );

      setReceipt((prev: any) => ({
        ...prev,
        refund: data.data?.refund || {
          status: "PENDING",
          reason: refundNotes ? `${refundReason} - Details: ${refundNotes}` : refundReason,
          createdAt: new Date().toISOString(),
        },
      }));
    } catch (err: any) {
      setRefundErrorMsg(err.message || "Failed to submit refund request. Please try again.");
    } finally {
      setSubmittingRefund(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-slate-400 font-medium">Generating official receipt...</p>
        </div>
      </div>
    );
  }

  if (!receipt) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4 text-center">
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl mb-4">
          <AlertCircle className="w-10 h-10 text-rose-400" />
        </div>
        <h2 className="text-xl font-bold text-white">Payment Receipt Not Found</h2>
        <p className="text-xs text-slate-400 mt-1 max-w-sm">
          We could not locate a payment transaction matching this reference.
        </p>
        <Link
          href="/student/payments"
          className="mt-6 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs font-semibold rounded-xl border border-slate-800 transition-all"
        >
          Return to Payments History
        </Link>
      </div>
    );
  }

  const isCaptured = receipt.status === "CAPTURED";
  const isRefunded = receipt.status === "REFUNDED" || receipt.refund?.status === "REFUNDED";
  const isPendingReview =
    receipt.refund?.status === "PENDING" || receipt.refund?.status === "REFUND_REQUESTED";
  const isRejected = receipt.refund?.status === "REJECTED";

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6 lg:p-8 flex flex-col items-center print:bg-white print:p-0 print:m-0">
      <style jsx global>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 6mm 8mm;
          }
          html, body {
            background: #ffffff !important;
            color: #000000 !important;
            font-size: 10px !important;
            height: auto !important;
            overflow: visible !important;
          }
          .print\\:hidden {
            display: none !important;
          }
          .receipt-card {
            box-shadow: none !important;
            border: 1px solid #d1d5db !important;
            border-radius: 0 !important;
            padding: 16px 20px !important;
            background: #ffffff !important;
            color: #000000 !important;
            max-width: 100% !important;
            margin: 0 auto !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          .receipt-card * {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
        }
      `}</style>

      <div className="w-full max-w-3xl space-y-4 print:space-y-0 print:max-w-none">
        {/* Navigation & Print Actions (Hidden in Print) */}
        <div className="flex flex-wrap justify-between items-center gap-3 print:hidden">
          <div className="flex items-center gap-2">
            <Link
              href="/student/dashboard"
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 shadow-xs transition-all cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4 text-slate-400" />
              <span>Back to Dashboard</span>
            </Link>
            <div className="hidden">
              <BackToHomeButton variant="dark" />
            </div>
          </div>

          <button
            onClick={handlePrint}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-md transition-all cursor-pointer border border-emerald-500/40"
          >
            <Printer className="w-4 h-4" />
            <span>Print Receipt</span>
          </button>
        </div>

        {/* Global Feedback Notifications (Hidden in Print) */}
        {refundSuccessMsg && (
          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 flex items-start gap-3 print:hidden">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div className="text-xs">
              <p className="font-bold text-emerald-300">Request Received</p>
              <p className="text-emerald-400/90 mt-0.5">{refundSuccessMsg}</p>
            </div>
          </div>
        )}

        {/* Main Official Receipt Document */}
        <div className="receipt-card bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-5 print:bg-white print:text-black print:shadow-none print:border print:border-gray-300 print:rounded-none print:p-5 print:space-y-3">
          
          {/* Header Section: Logo + Heading */}
          <div className="space-y-4 print:space-y-2">
            <div className="flex items-center justify-between border-b border-slate-800 print:border-gray-300 pb-4 print:pb-2">
              <div className="flex items-center gap-3">
                <Logo
                  variant="horizontal"
                  size="md"
                  theme="dark"
                  href={false}
                  showTagline
                  tagline="Learner Portal"
                />
              </div>

              <div className="text-right">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 print:text-gray-500 block">
                  Receipt Date
                </span>
                <span className="text-xs font-bold text-slate-200 print:text-black">
                  {new Date(receipt.capturedAt || receipt.createdAt).toLocaleDateString("en-IN", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
              </div>
            </div>

            {/* Official Centered Heading */}
            <div className="text-center py-1 border-b border-slate-800 print:border-gray-300 pb-3 print:pb-2">
              <h1 className="text-xl sm:text-2xl font-black tracking-wider uppercase text-white print:text-black">
                OFFICIAL PAYMENT RECEIPT
              </h1>
              <p className="text-[11px] text-slate-400 print:text-gray-600 font-semibold mt-0.5">
                Authorized Proof of Transaction & Enrollment Acknowledgement
              </p>
            </div>
          </div>

          {/* Dynamic Status & Payment Confirmation */}
          <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 print:bg-gray-50 print:border-gray-300 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 print:py-2 print:px-3">
            <div className="space-y-0.5">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 print:text-gray-500 block">
                Transaction Status
              </span>
              <div className="flex items-center gap-2">
                {isCaptured ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 print:bg-green-100 print:text-green-800 print:border-green-300">
                    <CheckCircle2 className="w-3.5 h-3.5" /> PAYMENT CAPTURED
                  </span>
                ) : isRefunded ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-bold bg-purple-500/15 text-purple-400 border border-purple-500/30 print:bg-purple-100 print:text-purple-800 print:border-purple-300">
                    <RotateCcw className="w-3.5 h-3.5" /> REFUNDED
                  </span>
                ) : receipt.status === "PENDING" ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30 print:bg-amber-100 print:text-amber-800 print:border-amber-300">
                    <Clock className="w-3.5 h-3.5" /> PENDING VERIFICATION
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30 print:bg-rose-100 print:text-rose-800 print:border-rose-300">
                    <XCircle className="w-3.5 h-3.5" /> {receipt.status}
                  </span>
                )}
              </div>
            </div>

            <div className="text-left sm:text-right space-y-0.5">
              <p className="text-xs font-bold text-slate-200 print:text-black">
                {isCaptured
                  ? "Payment successfully received"
                  : isRefunded
                  ? "Transaction fully refunded"
                  : "Processing payment status"}
              </p>
              <div className="flex items-center sm:justify-end gap-1.5 text-[11px] text-slate-400 print:text-gray-600">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 print:text-emerald-700" />
                <span>Processed securely via Cashfree Payments</span>
              </div>
            </div>
          </div>

          {/* Billed To & Educator Details (Two Columns) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-slate-950/40 border border-slate-800 print:bg-white print:border-gray-300 text-xs print:p-3 print:gap-3">
            {/* Billed To (Customer Details + Reference Number) */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-slate-400 print:text-gray-600 font-bold uppercase tracking-wider text-[10px]">
                <FileText className="w-3.5 h-3.5 text-emerald-400 print:text-gray-500" />
                <span>Billed To (Learner Details)</span>
              </div>
              
              <div className="space-y-0.5">
                <p className="font-extrabold text-sm text-white print:text-black">
                  {receipt.studentName}
                </p>
                <p className="text-slate-300 print:text-gray-800">{receipt.studentEmail}</p>
              </div>

              {/* Reference Number Near Customer Name */}
              <div className="pt-1 flex items-center gap-1.5">
                <span className="text-[10px] uppercase font-bold text-slate-400 print:text-gray-600">
                  Reference Number:
                </span>
                <span
                  className="font-mono text-xs font-bold text-emerald-400 print:text-black bg-slate-950 print:bg-gray-100 px-2 py-0.5 rounded border border-slate-800 print:border-gray-300"
                  title={receipt.internalReference}
                >
                  {formatReferenceNumber(receipt.internalReference)}
                </span>
              </div>
            </div>

            {/* Educator / Service Provider */}
            <div className="space-y-1.5 sm:text-right">
              <div className="flex items-center sm:justify-end gap-1.5 text-slate-400 print:text-gray-600 font-bold uppercase tracking-wider text-[10px]">
                <Sparkles className="w-3.5 h-3.5 text-emerald-400 print:text-gray-500" />
                <span>Educator / Service Provider</span>
              </div>
              <p className="font-extrabold text-sm text-white print:text-black">
                {receipt.teacherName}
              </p>
              <div className="space-y-0.5 text-slate-400 print:text-gray-600">
                <p>EduConnects Verified Partner</p>
                <p className="text-[11px]">EduConnects Learning Network</p>
              </div>
            </div>
          </div>

          {/* Itemized Purchase Table */}
          <div className="space-y-2">
            <div className="flex justify-between items-center px-1">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 print:text-gray-600">
                Itemized Purchase Summary
              </span>
            </div>

            <div className="border border-slate-800 rounded-2xl overflow-hidden print:border-gray-300">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/80 print:bg-gray-100 text-slate-300 print:text-gray-800 font-bold border-b border-slate-800 print:border-gray-300">
                  <tr>
                    <th className="px-3.5 py-2.5 print:py-1.5">Description of Service</th>
                    <th className="px-3.5 py-2.5 text-center print:py-1.5">Qty</th>
                    <th className="px-3.5 py-2.5 text-right print:py-1.5">Price</th>
                    <th className="px-3.5 py-2.5 text-right print:py-1.5">Discount</th>
                    <th className="px-3.5 py-2.5 text-right print:py-1.5">Net Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 print:divide-gray-300">
                  <tr>
                    <td className="px-3.5 py-3 print:py-2">
                      <p className="font-extrabold text-white print:text-black text-xs sm:text-sm">
                        {receipt.productTitle}
                      </p>
                      <span className="inline-block text-[10px] font-semibold text-emerald-400 print:text-gray-600 capitalize">
                        {(receipt.productType || "COURSE").replace(/_/g, " ").toLowerCase()}
                      </span>
                    </td>
                    <td className="px-3.5 py-3 text-center text-slate-300 print:text-black font-medium print:py-2">
                      1
                    </td>
                    <td className="px-3.5 py-3 text-right text-slate-300 print:text-black font-medium print:py-2">
                      {formatCurrency(receipt.originalPrice || receipt.amount)}
                    </td>
                    <td className="px-3.5 py-3 text-right text-slate-400 print:text-gray-600 print:py-2">
                      {receipt.discountAmount && receipt.discountAmount > 0 ? (
                        <span className="text-emerald-400 print:text-green-700 font-semibold">
                          -{formatCurrency(receipt.discountAmount)}
                          {receipt.offerCode && ` (${receipt.offerCode})`}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-3.5 py-3 text-right font-extrabold text-white print:text-black text-xs sm:text-sm print:py-2">
                      {formatCurrency(receipt.amount)}
                    </td>
                  </tr>
                </tbody>
                <tfoot className="bg-slate-950/60 print:bg-gray-50 border-t border-slate-800 print:border-gray-300 text-xs">
                  {receipt.discountAmount > 0 && (
                    <tr>
                      <td colSpan={4} className="px-3.5 py-1.5 text-right text-slate-400 print:text-gray-600">
                        Subtotal (Gross):
                      </td>
                      <td className="px-3.5 py-1.5 text-right font-semibold text-slate-300 print:text-black">
                        {formatCurrency(receipt.originalPrice || receipt.amount)}
                      </td>
                    </tr>
                  )}
                  {receipt.discountAmount > 0 && (
                    <tr>
                      <td colSpan={4} className="px-3.5 py-1.5 text-right text-emerald-400 print:text-green-700">
                        Total Discount:
                      </td>
                      <td className="px-3.5 py-1.5 text-right font-semibold text-emerald-400 print:text-green-700">
                        -{formatCurrency(receipt.discountAmount)}
                      </td>
                    </tr>
                  )}
                  <tr className="border-t border-slate-800 print:border-gray-300">
                    <td colSpan={4} className="px-3.5 py-2.5 text-right font-extrabold text-slate-200 print:text-black text-xs sm:text-sm print:py-1.5">
                      Final Amount Paid:
                    </td>
                    <td className="px-3.5 py-2.5 text-right font-black text-emerald-400 print:text-black text-sm sm:text-base print:py-1.5">
                      {formatCurrency(receipt.amount)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Payment Method & Gateway Reference Section */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-2xl bg-slate-950/60 print:bg-gray-50 border border-slate-800 print:border-gray-300 text-xs print:p-2.5">
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5 text-slate-400 print:text-gray-600 font-bold uppercase text-[10px]">
                <CreditCard className="w-3 h-3 text-emerald-400 print:text-gray-500" />
                <span>Payment Method</span>
              </div>
              <p className="font-semibold text-slate-200 print:text-black">
                {receipt.paymentMethod || "Cashfree Payments (Online)"}
              </p>
            </div>

            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5 text-slate-400 print:text-gray-600 font-bold uppercase text-[10px]">
                <Hash className="w-3 h-3 text-emerald-400 print:text-gray-500" />
                <span>Gateway Order ID</span>
              </div>
              <p className="font-mono text-slate-300 print:text-black truncate" title={receipt.providerOrderId || "N/A"}>
                {receipt.providerOrderId || "N/A"}
              </p>
            </div>

            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5 text-slate-400 print:text-gray-600 font-bold uppercase text-[10px]">
                <CheckCircle2 className="w-3 h-3 text-emerald-400 print:text-gray-500" />
                <span>Gateway Payment ID</span>
              </div>
              <p className="font-mono text-slate-300 print:text-black truncate" title={receipt.providerPaymentId || "Captured"}>
                {receipt.providerPaymentId || "Pending Gateway Sync"}
              </p>
            </div>
          </div>

          {/* Official Company Details & Support (Business Information Section) */}
          <div className="border-t border-slate-800 print:border-gray-300 pt-4 print:pt-3 space-y-2">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-emerald-400 print:text-black" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 print:text-black">
                Business Information
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-slate-400 print:text-gray-700 leading-snug">
              {/* Entity & Registration */}
              <div className="space-y-0.5">
                <p className="font-extrabold text-white print:text-black text-xs sm:text-sm">
                  EduConnects
                </p>
                <p className="text-slate-300 print:text-gray-800 font-medium">
                  A MyProFunnels Ventures Company
                </p>
                <p className="font-semibold text-slate-300 print:text-gray-800">
                  Shrivastava ProFunnels Ventures Pvt Ltd
                </p>
                <p className="font-mono text-[10px] text-slate-400 print:text-gray-600">
                  CIN: U85499UP2024PTC212061
                </p>
                <div className="pt-0.5 text-[11px]">
                  <span className="font-semibold text-slate-300 print:text-gray-800 block">
                    Registered Office:
                  </span>
                  <p>Civil Lines, Lalitpur, Uttar Pradesh, India - 284403</p>
                </div>
              </div>

              {/* Support Channels */}
              <div className="space-y-1 sm:text-right">
                <div className="space-y-0.5">
                  <span className="font-semibold text-slate-300 print:text-gray-800 block">
                    Customer Support:
                  </span>
                  <p className="font-bold text-white print:text-black">
                    EduConnects Support Team
                  </p>
                  <div className="flex items-center sm:justify-end gap-1.5 pt-0.5">
                    <Phone className="w-3.5 h-3.5 text-emerald-400 print:text-black" />
                    <a
                      href="https://wa.me/918062181499"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-bold text-emerald-400 hover:text-emerald-300 print:text-black underline flex items-center gap-1"
                    >
                      <span>WhatsApp: +91 8062181499</span>
                    </a>
                  </div>
                  <p className="text-[10px] text-slate-500 print:text-gray-600">
                    Operating Hours: Mon – Sat (10:00 AM – 7:00 PM IST)
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Receipt Footer Notice */}
          <div className="border-t border-slate-800/70 print:border-gray-300 pt-3 print:pt-2 text-center">
            <p className="text-[10px] text-slate-400 print:text-gray-600">
              This is a computer-generated official receipt and serves as valid proof of payment.
            </p>
          </div>
        </div>

        {/* Refund Status Alerts & Request Action (Hidden in Print) */}
        <div className="space-y-4 print:hidden">
          {isPendingReview && (
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/25 space-y-1.5">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-xs">
                <Clock className="w-4 h-4 animate-pulse" />
                <span>Refund Request Under Review</span>
              </div>
              <p className="text-xs text-amber-200/90 leading-relaxed">
                Your refund request has been submitted successfully. Our team will review your request and update the refund status.
              </p>
              {receipt.refund?.reason && (
                <div className="pt-1 text-[11px] text-amber-400/80 border-t border-amber-500/20">
                  <span className="font-semibold">Reason Submitted:</span> {receipt.refund.reason}
                </div>
              )}
            </div>
          )}

          {isRejected && (
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/25 space-y-1.5">
              <div className="flex items-center gap-2 text-rose-400 font-bold text-xs">
                <XCircle className="w-4 h-4" />
                <span>Refund Request Declined</span>
              </div>
              <p className="text-xs text-rose-200/90 leading-relaxed">
                {receipt.refund?.reason ||
                  "Your refund request was reviewed and could not be approved based on our terms and conditions."}
              </p>
              <div className="pt-1">
                <a
                  href="https://wa.me/918062181499"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-300 hover:text-rose-200 underline"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>Contact Support on WhatsApp for Assistance</span>
                </a>
              </div>
            </div>
          )}

          {isRefunded && (
            <div className="p-4 rounded-2xl bg-purple-500/10 border border-purple-500/25 space-y-1">
              <div className="flex items-center gap-2 text-purple-400 font-bold text-xs">
                <CheckCircle2 className="w-4 h-4" />
                <span>Purchase Refunded</span>
              </div>
              <p className="text-xs text-purple-200/90">
                This transaction has been refunded. Course access or slot booking has been revoked.
                {receipt.refund?.providerRefundId && (
                  <span className="block mt-1 font-mono text-[11px] text-purple-300">
                    Gateway Refund ID: {receipt.refund.providerRefundId}
                  </span>
                )}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
