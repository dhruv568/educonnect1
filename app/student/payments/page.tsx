"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Receipt,
  Search,
  ArrowRight,
  ExternalLink,
  ShieldCheck,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { formatCurrency } from "@/lib/currency";
import { BackButton } from "@/components/ui/back-button";
import { BackToHomeButton } from "@/components/ui/back-to-home-button";

export default function StudentPaymentsPage() {
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("ALL");
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/student/payments", { cache: "no-store" });
      const data = await res.json();
      if (res.ok) {
        setPayments(data.data?.payments || []);
      }
    } catch (err) {
      console.error("Failed to load payments:", err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = payments.filter((p) => {
    if (filter !== "ALL" && p.status !== filter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        (p.productTitle || "").toLowerCase().includes(q) ||
        (p.internalReference || "").toLowerCase().includes(q) ||
        (p.teacherName || "").toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <DashboardLayout role="STUDENT" userName="Learner">
      <div className="space-y-6 pb-16">
        {/* Header Title Banner */}
        <div className="bg-gradient-to-r from-[#0B4F4B] via-[#073F3C] to-[#042826] text-white rounded-3xl p-6 lg:p-8 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden">
          <div className="space-y-2 relative z-10">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-xs font-bold text-teal-200 border border-white/20 uppercase tracking-wider">
                Financial Ledger
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight flex items-center gap-3">
              <CreditCard className="w-8 h-8 text-teal-300 shrink-0" />
              Payment Log & Purchase History
            </h1>
            <p className="text-xs sm:text-sm text-teal-100 max-w-xl">
              Complete itemized billing ledger for all course enrollments, live class slot bookings, and Cashfree transactions.
            </p>
          </div>

          <div className="flex items-center gap-2.5 relative z-10 shrink-0">
            <BackButton fallbackUrl="/student/dashboard" label="Back to Dashboard" variant="dark" />
            <BackToHomeButton variant="dark" />
          </div>
        </div>

        {/* Filter Toolbar */}
        <Card className="p-4 border-slate-200 bg-white rounded-3xl shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search course, class, or reference..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-900 placeholder-slate-400 outline-none focus:ring-2 focus:ring-[#0B4F4B]"
            />
          </div>

          <div className="flex items-center gap-1.5 flex-wrap w-full sm:w-auto">
            {["ALL", "CAPTURED", "PENDING", "REFUNDED", "FAILED"].map((s) => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  filter === s
                    ? "bg-[#0B4F4B] text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </Card>

        {/* Payment List Table */}
        {loading ? (
          <Card className="p-12 text-center bg-white border border-slate-200 rounded-3xl">
            <Loader2 className="h-8 w-8 text-[#0B4F4B] animate-spin mx-auto mb-3" />
            <p className="text-xs text-slate-500 font-bold">Loading payment transaction records...</p>
          </Card>
        ) : filtered.length === 0 ? (
          <Card className="p-16 text-center space-y-3 bg-white border border-slate-200 rounded-3xl shadow-sm">
            <Receipt className="w-12 h-12 text-slate-300 mx-auto" />
            <h3 className="text-base font-bold text-slate-800">No payment logs found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              You haven&apos;t completed any course purchases or live class bookings matching this filter yet.
            </p>
            <Link href="/courses" className="inline-block pt-2">
              <Button variant="primary" size="sm" className="bg-[#0B4F4B] hover:bg-[#073F3C]">
                Explore Courses
              </Button>
            </Link>
          </Card>
        ) : (
          <Card className="p-0 border-slate-200 overflow-hidden rounded-3xl shadow-xs bg-white">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-600 font-extrabold uppercase border-b border-slate-200">
                  <tr>
                    <th className="p-4">Item Details</th>
                    <th className="p-4">Transaction Ref</th>
                    <th className="p-4">Educator</th>
                    <th className="p-4">Amount</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Date</th>
                    <th className="p-4 text-right">Receipt</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-4">
                        <div className="font-extrabold text-slate-900 truncate max-w-[220px]">
                          {p.productTitle}
                        </div>
                        <div className="text-[10px] text-slate-500 capitalize">
                          {(p.type || "PURCHASE").replace("_", " ")}
                        </div>
                      </td>
                      <td className="p-4 font-mono text-[11px] text-slate-600">
                        {p.internalReference}
                      </td>
                      <td className="p-4 font-medium text-slate-700">{p.teacherName}</td>
                      <td className="p-4 font-bold text-slate-900">{formatCurrency(p.amount)}</td>
                      <td className="p-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            p.status === "CAPTURED"
                              ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                              : p.status === "REFUNDED"
                              ? "bg-purple-100 text-purple-800 border border-purple-200"
                              : p.status === "FAILED"
                              ? "bg-red-100 text-red-800 border border-red-200"
                              : "bg-amber-100 text-amber-800 border border-amber-200"
                          }`}
                        >
                          {p.status === "CAPTURED" && <CheckCircle2 className="w-3 h-3" />}
                          {p.status}
                        </span>
                      </td>
                      <td className="p-4 text-slate-500">
                        {new Date(p.createdAt).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </td>
                      <td className="p-4 text-right">
                        <Link
                          href={`/student/payments/${p.id}`}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-teal-50 text-teal-800 hover:bg-teal-100 text-xs font-bold transition-colors border border-teal-200"
                        >
                          <span>Receipt</span>
                          <ExternalLink className="w-3 h-3" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
