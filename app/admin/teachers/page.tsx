"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { AdminBreadcrumb } from "@/components/ui/admin-breadcrumb";
import { Card } from "@/components/ui/card";
import { GlassButton } from "@/components/glass/glass-button";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  Loader2,
  ArrowRight,
  ShieldCheck,
  GraduationCap,
  Sparkles,
} from "lucide-react";
import { formatCurrency } from "@/lib/currency";

export default function AdminTeachersPage() {
  const [teachers, setTeachers] = useState<any[]>([]);
  const [recommendedIds, setRecommendedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    fetchTeachers();
  }, [search, statusFilter, page]);

  const fetchTeachers = async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams({
        search,
        status: statusFilter,
        page: String(page),
        limit: "10",
      });

      const [res, recRes] = await Promise.all([
        fetch(`/api/admin/teachers?${query.toString()}`),
        fetch("/api/admin/recommended-educators"),
      ]);

      const json = await res.json();
      const recJson = await recRes.json();

      if (json.data) {
        setTeachers(json.data.teachers || []);
        setTotalPages(json.data.pagination?.totalPages || 1);
        setTotalCount(json.data.pagination?.totalCount || 0);
      }
      if (recJson.data?.recommendedIds) {
        setRecommendedIds(recJson.data.recommendedIds);
      }
    } catch (err) {
      console.error("Failed to fetch teachers:", err);
    } finally {
      setLoading(false);
    }
  };

  const toggleRecommended = async (teacherId: string, isCurrentlyRecommended: boolean) => {
    const nextState = !isCurrentlyRecommended;
    setRecommendedIds((prev) =>
      nextState ? [...prev, teacherId] : prev.filter((id) => id !== teacherId)
    );

    try {
      await fetch("/api/admin/recommended-educators", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teacherId, isRecommended: nextState }),
      });
    } catch (err) {
      console.error("Failed to toggle recommended educator:", err);
    }
  };

  return (
    <DashboardLayout role="ADMIN" userName="System Administrator" userEmail="educonnects.com@gmail.com">
      <div className="space-y-6 pb-16">
        {/* Breadcrumb & Header */}
        <div>
          <AdminBreadcrumb
            items={[{ label: "People" }, { label: "Educator Roster" }]}
            className="mb-3"
          />
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl lg:text-3xl font-black text-slate-900 tracking-tight">
                  Educator Roster & Directory
                </h1>
                <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-teal-100 text-teal-800 border border-teal-200 uppercase">
                  {totalCount} Educators
                </span>
              </div>
              <p className="text-xs lg:text-sm text-slate-500 mt-1">
                Directory of registered educators, subject specialties, verified qualifications, and hourly rates.
              </p>
            </div>

            <Link href="/admin/verification">
              <GlassButton variant="primary" size="sm" rightIcon={<ShieldCheck className="h-4 w-4" />}>
                Educator Verifications Queue
              </GlassButton>
            </Link>
          </div>
        </div>

        {/* Relationship Banner: Roster vs Verification */}
        <div className="p-4 rounded-2xl bg-teal-50 border border-teal-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-teal-900">
          <div className="flex items-center gap-2.5">
            <GraduationCap className="h-5 w-5 text-teal-700 shrink-0" />
            <div>
              <span className="font-bold">Managing Verified Educators:</span>
              <span className="text-teal-800 ml-1">
                This roster lists registered educators. To review unapproved credential submissions or pending ID documents, visit the verifications workspace.
              </span>
            </div>
          </div>
          <Link href="/admin/verification" className="shrink-0 font-bold text-teal-700 hover:text-teal-950 flex items-center gap-1">
            <span>Open Verification Queue</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {/* Filter Toolbar */}
        <Card className="p-4 border-slate-200 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search by name, email, or subject..."
              className="w-full h-10 pl-10 pr-4 bg-slate-100 border-none rounded-2xl text-xs text-slate-900 font-semibold outline-none focus:ring-2 focus:ring-[#0B4F4B]"
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <Filter className="h-4 w-4 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="h-10 px-3 bg-slate-100 border-none rounded-2xl text-xs font-bold text-slate-700 outline-none"
            >
              <option value="ALL">ALL VERIFICATION STATUSES</option>
              <option value="PENDING">PENDING REVIEW</option>
              <option value="VERIFIED">VERIFIED EDUCATOR</option>
              <option value="REJECTED">REJECTED</option>
              <option value="SUSPENDED">SUSPENDED</option>
            </select>
          </div>
        </Card>

        {/* Educator List Table */}
        <Card className="p-0 border-slate-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-600 font-extrabold uppercase border-b border-slate-200">
                <tr>
                  <th className="p-4">Educator</th>
                  <th className="p-4">Subjects & Experience</th>
                  <th className="p-4">Verification Status</th>
                  <th className="p-4">Credentials</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-500">
                      <Loader2 className="h-6 w-6 text-[#0B4F4B] animate-spin mx-auto mb-2" />
                      Loading educator roster...
                    </td>
                  </tr>
                ) : teachers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-500 font-bold">
                      No educator records found matching filters.
                    </td>
                  </tr>
                ) : (
                  teachers.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-[#0B4F4B] text-white font-bold flex items-center justify-center text-xs shadow-xs shrink-0 uppercase">
                            {t.name.charAt(0)}
                          </div>
                          <div>
                            <div className="font-extrabold text-slate-900">{t.name}</div>
                            <div className="text-[11px] text-slate-500">{t.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="font-bold text-slate-800">{t.subjects.join(", ") || "General"}</div>
                        <div className="text-[11px] text-slate-500">
                          {t.experienceYears} Years Exp • {formatCurrency(t.hourlyRate)}/hr
                        </div>
                      </td>
                      <td className="p-4">
                        <StatusBadge status={t.verificationStatus} size="sm" />
                      </td>
                      <td className="p-4 text-slate-500">
                        <div className="font-semibold text-slate-700">{t.documentCount} Documents</div>
                        <div className="text-[10px]">{t.qualificationCount} Qualifications</div>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => toggleRecommended(t.id, recommendedIds.includes(t.id))}
                            title={recommendedIds.includes(t.id) ? "Remove from Learner Dashboard Recommended list" : "Recommend on Learner Dashboard"}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all inline-flex items-center gap-1 border cursor-pointer ${
                              recommendedIds.includes(t.id)
                                ? "bg-amber-100 text-amber-900 border-amber-300 hover:bg-amber-200"
                                : "bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200"
                            }`}
                          >
                            <Sparkles className={`w-3.5 h-3.5 ${recommendedIds.includes(t.id) ? "text-amber-600 fill-amber-500" : "text-slate-400"}`} />
                            <span>{recommendedIds.includes(t.id) ? "Recommended" : "Recommend"}</span>
                          </button>

                          <Link href={`/admin/verification/${t.id}`}>
                            <button className="px-3.5 py-1.5 rounded-xl bg-teal-50 text-teal-800 hover:bg-teal-100 text-xs font-bold transition-colors inline-flex items-center gap-1 border border-teal-200 cursor-pointer">
                              <span>Review Profile</span>
                              <ArrowRight className="h-3.5 w-3.5" />
                            </button>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <div>
              Showing Page <span className="font-bold text-slate-900">{page}</span> of{" "}
              <span className="font-bold text-slate-900">{totalPages}</span> ({totalCount} educators)
            </div>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="p-2 rounded-xl border border-slate-200 text-slate-600 disabled:opacity-40 hover:bg-slate-100 cursor-pointer"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="p-2 rounded-xl border border-slate-200 text-slate-600 disabled:opacity-40 hover:bg-slate-100 cursor-pointer"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}
