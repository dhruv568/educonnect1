"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Search,
  Filter,
  SlidersHorizontal,
  GraduationCap,
  Sparkles,
  BookOpen,
  CheckCircle,
  X,
  ChevronLeft,
  ChevronRight,
  Layers,
} from "lucide-react";
import { CourseCard } from "@/components/courses/course-card";
import { FloatingNavbar } from "@/components/homepage/floating-navbar";
import { PremiumFooter } from "@/components/homepage/premium-footer";
import {
  SCHOOL_GRADES,
  SENIOR_SECONDARY_STREAMS,
  COMPETITIVE_EXAMS,
  DIPLOMA_BRANCHES,
  isSeniorSecondaryGrade,
} from "@/lib/constants/academic";

const SUBJECTS = ["All", "Mathematics", "Science", "Physics", "Chemistry", "Biology", "Computer Science", "English", "Economics"];
const LEVELS = [
  { label: "All Levels", value: "all" },
  { label: "Beginner", value: "BEGINNER" },
  { label: "Intermediate", value: "INTERMEDIATE" },
  { label: "Advanced", value: "ADVANCED" },
];
const SORT_OPTIONS = [
  { label: "Recommended", value: "recommended" },
  { label: "Highest Rated", value: "rating" },
  { label: "Newest", value: "newest" },
  { label: "Most Enrolled", value: "most_enrolled" },
  { label: "Price: Low to High", value: "price_asc" },
  { label: "Price: High to Low", value: "price_desc" },
  { label: "Shortest Duration", value: "shortest" },
  { label: "Longest Duration", value: "longest" },
];

