"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BackButton } from "@/components/ui/back-button";
import {
  GraduationCap,
  Search,
  Filter,
  Star,
  ShieldCheck,
  Calendar,
  Clock,
  BookOpen,
  ArrowRight,
  X,
  RotateCcw,
  Video,
  CheckCircle2,
  AlertCircle,
  Loader2,
  IndianRupee,
  Sparkles,
} from "lucide-react";
import { formatCurrency } from "@/lib/currency";
import {
  SCHOOL_GRADES,
  SENIOR_SECONDARY_STREAMS,
  COMPETITIVE_EXAMS,
  DIPLOMA_BRANCHES,
  isSeniorSecondaryGrade,
} from "@/lib/constants/academic";

export default function StudentFindTeachersPage() {
  const router = useRouter();

  // Search and filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("all");
  const [selectedAcademicLevel, setSelectedAcademicLevel] = useState("all");
  const [selectedGrade, setSelectedGrade] = useState("all");
  const [selectedStream, setSelectedStream] = useState("all");
  const [selectedExam, setSelectedExam] = useState("all");
  const [selectedDiplomaBranch, setSelectedDiplomaBranch] = useState("all");
  const [maxPrice, setMaxPrice] = useState(5000);
  const [minRating, setMinRating] = useState(0);
  const [minExperience, setMinExperience] = useState(0);
  const [sortBy, setSortBy] = useState("recommended");

  // Data states
  const [teachers, setTeachers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTeacherId, setSelectedTeacherId] = useState<string | null>(null);
  const [teacherDetail, setTeacherDetail] = useState<any | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [activeModalTab, setActiveModalTab] = useState<"about" | "slots" | "courses">("about");
  const [bookingLoadingSlotId, setBookingLoadingSlotId] = useState<string | null>(null);
  const [bookingFeedback, setBookingFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const subjects = [
    { value: "all", label: "All Subjects" },
    { value: "mathematics", label: "Mathematics" },
    { value: "physics", label: "Physics" },
    { value: "chemistry", label: "Chemistry" },
    { value: "computer science", label: "Computer Science" },
    { value: "english", label: "English" },
    { value: "biology", label: "Biology" },
  ];

  // Fetch teachers from existing API
  const fetchTeachers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery.trim()) params.set("search", searchQuery.trim());
      if (selectedSubject !== "all") params.set("subject", selectedSubject);
      if (maxPrice < 5000) params.set("priceMax", String(maxPrice));
      if (minRating > 0) params.set("ratingMin", String(minRating));
      if (minExperience > 0) params.set("experienceMin", String(minExperience));
      if (sortBy !== "recommended") params.set("sortBy", sortBy);
      if (selectedAcademicLevel !== "all") params.set("academicLevel", selectedAcademicLevel);
      if (selectedGrade !== "all") params.set("grade", selectedGrade);
      if (selectedStream !== "all") params.set("stream", selectedStream);
      if (selectedExam !== "all") params.set("exam", selectedExam);
      if (selectedDiplomaBranch !== "all") params.set("diplomaBranch", selectedDiplomaBranch);

      const res = await fetch(`/api/teachers?${params.toString()}`);
      const json = await res.json();
      if (json.success && json.data) {
        setTeachers(json.data.teachers || []);
      }
    } catch (err) {
      console.error("Failed to fetch teachers:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeachers();
  }, [
    selectedSubject,
    maxPrice,
    minRating,
    minExperience,
    sortBy,
    selectedAcademicLevel,
    selectedGrade,
    selectedStream,
    selectedExam,
    selectedDiplomaBranch,
  ]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchTeachers();
  };

  const handleResetFilters = () => {
    setSearchQuery("");
    setSelectedSubject("all");
    setSelectedAcademicLevel("all");
    setSelectedGrade("all");
    setSelectedStream("all");
    setSelectedExam("all");
    setSelectedDiplomaBranch("all");
    setMaxPrice(5000);
    setMinRating(0);
    setMinExperience(0);
    setSortBy("recommended");
  };

  // Open teacher profile details modal
  const handleOpenProfile = async (teacherId: string) => {
    setSelectedTeacherId(teacherId);
    setDetailLoading(true);
    setBookingFeedback(null);
    setActiveModalTab("about");

    try {
      const res = await fetch(`/api/teachers/${teacherId}`);
      const json = await res.json();
      if (json.success && json.data) {
        setTeacherDetail(json.data.teacher);
      }
    } catch (err) {
      console.error("Failed to fetch teacher detail:", err);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleCloseProfile = () => {
    setSelectedTeacherId(null);
    setTeacherDetail(null);
    setBookingFeedback(null);
  };

  // Book a live class slot with this teacher
  const handleBookSlot = async (slotId: string) => {
    setBookingLoadingSlotId(slotId);
    setBookingFeedback(null);

    try {
      const res = await fetch(`/api/student/live-classes/${slotId}/book`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to book live session.");
      }

      if (data.data?.isFree) {
        setBookingFeedback({
          type: "success",
          message: "Free live session booked successfully! View it in My Live Classes.",
        });
      } else {
        // Redirect to payment checkout
        router.push(`/payment/checkout?type=LIVE_CLASS_BOOKING&slotId=${slotId}`);
      }
    } catch (err: any) {
      setBookingFeedback({
        type: "error",
        message: err.message || "Could not complete booking.",
      });
    } finally {
      setBookingLoadingSlotId(null);
    }
  };

  return (
    <DashboardLayout role="STUDENT">
      <div className="space-y-6 pb-16">
        <BackButton
          fallbackUrl="/student/dashboard"
          label="Back to Dashboard"
          variant="default"
        />

        {/* Header Banner */}
        <div className="bg-gradient-to-r from-blue-700 via-blue-800 to-indigo-900 text-white rounded-3xl p-6 lg:p-8 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-1 max-w-xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-white text-[11px] font-bold uppercase tracking-wider mb-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" /> Verified Educator Discovery
            </div>
            <h1 className="text-2xl lg:text-3xl font-black tracking-tight">
              Find Verified Teachers
            </h1>
            <p className="text-xs sm:text-sm text-blue-100 font-medium">
              Connect with top STEM, Humanities, and Language instructors. Book live 1-on-1 tutoring or join group cohorts.
            </p>
          </div>

          <form onSubmit={handleSearchSubmit} className="w-full md:w-80 flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search name or subject..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 bg-white text-slate-900 rounded-xl text-xs font-semibold placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-blue-400 shadow-md"
              />
            </div>
            <Button type="submit" variant="secondary" size="sm" className="bg-white text-slate-900 hover:bg-slate-100 font-bold shrink-0 shadow-md">
              Search
            </Button>
          </form>
        </div>

        {/* Filters and Results Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Left Sidebar Filters */}
          <div className="space-y-6">
            <Card className="p-6 bg-white rounded-3xl border border-slate-200 shadow-sm space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center gap-2 text-slate-900 font-extrabold text-sm uppercase tracking-wider">
                  <Filter className="h-4 w-4 text-blue-600" /> Filter Tutors
                </div>
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="text-xs font-bold text-slate-400 hover:text-blue-600 flex items-center gap-1 transition-colors"
                >
                  <RotateCcw className="h-3 w-3" /> Reset
                </button>
              </div>

              {/* Subject */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Subject Area
                </label>
                <select
                  value={selectedSubject}
                  onChange={(e) => setSelectedSubject(e.target.value)}
                  className="w-full h-10 px-3 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 outline-none focus:ring-2 focus:ring-blue-500 font-medium cursor-pointer"
                >
                  {subjects.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Academic Level */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <GraduationCap className="h-3.5 w-3.5 text-blue-600" /> Academic Level
                </label>
                <select
                  value={selectedAcademicLevel}
                  onChange={(e) => {
                    setSelectedAcademicLevel(e.target.value);
                    setSelectedGrade("all");
                    setSelectedStream("all");
                    setSelectedExam("all");
                    setSelectedDiplomaBranch("all");
                  }}
                  className="w-full h-10 px-3 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 outline-none focus:ring-2 focus:ring-blue-500 font-medium cursor-pointer"
                >
                  <option value="all">All Academic Levels</option>
                  <option value="SCHOOL">School Education</option>
                  <option value="DIPLOMA">Diploma Studies</option>
                </select>
              </div>

              {/* Conditional: School Grade */}
              {selectedAcademicLevel === "SCHOOL" && (
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Grade / Class
                  </label>
                  <select
                    value={selectedGrade}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSelectedGrade(val);
                      if (!isSeniorSecondaryGrade(val)) {
                        setSelectedStream("all");
                        setSelectedExam("all");
                      }
                    }}
                    className="w-full h-10 px-3 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 outline-none focus:ring-2 focus:ring-blue-500 font-medium cursor-pointer"
                  >
                    <option value="all">All School Grades</option>
                    {SCHOOL_GRADES.map((g) => (
                      <option key={g.value} value={g.value}>
                        {g.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Conditional: Senior Secondary Stream (Grades 11–12 only) */}
              {selectedAcademicLevel === "SCHOOL" && isSeniorSecondaryGrade(selectedGrade) && (
                <>
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Stream
                    </label>
                    <select
                      value={selectedStream}
                      onChange={(e) => setSelectedStream(e.target.value)}
                      className="w-full h-10 px-3 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 outline-none focus:ring-2 focus:ring-blue-500 font-medium cursor-pointer"
                    >
                      <option value="all">All Streams</option>
                      {SENIOR_SECONDARY_STREAMS.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Target Exam (Optional)
                    </label>
                    <select
                      value={selectedExam}
                      onChange={(e) => setSelectedExam(e.target.value)}
                      className="w-full h-10 px-3 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 outline-none focus:ring-2 focus:ring-blue-500 font-medium cursor-pointer"
                    >
                      <option value="all">Any / General Preparation</option>
                      {COMPETITIVE_EXAMS.map((x) => (
                        <option key={x} value={x}>
                          {x}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              {/* Conditional: Diploma Branch */}
              {selectedAcademicLevel === "DIPLOMA" && (
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Diploma Branch
                  </label>
                  <select
                    value={selectedDiplomaBranch}
                    onChange={(e) => setSelectedDiplomaBranch(e.target.value)}
                    className="w-full h-10 px-3 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 outline-none focus:ring-2 focus:ring-blue-500 font-medium cursor-pointer"
                  >
                    <option value="all">All Diploma Branches</option>
                    {DIPLOMA_BRANCHES.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Hourly Price Slider */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-slate-700 uppercase tracking-wider">Max Hourly Rate</span>
                  <span className="text-blue-600 font-black">{formatCurrency(maxPrice)}/hr</span>
                </div>
                <input
                  type="range"
                  min={100}
                  max={5000}
                  step={25}
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(Number(e.target.value))}
                  className="w-full accent-blue-600 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-400 font-semibold">
                  <span>{formatCurrency(100)}/hr</span>
                  <span>{formatCurrency(5000)}+/hr</span>
                </div>
              </div>

              {/* Minimum Rating */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Minimum Rating
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: 4.0, label: "4+" },
                    { value: 4.5, label: "4.5+" },
                    { value: 5.0, label: "5" },
                  ].map((item) => (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => setMinRating(minRating === item.value ? 0 : item.value)}
                      className={`py-2 text-xs font-bold rounded-xl border transition-all ${
                        minRating === item.value
                          ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                          : "bg-slate-50 text-slate-700 border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      ★ {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Minimum Experience */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Teaching Experience
                </label>
                <select
                  value={minExperience}
                  onChange={(e) => setMinExperience(Number(e.target.value))}
                  className="w-full h-10 px-3 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 outline-none focus:ring-2 focus:ring-blue-500 font-medium cursor-pointer"
                >
                  <option value={0}>Any Experience</option>
                  <option value={2}>2+ Years Experience</option>
                  <option value={5}>5+ Years Experience</option>
                  <option value={8}>8+ Years Experience</option>
                </select>
              </div>

              {/* Sort By */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Sort Results By
                </label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full h-10 px-3 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 outline-none focus:ring-2 focus:ring-blue-500 font-medium cursor-pointer"
                >
                  <option value="recommended">Recommended</option>
                  <option value="rating">Highest Rated</option>
                  <option value="price_asc">Price: Low to High</option>
                  <option value="price_desc">Price: High to Low</option>
                  <option value="experience">Most Experienced</option>
                </select>
              </div>
            </Card>
          </div>

          {/* Right Teacher Card Grid */}
          <div className="lg:col-span-3 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-extrabold text-slate-900">
                Available Educators ({teachers.length})
              </h2>
              <span className="text-xs text-slate-500 font-medium">
                Verified background & degree credentials
              </span>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {[1, 2, 3, 4].map((i) => (
                  <Card key={i} className="p-6 bg-white rounded-3xl border border-slate-200 space-y-4 animate-pulse">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-2xl bg-slate-200" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-slate-200 rounded w-3/4" />
                        <div className="h-3 bg-slate-100 rounded w-1/2" />
                      </div>
                    </div>
                    <div className="h-8 bg-slate-100 rounded-xl" />
                    <div className="h-10 bg-slate-200 rounded-xl" />
                  </Card>
                ))}
              </div>
            ) : teachers.length === 0 ? (
              <Card className="p-12 text-center bg-white rounded-3xl border-2 border-dashed border-slate-200 space-y-4">
                <GraduationCap className="w-12 h-12 text-slate-300 mx-auto" />
                <h3 className="text-lg font-bold text-slate-800">No matching educators found</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Try adjusting your subject filters, increasing the maximum hourly rate, or resetting the search term.
                </p>
                <Button variant="outline" size="sm" onClick={handleResetFilters}>
                  Reset All Filters
                </Button>
              </Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {teachers.map((t) => (
                  <Card
                    key={t.id}
                    className="p-6 bg-white rounded-3xl border border-slate-200 hover:border-blue-300 hover:shadow-lg transition-all flex flex-col justify-between space-y-5 min-w-0 overflow-hidden"
                  >
                    <div className="space-y-4 min-w-0">
                      {/* Teacher Profile Top */}
                      <div className="flex items-center gap-4 min-w-0">
                        <img
                          src={t.avatarUrl}
                          alt={t.name}
                          className="w-16 h-16 rounded-2xl object-cover ring-2 ring-blue-100 shrink-0 aspect-square"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-1.5 min-w-0">
                            <h3 className="text-base font-extrabold text-slate-900 truncate min-w-0" title={t.name}>
                              {t.name}
                            </h3>
                            <Badge variant="success" size="sm" className="shrink-0 flex items-center gap-1">
                              <ShieldCheck className="h-3 w-3" /> Verified
                            </Badge>
                          </div>
                          <p className="text-xs font-bold text-blue-600 truncate mt-0.5" title={t.headline}>
                            {t.headline}
                          </p>
                          <div className="flex items-center gap-3 text-xs text-slate-500 font-semibold mt-1">
                            <span className="flex items-center text-amber-500 font-bold shrink-0">
                              ★ {t.rating.toFixed(1)}
                            </span>
                            <span className="shrink-0">• {t.experienceYears}y Exp</span>
                          </div>
                        </div>
                      </div>

                      {/* Bio snippet */}
                      {t.bio && (
                        <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                          {t.bio}
                        </p>
                      )}

                      {/* Subjects */}
                      <div className="flex flex-wrap gap-1.5">
                        {t.subjects.slice(0, 3).map((sub: string, idx: number) => (
                          <span
                            key={idx}
                            className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700"
                          >
                            {sub}
                          </span>
                        ))}
                        {t.subjects.length > 3 && (
                          <span className="text-[10px] font-bold px-2 py-1 rounded-lg bg-slate-50 text-slate-400">
                            +{t.subjects.length - 3} more
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Bottom Rate and Action */}
                    <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400">Trial Rate</span>
                        <div className="text-lg font-black text-slate-900">{formatCurrency(t.hourlyRate)}/hr</div>
                      </div>

                      <Button
                        variant="student"
                        size="sm"
                        onClick={() => handleOpenProfile(t.id)}
                        rightIcon={<ArrowRight className="h-3.5 w-3.5" />}
                      >
                        View Profile
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Teacher Profile & Booking Slide-over Modal */}
      {selectedTeacherId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="relative w-full max-w-2xl bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto space-y-6">
            {/* Close button */}
            <button
              onClick={handleCloseProfile}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-700 p-2 rounded-full hover:bg-slate-100 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            {detailLoading || !teacherDetail ? (
              <div className="py-16 text-center space-y-3">
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
                <p className="text-xs text-slate-500 font-semibold">Loading educator profile...</p>
              </div>
            ) : (
              <>
                {/* Header Information */}
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 pt-2">
                  <img
                    src={teacherDetail.avatarUrl}
                    alt={teacherDetail.name}
                    className="w-20 h-20 rounded-2xl object-cover ring-4 ring-blue-100 shadow-md"
                  />
                  <div className="text-center sm:text-left space-y-1.5 min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                      <h2 className="text-xl font-extrabold text-slate-900">
                        {teacherDetail.name}
                      </h2>
                      <Badge variant="success" size="sm" className="flex items-center gap-1">
                        <ShieldCheck className="h-3 w-3" /> Verified Educator
                      </Badge>
                    </div>
                    <p className="text-xs font-bold text-blue-600">{teacherDetail.headline}</p>
                    <div className="flex items-center justify-center sm:justify-start gap-4 text-xs text-slate-500 font-semibold">
                      <span className="text-amber-500 font-bold">★ {teacherDetail.rating.toFixed(1)} Rating</span>
                      <span>• {teacherDetail.experienceYears} Years Experience</span>
                      <span className="font-extrabold text-slate-900">{formatCurrency(teacherDetail.hourlyRate)}/hr</span>
                    </div>
                  </div>
                </div>

                {/* Feedback Alert */}
                {bookingFeedback && (
                  <div
                    className={`p-4 rounded-2xl text-xs font-semibold flex items-center gap-2 ${
                      bookingFeedback.type === "success"
                        ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                        : "bg-red-50 text-red-800 border border-red-200"
                    }`}
                  >
                    {bookingFeedback.type === "success" ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                    )}
                    <span>{bookingFeedback.message}</span>
                  </div>
                )}

                {/* Tab Navigation in Modal */}
                <div className="flex border-b border-slate-200 gap-6">
                  <button
                    onClick={() => setActiveModalTab("about")}
                    className={`pb-3 text-xs font-extrabold transition-colors border-b-2 ${
                      activeModalTab === "about"
                        ? "border-blue-600 text-blue-600"
                        : "border-transparent text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    About Educator
                  </button>
                  <button
                    onClick={() => setActiveModalTab("slots")}
                    className={`pb-3 text-xs font-extrabold transition-colors border-b-2 flex items-center gap-1.5 ${
                      activeModalTab === "slots"
                        ? "border-blue-600 text-blue-600"
                        : "border-transparent text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    <Video className="w-3.5 h-3.5" />
                    Live Class Slots ({teacherDetail.liveClassSlots?.length || 0})
                  </button>
                  <button
                    onClick={() => setActiveModalTab("courses")}
                    className={`pb-3 text-xs font-extrabold transition-colors border-b-2 flex items-center gap-1.5 ${
                      activeModalTab === "courses"
                        ? "border-blue-600 text-blue-600"
                        : "border-transparent text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    Video Courses ({teacherDetail.courses?.length || 0})
                  </button>
                </div>

                {/* Tab Content */}
                {activeModalTab === "about" && (
                  <div className="space-y-5">
                    <div className="space-y-1.5">
                      <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
                        Biography
                      </h4>
                      <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-4 rounded-2xl border border-slate-100">
                        {teacherDetail.bio || "No biography provided yet."}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
                        Expertise & Subjects Taught
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {teacherDetail.subjects?.map((sub: string, idx: number) => (
                          <span
                            key={idx}
                            className="text-xs font-bold px-3 py-1 rounded-xl bg-blue-50 text-blue-700 border border-blue-100"
                          >
                            {sub}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-100 flex items-center justify-between">
                      <div>
                        <div className="text-xs font-bold text-indigo-900">Standard Private Tutoring Rate</div>
                        <div className="text-sm font-extrabold text-indigo-700">
                          {formatCurrency(teacherDetail.hourlyRate)} / hour (Includes notes & homework check)
                        </div>
                      </div>
                      <Button
                        variant="student"
                        size="sm"
                        onClick={() => setActiveModalTab("slots")}
                      >
                        Book Live Session
                      </Button>
                    </div>
                  </div>
                )}

                {activeModalTab === "slots" && (
                  <div className="space-y-4">
                    {teacherDetail.liveClassSlots?.length === 0 ? (
                      <div className="p-8 text-center space-y-2 bg-slate-50 rounded-2xl border border-slate-100">
                        <Calendar className="w-8 h-8 text-slate-300 mx-auto" />
                        <p className="text-xs font-bold text-slate-600">
                          No upcoming live classes scheduled currently.
                        </p>
                        <p className="text-[11px] text-slate-400">
                          Check back soon or explore video courses by this educator.
                        </p>
                      </div>
                    ) : (
                      teacherDetail.liveClassSlots?.map((slot: any) => (
                        <div
                          key={slot.id}
                          className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:border-slate-300 transition-colors"
                        >
                          <div className="space-y-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm font-extrabold text-slate-900 truncate">
                                {slot.title}
                              </h4>
                              <Badge variant="outline" size="sm">
                                {slot.level}
                              </Badge>
                            </div>
                            <p className="text-xs text-slate-500">
                              Subject: {slot.subject} • Duration: {slot.durationMinutes} mins
                            </p>
                            <div className="text-xs text-slate-600 font-semibold flex items-center gap-2 pt-0.5">
                              <Clock className="w-3.5 h-3.5 text-blue-500" />
                              <span>
                                {new Date(slot.startTime).toLocaleDateString(undefined, {
                                  weekday: "short",
                                  month: "short",
                                  day: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>
                              <span className="text-slate-400">
                                ({slot.bookedCount}/{slot.maxCapacity} booked)
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end shrink-0">
                            <div className="text-right">
                              <span className="text-[10px] text-slate-400 uppercase font-bold">Fee</span>
                              <div className="text-sm font-black text-slate-900">
                                {slot.price === 0 ? "FREE" : formatCurrency(slot.price)}
                              </div>
                            </div>

                            <Button
                              variant="student"
                              size="sm"
                              disabled={slot.isFull || bookingLoadingSlotId === slot.id}
                              onClick={() => handleBookSlot(slot.id)}
                            >
                              {bookingLoadingSlotId === slot.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : slot.isFull ? (
                                "Class Full"
                              ) : slot.price === 0 ? (
                                "Book Free"
                              ) : (
                                "Enroll & Pay"
                              )}
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {activeModalTab === "courses" && (
                  <div className="space-y-4">
                    {teacherDetail.courses?.length === 0 ? (
                      <div className="p-8 text-center space-y-2 bg-slate-50 rounded-2xl border border-slate-100">
                        <BookOpen className="w-8 h-8 text-slate-300 mx-auto" />
                        <p className="text-xs font-bold text-slate-600">
                          No pre-recorded courses published by this teacher yet.
                        </p>
                      </div>
                    ) : (
                      teacherDetail.courses?.map((course: any) => (
                        <div
                          key={course.id}
                          className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-14 h-14 rounded-xl overflow-hidden bg-slate-200 shrink-0">
                              <img
                                src={course.thumbnailUrl || "/images/course-placeholder.jpg"}
                                alt={course.title}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div className="space-y-0.5 min-w-0">
                              <h4 className="text-sm font-extrabold text-slate-900 truncate">
                                {course.title}
                              </h4>
                              <p className="text-xs text-slate-500">
                                {course.level} • {course.subject}
                              </p>
                              <span className="text-[10px] text-slate-400 font-semibold">
                                {course.enrollmentCount || 0} students enrolled
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end shrink-0">
                            <div className="text-right">
                              <span className="text-[10px] text-slate-400 uppercase font-bold">Course Price</span>
                              <div className="text-sm font-black text-slate-900">
                                {course.price === 0 ? "FREE" : formatCurrency(course.price)}
                              </div>
                            </div>

                            <Link href={`/payment/checkout?type=COURSE_ENROLLMENT&courseId=${course.id}`}>
                              <Button variant="student" size="sm">
                                Enroll Now
                              </Button>
                            </Link>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
