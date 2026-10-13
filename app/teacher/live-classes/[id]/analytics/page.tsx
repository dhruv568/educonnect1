"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MetricCard } from "@/components/analytics/metric-card";
import { Video, Users, CheckCircle2, Clock, ArrowLeft, Loader2 } from "lucide-react";
import { BackButton } from "@/components/ui/back-button";

export default function SingleLiveClassAnalyticsPage({ params }: { params: { id: string } }) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    fetch(`/api/teacher/live-classes/${params.id}/analytics`)
      .then((res) => res.json())
      .then((json) => {
        if (json.data) setData(json.data);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [params.id]);

  if (loading) {
    return (
      <DashboardLayout role="TEACHER" userName="Live Class Analytics">
        <div className="p-12 text-center">
          <Loader2 className="h-8 w-8 text-[#0F766E] animate-spin mx-auto" />
        </div>
      </DashboardLayout>
    );
  }

  if (!data) {
    return (
      <DashboardLayout role="TEACHER" userName="Live Class Analytics">
        <div className="p-12 text-center space-y-3">
          <p className="text-sm font-bold text-slate-700">Live class analytics not found.</p>
          <BackButton fallbackUrl={`/teacher/live-classes/${params.id}`} label="Back to Class Details" variant="default" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="TEACHER" userName={data.slot.title}>
      <div className="max-w-5xl mx-auto space-y-6 pb-16">
        <div className="flex items-center gap-3">
          <BackButton
            fallbackUrl={`/teacher/live-classes/${params.id}`}
            label="Back to Class Details"
            variant="default"
          />
          <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100 truncate">
            {data.slot.title}
          </h1>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard
            title="Booked Students"
            value={data.analytics.bookedStudents}
            subtitle={`Capacity: ${data.slot.maxCapacity}`}
            icon={<Users className="h-5 w-5 text-[#0F766E]" />}
            variant="teal"
          />

          <MetricCard
            title="Attended Students"
            value={data.analytics.attendedStudents}
            subtitle={`${data.analytics.noShowStudents} no-shows`}
            icon={<CheckCircle2 className="h-5 w-5 text-emerald-600" />}
            variant="emerald"
          />

          <MetricCard
            title="Attendance Rate"
            value={`${data.analytics.attendanceRatePercent}%`}
            subtitle="Of expected participants"
            icon={<Video className="h-5 w-5 text-[#115E59]" />}
            variant="teal"
          />

          <MetricCard
            title="Avg Duration"
            value={`${data.analytics.avgDurationMinutes} mins`}
            subtitle="Per present student"
            icon={<Clock className="h-5 w-5 text-amber-500" />}
            variant="amber"
          />
        </div>

        {/* Attendees List */}
        <Card className="p-6 border-slate-200 dark:border-slate-800 space-y-4">
          <h3 className="text-lg font-black text-slate-900 dark:text-slate-100">
            Attendance Log
          </h3>

          {data.attendees.length === 0 ? (
            <p className="text-xs text-slate-500">No student attendance records captured yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-extrabold uppercase">
                    <th className="py-3 px-2">Student Name</th>
                    <th className="py-3 px-2">Joined At</th>
                    <th className="py-3 px-2">Left At</th>
                    <th className="py-3 px-2">Duration (mins)</th>
                    <th className="py-3 px-2">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                  {data.attendees.map((a: any, idx: number) => (
                    <tr key={idx}>
                      <td className="py-3 px-2 font-bold text-slate-900 dark:text-slate-100">{a.studentName}</td>
                      <td className="py-3 px-2 text-slate-500">{new Date(a.joinedAt).toLocaleTimeString()}</td>
                      <td className="py-3 px-2 text-slate-500">{a.leftAt ? new Date(a.leftAt).toLocaleTimeString() : "In Progress"}</td>
                      <td className="py-3 px-2 font-bold">{a.durationMinutes}</td>
                      <td className="py-3 px-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${a.status === 'PRESENT' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                          {a.status}
                        </span>
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