export default function CoursePlatformPage() {
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Filters state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("All");
  const [selectedLevel, setSelectedLevel] = useState("all");
  const [academicLevel, setAcademicLevel] = useState("all");
  const [gradeLevel, setGradeLevel] = useState("all");
  const [stream, setStream] = useState("all");
  const [competitiveExam, setCompetitiveExam] = useState("all");
  const [diplomaBranch, setDiplomaBranch] = useState("all");
  const [sortBy, setSortBy] = useState("recommended");
  const [priceMax, setPriceMax] = useState<number | undefined>(undefined);
  const [showFiltersMobile, setShowFiltersMobile] = useState(false);

  const fetchCourses = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set("search", searchQuery);
      if (selectedSubject !== "All") params.set("subject", selectedSubject);
      if (selectedLevel !== "all") params.set("level", selectedLevel);
      if (academicLevel !== "all") params.set("academicLevel", academicLevel);
      if (gradeLevel !== "all") params.set("grade", gradeLevel);
      if (stream !== "all") params.set("stream", stream);
      if (competitiveExam !== "all") params.set("exam", competitiveExam);
      if (diplomaBranch !== "all") params.set("diplomaBranch", diplomaBranch);
      if (sortBy) params.set("sortBy", sortBy);
      if (priceMax !== undefined) params.set("priceMax", priceMax.toString());
      params.set("page", page.toString());
      params.set("limit", "9");

      const res = await fetch(`/api/courses?${params.toString()}`);
      const data = await res.json();

      if (data.success) {
        setCourses(data.data.courses || []);
        setTotalCount(data.data.totalCount || 0);
        setTotalPages(data.data.totalPages || 1);
      }
    } catch (err) {
      console.error("Failed to fetch courses:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, [
    searchQuery,
    selectedSubject,
    selectedLevel,
    academicLevel,
    gradeLevel,
    stream,
    competitiveExam,
    diplomaBranch,
    sortBy,
    priceMax,
    page,
  ]);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans selection:bg-[#16805B] selection:text-white">
      <FloatingNavbar />

      {/* Hero Header Section */}
      <section className="relative pt-28 pb-16 overflow-hidden bg-gradient-to-b from-[#16805B]/10 via-[#0D5C41]/5 to-transparent">
        <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-gradient-to-tr from-emerald-600/15 via-[#16805B]/15 to-teal-600/15 blur-3xl pointer-events-none rounded-full" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[#16805B] dark:text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-4 backdrop-blur-md">
            <Sparkles className="w-3.5 h-3.5" />
            <span>EduConnects Course Platform</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-slate-900 dark:text-slate-100 max-w-3xl mx-auto">
            Master Any Subject with{" "}
            <span className="bg-gradient-to-r from-[#16805B] via-emerald-600 to-teal-600 bg-clip-text text-transparent">
              Self-Paced Learning
            </span>
          </h1>

          <p className="mt-4 text-base sm:text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto font-medium">
            Explore expert-crafted pre-recorded video courses from verified educators. Learn on your own schedule with complete lesson resources.
          </p>

          {/* Search Bar */}
          <div className="mt-8 max-w-2xl mx-auto">
            <div className="relative flex items-center shadow-xl shadow-[#16805B]/5 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl">
              <Search className="absolute left-4 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search by course title, teacher, subject, or keyword..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-12 pr-10 py-4 text-sm sm:text-base bg-transparent text-slate-900 dark:text-slate-100 placeholder-slate-400 outline-none font-medium"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Subject Pills Filter */}
          <div className="mt-6 flex items-center justify-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            {SUBJECTS.map((sub) => (
              <button
                key={sub}
                onClick={() => {
                  setSelectedSubject(sub);
                  setPage(1);
                }}
                className={`px-4 py-2 text-xs font-semibold rounded-xl whitespace-nowrap transition-all duration-200 ${
                  selectedSubject === sub
                    ? "bg-gradient-to-r from-[#16805B] to-[#0D5C41] text-white shadow-md shadow-emerald-500/20 scale-105"
                    : "bg-white/60 dark:bg-slate-900/60 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
              >
                {sub}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar Filters Desktop */}
          <aside className="hidden lg:block w-64 shrink-0 space-y-6">
            <div className="p-6 rounded-2xl bg-white/70 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800/80 backdrop-blur-md space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
                <h3 className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2 text-sm uppercase tracking-wider">
                  <Filter className="w-4 h-4 text-[#16805B]" /> Filter Courses
                </h3>
                {(selectedSubject !== "All" || selectedLevel !== "all" || academicLevel !== "all" || priceMax !== undefined) && (
                  <button
                    onClick={() => {
                      setSelectedSubject("All");
                      setSelectedLevel("all");
                      setAcademicLevel("all");
                      setGradeLevel("all");
                      setStream("all");
                      setCompetitiveExam("all");
                      setDiplomaBranch("all");
                      setPriceMax(undefined);
                      setPage(1);
                    }}
                    className="text-xs text-[#16805B] dark:text-emerald-400 font-semibold hover:underline"
                  >
                    Reset
                  </button>
                )}
              </div>

              {/* Academic Level Filter */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mb-2">
                  <GraduationCap className="w-3.5 h-3.5 text-[#16805B]" /> Academic Level
                </label>
                <select
                  value={academicLevel}
                  onChange={(e) => {
                    setAcademicLevel(e.target.value);
                    setGradeLevel("all");
                    setStream("all");
                    setCompetitiveExam("all");
                    setDiplomaBranch("all");
                    setPage(1);
                  }}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-[#16805B] font-medium cursor-pointer"
                >
                  <option value="all">All Academic Levels</option>
                  <option value="SCHOOL">School Education</option>
                  <option value="DIPLOMA">Diploma Studies</option>
                </select>
              </div>

              {/* Conditional: School Grade */}
              {academicLevel === "SCHOOL" && (
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-2">
                    Grade / Class
                  </label>
                  <select
                    value={gradeLevel}
                    onChange={(e) => {
                      const val = e.target.value;
                      setGradeLevel(val);
                      if (!isSeniorSecondaryGrade(val)) {
                        setStream("all");
                        setCompetitiveExam("all");
                      }
                      setPage(1);
                    }}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-blue-500 font-medium cursor-pointer"
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

              {/* Conditional: Stream & Exam for Grades 11-12 */}
              {academicLevel === "SCHOOL" && isSeniorSecondaryGrade(gradeLevel) && (
                <>
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-2">
                      Stream
                    </label>
                    <select
                      value={stream}
                      onChange={(e) => {
                        setStream(e.target.value);
                        setPage(1);
                      }}
                      className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-blue-500 font-medium cursor-pointer"
                    >
                      <option value="all">All Streams</option>
                      {SENIOR_SECONDARY_STREAMS.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-2">
                      Target Exam
                    </label>
                    <select
                      value={competitiveExam}
                      onChange={(e) => {
                        setCompetitiveExam(e.target.value);
                        setPage(1);
                      }}
                      className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-blue-500 font-medium cursor-pointer"
                    >
                      <option value="all">Any / General</option>
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
              {academicLevel === "DIPLOMA" && (
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-2">
                    Diploma Branch
                  </label>
                  <select
                    value={diplomaBranch}
                    onChange={(e) => {
                      setDiplomaBranch(e.target.value);
                      setPage(1);
                    }}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-blue-500 font-medium cursor-pointer"
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

              {/* Level Filter */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-3">
                  Difficulty Level
                </label>
                <div className="space-y-2">
                  {LEVELS.map((lvl) => (
                    <label key={lvl.value} className="flex items-center gap-2.5 text-xs text-slate-700 dark:text-slate-300 font-medium cursor-pointer hover:text-[#16805B]">
                      <input
                        type="radio"
                        name="level"
                        checked={selectedLevel === lvl.value}
                        onChange={() => {
                          setSelectedLevel(lvl.value);
                          setPage(1);
                        }}
                        className="text-[#16805B] focus:ring-[#16805B]"
                      />
                      {lvl.label}
                    </label>
                  ))}
                </div>
              </div>

              {/* Price Filter */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-3">
                  Max Price
                </label>
                <div className="space-y-2">
                  <button
                    onClick={() => { setPriceMax(undefined); setPage(1); }}
                    className={`w-full px-3 py-1.5 text-left text-xs font-medium rounded-lg border ${
                      priceMax === undefined ? "bg-emerald-50 dark:bg-emerald-950/50 border-[#16805B] text-[#16805B]" : "border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400"
                    }`}
                  >
                    Any Price
                  </button>
                  <button
                    onClick={() => { setPriceMax(0); setPage(1); }}
                    className={`w-full px-3 py-1.5 text-left text-xs font-medium rounded-lg border ${
                      priceMax === 0 ? "bg-emerald-50 dark:bg-emerald-950/50 border-[#16805B] text-[#16805B]" : "border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400"
                    }`}
                  >
                    Free Only (₹0)
                  </button>
                  <button
                    onClick={() => { setPriceMax(1000); setPage(1); }}
                    className={`w-full px-3 py-1.5 text-left text-xs font-medium rounded-lg border ${
                      priceMax === 1000 ? "bg-emerald-50 dark:bg-emerald-950/50 border-[#16805B] text-[#16805B]" : "border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400"
                    }`}
                  >
                    Under ₹1,000
                  </button>
                  <button
                    onClick={() => { setPriceMax(2500); setPage(1); }}
                    className={`w-full px-3 py-1.5 text-left text-xs font-medium rounded-lg border ${
                      priceMax === 2500 ? "bg-emerald-50 dark:bg-emerald-950/50 border-[#16805B] text-[#16805B]" : "border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400"
                    }`}
                  >
                    Under ₹2,500
                  </button>
                </div>
              </div>
            </div>
          </aside>

          {/* Course Grid & Sorting Header */}
          <div className="flex-1 space-y-6">
            {/* Top Toolbar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-white/70 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800/80 backdrop-blur-md">
              <div className="text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-300">
                Showing <span className="font-bold text-slate-900 dark:text-slate-100">{courses.length}</span> of{" "}
                <span className="font-bold text-slate-900 dark:text-slate-100">{totalCount}</span> courses
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                <button
                  onClick={() => setShowFiltersMobile(!showFiltersMobile)}
                  className="lg:hidden flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" /> Filters
                </button>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400 shrink-0">Sort By:</span>
                  <select
                    value={sortBy}
                    onChange={(e) => {
                      setSortBy(e.target.value);
                      setPage(1);
                    }}
                    className="px-3 py-2 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-slate-800 border-0 text-slate-900 dark:text-slate-100 outline-none cursor-pointer"
                  >
                    {SORT_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Courses Grid */}
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <div
                    key={n}
                    className="h-80 rounded-2xl bg-slate-200 dark:bg-slate-800 animate-pulse"
                  />
                ))}
              </div>
            ) : courses.length === 0 ? (
              <div className="p-12 text-center rounded-2xl bg-white/70 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800">
                <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">No Courses Found</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  We couldn't find any courses matching your search criteria. Try clearing filters or searching for different keywords.
                </p>
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setSelectedSubject("All");
                    setSelectedLevel("all");
                    setPriceMax(undefined);
                  }}
                  className="mt-4 px-4 py-2 text-xs font-semibold rounded-xl bg-[#16805B] text-white shadow-md hover:bg-[#0D5C41] transition"
                >
                  Clear Filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {courses.map((course) => (
                  <CourseCard key={course.id} {...course} />
                ))}
              </div>
            )}

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-6">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                  className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 px-4">
                  Page {page} of {totalPages}
                </span>

                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage(page + 1)}
                  className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </main>

      <PremiumFooter />
    </div>
  );
}
