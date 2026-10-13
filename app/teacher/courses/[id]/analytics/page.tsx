"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MetricCard } from "@/components/analytics/metric-card";
import { BookOpen, Users, CheckCircle2, Star, ArrowLeft, Loader2 } from "lucide-react";
import { formatCurrency } from "@/lib/currency";
import { BackButton } from "@/components/ui/back-button";

export default function SingleCourseAnalyticsPage({ params }: { params: { id: string } }) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    fetch(`/api/teacher/courses/${params.id}/analytics`)
      .then((res) => res.json())
      .then((json) => {
        if (json.data) setData(json.data);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [params.id]);

  if (loading) {
    return (
      <DashboardLayout role="TEACHER" userName="Course Analytics">
        <div className="p-12 text-center">
          <Loader2 className="h-8 w-8 text-[#0F766E] animate-spin mx-auto" />
        </div>
      </DashboardLayout>
    );
  }

  if (!data) {
    return (
      <DashboardLayout role="TEACHER" userName="Course Analytics">
        <div className="p-12 text-center space-y-3">
          <p className="text-sm font-bold text-slate-700">Course analytics not found.</p>
          <BackButton fallbackUrl={`/teacher/courses/${params.id}`} label="Back to Course" variant="default" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="TEACHER" userName={data.course.title}>
      <div className="max-w-5xl mx-auto space-y-6 pb-16">
        <div className="flex items-center gap-3">
          <BackButton
            fallbackUrl={`/teacher/courses/${params.id}`}
            label="Back to Course"
            variant="default"
          />
          <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100 truncate">
            {data.course.title}
          </h1>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard
            title="Total Enrollments"
            value={data.analytics.totalEnrollments}
            subtitle={`Price: ${formatCurrency(data.course.price)}`}
            icon={<Users className="h-5 w-5 text-[#0F766E]" />}
            variant="teal"
          />

          <MetricCard
            title="Completion Rate"
            value={`${data.analytics.completionRatePercent}%`}
            subtitle={`${data.analytics.completedEnrollments} students completed`}
            icon={<CheckCircle2 className="h-5 w-5 text-emerald-600" />}
            variant="emerald"
          />

          <MetricCard
            title="Average Progress"
            value={`${data.analytics.averageProgressPercent}%`}
            subtitle={`${data.analytics.totalLessons} lessons total`}
            icon={<BookOpen className="h-5 w-5 text-[#115E59]" />}
            variant="teal"
          />

          <MetricCard
            title="Average Rating"
            value={`★ ${data.course.rating.toFixed(1)}`}
            subtitle={`${data.course.reviewCount} total reviews`}
            icon={<Star className="h-5 w-5 text-amber-500" />}
            variant="amber"
          />
        </div>

        {/* Student Progress Breakdown */}
        <Card className="p-6 border-slate-200 dark:border-slate-800 space-y-4">
          <h3 className="text-lg font-black text-slate-900 dark:text-slate-100">
            Student Progress Roster
          </h3>

          {data.students.length === 0 ? (
            <p className="text-xs text-slate-500">No student enrollment data recorded yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-extrabold uppercase">
                    <th className="py-3 px-2">Student Name</th>
                    <th className="py-3 px-2">Enrolled Date</th>
                    <th className="py-3 px-2">Status</th>
                    <th className="py-3 px-2">Completed Lessons</th>
                    <th className="py-3 px-2">Progress %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                  {data.students.map((s: any) => (
                    <tr key={s.studentId}>
                      <td className="py-3 px-2 font-bold text-slate-900 dark:text-slate-100">{s.studentName}</td>
                      <td className="py-3 px-2 text-slate-500">{new Date(s.enrolledAt).toLocaleDateString()}</td>
                      <td className="py-3 px-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                          {s.status}
                        </span>
                      </td>
                      <td className="py-3 px-2 font-bold">{s.completedLessons} / {s.totalLessons}</td>
                      <td className="py-3 px-2 text-[#0F766E] font-bold">{s.progressPercent}%</td>
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
