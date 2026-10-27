"use client";

import React, { useState, useEffect, useRef } from "react";
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

  // Category horizontal scroll state
  const categoryScrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScrollState = () => {
    const el = categoryScrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  };

  useEffect(() => {
    const el = categoryScrollRef.current;
    if (!el) return;
    checkScrollState();
    el.addEventListener("scroll", checkScrollState, { passive: true });
    window.addEventListener("resize", checkScrollState);
    return () => {
      el.removeEventListener("scroll", checkScrollState);
      window.removeEventListener("resize", checkScrollState);
    };
  }, []);

  const scrollCategories = (direction: "left" | "right") => {
    const el = categoryScrollRef.current;
    if (!el) return;
    const scrollAmount = direction === "left" ? -240 : 240;
    el.scrollBy({ left: scrollAmount, behavior: "smooth" });
  };

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
    <div data-theme="learner" className="theme-learner min-h-screen flex flex-col bg-[#EFF6FF]/30 dark:bg-slate-950 text-[#0F172A] dark:text-slate-100 font-sans selection:bg-[#2563EB] selection:text-white overflow-x-hidden">
      <FloatingNavbar variant="student" />

      {/* Hero Header Section */}
      <section className="relative pt-28 pb-16 overflow-hidden bg-gradient-to-b from-[#EFF6FF] via-[#EFF6FF]/60 to-transparent">
        <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-gradient-to-tr from-blue-600/15 via-[#2563EB]/15 to-sky-400/15 blur-3xl pointer-events-none rounded-full" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-[#2563EB] dark:text-blue-400 text-xs font-semibold uppercase tracking-wider mb-4 backdrop-blur-md shadow-2xs">
            <Sparkles className="w-3.5 h-3.5 text-[#2563EB]" />
            <span>EduConnects Course Platform</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-[#0F172A] dark:text-slate-100 max-w-3xl mx-auto">
            Master Any Subject with{" "}
            <span className="bg-gradient-to-r from-[#1D4ED8] via-[#2563EB] to-[#3B82F6] bg-clip-text text-transparent">
              Self-Paced Learning
            </span>
          </h1>

          <p className="mt-4 text-base sm:text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto font-medium">
            Explore expert-crafted pre-recorded video courses from verified educators. Learn on your own schedule with complete lesson resources.
          </p>

          {/* Search Bar */}
          <div className="mt-8 max-w-2xl mx-auto">
            <div className="relative flex items-center shadow-xl shadow-blue-600/5 rounded-2xl overflow-hidden border border-[#E2E8F0] dark:border-slate-800 bg-white dark:bg-slate-900/80 backdrop-blur-xl focus-within:border-[#2563EB] focus-within:ring-2 focus-within:ring-blue-500/20 transition-all">
              <Search className="absolute left-4 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search by course title, teacher, subject, or keyword..."
                aria-label="Search courses by title, teacher, subject, or keyword"
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
                  aria-label="Clear search"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Subject Pills Filter */}
          <div className="mt-6 w-full max-w-full min-w-0 relative group">
            {/* Left scroll chevron button (desktop/tablet) */}
            {canScrollLeft && (
              <button
                type="button"
                onClick={() => scrollCategories("left")}
                aria-label="Scroll categories left"
                className="hidden sm:flex absolute left-0 top-1/2 -translate-y-1/2 z-20 w-8 h-8 items-center justify-center rounded-full bg-white/95 dark:bg-slate-900/95 shadow-md border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:text-[#2563EB] hover:border-blue-300 transition-all -ml-3 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            )}

            {/* Scrollable category chips track */}
            <div
              ref={categoryScrollRef}
              className="flex items-center gap-2 overflow-x-auto py-2.5 px-4 sm:px-6 lg:px-0 -mx-4 sm:-mx-6 lg:mx-0 justify-start lg:justify-center scrollbar-none touch-pan-x overscroll-x-contain scroll-smooth"
              role="tablist"
              aria-label="Course categories by subject"
            >
              {SUBJECTS.map((sub, idx) => (
                <button
                  key={sub}
                  type="button"
                  role="tab"
                  aria-selected={selectedSubject === sub}
                  tabIndex={selectedSubject === sub ? 0 : -1}
                  onClick={(e) => {
                    setSelectedSubject(sub);
                    setPage(1);
                    e.currentTarget.scrollIntoView({
                      behavior: "smooth",
                      block: "nearest",
                      inline: "center",
                    });
                  }}
                  onFocus={(e) => {
                    e.currentTarget.scrollIntoView({
                      behavior: "smooth",
                      block: "nearest",
                      inline: "center",
                    });
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "ArrowRight") {
                      e.preventDefault();
                      const nextIdx = (idx + 1) % SUBJECTS.length;
                      const buttons = categoryScrollRef.current?.querySelectorAll<HTMLButtonElement>("button[role='tab']");
                      buttons?.[nextIdx]?.focus();
                      setSelectedSubject(SUBJECTS[nextIdx]);
                      setPage(1);
                    } else if (e.key === "ArrowLeft") {
                      e.preventDefault();
                      const prevIdx = (idx - 1 + SUBJECTS.length) % SUBJECTS.length;
                      const buttons = categoryScrollRef.current?.querySelectorAll<HTMLButtonElement>("button[role='tab']");
                      buttons?.[prevIdx]?.focus();
                      setSelectedSubject(SUBJECTS[prevIdx]);
                      setPage(1);
                    }
                  }}
                  className={`shrink-0 min-h-[40px] px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl whitespace-nowrap transition-all duration-150 inline-flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900 ${
                    selectedSubject === sub
                      ? "bg-[#2563EB] text-white shadow-sm shadow-blue-500/25 border border-[#2563EB]"
                      : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-blue-50/50 dark:hover:bg-slate-800 hover:text-[#2563EB] dark:hover:text-blue-400 hover:border-blue-200 dark:hover:border-slate-700"
                  }`}
                >
                  {sub}
                </button>
              ))}
              {/* Trailing spacer to preserve right buffer when scrolled to the end on mobile */}
              <div className="shrink-0 w-4 lg:hidden" aria-hidden="true" />
            </div>

            {/* Right scroll chevron button (desktop/tablet) */}
            {canScrollRight && (
              <button
                type="button"
                onClick={() => scrollCategories("right")}
                aria-label="Scroll categories right"
                className="hidden sm:flex absolute right-0 top-1/2 -translate-y-1/2 z-20 w-8 h-8 items-center justify-center rounded-full bg-white/95 dark:bg-slate-900/95 shadow-md border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:text-[#2563EB] hover:border-blue-300 transition-all -mr-3 cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
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
                  <Filter className="w-4 h-4 text-[#2563EB]" /> Filter Courses
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
                    className="text-xs text-[#2563EB] dark:text-blue-400 font-semibold hover:underline"
                  >
                    Reset
                  </button>
                )}
              </div>

              {/* Academic Level Filter */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mb-2">
                  <GraduationCap className="w-3.5 h-3.5 text-[#2563EB]" /> Academic Level
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
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-[#2563EB] font-medium cursor-pointer"
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
                    <label key={lvl.value} className="flex items-center gap-2.5 text-xs text-slate-700 dark:text-slate-300 font-medium cursor-pointer hover:text-[#2563EB]">
                      <input
                        type="radio"
                        name="level"
                        checked={selectedLevel === lvl.value}
                        onChange={() => {
                          setSelectedLevel(lvl.value);
                          setPage(1);
                        }}
                        className="text-[#2563EB] focus:ring-[#2563EB]"
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
                    className={`w-full px-3 py-1.5 text-left text-xs font-medium rounded-lg border transition-all ${
                      priceMax === undefined ? "bg-blue-50 dark:bg-blue-950/50 border-[#2563EB] text-[#2563EB] font-bold shadow-2xs" : "border-[#E2E8F0] dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-blue-200"
                    }`}
                  >
                    Any Price
                  </button>
                  <button
                    onClick={() => { setPriceMax(0); setPage(1); }}
                    className={`w-full px-3 py-1.5 text-left text-xs font-medium rounded-lg border transition-all ${
                      priceMax === 0 ? "bg-blue-50 dark:bg-blue-950/50 border-[#2563EB] text-[#2563EB] font-bold shadow-2xs" : "border-[#E2E8F0] dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-blue-200"
                    }`}
                  >
                    Free Only (₹0)
                  </button>
                  <button
                    onClick={() => { setPriceMax(1000); setPage(1); }}
                    className={`w-full px-3 py-1.5 text-left text-xs font-medium rounded-lg border transition-all ${
                      priceMax === 1000 ? "bg-blue-50 dark:bg-blue-950/50 border-[#2563EB] text-[#2563EB] font-bold shadow-2xs" : "border-[#E2E8F0] dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-blue-200"
                    }`}
                  >
                    Under ₹1,000
                  </button>
                  <button
                    onClick={() => { setPriceMax(2500); setPage(1); }}
                    className={`w-full px-3 py-1.5 text-left text-xs font-medium rounded-lg border transition-all ${
                      priceMax === 2500 ? "bg-blue-50 dark:bg-blue-950/50 border-[#2563EB] text-[#2563EB] font-bold shadow-2xs" : "border-[#E2E8F0] dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-blue-200"
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
                  className="mt-4 px-4 py-2 text-xs font-semibold rounded-xl bg-[#2563EB] text-white shadow-md hover:bg-[#1D4ED8] transition"
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

      <PremiumFooter variant="student" />
    </div>
  );
}
