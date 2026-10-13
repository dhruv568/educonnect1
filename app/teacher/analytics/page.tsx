"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MetricCard } from "@/components/analytics/metric-card";
import { AnalyticsChart } from "@/components/analytics/analytics-chart";
import { EmptyAnalyticsState } from "@/components/analytics/empty-analytics-state";
import {
  BarChart2,
  BookOpen,
  Video,
  Users,
  IndianRupee,
  Download,
  Calendar,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { formatCurrency } from "@/lib/currency";
import { BackButton } from "@/components/ui/back-button";

export default function TeacherAnalyticsPage() {
  const [range, setRange] = useState("30d");
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<any>(null);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/teacher/analytics?range=${range}`);
      const json = await res.json();
      if (json.data) {
        setAnalytics(json.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [range]);

  const courseBreakdown = analytics?.courseMetrics?.courseBreakdown || [];
  const chartData = courseBreakdown.map((c: any) => ({
    label: c.title.length > 15 ? c.title.substring(0, 12) + "..." : c.title,
    value: c.periodEnrollments,
    secondaryValue: c.completionRatePercent,
  }));

  return (
    <DashboardLayout role="TEACHER" userName="Teaching Analytics">
      <div className="space-y-8 pb-16">
        {/* Header & Date Range Picker */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <BackButton
              fallbackUrl="/teacher/dashboard"
              label="Back to Dashboard"
              variant="default"
              className="mb-3"
            />
            <h1 className="text-2xl lg:text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
              Teaching Analytics & Insights
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Track course completion rates, live class attendance, student progress, and period revenue.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Date Range Selector */}
            <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
              {[
                { id: "7d", label: "7 Days" },
                { id: "30d", label: "30 Days" },
                { id: "90d", label: "90 Days" },
                { id: "year", label: "This Year" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setRange(tab.id)}
                  className={`px-3 py-1.5 font-bold rounded-lg transition ${
                    range === tab.id
                      ? "bg-white dark:bg-slate-800 text-[#0F766E] dark:text-[#2DD4BF] shadow-xs"
                      : "text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <a href="/api/admin/analytics/export?type=revenue" download>
              <Button variant="outline" size="sm" leftIcon={<Download className="h-4 w-4" />}>
                Export CSV
              </Button>
            </a>
          </div>
        </div>

        {/* Analytics Key Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard
            title="Period Enrollments"
            value={loading ? "..." : analytics?.courseMetrics?.totalEnrollmentsInPeriod || 0}
            subtitle="Student course enrollments"
            icon={<BookOpen className="h-5 w-5 text-[#0F766E]" />}
            variant="teal"
          />

          <MetricCard
            title="Avg Completion Rate"
            value={loading ? "..." : `${analytics?.courseMetrics?.overallCompletionRate || 0}%`}
            subtitle="Eligible student completion"
            icon={<CheckCircle2 className="h-5 w-5 text-emerald-600" />}
            variant="emerald"
          />

          <MetricCard
            title="Class Attendance Rate"
            value={loading ? "..." : `${analytics?.liveClassMetrics?.attendanceRatePercent || 0}%`}
            subtitle={`${analytics?.liveClassMetrics?.totalPresentParticipants || 0} participants attended`}
            icon={<Video className="h-5 w-5 text-[#115E59]" />}
            variant="teal"
          />

          <MetricCard
            title="Period Earnings"
            value={loading ? "..." : formatCurrency(analytics?.financialMetrics?.periodEarningsRupees || 0)}
            subtitle="Calculated from ledger"
            icon={<IndianRupee className="h-5 w-5 text-amber-500" />}
            variant="amber"
          />
        </div>

        {/* Interactive Performance Chart */}
        <Card className="p-6 border-slate-200 dark:border-slate-800 space-y-4">
          <h3 className="text-lg font-black text-slate-900 dark:text-slate-100">
            Course Performance Breakdown
          </h3>

          {loading ? (
            <div className="p-12 text-center">
              <Loader2 className="h-8 w-8 text-[#0F766E] animate-spin mx-auto" />
            </div>
          ) : chartData.length === 0 ? (
            <EmptyAnalyticsState
              title="No course performance data"
              description="Publish video courses and enroll students to view detailed completion rates and engagement metrics."
              actionText="Create New Course"
              actionHref="/teacher/courses"
            />
          ) : (
            <AnalyticsChart
              title="Enrollments vs Completion Rate %"
              data={chartData}
              primaryLabel="Period Enrollments"
              secondaryLabel="Completion Rate %"
            />
          )}
        </Card>

        {/* Detailed Course Breakdown Table */}
        <Card className="p-6 border-slate-200 dark:border-slate-800 space-y-4">
          <h3 className="text-lg font-black text-slate-900 dark:text-slate-100">
            Course Analytics Table
          </h3>

          {courseBreakdown.length === 0 ? (
            <p className="text-xs text-slate-500 font-medium">No active courses published yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-extrabold uppercase tracking-wider">
                    <th className="py-3 px-2">Course Title</th>
                    <th className="py-3 px-2">Status</th>
                    <th className="py-3 px-2">Price</th>
                    <th className="py-3 px-2">Total Enrollments</th>
                    <th className="py-3 px-2">Period Enrollments</th>
                    <th className="py-3 px-2">Avg Progress</th>
                    <th className="py-3 px-2">Completion Rate</th>
                    <th className="py-3 px-2">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium text-slate-700 dark:text-slate-300">
                  {courseBreakdown.map((course: any) => (
                    <tr key={course.courseId} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                      <td className="py-3 px-2 font-bold text-slate-900 dark:text-slate-100">{course.title}</td>
                      <td className="py-3 px-2">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700">
                          {course.status}
                        </span>
                      </td>
                      <td className="py-3 px-2">{formatCurrency(course.price)}</td>
                      <td className="py-3 px-2 font-bold">{course.totalEnrollments}</td>
                      <td className="py-3 px-2 text-[#0F766E] font-bold">{course.periodEnrollments}</td>
                      <td className="py-3 px-2">{course.averageProgressPercent}%</td>
                      <td className="py-3 px-2 text-emerald-600 font-bold">{course.completionRatePercent}%</td>
                      <td className="py-3 px-2">
                        <Link href={`/teacher/courses/${course.courseId}/analytics`}>
                          <Button variant="outline" size="sm">
                            Inspect
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </DashboardLayout>
  );
}
