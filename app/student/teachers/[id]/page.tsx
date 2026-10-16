"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BackButton } from "@/components/ui/back-button";
import {
  GraduationCap,
  Star,
  ShieldCheck,
  Calendar,
  Clock,
  BookOpen,
  MapPin,
  Globe,
  Sparkles,
  Award,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { formatCurrency } from "@/lib/currency";
import { EducatorBookingCalendar } from "@/components/booking/educator-booking-calendar";

export default function StudentTeacherProfilePage() {
  const { id } = useParams();
  const router = useRouter();

  const [teacher, setTeacher] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"calendar" | "about">("calendar");

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetch(`/api/teachers/${id}`)
      .then((r) => r.json())
      .then((res) => {
        if (res.success && res.data?.teacher) {
          setTeacher(res.data.teacher);
        } else {
          setError(res.error || "Educator not found");
        }
      })
      .catch((err) => {
        console.error(err);
        setError("Failed to load educator profile.");
      })
      .finally(() => setLoading(false));
  }, [id]);

  return (
    <DashboardLayout role="STUDENT">
      <div className="space-y-6 pb-16 font-sans">
        <BackButton
          fallbackUrl="/student/teachers"
          label="Back to Teacher Discovery"
          variant="default"
        />

        {loading ? (
          <div className="space-y-6">
            <div className="h-64 bg-slate-100 rounded-3xl animate-pulse" />
            <div className="h-96 bg-slate-100 rounded-3xl animate-pulse" />
          </div>
        ) : error || !teacher ? (
          <Card className="p-12 text-center bg-white rounded-3xl border border-slate-200 space-y-4">
            <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
            <h2 className="text-xl font-bold text-slate-900">{error || "Educator Profile Not Found"}</h2>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              The educator profile you are looking for may have been deactivated or does not exist.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push("/student/teachers")}
            >
              Browse All Teachers
            </Button>
          </Card>
        ) : (
          <div className="space-y-8">
            {/* Educator Header Card */}
            <Card className="p-6 lg:p-8 bg-white rounded-3xl border border-slate-200 shadow-xs space-y-6">
              <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
                <img
                  src={teacher.avatarUrl || "/images/educators/educator_01.jpg"}
                  alt={teacher.name}
                  className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl object-cover ring-4 ring-blue-50 shadow-md aspect-square shrink-0"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "/images/educators/educator_01.jpg";
                  }}
                />

                <div className="space-y-2 text-center md:text-left flex-1 min-w-0">
                  <div className="flex flex-wrap items-center justify-center md:justify-start gap-2.5">
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight">{teacher.name}</h1>
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                      <ShieldCheck className="h-3.5 w-3.5" /> Verified Educator
                    </span>
                  </div>

                  <p className="text-sm font-semibold text-slate-600 line-clamp-2">{teacher.headline}</p>

                  <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 text-xs font-semibold text-slate-500 pt-1">
                    <span className="flex items-center gap-1 text-amber-600 font-bold">
                      <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
                      {typeof teacher.rating === "number" ? teacher.rating.toFixed(2) : teacher.rating} Rating
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Award className="h-3.5 w-3.5 text-blue-600" />
                      {teacher.experienceYears} Years Experience
                    </span>
                    <span>•</span>
                    <span className="text-slate-900 font-extrabold text-sm">
                      {formatCurrency(teacher.hourlyRate)}/hr
                    </span>
                    {teacher.location && (
                      <>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-slate-400" /> {teacher.location}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex flex-col items-center md:items-end gap-2 shrink-0">
                  <div className="text-xs uppercase font-bold text-slate-400 tracking-wider">Session Pricing</div>
                  <div className="text-2xl font-black text-blue-700">{formatCurrency(teacher.hourlyRate)}</div>
                  <span className="text-[11px] text-slate-400 font-medium">Standard 60-min Lesson</span>
                </div>
              </div>

              {/* Navigation Tabs */}
              <div className="flex items-center gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setActiveTab("calendar")}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                    activeTab === "calendar"
                      ? "bg-blue-600 text-white shadow-xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  <Calendar className="w-3.5 h-3.5" /> Book Session (Calendar)
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("about")}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                    activeTab === "about"
                      ? "bg-blue-600 text-white shadow-xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  <BookOpen className="w-3.5 h-3.5" /> About Educator & Subjects
                </button>
              </div>
            </Card>

            {/* Tab Contents */}
            {activeTab === "calendar" ? (
              <div className="space-y-4">
                <EducatorBookingCalendar
                  teacherId={teacher.id}
                  teacherName={teacher.name}
                  hourlyRate={teacher.hourlyRate}
                  subjects={teacher.subjects}
                />
              </div>
            ) : (
              <Card className="p-6 lg:p-8 bg-white rounded-3xl border border-slate-200 shadow-xs space-y-6">
                <div>
                  <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider mb-2">
                    About the Instructor
                  </h3>
                  <p className="text-sm text-slate-600 leading-relaxed bg-slate-50 p-5 rounded-2xl border border-slate-100">
                    {teacher.bio || "No biography provided yet."}
                  </p>
                </div>

                <div>
                  <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider mb-2">
                    Subjects Taught
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {teacher.subjects && teacher.subjects.length > 0 ? (
                      teacher.subjects.map((sub: string, idx: number) => (
                        <span
                          key={idx}
                          className="px-3 py-1 rounded-xl bg-blue-50 text-blue-700 text-xs font-bold border border-blue-100"
                        >
                          {sub}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-slate-400">General Academics</span>
                    )}
                  </div>
                </div>

                {teacher.languages && (
                  <div>
                    <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider mb-2">
                      Languages Spoken
                    </h3>
                    <p className="text-xs font-semibold text-slate-700">{teacher.languages}</p>
                  </div>
                )}
              </Card>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
