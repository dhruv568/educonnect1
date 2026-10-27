"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import MuxPlayer from "@mux/mux-player-react";
import {
  Star,
  Clock,
  BookOpen,
  CheckCircle2,
  Lock,
  PlayCircle,
  Users,
  Globe,
  ChevronDown,
  ChevronUp,
  User,
  X,
  Sparkles,
  Eye,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { formatCurrency } from "@/lib/currency";
import { Footer } from "@/components/layout/footer";
import { BackButton } from "@/components/ui/back-button";

export default function CourseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params?.slug as string;

  const [course, setCourse] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [enrollMsg, setEnrollMsg] = useState("");
  const [openSections, setOpenSections] = useState<{ [key: string]: boolean }>({});

  // Preview Modal State
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewTitle, setPreviewTitle] = useState("");
  const [loadingPlayback, setLoadingPlayback] = useState(false);
  const [playbackError, setPlaybackError] = useState("");
  const [playbackData, setPlaybackData] = useState<any>(null);

  const fetchCourseDetails = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/courses/${slug}`);
      const data = await res.json();
      if (data.success && data.data.course) {
        setCourse(data.data.course);
        if (data.data.course.sections?.length > 0) {
          setOpenSections({ [data.data.course.sections[0].id]: true });
        }
      }
    } catch (err) {
      console.error("Failed to fetch course details:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (slug) fetchCourseDetails();
  }, [slug]);

  const toggleSection = (id: string) => {
    setOpenSections((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleOpenLessonPreview = async (lesson: any) => {
    if (!course) return;
    setPreviewTitle(lesson.title);
    setPreviewModalOpen(true);
    setLoadingPlayback(true);
    setPlaybackError("");
    setPlaybackData(null);

    try {
      const res = await fetch(`/api/courses/${course.id}/lessons/${lesson.id}/playback`);
      const data = await res.json();

      if (data.success && data.data) {
        setPlaybackData(data.data);
      } else {
        setPlaybackError(data.error || "Preview video is currently unavailable.");
      }
    } catch (err) {
      setPlaybackError("Failed to fetch video playback stream.");
    } finally {
      setLoadingPlayback(false);
    }
  };

  const handleEnroll = async () => {
    if (!course) return;
    setEnrolling(true);
    setEnrollMsg("");
    try {
      const res = await fetch(`/api/courses/${course.id}/enroll`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();

      if (res.status === 401) {
        router.push(`/student/register?courseId=${course.id}`);
        return;
      }

      if (data.success) {
        if (data.data.enrollment?.status === "ACTIVE") {
          router.push(`/learn/${slug}`);
        } else {
          setEnrollMsg("Redirecting to Payment Gateway...");
          setTimeout(() => {
            let offerQuery = "";
            if (typeof window !== "undefined") {
              const urlParams = new URLSearchParams(window.location.search);
              const offerParam = urlParams.get("offer") || urlParams.get("code") || urlParams.get("coupon");
              if (offerParam) offerQuery = `&offer=${encodeURIComponent(offerParam)}`;
            }
            router.push(`/payment/checkout?type=COURSE_ENROLLMENT&courseId=${course.id}${offerQuery}`);
          }, 800);
        }
      } else {
        setEnrollMsg(data.error || "Enrollment failed.");
      }
    } catch (err: any) {
      setEnrollMsg("Failed to process enrollment.");
    } finally {
      setEnrolling(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
        <Navbar />
        <div className="flex-1 max-w-7xl w-full mx-auto px-4 py-32 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500" />
        </div>
        <Footer />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
        <Navbar />
        <div className="flex-1 max-w-7xl w-full mx-auto px-4 py-32 text-center">
          <h2 className="text-2xl font-bold text-slate-200">Course Not Found</h2>
          <p className="text-sm text-slate-400 mt-2">The course you are looking for does not exist or has been removed.</p>
          <Link href="/courses" className="mt-6 inline-block px-5 py-2.5 rounded-xl bg-[#2563EB] text-white font-semibold hover:bg-[#1D4ED8]">
            Browse All Courses
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 selection:bg-[#2563EB] selection:text-white">
      <Navbar />

      {/* Hero Header */}
      <section className="relative pt-28 pb-16 bg-gradient-to-b from-slate-900 via-slate-900/90 to-slate-950 border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 items-start">
            {/* Left Header Info */}
            <div className="lg:col-span-2 space-y-6">
              <div>
                <BackButton
                  fallbackUrl="/courses"
                  label="Back to Courses"
                  variant="dark"
                  className="mb-4"
                />
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-3 py-1 text-xs font-semibold rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30 uppercase tracking-wider">
                    {course.subject}
                  </span>
                  <span className="px-3 py-1 text-xs font-semibold rounded-full bg-slate-800 text-slate-300 border border-slate-700 uppercase tracking-wider">
                    {course.level}
                  </span>
                </div>
              </div>

              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-50 tracking-tight leading-tight">
                {course.title}
              </h1>

              {course.subtitle && (
                <p className="text-lg text-slate-300 font-medium">
                  {course.subtitle}
                </p>
              )}

              <p className="text-sm sm:text-base text-slate-400 leading-relaxed">
                {course.description}
              </p>

              {/* Course Meta Stats */}
              <div className="flex flex-wrap items-center gap-6 pt-2 text-sm text-slate-300">
                <div className="flex items-center gap-1.5 text-amber-400 font-bold">
                  <Star className="w-4 h-4 fill-amber-400" />
                  <span>{course.rating.toFixed(1)}</span>
                  <span className="text-slate-400 font-normal">({course.reviewCount} reviews)</span>
                </div>

                <div className="flex items-center gap-1.5 text-slate-300">
                  <Users className="w-4 h-4 text-emerald-400" />
                  <span>{course.enrollmentCount} Enrolled Students</span>
                </div>

                <div className="flex items-center gap-1.5 text-slate-300">
                  <BookOpen className="w-4 h-4 text-teal-400" />
                  <span>{course.lessonCount} Lessons</span>
                </div>

                <div className="flex items-center gap-1.5 text-slate-300">
                  <Clock className="w-4 h-4 text-purple-400" />
                  <span>{course.durationHours} Hours Total</span>
                </div>

                <div className="flex items-center gap-1.5 text-slate-300">
                  <Globe className="w-4 h-4 text-emerald-400" />
                  <span>{course.language}</span>
                </div>
              </div>

              {/* Instructor snippet */}
              <div className="pt-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-800 flex items-center justify-center text-slate-400">
                  {course.teacher.avatarUrl ? (
                    <img src={course.teacher.avatarUrl} alt={course.teacher.name} className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <div className="text-xs text-slate-400 font-medium">Created by</div>
                  <div className="text-sm font-bold text-slate-100 flex items-center gap-1">
                    {course.teacher.name}
                    {course.teacher.isVerified && (
                      <span title="Verified Instructor"><CheckCircle2 className="w-4 h-4 text-emerald-400 fill-emerald-400/20" /></span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Right Sticky Desktop Enrollment Card */}
            <div className="lg:col-span-1">
              <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl shadow-blue-500/10 space-y-6 sticky top-28">
                <div className="relative aspect-video max-h-44 sm:max-h-48 w-full rounded-xl overflow-hidden bg-slate-950">
                  <img
                    src={course.thumbnailUrl || "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=600&auto=format&fit=crop&q=80"}
                    alt={course.title}
                    className="w-full h-full object-cover"
                  />
                  <Link href={`/courses/${slug}/preview`} className="absolute inset-0 bg-slate-950/40 flex items-center justify-center group">
                    <div className="w-12 h-12 rounded-full bg-[#2563EB]/90 text-white flex items-center justify-center backdrop-blur-md shadow-lg group-hover:scale-110 transition">
                      <PlayCircle className="w-6 h-6 ml-0.5" />
                    </div>
                  </Link>
                </div>

                <div className="flex items-baseline justify-between">
                  {course.price === 0 ? (
                    <span className="text-3xl font-black text-emerald-400">FREE</span>
                  ) : (
                    <span className="text-3xl font-black text-slate-50">
                      {formatCurrency(course.price)}
                    </span>
                  )}
                </div>

                {enrollMsg && (
                  <div className="p-3 text-xs rounded-xl bg-blue-500/20 text-blue-300 border border-blue-500/30">
                    {enrollMsg}
                  </div>
                )}

                <div className="space-y-3">
                  <Link
                    href={`/courses/${slug}/preview`}
                    className="w-full py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold text-center flex items-center justify-center gap-2 border border-slate-700 transition"
                  >
                    <Eye className="w-4 h-4 text-blue-400" /> Preview Course
                  </Link>

                  {course.isEnrolled ? (
                    <Link
                      href={`/learn/${slug}`}
                      className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-center block shadow-lg shadow-blue-600/30 hover:scale-[1.02] transition"
                    >
                      Continue Learning
                    </Link>
                  ) : (
                    <button
                      onClick={handleEnroll}
                      disabled={enrolling}
                      className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-center shadow-lg shadow-blue-600/30 hover:scale-[1.02] transition disabled:opacity-50"
                    >
                      {enrolling ? "Enrolling..." : course.price === 0 ? "Enroll Now Free" : "Enroll Now"}
                    </button>
                  )}
                </div>

                <div className="space-y-2.5 pt-2 text-xs text-slate-400 font-medium">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Full Lifetime Access</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Access on Mobile and Desktop</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Downloadable Lesson Resources</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Body Sections */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex-1 w-full space-y-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          <div className="lg:col-span-2 space-y-12">
            {/* What You Will Learn */}
            {course.learningOutcomes && course.learningOutcomes.length > 0 && (
              <div className="p-8 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
                <h3 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-emerald-400" /> What You'll Learn
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  {course.learningOutcomes.map((item: string, idx: number) => (
                    <div key={idx} className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-300 font-medium">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Curriculum Accordion */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-teal-400" /> Course Curriculum
                </h3>
                <span className="text-xs font-semibold text-slate-400">
                  {course.sections.length} Sections • {course.lessonCount} Lessons
                </span>
              </div>

              <div className="space-y-3">
                {course.sections.map((sec: any) => {
                  const isOpen = Boolean(openSections[sec.id]);
                  return (
                    <div key={sec.id} className="rounded-xl bg-slate-900/80 border border-slate-800 overflow-hidden">
                      <button
                        onClick={() => toggleSection(sec.id)}
                        className="w-full p-4 flex items-center justify-between bg-slate-900 text-left hover:bg-slate-850 transition"
                      >
                        <span className="font-bold text-sm text-slate-200">{sec.title}</span>
                        <div className="flex items-center gap-3 text-xs text-slate-400">
                          <span>{sec.lessons.length} lessons</span>
                          {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </div>
                      </button>

                      {isOpen && (
                        <div className="divide-y divide-slate-800/60 bg-slate-950/40">
                          {sec.lessons.map((les: any) => (
                            <div key={les.id} className="p-3.5 flex items-center justify-between hover:bg-slate-900/40 transition">
                              <div className="flex items-center gap-3">
                                {les.isPreview ? (
                                  <PlayCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                                ) : (
                                  <Lock className="w-4 h-4 text-slate-500 shrink-0" />
                                )}
                                <span className="text-xs font-medium text-slate-300">{les.title}</span>
                              </div>

                              <div className="flex items-center gap-2">
                                {les.isPreview && (
                                  <button
                                    onClick={() => handleOpenLessonPreview(les)}
                                    className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-blue-500/20 text-blue-400 border border-blue-500/30 hover:bg-blue-500/30"
                                  >
                                    Preview
                                  </button>
                                )}
                                {les.durationSeconds > 0 && (
                                  <span className="text-[11px] text-slate-500">
                                    {Math.round(les.durationSeconds / 60)}m
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Video Preview Modal */}
      {previewModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="relative w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl space-y-4 p-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h4 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <PlayCircle className="w-4 h-4 text-emerald-400" /> Preview: {previewTitle}
              </h4>
              <button
                onClick={() => {
                  setPreviewModalOpen(false);
                  setPlaybackData(null);
                }}
                className="text-slate-400 hover:text-slate-200"
                aria-label="Close preview modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="relative aspect-video rounded-xl overflow-hidden bg-slate-950 flex items-center justify-center">
              {loadingPlayback ? (
                <div className="flex flex-col items-center space-y-2 p-4 text-center">
                  <Loader2 className="w-8 h-8 text-[#2563EB] animate-spin" />
                  <span className="text-xs text-slate-400">Loading video stream...</span>
                </div>
              ) : playbackError ? (
                <div className="p-6 text-center space-y-2">
                  <AlertTriangle className="w-8 h-8 text-amber-400 mx-auto" />
                  <p className="text-xs font-semibold text-amber-300">{playbackError}</p>
                </div>
              ) : playbackData?.isMux && playbackData.playbackId ? (
                <MuxPlayer
                  streamType="on-demand"
                  playbackId={playbackData.playbackId}
                  tokens={{ playback: playbackData.signedToken }}
                  autoPlay={true}
                  className="w-full h-full object-contain"
                />
              ) : playbackData?.playbackUrl ? (
                <video src={playbackData.playbackUrl} controls autoPlay className="w-full h-full object-contain" />
              ) : (
                <div className="p-4 text-xs text-slate-400">Video content unavailable.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Mobile Sticky Enrollment Footer */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 p-4 bg-slate-900/90 border-t border-slate-800 backdrop-blur-md z-40 flex items-center justify-between">
        <div>
          <div className="text-xs text-slate-400">Total Price</div>
          <div className="text-lg font-black text-slate-100">
            {course.price === 0 ? "FREE" : formatCurrency(course.price)}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href={`/courses/${slug}/preview`}
            className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-200 font-bold text-xs border border-slate-700"
          >
            Preview
          </Link>
          <button
            onClick={handleEnroll}
            disabled={enrolling}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-xs shadow-lg shadow-blue-600/30"
          >
            {enrolling ? "Enrolling..." : course.isEnrolled ? "Continue" : "Enroll"}
          </button>
        </div>
      </div>

      <Footer />
    </div>
  );
}
