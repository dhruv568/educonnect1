"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { MetricCard } from "@/components/analytics/metric-card";
import {
  Video,
  Users,
  Award,
  ShieldCheck,
  Plus,
  ArrowRight,
  FileCheck,
  Clock,
  XCircle,
  AlertOctagon,
  BookOpen,
  IndianRupee,
  Calendar,
  BarChart2,
  Loader2,
  Lock,
} from "lucide-react";
import { formatCurrency } from "@/lib/currency";

export default function TeacherDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{
    userName: string;
    verificationStatus: string;
    metrics: {
      todayClassesCount: number;
      upcomingClassesCount: number;
      activeStudentsCount: number;
      activeCoursesCount: number;
      totalEarningsRupees: number;
      monthlyEarningsRupees: number;
    };
    todaySchedule: any[];
    upcomingClasses: any[];
  }>({
    userName: "Educator",
    verificationStatus: "PENDING",
    metrics: {
      todayClassesCount: 0,
      upcomingClassesCount: 0,
      activeStudentsCount: 0,
      activeCoursesCount: 0,
      totalEarningsRupees: 0,
      monthlyEarningsRupees: 0,
    },
    todaySchedule: [],
    upcomingClasses: [],
  });

  useEffect(() => {
    fetch("/api/teacher/dashboard")
      .then((res) => res.json())
      .then((json) => {
        if (json.data) {
          setData(json.data);
        }
      })
      .catch((err) => console.error("Failed to load teacher dashboard:", err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <DashboardLayout role="TEACHER" userName={data.userName}>
      <div className="space-y-8 pb-16">
        {/* Dynamic Verification Status Banner */}
        {data.verificationStatus === "VERIFIED" ? (
          <div className="bg-emerald-600 text-white rounded-3xl p-6 shadow-lg flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/10 rounded-2xl">
                <ShieldCheck className="h-8 w-8 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold">Verification Status: Verified Educator</h2>
                  <StatusBadge status="VERIFIED" />
                </div>
                <p className="text-xs text-emerald-100 mt-1">
                  Your profile is published on the EduConnects platform. You are eligible for demo bookings, live classes, and courses.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link href="/teacher/analytics">
                <Button variant="secondary" size="sm" rightIcon={<BarChart2 className="h-4 w-4" />}>
                  View Teaching Analytics
                </Button>
              </Link>
            </div>
          </div>
        ) : data.verificationStatus === "PENDING" ? (
          <div className="bg-amber-500 text-white rounded-3xl p-6 shadow-lg flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/10 rounded-2xl shrink-0">
                <Clock className="h-8 w-8 text-white animate-pulse" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold">Verification Status: Application Under Review</h2>
                  <StatusBadge status="PENDING" />
                </div>
                <p className="text-xs text-amber-100 font-medium leading-relaxed">
                  Thank You for applying. We shall verify your documents, and if they meet our policy requirements, the next round will proceed. You will be informed through our official email, WhatsApp, or via call.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Link href="/teacher/onboarding">
                <Button variant="secondary" size="sm" rightIcon={<FileCheck className="h-4 w-4" />}>
                  Complete Verification
                </Button>
              </Link>
              <Link href="/teacher/verification">
                <Button variant="outline" size="sm" className="bg-white/10 text-white border-white/20 hover:bg-white/20">
                  View Status
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="bg-gradient-to-r from-amber-600 to-orange-600 text-white rounded-3xl p-6 shadow-lg flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/10 rounded-2xl shrink-0">
                <AlertOctagon className="h-8 w-8 text-white" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold">Verification Required: Complete Educator KYC</h2>
                  <StatusBadge status={data.verificationStatus} />
                </div>
                <p className="text-xs text-amber-100 font-medium">
                  Complete your 5-step educator verification (personal info, qualifications, KYC ID, and bank details) to unlock course creation and live classes.
                </p>
              </div>
            </div>
            <Link href="/teacher/onboarding" className="shrink-0">
              <Button variant="secondary" size="sm" rightIcon={<ArrowRight className="h-4 w-4" />}>
                Complete Verification
              </Button>
            </Link>
          </div>
        )}

        {/* Educator Stats Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard
            title="Today's Classes"
            value={loading ? "..." : data.metrics.todayClassesCount}
            subtitle={`${data.metrics.upcomingClassesCount} upcoming total`}
            icon={<Video className="h-5 w-5 text-blue-600" />}
            variant="blue"
          />

          <MetricCard
            title="Active Students"
            value={loading ? "..." : data.metrics.activeStudentsCount}
            subtitle="Enrolled in your courses"
            icon={<Users className="h-5 w-5 text-emerald-600" />}
            variant="emerald"
          />

          <MetricCard
            title="Published Courses"
            value={loading ? "..." : data.metrics.activeCoursesCount}
            subtitle="Self-paced LMS courses"
            icon={<BookOpen className="h-5 w-5 text-purple-600" />}
            variant="purple"
          />

          <MetricCard
            title="Monthly Earnings"
            value={loading ? "..." : formatCurrency(data.metrics.monthlyEarningsRupees)}
            subtitle={`Total: ${formatCurrency(data.metrics.totalEarningsRupees)}`}
            icon={<IndianRupee className="h-5 w-5 text-amber-500" />}
            variant="amber"
          />
        </div>

        {/* Schedule & Upcoming Sessions Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Today's Schedule */}
          <Card className="p-6 space-y-4 border-l-4 border-l-blue-600">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-blue-600" />
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Today's Schedule
                </h3>
              </div>
              <Link href="/teacher/live-classes">
                <Button variant="outline" size="sm" rightIcon={<ArrowRight className="h-4 w-4" />}>
                  Manage Slots
                </Button>
              </Link>
            </div>

            {loading ? (
              <div className="p-6 text-center">
                <Loader2 className="h-6 w-6 text-blue-600 animate-spin mx-auto" />
              </div>
            ) : data.todaySchedule.length === 0 ? (
              <div className="p-6 text-center bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-slate-200/80">
                <Clock className="h-8 w-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                <p className="text-xs font-semibold text-slate-500">No live classes scheduled for today.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {data.todaySchedule.map((slot) => (
                  <div
                    key={slot.slotId}
                    className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 flex items-center justify-between gap-4"
                  >
                    <div>
                      <h4 className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
                        {slot.title}
                      </h4>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {new Date(slot.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} •{" "}
                        {slot.bookedCount} / {slot.maxCapacity} Students
                      </p>
                    </div>

                    <Link href={`/classroom/${slot.slotId}`}>
                      <Button variant="primary" size="sm">
                        Enter Classroom
                      </Button>
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Upcoming Live Classes */}
          <Card className="p-6 space-y-4 border-l-4 border-l-emerald-600">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Video className="h-5 w-5 text-emerald-600" />
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Upcoming Classes
                </h3>
              </div>
              {data.verificationStatus === "VERIFIED" ? (
                <Link href="/teacher/live-classes">
                  <Button variant="primary" size="sm" leftIcon={<Plus className="h-4 w-4" />}>
                    Create Slot
                  </Button>
                </Link>
              ) : (
                <Link href="/teacher/onboarding" title="Verification required to create live slots">
                  <Button variant="outline" size="sm" leftIcon={<Lock className="h-4 w-4 text-amber-600" />} className="bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100">
                    🔒 Verification required
                  </Button>
                </Link>
              )}
            </div>

            {loading ? (
              <div className="p-6 text-center">
                <Loader2 className="h-6 w-6 text-emerald-600 animate-spin mx-auto" />
              </div>
            ) : data.upcomingClasses.length === 0 ? (
              <div className="p-6 text-center bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-slate-200/80">
                <Video className="h-8 w-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                <p className="text-xs font-semibold text-slate-500">No upcoming live slots scheduled.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {data.upcomingClasses.map((slot) => (
                  <div
                    key={slot.slotId}
                    className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 flex items-center justify-between gap-4"
                  >
                    <div>
                      <h4 className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
                        {slot.title}
                      </h4>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {new Date(slot.startTime).toLocaleDateString([], {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}{" "}
                        • {slot.bookedCount} / {slot.maxCapacity} Booked
                      </p>
                    </div>

                    <Link href={`/classroom/${slot.slotId}`}>
                      <Button variant={slot.canEnter ? "primary" : "outline"} size="sm">
                        {slot.canEnter ? "Enter Classroom" : "View Slot"}
                      </Button>
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Quick Educator Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {data.verificationStatus === "VERIFIED" ? (
            <Link href="/teacher/live-classes">
              <Card className="p-5 hover:border-blue-500 transition cursor-pointer space-y-2">
                <Video className="h-6 w-6 text-blue-600" />
                <h4 className="text-sm font-extrabold text-slate-900 dark:text-slate-100">Create Live Class</h4>
                <p className="text-xs text-slate-500">Schedule 1-on-1 or group live sessions.</p>
              </Card>
            </Link>
          ) : (
            <Link href="/teacher/onboarding">
              <Card className="p-5 hover:border-amber-400 transition cursor-pointer space-y-2 border-amber-200 bg-amber-50/30">
                <div className="flex items-center justify-between">
                  <Video className="h-6 w-6 text-slate-400" />
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 flex items-center gap-1">
                    <Lock className="h-3 w-3" /> Locked
                  </span>
                </div>
                <h4 className="text-sm font-extrabold text-slate-700">Create Live Class</h4>
                <p className="text-xs text-amber-700 font-medium">🔒 Verification required to schedule sessions.</p>
              </Card>
            </Link>
          )}

          {data.verificationStatus === "VERIFIED" ? (
            <Link href="/teacher/courses">
              <Card className="p-5 hover:border-emerald-500 transition cursor-pointer space-y-2">
                <BookOpen className="h-6 w-6 text-emerald-600" />
                <h4 className="text-sm font-extrabold text-slate-900 dark:text-slate-100">Create Course</h4>
                <p className="text-xs text-slate-500">Upload video lessons & study materials.</p>
              </Card>
            </Link>
          ) : (
            <Link href="/teacher/onboarding">
              <Card className="p-5 hover:border-amber-400 transition cursor-pointer space-y-2 border-amber-200 bg-amber-50/30">
                <div className="flex items-center justify-between">
                  <BookOpen className="h-6 w-6 text-slate-400" />
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 flex items-center gap-1">
                    <Lock className="h-3 w-3" /> Locked
                  </span>
                </div>
                <h4 className="text-sm font-extrabold text-slate-700">Create Course</h4>
                <p className="text-xs text-amber-700 font-medium">🔒 Verification required to upload & publish.</p>
              </Card>
            </Link>
          )}

          <Link href="/teacher/analytics">
            <Card className="p-5 hover:border-purple-500 transition cursor-pointer space-y-2">
              <BarChart2 className="h-6 w-6 text-purple-600" />
              <h4 className="text-sm font-extrabold text-slate-900 dark:text-slate-100">View Analytics</h4>
              <p className="text-xs text-slate-500">Course completion & class attendance stats.</p>
            </Card>
          </Link>

          <Link href="/teacher/earnings">
            <Card className="p-5 hover:border-amber-500 transition cursor-pointer space-y-2">
              <IndianRupee className="h-6 w-6 text-amber-500" />
              <h4 className="text-sm font-extrabold text-slate-900 dark:text-slate-100">View Earnings</h4>
              <p className="text-xs text-slate-500">Financial ledger entries & Cashfree payouts.</p>
            </Card>
          </Link>
        </div>
      </div>
    </DashboardLayout>
  );
}
