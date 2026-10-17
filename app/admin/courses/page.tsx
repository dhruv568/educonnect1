"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  BookOpen,
  CheckCircle2,
  AlertCircle,
  Archive,
  Eye,
  Search,
  Shield,
  Trash2,
  Filter,
  ArrowRight,
  Loader2,
  Sparkles,
  Send,
  Bell,
  RefreshCw,
} from "lucide-react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { AdminBreadcrumb } from "@/components/ui/admin-breadcrumb";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatCurrency } from "@/lib/currency";
import { PermissionGuard } from "@/components/shared/permission-guard";
import { ErrorBanner } from "@/components/ui/error/error-banner";
import { AppErrors } from "@/lib/errors/app-error";
import { StructuredErrorMetadata } from "@/lib/errors/types";

export default function AdminCoursesModerationPage() {
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});
  const [notifyLoading, setNotifyLoading] = useState<Record<string, boolean>>({});
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [courseErrors, setCourseErrors] = useState<Record<string, StructuredErrorMetadata | null>>({});

  const fetchAdminCourses = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/courses?limit=100");
      const data = await res.json();
      if (data.success) {
        setCourses(data.data.courses || []);
      }
    } catch (err) {
      console.error("Failed to load admin courses:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminCourses();
  }, []);

  const handleNotifyEducator = async (courseId: string, courseTitle: string) => {
    setNotifyLoading((prev) => ({ ...prev, [courseId]: true }));
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const res = await fetch(`/api/admin/courses/${courseId}/notify-educator`, {
        method: "POST",
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSuccessMsg(data.data?.message || `Notification sent to educator for "${courseTitle}".`);
      } else {
        const msg = data.error || data.message || "Failed to notify educator.";
        setErrorMsg(msg);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Network error while notifying educator.");
    } finally {
      setNotifyLoading((prev) => ({ ...prev, [courseId]: false }));
    }
  };

  const handleStatusChange = async (
    courseId: string,
    newStatus: string,
    actionName?: string,
    reason?: string,
    skipPreValidation = false
  ) => {
    const course = courses.find((c) => c.id === courseId);

    // Phase 4: Pre-validate course before administrator clicks Approve & Publish
    // while retaining authoritative server-side validation.
    if (!skipPreValidation && actionName === "APPROVE" && course && (course.totalLessons ?? 0) === 0) {
      const structuredMeta = AppErrors.courseNoLessons(courseId, course.title).toMetadata();
      setCourseErrors((prev) => ({
        ...prev,
        [courseId]: structuredMeta,
      }));
      return;
    }

    setActionLoading((prev) => ({ ...prev, [courseId]: true }));
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await fetch(`/api/admin/courses/${courseId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus, action: actionName, reason }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        const errorDetails: StructuredErrorMetadata =
          data.errorDetails ||
          AppErrors.fromAny(data.error || data.message || "Failed to update course status.").toMetadata();

        setCourseErrors((prev) => ({
          ...prev,
          [courseId]: errorDetails,
        }));
      } else {
        // Success: clear any existing error for this course
        setCourseErrors((prev) => ({ ...prev, [courseId]: null }));
        setSuccessMsg(`Course status updated to '${newStatus}' successfully.`);
        await fetchAdminCourses();
      }
    } catch (err: any) {
      console.error("Failed to update status:", err);
      const fallbackMeta = AppErrors.fromAny(err).toMetadata();
      setCourseErrors((prev) => ({
        ...prev,
        [courseId]: fallbackMeta,
      }));
    } finally {
      setActionLoading((prev) => ({ ...prev, [courseId]: false }));
    }
  };

  const handleDeleteCourse = async (courseId: string, title: string) => {
    if (!confirm(`Are you sure you want to permanently delete course "${title}"?`)) return;
    try {
      const res = await fetch(`/api/admin/courses/${courseId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        fetchAdminCourses();
      }
    } catch (err) {
      console.error("Failed to delete course:", err);
    }
  };

  const draftCount = courses.filter((c) => c.status === "DRAFT").length;
  const publishedCount = courses.filter((c) => c.status === "PUBLISHED").length;
  const archivedCount = courses.filter((c) => c.status === "ARCHIVED").length;

  const filtered = courses.filter((c) => {
    const matchesSearch =
      !searchTerm ||
      c.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.teacherName && c.teacherName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (c.teacherEmail && c.teacherEmail.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus =
      statusFilter === "ALL" ||
      c.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <DashboardLayout role="ADMIN" userName="System Administrator" userEmail="educonnects.com@gmail.com">
      <div className="space-y-6 pb-16">
        {/* Breadcrumb & Header */}
        <div>
          <AdminBreadcrumb
            items={[{ label: "Content" }, { label: "Course Moderation" }]}
            className="mb-3"
          />
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl lg:text-3xl font-black text-slate-900 tracking-tight">
                  Course Moderation & Catalog
                </h1>
                <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-purple-100 text-purple-800 border border-purple-200 uppercase">
                  {courses.length} Courses
                </span>
              </div>
              <p className="text-xs lg:text-sm text-slate-500 mt-1">
                Review curriculum, moderate submissions, and publish pre-recorded video courses to the public catalog.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Link href="/admin/errors">
                <button className="px-3 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-800 text-xs font-bold transition-colors border border-purple-200">
                  Open Error Center
                </button>
              </Link>
              <Link href="/admin/reports">
                <button className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors">
                  View Content Reports
                </button>
              </Link>
            </div>
          </div>
        </div>

        {/* Status Filter Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          <button
            onClick={() => setStatusFilter("ALL")}
            className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
              statusFilter === "ALL"
                ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                : "bg-white hover:bg-slate-50 text-slate-700 border-slate-200"
            }`}
          >
            <span className="text-[11px] font-bold opacity-80 uppercase">Total Catalog</span>
            <div className="text-2xl font-black mt-1">{courses.length}</div>
            <p className="text-[10px] opacity-70 mt-0.5">All registered courses</p>
          </button>

          <button
            onClick={() => setStatusFilter("DRAFT")}
            className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
              statusFilter === "DRAFT"
                ? "bg-amber-500 text-white border-amber-500 shadow-sm"
                : "bg-white hover:bg-slate-50 text-slate-700 border-slate-200"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold opacity-80 uppercase">Pending Review</span>
              {draftCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[9px] font-black bg-amber-400 text-amber-950">
                  ACTION REQ
                </span>
              )}
            </div>
            <div className="text-2xl font-black mt-1">{draftCount}</div>
            <p className="text-[10px] opacity-70 mt-0.5">Draft submissions awaiting approval</p>
          </button>

          <button
            onClick={() => setStatusFilter("PUBLISHED")}
            className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
              statusFilter === "PUBLISHED"
                ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                : "bg-white hover:bg-slate-50 text-slate-700 border-slate-200"
            }`}
          >
            <span className="text-[11px] font-bold opacity-80 uppercase">Published Live</span>
            <div className="text-2xl font-black mt-1">{publishedCount}</div>
            <p className="text-[10px] opacity-70 mt-0.5">Available in catalog</p>
          </button>

          <button
            onClick={() => setStatusFilter("ARCHIVED")}
            className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
              statusFilter === "ARCHIVED"
                ? "bg-slate-700 text-white border-slate-700 shadow-sm"
                : "bg-white hover:bg-slate-50 text-slate-700 border-slate-200"
            }`}
          >
            <span className="text-[11px] font-bold opacity-80 uppercase">Archived</span>
            <div className="text-2xl font-black mt-1">{archivedCount}</div>
            <p className="text-[10px] opacity-70 mt-0.5">Deactivated courses</p>
          </button>
        </div>

        {/* Global Feedback Banners */}
        {errorMsg && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
            <button onClick={() => setErrorMsg(null)} className="text-xs font-bold underline hover:text-rose-900 cursor-pointer">
              Dismiss
            </button>
          </div>
        )}

        {successMsg && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
            <button onClick={() => setSuccessMsg(null)} className="text-xs font-bold underline hover:text-emerald-900 cursor-pointer">
              Dismiss
            </button>
          </div>
        )}

        {/* Search Toolbar */}
        <Card className="p-4 border-slate-200 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search courses, educators, or subjects..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-10 pl-10 pr-4 bg-slate-100 border-none rounded-2xl text-xs text-slate-900 font-semibold outline-none focus:ring-2 focus:ring-[#0B4F4B]"
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <Filter className="h-4 w-4 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-10 px-3 bg-slate-100 border-none rounded-2xl text-xs font-bold text-slate-700 outline-none"
            >
              <option value="ALL">ALL STATUSES</option>
              <option value="DRAFT">DRAFT / PENDING</option>
              <option value="PUBLISHED">PUBLISHED</option>
              <option value="ARCHIVED">ARCHIVED</option>
            </select>
          </div>
        </Card>

        {/* Courses Table */}
        <Card className="p-0 border-slate-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-600 font-extrabold uppercase border-b border-slate-200">
                <tr>
                  <th className="p-4">Course</th>
                  <th className="p-4">Educator</th>
                  <th className="p-4">Subject & Price</th>
                  <th className="p-4">Curriculum Info</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Moderation Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-500">
                      <Loader2 className="h-6 w-6 text-[#0B4F4B] animate-spin mx-auto mb-2" />
                      Loading course catalog...
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-500 font-bold">
                      No courses match your criteria.
                    </td>
                  </tr>
                ) : (
                  filtered.map((c) => {
                    const currentError = courseErrors[c.id];
                    const hasNoLessons = (c.totalLessons ?? 0) === 0;

                    return (
                      <React.Fragment key={c.id}>
                        <tr className="hover:bg-slate-50/80 transition-colors">
                          <td className="p-4">
                            <div className="font-bold text-slate-900">{c.title}</div>
                            <div className="text-[11px] text-slate-400 font-mono">/courses/{c.slug}</div>
                          </td>
                          <td className="p-4">
                            <div className="font-semibold text-slate-800">{c.teacherName || "Educator"}</div>
                            <div className="text-[11px] text-slate-400">{c.teacherEmail || ""}</div>
                          </td>
                          <td className="p-4">
                            <div className="font-medium text-slate-700">{c.subject}</div>
                            <div className="font-bold text-slate-900 mt-0.5">
                              {c.price === 0 ? "FREE" : formatCurrency(c.price)}
                            </div>
                          </td>
                          <td className="p-4 text-slate-500">
                            {/* Display accurate curriculum information: sections and lessons */}
                            <div className="font-semibold text-slate-800">
                              {c.sectionsCount ?? 0} Sections ({c.totalLessons ?? 0} Lessons)
                            </div>
                            {c.sectionsCount > 0 && hasNoLessons ? (
                              <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800 border border-amber-200 mt-0.5">
                                ⚠️ Empty Sections (0 Lessons)
                              </span>
                            ) : hasNoLessons ? (
                              <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-800 border border-rose-200 mt-0.5">
                                0 Lessons
                              </span>
                            ) : (
                              <div className="text-[11px] text-slate-400">
                                {c.enrollmentCount ?? c.enrollmentsCount ?? 0} Enrollments
                              </div>
                            )}
                          </td>
                          <td className="p-4">
                            <div className="space-y-1">
                              <StatusBadge
                                status={c.status === "PUBLISHED" ? "PUBLISHED" : c.status === "DRAFT" ? "PENDING" : "REJECTED"}
                                size="sm"
                              />
                              {currentError && (
                                <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-800 border border-rose-200">
                                  Action Required
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="p-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Link
                                href={`/courses/${c.slug}/preview`}
                                target="_blank"
                                className="p-2 rounded-xl bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200 transition-colors"
                                title="Preview Course Curriculum"
                              >
                                <Eye className="w-4 h-4" />
                              </Link>

                              {c.status !== "PUBLISHED" && (
                                <>
                                  <PermissionGuard permission="courses.approve">
                                    <button
                                      onClick={() => handleStatusChange(c.id, "PUBLISHED", "APPROVE")}
                                      disabled={actionLoading[c.id]}
                                      className="px-3 py-1.5 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white transition-colors cursor-pointer shadow-2xs"
                                    >
                                      {actionLoading[c.id] ? "Updating..." : "Approve & Publish"}
                                    </button>
                                  </PermissionGuard>
                                  {c.status !== "UNPUBLISHED" && (
                                    <PermissionGuard permission="courses.reject">
                                      <button
                                        onClick={() => {
                                          const reason = prompt("Reason for rejection (optional):") || "Course rejected by admin moderation.";
                                          handleStatusChange(c.id, "UNPUBLISHED", "REJECT", reason);
                                        }}
                                        disabled={actionLoading[c.id]}
                                        className="px-3 py-1.5 text-xs font-bold rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white transition-colors cursor-pointer shadow-2xs"
                                      >
                                        {actionLoading[c.id] ? "Updating..." : "Reject"}
                                      </button>
                                    </PermissionGuard>
                                  )}
                                </>
                              )}

                              {c.status === "PUBLISHED" && (
                                <PermissionGuard permission="courses.reject">
                                  <button
                                    onClick={() => handleStatusChange(c.id, "UNPUBLISHED")}
                                    disabled={actionLoading[c.id]}
                                    className="px-3 py-1.5 text-xs font-bold rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white transition-colors cursor-pointer shadow-2xs"
                                  >
                                    {actionLoading[c.id] ? "Updating..." : "Unpublish"}
                                  </button>
                                </PermissionGuard>
                              )}

                              {c.status !== "ARCHIVED" && (
                                <PermissionGuard permission="courses.reject">
                                  <button
                                    onClick={() => handleStatusChange(c.id, "ARCHIVED")}
                                    disabled={actionLoading[c.id]}
                                    className="p-2 rounded-xl bg-slate-100 text-slate-500 hover:text-rose-600 hover:bg-rose-50 disabled:opacity-50 transition-colors cursor-pointer"
                                    title="Archive Course"
                                  >
                                    <Archive className="w-4 h-4" />
                                  </button>
                                </PermissionGuard>
                              )}

                              <PermissionGuard permission="courses.delete">
                                <button
                                  onClick={() => handleDeleteCourse(c.id, c.title)}
                                  disabled={actionLoading[c.id]}
                                  className="p-2 rounded-xl bg-slate-100 text-rose-500 hover:text-rose-700 hover:bg-rose-50 disabled:opacity-50 transition-colors cursor-pointer"
                                  title="Delete Course Permanently"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </PermissionGuard>
                            </div>
                          </td>
                        </tr>

                        {/* Phase 4: Show the error near the course's moderation status with full guidance */}
                        {currentError && (
                          <tr className="bg-amber-50/40 border-b border-amber-200">
                            <td colSpan={6} className="p-4 sm:p-5">
                              <ErrorBanner
                                error={currentError}
                                showAdminGuidance={true}
                                onDismiss={() => {
                                  // Allows admin to dismiss notification without altering course status
                                  setCourseErrors((prev) => ({ ...prev, [c.id]: null }));
                                }}
                                onRetry={() => {
                                  // Re-runs authoritative check against server
                                  handleStatusChange(c.id, "PUBLISHED", "APPROVE", undefined, true);
                                }}
                                retryLoading={actionLoading[c.id]}
                                actions={[
                                  {
                                    label: "View Curriculum",
                                    icon: <Eye className="w-3.5 h-3.5" />,
                                    variant: "outline",
                                    onClick: () => {
                                      window.open(`/courses/${c.slug}/preview`, "_blank");
                                    },
                                  },
                                  {
                                    label: notifyLoading[c.id] ? "Sending..." : "Notify Educator",
                                    icon: <Bell className="w-3.5 h-3.5" />,
                                    variant: "primary",
                                    disabled: notifyLoading[c.id],
                                    onClick: () => handleNotifyEducator(c.id, c.title),
                                  },
                                ]}
                              />
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}
