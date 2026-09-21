"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Activity,
  BookOpen,
  CalendarCheck,
  CreditCard,
  User,
  CheckCircle2,
  Search,
  Clock,
  Loader2,
  Filter,
  ShieldCheck,
} from "lucide-react";
import { BackButton } from "@/components/ui/back-button";
import { BackToHomeButton } from "@/components/ui/back-to-home-button";

export default function StudentActivityLogPage() {
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState("ALL");
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchActivity();
  }, []);

  const fetchActivity = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/student/activity", { cache: "no-store" });
      const data = await res.json();
      if (res.ok) {
        setActivities(data.data?.activities || []);
      }
    } catch (err) {
      console.error("Failed to load activity logs:", err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = activities.filter((act) => {
    if (filterCategory !== "ALL" && act.category !== filterCategory) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        (act.title || "").toLowerCase().includes(q) ||
        (act.subtitle || "").toLowerCase().includes(q)
      );
    }
    return true;
  });

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "LESSONS":
        return <BookOpen className="w-4 h-4 text-purple-600" />;
      case "CLASSES":
        return <CalendarCheck className="w-4 h-4 text-emerald-600" />;
      case "PURCHASES":
        return <CreditCard className="w-4 h-4 text-blue-600" />;
      case "ACCOUNT":
        return <ShieldCheck className="w-4 h-4 text-amber-600" />;
      default:
        return <Activity className="w-4 h-4 text-teal-600" />;
    }
  };

  return (
    <DashboardLayout role="STUDENT" userName="Learner">
      <div className="space-y-6 pb-16">
        {/* Header Title Banner */}
        <div className="bg-gradient-to-r from-[#3157D5] via-[#243B9B] to-[#1E3185] text-white rounded-3xl p-6 lg:p-8 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden">
          <div className="space-y-2 relative z-10">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-xs font-bold text-blue-200 border border-white/20 uppercase tracking-wider">
                Real-Time Timeline
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight flex items-center gap-3">
              <Activity className="w-8 h-8 text-blue-300 shrink-0" />
              Learner Activity Log
            </h1>
            <p className="text-xs sm:text-sm text-blue-100 max-w-xl">
              Complete historical record of course enrollments, lesson completions, live class bookings, logins, and account security events.
            </p>
          </div>

          <div className="flex items-center gap-2.5 relative z-10 shrink-0">
            <BackButton fallbackUrl="/student/dashboard" label="Back to Dashboard" variant="dark" />
            <BackToHomeButton variant="dark" />
          </div>
        </div>

        {/* Filters Toolbar */}
        <Card className="p-4 border-slate-200 bg-white rounded-3xl shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search activity title or details..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-900 placeholder-slate-400 outline-none focus:ring-2 focus:ring-[#3157D5]"
            />
          </div>

          <div className="flex items-center gap-1.5 flex-wrap w-full sm:w-auto">
            {[
              { label: "ALL", value: "ALL" },
              { label: "LESSONS", value: "LESSONS" },
              { label: "CLASSES", value: "CLASSES" },
              { label: "PURCHASES", value: "PURCHASES" },
              { label: "ACCOUNT", value: "ACCOUNT" },
            ].map((cat) => (
              <button
                key={cat.value}
                onClick={() => setFilterCategory(cat.value)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  filterCategory === cat.value
                    ? "bg-[#3157D5] text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </Card>

        {/* Activity Timeline List */}
        {loading ? (
          <Card className="p-12 text-center bg-white border border-slate-200 rounded-3xl">
            <Loader2 className="h-8 w-8 text-[#3157D5] animate-spin mx-auto mb-3" />
            <p className="text-xs text-slate-500 font-bold">Loading activity log timeline...</p>
          </Card>
        ) : filtered.length === 0 ? (
          <Card className="p-16 text-center space-y-3 bg-white border border-slate-200 rounded-3xl shadow-sm">
            <Activity className="w-12 h-12 text-slate-300 mx-auto" />
            <h3 className="text-base font-bold text-slate-800">No activity logs found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              There are no recent activities matching your selected category filter.
            </p>
          </Card>
        ) : (
          <Card className="p-6 border-slate-200 rounded-3xl bg-white shadow-xs space-y-4">
            <div className="space-y-4">
              {filtered.map((item) => (
                <div
                  key={item.id}
                  className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 hover:border-blue-200 transition-colors flex items-start gap-4"
                >
                  <div className="p-2.5 rounded-2xl bg-white border border-slate-200 shadow-2xs shrink-0 mt-0.5">
                    {getCategoryIcon(item.category)}
                  </div>

                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                      <h4 className="text-sm font-extrabold text-slate-900 truncate">
                        {item.title}
                      </h4>
                      {item.status && (
                        <Badge
                          variant="outline"
                          className="w-fit text-[10px] font-bold border-slate-200 bg-white"
                        >
                          {item.status}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 truncate">{item.subtitle}</p>
                    <div className="text-[11px] text-slate-400 font-medium flex items-center gap-1.5 pt-1">
                      <Clock className="w-3 h-3 text-slate-400" />
                      {new Date(item.timestamp).toLocaleString(undefined, {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
