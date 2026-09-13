"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { formatCurrency } from "@/lib/currency";
import { BackButton } from "@/components/ui/back-button";
import {
  Plus,
  BookOpen,
  Users,
  CheckCircle2,
  Clock,
  Sparkles,
  Edit,
  Eye,
  MoreVertical,
  Layers,
  BarChart2,
  Trash2,
  Copy,
  Archive,
  Star,
  Settings,
  Lock,
  ShieldAlert,
  ArrowRight,
} from "lucide-react";

export default function TeacherCoursesDashboardPage() {
  const router = useRouter();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState("Educator");
  const [userEmail, setUserEmail] = useState("");
  const [verificationStatus, setVerificationStatus] = useState<string>("PENDING");

  const [courses, setCourses] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({
    totalCourses: 0,
    publishedCourses: 0,
    draftCourses: 0,
    totalStudents: 0,
  });
  const [filterStatus, setFilterStatus] = useState<string>("ALL");

  // Create Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const PRESET_SUBJECTS = ["Mathematics", "Science", "Physics", "Chemistry", "Biology", "Computer Science", "English"];
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newSubject, setNewSubject] = useState("Mathematics");
  const [isCustomSubject, setIsCustomSubject] = useState(false);
  const [newDescription, setNewDescription] = useState("");
  const [newPrice, setNewPrice] = useState("0");

  const fetchTeacherCourses = async () => {
    setLoading(true);
    try {
      const profileRes = await fetch("/api/teacher/onboarding");
      const profileJson = await profileRes.json();
      if (profileJson.data) {
        setUserName(`${profileJson.data.profile.firstName} ${profileJson.data.profile.lastName}`.trim() || profileJson.data.user.email);
        setUserEmail(profileJson.data.user.email);
        if (profileJson.data.teacherProfile) {
          setVerificationStatus(profileJson.data.teacherProfile.verificationStatus || "PENDING");
        }
      }

      const res = await fetch("/api/teacher/courses");
      const data = await res.json();
      if (data.success) {
        setCourses(data.data.courses || []);
        setStats(data.data.stats || {});
      }
    } catch (err) {
      console.error("Failed to load teacher courses:", err);
      showToast("Error", "Could not fetch course list.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeacherCourses();
  }, []);

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (verificationStatus !== "VERIFIED") {
      showToast("Verification Required 🔒", "Only verified educators can create or publish courses.", "error");
      router.push("/teacher/onboarding");
      return;
    }
    if (!newTitle.trim() || !newDescription.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/teacher/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTitle,
          subject: newSubject,
          description: newDescription,
          price: Number(newPrice) || 0,
        }),
      });
      const data = await res.json();
      if (data.success && data.data.course) {
        showToast("Course Created", "Redirecting to course builder...", "success");
        setShowCreateModal(false);
        router.push(`/teacher/courses/${data.data.course.id}/edit`);
      }
    } catch (err) {
      console.error("Failed to create course:", err);
      showToast("Error", "Failed to create course.", "error");
    } finally {
      setCreating(false);
    }
  };

  const handleDuplicateCourse = async (courseId: string) => {
    try {
      const res = await fetch(`/api/teacher/courses/${courseId}/duplicate`, {
        method: "POST",
      });
      const json = await res.json();
      if (json.success) {
        showToast("Duplicated", "Course duplicated as draft copy.", "success");
        fetchTeacherCourses();
      }
    } catch (err) {
      showToast("Error", "Failed to duplicate course.", "error");
    }
  };

  const handlePublishToggle = async (course: any) => {
    if (verificationStatus !== "VERIFIED" && course.status !== "PUBLISHED") {
      showToast("Verification Required 🔒", "Only verified educators can publish courses to learners.", "error");
      router.push("/teacher/onboarding");
      return;
    }
    const endpoint = course.status === "PUBLISHED" ? "unpublish" : "publish";
    try {
      const res = await fetch(`/api/teacher/courses/${course.id}/${endpoint}`, {
        method: "POST",
      });
      const json = await res.json();
      if (json.success) {
        showToast("Status Updated", `Course is now ${endpoint === "publish" ? "published" : "unpublished"}.`, "success");
        fetchTeacherCourses();
      } else {
        showToast("Publish Error", json.error?.message || "Could not publish course.", "error");
      }
    } catch (err) {
      showToast("Error", "Failed to update course status.", "error");
    }
  };

  const filteredCourses = courses.filter((c) => {
    if (filterStatus === "ALL") return true;
    return c.status === filterStatus;
  });

  return (
    <DashboardLayout role="TEACHER" userName={userName} userEmail={userEmail}>
      <div className="space-y-6">
        {/* Verification Required Banner for Unverified Educators */}
        {verificationStatus !== "VERIFIED" && (
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-center gap-3">
              <ShieldAlert className="h-5 w-5 text-amber-600 shrink-0" />
              <div>
                <h4 className="text-xs font-black text-amber-950">Educator Verification Required for Course Creation</h4>
                <p className="text-[11px] text-amber-800 font-medium">
                  You must be an approved, verified educator to build LMS courses or publish lessons to learners.
                </p>
              </div>
            </div>
            <Link href="/teacher/onboarding" className="shrink-0 w-full sm:w-auto">
              <Button size="sm" variant="secondary" rightIcon={<ArrowRight className="h-3.5 w-3.5" />} className="w-full sm:w-auto text-xs font-bold bg-amber-600 text-white hover:bg-amber-700">
                Complete Verification
              </Button>
            </Link>
          </div>
        )}

        {/* Top Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div>
            <BackButton
              fallbackUrl="/teacher/dashboard"
              label="Back to Dashboard"
              variant="default"
              className="mb-3"
            />
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 flex items-center gap-2">
              <BookOpen className="h-7 w-7 text-blue-600" /> Courses & Content
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Create, manage, and publish your LMS pre-recorded learning content.
            </p>
          </div>

          {verificationStatus === "VERIFIED" ? (
            <Button
              onClick={() => setShowCreateModal(true)}
              variant="primary"
              size="sm"
              leftIcon={<Plus className="h-4 w-4" />}
            >
              + Create Course
            </Button>
          ) : (
            <Link href="/teacher/onboarding" title="Educator verification required to create courses">
              <Button
                variant="outline"
                size="sm"
                leftIcon={<Lock className="h-4 w-4 text-amber-600" />}
                className="bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100 font-bold"
              >
                🔒 Verification required
              </Button>
            </Link>
          )}
        </div>

        {/* Stats Metrics Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="space-y-1 border-l-4 border-l-slate-700">
            <div className="text-xs font-semibold text-slate-500 uppercase">Total Courses</div>
            <div className="text-2xl font-black text-slate-900">{stats.totalCourses || 0}</div>
          </Card>
          <Card className="space-y-1 border-l-4 border-l-emerald-600">
            <div className="text-xs font-semibold text-emerald-600 uppercase">Published Courses</div>
            <div className="text-2xl font-black text-slate-900">{stats.publishedCourses || 0}</div>
          </Card>
          <Card className="space-y-1 border-l-4 border-l-amber-500">
            <div className="text-xs font-semibold text-amber-600 uppercase">Draft Courses</div>
            <div className="text-2xl font-black text-slate-900">{stats.draftCourses || 0}</div>
          </Card>
          <Card className="space-y-1 border-l-4 border-l-blue-600">
            <div className="text-xs font-semibold text-blue-600 uppercase">Enrolled Students</div>
            <div className="text-2xl font-black text-slate-900">{stats.totalStudents || 0}</div>
          </Card>
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
          {["ALL", "PUBLISHED", "DRAFT", "ARCHIVED"].map((st) => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition ${
                filterStatus === st
                  ? "bg-blue-600 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              {st}
            </button>
          ))}
        </div>

        {/* Courses Cards Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-64 rounded-2xl bg-slate-200/70 animate-pulse" />
            ))}
          </div>
        ) : filteredCourses.length === 0 ? (
          <Card className="p-12 text-center space-y-4 border-dashed border-2">
            <BookOpen className="h-12 w-12 text-slate-400 mx-auto" />
            <div>
              <h3 className="text-base font-bold text-slate-800">No Courses Found</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                You haven't created any courses matching this filter status yet.
              </p>
            </div>
            <Button
              onClick={() => setShowCreateModal(true)}
              variant="primary"
              size="sm"
              leftIcon={<Plus className="h-4 w-4" />}
            >
              + Create First Course
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCourses.map((c) => {
              const getSubjectGradient = (subject: string) => {
                const s = (subject || "").toLowerCase();
                if (s.includes("math")) return "bg-gradient-to-br from-blue-600 via-indigo-600 to-indigo-800";
                if (s.includes("science")) return "bg-gradient-to-br from-emerald-600 via-teal-600 to-teal-800";
                if (s.includes("physic")) return "bg-gradient-to-br from-violet-600 via-purple-600 to-purple-800";
                if (s.includes("chem")) return "bg-gradient-to-br from-amber-500 via-rose-600 to-rose-700";
                if (s.includes("bio")) return "bg-gradient-to-br from-teal-600 via-emerald-700 to-green-800";
                if (s.includes("comp") || s.includes("code")) return "bg-gradient-to-br from-cyan-600 via-blue-600 to-indigo-900";
                if (s.includes("english") || s.includes("lang")) return "bg-gradient-to-br from-pink-600 via-rose-600 to-rose-800";
                return "bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900";
              };

              const hasCustomThumbnail = c.thumbnailUrl && c.thumbnailUrl !== "/images/course-placeholder.jpg";

              return (
                <div
                  key={c.id}
                  className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl overflow-hidden shadow-xs hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between group"
                >
                  {/* Card Banner Header */}
                  <div className="relative w-full h-36 overflow-hidden bg-slate-900">
                    {hasCustomThumbnail ? (
                      <img
                        src={c.thumbnailUrl}
                        alt={c.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className={`w-full h-full ${getSubjectGradient(c.subject)} p-4 flex flex-col justify-between relative overflow-hidden`}>
                        <BookOpen className="absolute -right-4 -bottom-4 w-32 h-32 text-white/10 rotate-12 pointer-events-none" />
                        <div className="flex items-center justify-between z-10">
                          <span className="px-3 py-1 text-[11px] font-extrabold tracking-wide uppercase rounded-full bg-slate-950/60 backdrop-blur-md text-white border border-white/20 shadow-xs">
                            {c.subject}
                          </span>
                          <span
                            className={`px-3 py-1 text-[10px] font-black uppercase tracking-wider rounded-full backdrop-blur-md shadow-xs ${
                              c.status === "PUBLISHED"
                                ? "bg-emerald-500/90 text-white"
                                : c.status === "DRAFT"
                                ? "bg-amber-500/90 text-white"
                                : "bg-slate-700/90 text-slate-200"
                            }`}
                          >
                            {c.status}
                          </span>
                        </div>
                      </div>
                    )}

                    {hasCustomThumbnail && (
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent p-3 flex flex-col justify-between z-10">
                        <div className="flex items-center justify-between">
                          <span className="px-3 py-1 text-[10px] font-extrabold uppercase rounded-full bg-slate-900/80 backdrop-blur-md text-white border border-white/20">
                            {c.subject}
                          </span>
                          <span
                            className={`px-3 py-1 text-[10px] font-black uppercase rounded-full backdrop-blur-md ${
                              c.status === "PUBLISHED"
                                ? "bg-emerald-500/90 text-white"
                                : c.status === "DRAFT"
                                ? "bg-amber-500/90 text-white"
                                : "bg-slate-700/90 text-slate-200"
                            }`}
                          >
                            {c.status}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Card Content Body */}
                  <div className="p-5 space-y-4 flex-1 flex flex-col justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        <span>{c.level || "Beginner"}</span>
                        <span className={c.price > 0 ? "text-blue-600 font-extrabold" : "text-emerald-600 font-extrabold"}>
                          {c.price > 0 ? formatCurrency(c.price) : "FREE"}
                        </span>
                      </div>

                      <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100 line-clamp-2 h-12 leading-snug group-hover:text-blue-600 transition-colors">
                        {c.title}
                      </h3>
                    </div>

                    {/* 4-Stats Grid */}
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300">
                      <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                        <BookOpen className="h-4 w-4 text-blue-500 flex-shrink-0" />
                        <span className="truncate">{c.lessonCount} Lessons</span>
                      </div>

                      <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                        <Users className="h-4 w-4 text-indigo-500 flex-shrink-0" />
                        <span className="truncate">{c.enrolledCount} Students</span>
                      </div>

                      <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                        <BarChart2 className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                        <span className="truncate">{c.completionRate}% Avg</span>
                      </div>

                      <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                        <Sparkles className="h-4 w-4 text-amber-500 flex-shrink-0" />
                        <span className="truncate">{c.rating ? `${c.rating.toFixed(1)} ★` : "4.8 ★"}</span>
                      </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                      <Link href={`/teacher/courses/${c.id}`} className="flex-1">
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full text-xs font-bold rounded-xl border-slate-200"
                          leftIcon={<Settings className="h-3.5 w-3.5 text-slate-500 flex-shrink-0" />}
                        >
                          Manage
                        </Button>
                      </Link>

                      <Link href={`/teacher/courses/${c.id}/edit`} className="flex-1">
                        <Button
                          variant="primary"
                          size="sm"
                          className="w-full text-xs font-bold rounded-xl shadow-xs"
                          leftIcon={<Edit className="h-3.5 w-3.5 flex-shrink-0" />}
                        >
                          Builder
                        </Button>
                      </Link>

                      <div className="flex items-center gap-1 border-l border-slate-200 dark:border-slate-800 pl-2">
                        <button
                          onClick={() => handleDuplicateCourse(c.id)}
                          className="p-2 rounded-xl text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 transition"
                          title="Duplicate Course"
                        >
                          <Copy className="h-4 w-4" />
                        </button>

                        <button
                          onClick={() => handlePublishToggle(c)}
                          className={`p-2 rounded-xl transition ${
                            c.status === "PUBLISHED"
                              ? "text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                              : "text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-slate-800"
                          }`}
                          title={c.status === "PUBLISHED" ? "Unpublish Course" : "Publish Course"}
                        >
                          <CheckCircle2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Create Course Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="relative w-full max-w-lg bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
              <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-blue-600" /> Create Pre-Recorded Course
              </h3>

              <form onSubmit={handleCreateCourse} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Course Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Mathematics Mastery: Algebra & Functions"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="w-full px-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-700">Subject *</label>
                    <button
                      type="button"
                      onClick={() => {
                        const nextState = !isCustomSubject;
                        setIsCustomSubject(nextState);
                        if (!nextState && !PRESET_SUBJECTS.includes(newSubject)) {
                          setNewSubject("Mathematics");
                        }
                      }}
                      className="text-[10px] text-blue-600 hover:underline font-semibold"
                    >
                      {isCustomSubject ? "← Choose from list" : "+ Custom Subject"}
                    </button>
                  </div>

                  {isCustomSubject ? (
                    <input
                      type="text"
                      required
                      placeholder="e.g. Instagram Growth, Digital Marketing..."
                      value={newSubject}
                      onChange={(e) => setNewSubject(e.target.value)}
                      className="w-full px-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  ) : (
                    <select
                      value={PRESET_SUBJECTS.includes(newSubject) ? newSubject : "OTHER"}
                      onChange={(e) => {
                        if (e.target.value === "OTHER") {
                          setIsCustomSubject(true);
                          setNewSubject("");
                        } else {
                          setNewSubject(e.target.value);
                        }
                      }}
                      className="w-full px-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 outline-none"
                    >
                      {PRESET_SUBJECTS.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                      <option value="OTHER">+ Add Custom Subject / Other...</option>
                    </select>
                  )}
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Description *</label>
                  <textarea
                    required
                    rows={3}
                    placeholder="Overview of what students will learn..."
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    className="w-full px-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Price (₹ - set 0 for Free)</label>
                  <input
                    type="number"
                    min="0"
                    value={newPrice}
                    onChange={(e) => setNewPrice(e.target.value)}
                    className="w-full px-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 outline-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                  <Button type="button" variant="outline" size="sm" onClick={() => setShowCreateModal(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" variant="primary" size="sm" disabled={creating}>
                    {creating ? "Creating..." : "Continue to Course Builder"}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
