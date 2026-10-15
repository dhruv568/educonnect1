"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, ListFilter, CheckCircle2, IndianRupee, Search } from "lucide-react";
import { formatCurrency } from "@/lib/currency";
import { BackButton } from "@/components/ui/back-button";
import { BackToHomeButton } from "@/components/ui/back-to-home-button";

export default function TeacherTransactionsPage() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function fetchTx() {
      try {
        const res = await fetch("/api/teacher/earnings/transactions");
        const json = await res.json();
        if (res.ok) {
          setTransactions(json.data.transactions || []);
        }
      } catch {
        // Error
      } finally {
        setLoading(false);
      }
    }
    fetchTx();
  }, []);

  const filtered = transactions.filter((t) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      t.productName.toLowerCase().includes(q) ||
      t.studentName.toLowerCase().includes(q) ||
      t.internalReference.toLowerCase().includes(q)
    );
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6 md:p-10 space-y-6 sm:space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-800/80 pb-6">
        <div>
          <div className="flex items-center gap-2.5 mb-2">
            <BackButton
              fallbackUrl="/teacher/earnings"
              label="Back to Earnings"
              variant="dark"
            />
            <BackToHomeButton variant="dark" />
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
            <ListFilter className="w-8 h-8 text-teal-400" /> Educator Sales Ledger
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Itemized breakdown of student purchases, gross revenue, platform fee deductions, and net share.
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Search by student, product, or ref..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-slate-900/60 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 outline-none focus:border-teal-500 transition-colors"
        />
      </div>

      {/* Table */}
      {loading ? (
        <div className="p-12 text-center text-slate-400 bg-slate-900/40 rounded-3xl border border-slate-800/60">
          <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs">Loading sales ledger...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-12 text-center text-slate-400 bg-slate-900/40 rounded-3xl border border-slate-800/60">
          <p className="text-sm font-semibold">No sales transactions recorded yet.</p>
        </div>
      ) : (
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-3xl overflow-hidden backdrop-blur-xl shadow-2xl">
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/80 text-slate-400 uppercase font-semibold border-b border-slate-800">
                <tr>
                  <th className="px-6 py-4">Product</th>
                  <th className="px-6 py-4">Student</th>
                  <th className="px-6 py-4">Gross Sales</th>
                  <th className="px-6 py-4">Platform Fee</th>
                  <th className="px-6 py-4">Teacher Net Share</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filtered.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-6 py-4 font-semibold text-white">
                      <div className="truncate max-w-[200px]">{t.productName}</div>
                      <div className="text-[10px] font-normal text-slate-400 font-mono">{t.internalReference}</div>
                    </td>
                    <td className="px-6 py-4 text-slate-300">{t.studentName}</td>
                    <td className="px-6 py-4 font-bold text-slate-200">{formatCurrency(t.grossAmount)}</td>
                    <td className="px-6 py-4 text-slate-400">-{formatCurrency(t.commissionAmount)}</td>
                    <td className="px-6 py-4 font-extrabold text-emerald-400">{formatCurrency(t.teacherEarningAmount)}</td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <CheckCircle2 className="w-3 h-3" /> {t.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-400">{new Date(t.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card List */}
          <div className="md:hidden divide-y divide-slate-800/60">
            {filtered.map((t) => (
              <div key={t.id} className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <h4 className="font-extrabold text-sm text-white break-words">
                      {t.productName}
                    </h4>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Student: <span className="text-slate-200 font-medium">{t.studentName}</span>
                    </p>
                  </div>
                  <span className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <CheckCircle2 className="w-3 h-3" /> {t.status}
                  </span>
                </div>

                <div className="bg-slate-950/60 rounded-xl p-3 border border-slate-800/80 text-xs space-y-2">
                  <div className="flex items-center justify-between text-slate-300">
                    <span className="text-slate-400 text-[11px]">Gross Sales:</span>
                    <span className="font-semibold text-slate-200">{formatCurrency(t.grossAmount)}</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-300">
                    <span className="text-slate-400 text-[11px]">Platform Fee:</span>
                    <span className="text-slate-400">-{formatCurrency(t.commissionAmount)}</span>
                  </div>
                  <div className="flex items-center justify-between pt-1.5 border-t border-slate-800/60">
                    <span className="text-slate-400 text-[11px] font-semibold">Teacher Net Share:</span>
                    <span className="text-sm font-extrabold text-emerald-400">{formatCurrency(t.teacherEarningAmount)}</span>
                  </div>
                  <div className="pt-1.5 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-500">
                    <span>Date: {new Date(t.createdAt).toLocaleDateString()}</span>
                    <span className="font-mono text-[10px] text-slate-400 truncate max-w-[150px]" title={t.internalReference}>
                      {t.internalReference}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
