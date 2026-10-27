"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { FloatingNavbar } from "@/components/homepage/floating-navbar";
import { PremiumFooter } from "@/components/homepage/premium-footer";
import { TeacherFilterPanel, TeacherFilterState } from "@/components/discovery/teacher-filter-panel";
import { TeacherCardGrid } from "@/components/discovery/teacher-card-grid";
import { AuthModal } from "@/components/shared/auth-modal";
import { GlassCard } from "@/components/glass/glass-card";
import { Search, Filter, GraduationCap } from "lucide-react";
import { UserRole } from "@/types/auth";
import { trackEvent } from "@/lib/analytics";

function FindTeachersContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [searchQuery, setSearchQuery] = useState(searchParams.get("search") || "");
  const [filters, setFilters] = useState<TeacherFilterState>({
    subject: searchParams.get("subject") || "all",
    priceMax: searchParams.get("priceMax") ? Number(searchParams.get("priceMax")) : 5000,
    ratingMin: searchParams.get("ratingMin") ? Number(searchParams.get("ratingMin")) : 0,
    experienceMin: 0,
    sortBy: searchParams.get("sortBy") || "recommended",
  });

  const [teachers, setTeachers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<UserRole>("STUDENT");

  // Sync state to URL search parameters
  const updateURL = (newSearch: string, newFilters: TeacherFilterState) => {
    const params = new URLSearchParams();
    if (newSearch.trim()) params.set("search", newSearch);
    if (newFilters.subject !== "all") params.set("subject", newFilters.subject);
    if (newFilters.priceMax < 5000) params.set("priceMax", String(newFilters.priceMax));
    if (newFilters.ratingMin > 0) params.set("ratingMin", String(newFilters.ratingMin));
    if (newFilters.sortBy !== "recommended") params.set("sortBy", newFilters.sortBy);

    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  // Fetch teachers from API
  useEffect(() => {
    const fetchTeachers = async () => {
      setLoading(true);
      try {
        const queryParams = new URLSearchParams();
        if (searchQuery.trim()) queryParams.set("search", searchQuery);
        if (filters.subject !== "all") queryParams.set("subject", filters.subject);
        if (filters.priceMax && filters.priceMax < 5000) queryParams.set("priceMax", String(filters.priceMax));
        if (filters.ratingMin) queryParams.set("ratingMin", String(filters.ratingMin));
        if (filters.sortBy) queryParams.set("sortBy", filters.sortBy);
        if (filters.academicLevel && filters.academicLevel !== "all") queryParams.set("academicLevel", filters.academicLevel);
        if (filters.gradeLevel && filters.gradeLevel !== "all") queryParams.set("grade", filters.gradeLevel);
        if (filters.stream && filters.stream !== "all") queryParams.set("stream", filters.stream);
        if (filters.competitiveExam && filters.competitiveExam !== "all") queryParams.set("exam", filters.competitiveExam);
        if (filters.diplomaBranch && filters.diplomaBranch !== "all") queryParams.set("diplomaBranch", filters.diplomaBranch);

        const res = await fetch(`/api/teachers?${queryParams.toString()}`);
        const data = await res.json();
        if (data.success) {
          setTeachers(data.data.teachers);
        }
      } catch (err) {
        console.error("Failed to load teachers:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchTeachers();
  }, [searchQuery, filters]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    trackEvent("teacher_search_submitted", { query: searchQuery });
    updateURL(searchQuery, filters);
  };

  const handleFilterChange = (newFilters: TeacherFilterState) => {
    setFilters(newFilters);
    updateURL(searchQuery, newFilters);
  };

  const handleResetFilters = () => {
    const defaultFilters: TeacherFilterState = {
      subject: "all",
      priceMax: 5000,
      ratingMin: 0,
      experienceMin: 0,
      sortBy: "recommended",
    };
    setSearchQuery("");
    setFilters(defaultFilters);
    updateURL("", defaultFilters);
  };

  const handleOpenAuth = (role: UserRole) => {
    setSelectedRole(role);
    setAuthModalOpen(true);
  };

  return (
    <div data-theme="main" className="min-h-screen flex flex-col bg-slate-50">
      <FloatingNavbar />

      <main className="flex-1 pt-32 pb-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          {/* Header Banner */}
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <span className="text-xs font-extrabold text-blue-600 uppercase tracking-widest">
              Teacher Platform Discovery
            </span>
            <h1 className="text-4xl font-black text-slate-900 tracking-tight">
              Find Verified EduConnects Tutors
            </h1>
            <p className="text-sm text-slate-600">
              Browse top educators, check experience credentials, and schedule 1-on-1 trial sessions.
            </p>
          </div>

          {/* Search Bar */}
          <form onSubmit={handleSearchSubmit} className="max-w-2xl mx-auto">
            <div className="glass-surface p-2 rounded-2xl flex items-center shadow-lg border border-white/90">
              <Search className="h-5 w-5 text-slate-400 ml-3" />
              <input
                type="text"
                placeholder="Search by tutor name, subject (e.g. 'Mathematics'), or skill..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 bg-transparent outline-none font-medium"
              />
              <button
                type="submit"
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition-all"
              >
                Search Tutors
              </button>
            </div>
          </form>

          {/* Main Discovery Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-4">
            {/* Filter Sidebar */}
            <div className="lg:col-span-4">
              <TeacherFilterPanel
                filters={filters}
                onChange={handleFilterChange}
                onReset={handleResetFilters}
              />
            </div>

            {/* Results Grid */}
            <div className="lg:col-span-8 space-y-4">
              <div className="flex items-center justify-between text-xs font-bold text-slate-600 px-1">
                <span>Showing {teachers.length} Verified Tutors</span>
                <span>URL Filter Sync Active 🔗</span>
              </div>

              <TeacherCardGrid
                teachers={teachers}
                loading={loading}
                onOpenAuth={handleOpenAuth}
              />
            </div>
          </div>
        </div>
      </main>

      <PremiumFooter />

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        initialRole={selectedRole}
      />
    </div>
  );
}

export default function FindTeachersPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading Teacher Discovery...</div>}>
      <FindTeachersContent />
    </Suspense>
  );
}
