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
import { DashboardPhoneVerificationBanner } from "@/components/dashboard/dashboard-phone-verification-banner";

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
    fetch("/api/teacher/dashboard", { cache: "no-store", headers: { Pragma: "no-cache" } })
      .then((res) => {
        if (res.status === 401) {
          if (typeof window !== "undefined" && !window.navigator.onLine) {
            return null;
          }
          const isSubdomain = typeof window !== "undefined" && (window.location.hostname.startsWith("educator") || window.location.hostname.startsWith("teacher"));
          window.location.replace(isSubdomain ? "/login?expired=true&redirectTo=/dashboard" : "/teacher/login?expired=true&redirectTo=/teacher/dashboard");
          return null;
        }
        return res.json();
      })
      .then((json) => {
        if (json?.data) {
          setData(json.data);
        }
      })
      .catch(() => {
        // Network or fetch failure: let layout handle auth verification
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <DashboardLayout role="TEACHER" userName={data.userName}>
      <div className="space-y-6 sm:space-y-8 pb-16 min-w-0">
        {/* Dynamic Verification Status Banner */}
        {data.verificationStatus === "VERIFIED" ? (
          <div className="bg-[#0F766E] text-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-3 sm:gap-4 min-w-0">
              <div className="p-2.5 sm:p-3 bg-white/10 rounded-2xl shrink-0">
                <ShieldCheck className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-base sm:text-xl font-bold break-words">Verification Status: Verified Educator</h2>
                  <StatusBadge status="VERIFIED" />
                </div>
                <p className="text-xs text-teal-100 mt-1 leading-relaxed">
                  Your profile is published on the EduConnects platform. You are eligible for demo bookings, live classes, and courses.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 pt-1 sm:pt-0">
              <Link href="/teacher/analytics" className="w-full sm:w-auto">
                <Button variant="secondary" size="sm" className="w-full sm:w-auto" rightIcon={<BarChart2 className="h-4 w-4" />}>
                  View Teaching Analytics
                </Button>
              </Link>
            </div>
          </div>
        ) : data.verificationStatus === "PENDING" ? (
          <div className="bg-amber-500 text-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-3 sm:gap-4 min-w-0">
              <div className="p-2.5 sm:p-3 bg-white/10 rounded-2xl shrink-0">
                <Clock className="h-6 w-6 sm:h-8 sm:w-8 text-white animate-pulse" />
              </div>
              <div className="space-y-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-base sm:text-xl font-bold break-words">Verification Status: Application Under Review</h2>
                  <StatusBadge status="PENDING" />
                </div>
                <p className="text-xs text-amber-100 font-semibold leading-relaxed">
                  Your educator account is pending verification. Teaching, live classes, course publishing, and content publishing will be available after verification.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto shrink-0 pt-1 sm:pt-0">
              <Link href="/teacher/onboarding" className="w-full sm:w-auto">
                <Button variant="secondary" size="sm" className="w-full sm:w-auto" rightIcon={<FileCheck className="h-4 w-4" />}>
                  Complete Verification
                </Button>
              </Link>
              <Link href="/teacher/verification" className="w-full sm:w-auto">
                <Button variant="outline" size="sm" className="w-full sm:w-auto bg-white/10 text-white border-white/20 hover:bg-white/20">
                  View Status
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="bg-gradient-to-r from-amber-600 to-orange-600 text-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-3 sm:gap-4 min-w-0">
              <div className="p-2.5 sm:p-3 bg-white/10 rounded-2xl shrink-0">
                <AlertOctagon className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
              </div>
              <div className="space-y-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-base sm:text-xl font-bold break-words">Verification Required: Complete Educator KYC</h2>
                  <StatusBadge status={data.verificationStatus} />
                </div>
                <p className="text-xs text-amber-100 font-semibold leading-relaxed">
                  Your educator account is pending verification. Teaching, live classes, course publishing, and content publishing will be available after verification.
                </p>
              </div>
            </div>
            <Link href="/teacher/onboarding" className="w-full sm:w-auto shrink-0 pt-1 sm:pt-0">
              <Button variant="secondary" size="sm" className="w-full sm:w-auto" rightIcon={<ArrowRight className="h-4 w-4" />}>
                Complete Verification
              </Button>
            </Link>
          </div>
        )}

        {/* Phone Verification Reminder Banner */}
        <DashboardPhoneVerificationBanner role="teacher" />

        {/* Educator Stats Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <MetricCard
            title="Today's Classes"
            value={loading ? "..." : data.metrics.todayClassesCount}
            subtitle={`${data.metrics.upcomingClassesCount} upcoming total`}
            icon={<Video className="h-5 w-5 text-[#0F766E]" />}
            variant="teal"
          />

          <MetricCard
            title="Active Students"
            value={loading ? "..." : data.metrics.activeStudentsCount}
            subtitle="Enrolled in your courses"
            icon={<Users className="h-5 w-5 text-[#0F766E]" />}
            variant="teal"
          />

          <MetricCard
            title="Published Courses"
            value={loading ? "..." : data.metrics.activeCoursesCount}
            subtitle="Self-paced LMS courses"
            icon={<BookOpen className="h-5 w-5 text-teal-600" />}
            variant="teal"
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Today's Schedule */}
          <Card className="p-4 sm:p-6 space-y-4 border-l-4 border-l-[#0F766E] rounded-2xl sm:rounded-3xl">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <Calendar className="h-5 w-5 text-[#0F766E] shrink-0" />
                <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 truncate">
                  Today's Schedule
                </h3>
              </div>
              <Link href="/teacher/live-classes" className="shrink-0">
                <Button variant="outline" size="sm" rightIcon={<ArrowRight className="h-4 w-4" />}>
                  Manage Slots
                </Button>
              </Link>
            </div>

            {loading ? (
              <div className="p-6 text-center">
                <Loader2 className="h-6 w-6 text-[#0F766E] animate-spin mx-auto" />
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
                    className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 min-w-0"
                  >
                    <div className="min-w-0">
                      <h4 className="text-sm font-extrabold text-slate-900 dark:text-slate-100 truncate">
                        {slot.title}
                      </h4>
                      <p className="text-xs text-slate-500 mt-0.5 truncate">
                        {new Date(slot.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} •{" "}
                        {slot.bookedCount} / {slot.maxCapacity} Students
                      </p>
                    </div>

                    <div className="w-full sm:w-auto shrink-0">
                      {data.verificationStatus === "VERIFIED" ? (
                        <Link
                          href={slot.canEnter ? `/classroom/${slot.slotId}` : `/teacher/live-classes/${slot.slotId}`}
                          className="w-full sm:w-auto block"
                        >
                          <Button variant={slot.canEnter ? "primary" : "outline"} size="sm" className="w-full sm:w-auto">
                            {slot.canEnter ? "Enter Classroom" : "View Slot"}
                          </Button>
                        </Link>
                      ) : (
                        <Button variant="outline" size="sm" disabled className="w-full sm:w-auto bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed font-bold">
                          <Lock className="h-3 w-3 mr-1 text-slate-400" /> Locked
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Upcoming Live Classes */}
          <Card className="p-4 sm:p-6 space-y-4 border-l-4 border-l-[#0F766E] rounded-2xl sm:rounded-3xl">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <Video className="h-5 w-5 text-[#0F766E] shrink-0" />
                <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 truncate">
                  Upcoming Classes
                </h3>
              </div>
              <div className="shrink-0">
                {data.verificationStatus === "VERIFIED" ? (
                  <Link href="/teacher/live-classes">
                    <Button variant="primary" size="sm" leftIcon={<Plus className="h-4 w-4" />}>
                      Create Slot
                    </Button>
                  </Link>
                ) : (
                  <Link href="/teacher/onboarding" title="Verification required to create live slots">
                    <Button variant="outline" size="sm" leftIcon={<Lock className="h-4 w-4 text-amber-600" />} className="bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100 text-xs">
                      🔒 Verification required
                    </Button>
                  </Link>
                )}
              </div>
            </div>

            {loading ? (
              <div className="p-6 text-center">
                <Loader2 className="h-6 w-6 text-[#0F766E] animate-spin mx-auto" />
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
                    className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 min-w-0"
                  >
                    <div className="min-w-0">
                      <h4 className="text-sm font-extrabold text-slate-900 dark:text-slate-100 truncate">
                        {slot.title}
                      </h4>
                      <p className="text-xs text-slate-500 mt-0.5 truncate">
                        {new Date(slot.startTime).toLocaleDateString([], {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}{" "}
                        • {slot.bookedCount} / {slot.maxCapacity} Booked
                      </p>
                    </div>

                    <div className="w-full sm:w-auto shrink-0">
                      {data.verificationStatus === "VERIFIED" ? (
                        <Link
                          href={slot.canEnter ? `/classroom/${slot.slotId}` : `/teacher/live-classes/${slot.slotId}`}
                          className="w-full sm:w-auto block"
                        >
                          <Button variant={slot.canEnter ? "primary" : "outline"} size="sm" className="w-full sm:w-auto">
                            {slot.canEnter ? "Enter Classroom" : "View Slot"}
                          </Button>
                        </Link>
                      ) : (
                        <Button variant="outline" size="sm" disabled className="w-full sm:w-auto bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed font-bold">
                          <Lock className="h-3 w-3 mr-1 text-slate-400" /> Locked
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Quick Educator Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {data.verificationStatus === "VERIFIED" ? (
            <Link href="/teacher/live-classes" className="block min-w-0">
              <Card className="p-4 sm:p-5 hover:border-teal-500 transition cursor-pointer space-y-2 rounded-2xl sm:rounded-3xl h-full">
                <Video className="h-6 w-6 text-[#0F766E]" />
                <h4 className="text-sm font-extrabold text-slate-900 dark:text-slate-100 truncate">Create Live Class</h4>
                <p className="text-xs text-slate-500">Schedule 1-on-1 or group live sessions.</p>
              </Card>
            </Link>
          ) : (
            <Link href="/teacher/onboarding" className="block min-w-0">
              <Card className="p-4 sm:p-5 hover:border-amber-400 transition cursor-pointer space-y-2 border-amber-200 bg-amber-50/30 rounded-2xl sm:rounded-3xl h-full">
                <div className="flex items-center justify-between">
                  <Video className="h-6 w-6 text-slate-400" />
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 flex items-center gap-1">
                    <Lock className="h-3 w-3" /> Locked
                  </span>
                </div>
                <h4 className="text-sm font-extrabold text-slate-700 truncate">Create Live Class</h4>
                <p className="text-xs text-amber-700 font-medium">🔒 Verification required to schedule sessions.</p>
              </Card>
            </Link>
          )}

          {data.verificationStatus === "VERIFIED" ? (
            <Link href="/teacher/courses" className="block min-w-0">
              <Card className="p-4 sm:p-5 hover:border-teal-500 transition cursor-pointer space-y-2 rounded-2xl sm:rounded-3xl h-full">
                <BookOpen className="h-6 w-6 text-[#0F766E]" />
                <h4 className="text-sm font-extrabold text-slate-900 dark:text-slate-100 truncate">Create Course</h4>
                <p className="text-xs text-slate-500">Upload video lessons & study materials.</p>
              </Card>
            </Link>
          ) : (
            <Link href="/teacher/onboarding" className="block min-w-0">
              <Card className="p-4 sm:p-5 hover:border-amber-400 transition cursor-pointer space-y-2 border-amber-200 bg-amber-50/30 rounded-2xl sm:rounded-3xl h-full">
                <div className="flex items-center justify-between">
                  <BookOpen className="h-6 w-6 text-slate-400" />
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 flex items-center gap-1">
                    <Lock className="h-3 w-3" /> Locked
                  </span>
                </div>
                <h4 className="text-sm font-extrabold text-slate-700 truncate">Create Course</h4>
                <p className="text-xs text-amber-700 font-medium">🔒 Verification required to upload & publish.</p>
              </Card>
            </Link>
          )}

          <Link href="/teacher/analytics" className="block min-w-0">
            <Card className="p-4 sm:p-5 hover:border-teal-500 transition cursor-pointer space-y-2 rounded-2xl sm:rounded-3xl h-full">
              <BarChart2 className="h-6 w-6 text-[#0F766E]" />
              <h4 className="text-sm font-extrabold text-slate-900 dark:text-slate-100 truncate">View Analytics</h4>
              <p className="text-xs text-slate-500">Course completion & class attendance stats.</p>
            </Card>
          </Link>

          <Link href="/teacher/earnings" className="block min-w-0">
            <Card className="p-4 sm:p-5 hover:border-teal-500 transition cursor-pointer space-y-2 rounded-2xl sm:rounded-3xl h-full">
              <IndianRupee className="h-6 w-6 text-amber-500" />
              <h4 className="text-sm font-extrabold text-slate-900 dark:text-slate-100 truncate">View Earnings</h4>
              <p className="text-xs text-slate-500">Financial ledger entries & Cashfree payouts.</p>
            </Card>
          </Link>
        </div>
      </div>
    </DashboardLayout>
  );
}
