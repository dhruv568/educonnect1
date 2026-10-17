"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  ShieldAlert,
  AlertCircle,
  AlertTriangle,
  Info,
  Search,
  Filter,
  CheckCircle2,
  RefreshCw,
  Loader2,
  ExternalLink,
  Copy,
  Check,
  ChevronLeft,
  ChevronRight,
  Eye,
  Activity,
  Server,
  Layers,
} from "lucide-react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { AdminBreadcrumb } from "@/components/ui/admin-breadcrumb";
import { Card } from "@/components/ui/card";
import { ErrorDetailsPanel } from "@/components/ui/error/error-details-panel";
import { StoredErrorRecord, StructuredErrorMetadata } from "@/lib/errors/types";

export default function AdminErrorCenterPage() {
  const [errors, setErrors] = useState<StoredErrorRecord[]>([]);
  const [metrics, setMetrics] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [applicationFilter, setApplicationFilter] = useState("ALL");
  const [severityFilter, setSeverityFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [selectedError, setSelectedError] = useState<StructuredErrorMetadata | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  const fetchErrors = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: "20",
        category: categoryFilter,
        application: applicationFilter,
        severity: severityFilter,
        status: statusFilter,
      });
      if (search) params.set("search", search);

      const res = await fetch(`/api/admin/errors?${params.toString()}`);
      const data = await res.json();
      if (data.success && data.data) {
        setErrors(data.data.errors || []);
        setMetrics(data.data.metrics || {});
        setTotalPages(data.data.pagination?.totalPages || 1);
      }
    } catch (err) {
      console.error("Failed to load error logs:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchErrors();
  }, [page, categoryFilter, applicationFilter, severityFilter, statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchErrors();
  };

  const handleStatusChange = async (errorId: string, newStatus: string) => {
    setUpdatingId(errorId);
    try {
      const res = await fetch("/api/admin/errors", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ errorId, status: newStatus }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSuccessNotice(`Error ${errorId} updated to ${newStatus}.`);
        setTimeout(() => setSuccessNotice(null), 3000);
        await fetchErrors();
      }
    } catch (err) {
      console.error("Failed to update error status:", err);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleCopyId = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getSeverityBadge = (sev: string) => {
    switch (sev) {
      case "critical":
        return "bg-rose-600 text-white";
      case "error":
        return "bg-rose-100 text-rose-800 border border-rose-200";
      case "warning":
        return "bg-amber-100 text-amber-800 border border-amber-200";
      case "info":
      default:
        return "bg-blue-100 text-blue-800 border border-blue-200";
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "RESOLVED":
        return "bg-emerald-100 text-emerald-800 border-emerald-200";
      case "INVESTIGATING":
        return "bg-amber-100 text-amber-800 border-amber-200";
      case "IGNORED":
        return "bg-slate-100 text-slate-600 border-slate-200";
      case "OPEN":
      default:
        return "bg-rose-100 text-rose-800 border-rose-200 font-extrabold";
    }
  };

  return (
    <DashboardLayout role="ADMIN" userName="System Administrator" userEmail="educonnects.com@gmail.com">
      <div className="space-y-6 pb-16">
        {/* Breadcrumb & Header */}
        <div>
          <AdminBreadcrumb
            items={[{ label: "Security & Operations" }, { label: "Error Center" }]}
            className="mb-3"
          />
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl lg:text-3xl font-black text-slate-900 tracking-tight">
                  Platform Error Center
                </h1>
                <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-rose-100 text-rose-800 border border-rose-200 uppercase">
                  Traceable Diagnostics
                </span>
              </div>
              <p className="text-xs lg:text-sm text-slate-500 mt-1">
                Centralized monitoring, classification, error reference lookup, and investigation triage across all platform applications.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={fetchErrors}
                className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold inline-flex items-center gap-1.5 transition cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
                <span>Refresh Logs</span>
              </button>
            </div>
          </div>
        </div>

        {/* Overview Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
            <span className="text-[10px] font-black uppercase text-slate-400">Total Tracked</span>
            <div className="text-2xl font-black text-slate-900 mt-1">{metrics.total ?? errors.length}</div>
            <p className="text-[10px] text-slate-400 mt-0.5">Logged exceptions</p>
          </div>

          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 shadow-2xs">
            <span className="text-[10px] font-black uppercase text-rose-600">Open Triage</span>
            <div className="text-2xl font-black text-rose-700 mt-1">{metrics.open ?? 0}</div>
            <p className="text-[10px] text-rose-600/80 mt-0.5">Awaiting investigation</p>
          </div>

          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 shadow-2xs">
            <span className="text-[10px] font-black uppercase text-amber-700">Investigating</span>
            <div className="text-2xl font-black text-amber-800 mt-1">{metrics.investigating ?? 0}</div>
            <p className="text-[10px] text-amber-700/80 mt-0.5">Under active review</p>
          </div>

          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 shadow-2xs">
            <span className="text-[10px] font-black uppercase text-emerald-700">Resolved</span>
            <div className="text-2xl font-black text-emerald-800 mt-1">{metrics.resolved ?? 0}</div>
            <p className="text-[10px] text-emerald-700/80 mt-0.5">Verified & closed</p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900 text-white shadow-2xs">
            <span className="text-[10px] font-black uppercase text-rose-400">Critical Incidents</span>
            <div className="text-2xl font-black mt-1">{metrics.bySeverity?.critical ?? 0}</div>
            <p className="text-[10px] text-slate-400 mt-0.5">High severity events</p>
          </div>
        </div>

        {/* Feedback Banner */}
        {successNotice && (
          <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successNotice}</span>
          </div>
        )}

        {/* Search & Filter Toolbar */}
        <Card className="p-4 border-slate-200 space-y-3">
          <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by Error Reference ID, route, code, or keyword..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-10 pl-10 pr-4 bg-slate-100 border-none rounded-2xl text-xs text-slate-900 font-semibold outline-none focus:ring-2 focus:ring-[#0B4F4B]"
              />
            </div>

            <button
              type="submit"
              className="w-full md:w-auto px-4 h-10 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition cursor-pointer"
            >
              Search Logs
            </button>
          </form>

          {/* Filter Dropdowns */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-xs">
            <div>
              <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Application</label>
              <select
                value={applicationFilter}
                onChange={(e) => {
                  setApplicationFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full h-9 px-3 bg-slate-100 border-none rounded-xl text-xs font-bold text-slate-700 outline-none"
              >
                <option value="ALL">All Applications</option>
                <option value="main">Main Website</option>
                <option value="learner">Learner Portal</option>
                <option value="educator">Educator Portal</option>
                <option value="admin">Admin Panel</option>
                <option value="api">API Routes</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Category</label>
              <select
                value={categoryFilter}
                onChange={(e) => {
                  setCategoryFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full h-9 px-3 bg-slate-100 border-none rounded-xl text-xs font-bold text-slate-700 outline-none"
              >
                <option value="ALL">All Categories</option>
                <option value="VALIDATION_ERROR">VALIDATION_ERROR</option>
                <option value="AUTHENTICATION_ERROR">AUTHENTICATION_ERROR</option>
                <option value="AUTHORIZATION_ERROR">AUTHORIZATION_ERROR</option>
                <option value="NOT_FOUND">NOT_FOUND</option>
                <option value="CONFLICT">CONFLICT</option>
                <option value="PAYMENT_ERROR">PAYMENT_ERROR</option>
                <option value="PAYOUT_ERROR">PAYOUT_ERROR</option>
                <option value="DATABASE_ERROR">DATABASE_ERROR</option>
                <option value="NETWORK_ERROR">NETWORK_ERROR</option>
                <option value="OTP_ERROR">OTP_ERROR</option>
                <option value="NOTIFICATION_ERROR">NOTIFICATION_ERROR</option>
                <option value="EXTERNAL_SERVICE_ERROR">EXTERNAL_SERVICE_ERROR</option>
                <option value="INTERNAL_SERVER_ERROR">INTERNAL_SERVER_ERROR</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Severity</label>
              <select
                value={severityFilter}
                onChange={(e) => {
                  setSeverityFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full h-9 px-3 bg-slate-100 border-none rounded-xl text-xs font-bold text-slate-700 outline-none"
              >
                <option value="ALL">All Severities</option>
                <option value="critical">Critical</option>
                <option value="error">Error</option>
                <option value="warning">Warning</option>
                <option value="info">Info</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full h-9 px-3 bg-slate-100 border-none rounded-xl text-xs font-bold text-slate-700 outline-none"
              >
                <option value="ALL">All Statuses</option>
                <option value="OPEN">OPEN</option>
                <option value="INVESTIGATING">INVESTIGATING</option>
                <option value="RESOLVED">RESOLVED</option>
                <option value="IGNORED">IGNORED</option>
              </select>
            </div>
          </div>
        </Card>

        {/* Errors Table */}
        <Card className="p-0 border-slate-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-600 font-extrabold uppercase border-b border-slate-200">
                <tr>
                  <th className="p-4">Reference ID & Timestamp</th>
                  <th className="p-4">Category & Severity</th>
                  <th className="p-4">Route / App</th>
                  <th className="p-4">Explanation & Record</th>
                  <th className="p-4">Investigation Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="p-12 text-center text-slate-500">
                      <Loader2 className="h-6 w-6 text-[#0B4F4B] animate-spin mx-auto mb-2" />
                      Loading platform error records...
                    </td>
                  </tr>
                ) : errors.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-12 text-center text-slate-500 space-y-2">
                      <ShieldAlert className="w-8 h-8 text-slate-300 mx-auto" />
                      <div className="font-bold">No errors recorded matching your filter criteria.</div>
                      <p className="text-[11px] text-slate-400">All services operating smoothly.</p>
                    </td>
                  </tr>
                ) : (
                  errors.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-slate-900">{item.errorId}</span>
                          <button
                            type="button"
                            onClick={() => handleCopyId(item.errorId)}
                            title="Copy Reference ID"
                            className="p-1 rounded text-slate-400 hover:text-slate-700 transition"
                          >
                            {copiedId === item.errorId ? (
                              <Check className="w-3 h-3 text-emerald-600" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          {new Date(item.timestamp).toLocaleString()}
                        </div>
                      </td>

                      <td className="p-4">
                        <div className="space-y-1">
                          <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                            {item.category}
                          </span>
                          <div>
                            <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-black uppercase ${getSeverityBadge(item.severity)}`}>
                              {item.severity}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="p-4">
                        <div className="font-semibold text-slate-800">{item.application?.toUpperCase() || "API"}</div>
                        <div className="text-[11px] text-slate-400 font-mono truncate max-w-[180px]" title={item.route}>
                          {item.route || "N/A"}
                        </div>
                      </td>

                      <td className="p-4">
                        <div className="font-medium text-slate-900 line-clamp-1">{item.message}</div>
                        {item.affectedResource && (
                          <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                            Target: {item.affectedResource.type}:{item.affectedResource.id || item.affectedResource.name || "N/A"}
                          </div>
                        )}
                      </td>

                      <td className="p-4">
                        <select
                          value={item.investigationStatus}
                          disabled={updatingId === item.errorId}
                          onChange={(e) => handleStatusChange(item.errorId, e.target.value)}
                          className={`px-2.5 py-1 rounded-xl text-[10px] font-bold border outline-none cursor-pointer ${getStatusBadge(
                            item.investigationStatus
                          )}`}
                        >
                          <option value="OPEN">OPEN</option>
                          <option value="INVESTIGATING">INVESTIGATING</option>
                          <option value="RESOLVED">RESOLVED</option>
                          <option value="IGNORED">IGNORED</option>
                        </select>
                      </td>

                      <td className="p-4 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedError(item);
                            setDetailsOpen(true);
                          }}
                          className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold inline-flex items-center gap-1 transition cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Inspect</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="p-4 border-t border-slate-200 flex items-center justify-between text-xs">
              <span className="text-slate-500">
                Page {page} of {totalPages}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 disabled:opacity-40 transition cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 disabled:opacity-40 transition cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Error Details Modal */}
      <ErrorDetailsPanel
        error={selectedError}
        isOpen={detailsOpen}
        isAdmin={true}
        onClose={() => setDetailsOpen(false)}
      />
    </DashboardLayout>
  );
}
