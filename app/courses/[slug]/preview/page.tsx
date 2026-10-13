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
  Sparkles,
  AlertTriangle,
  Loader2,
  X,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { BackButton } from "@/components/ui/back-button";
import { formatCurrency } from "@/lib/currency";

export default function DedicatedCoursePreviewPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params?.slug as string;

  const [course, setCourse] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [openSections, setOpenSections] = useState<{ [key: string]: boolean }>({});
  
  // Selected Preview Lesson State
  const [activeLesson, setActiveLesson] = useState<any>(null);
  const [playbackData, setPlaybackData] = useState<any>(null);
  const [loadingPlayback, setLoadingPlayback] = useState(false);
  const [playbackError, setPlaybackError] = useState("");

  // Enrollment State
  const [enrolling, setEnrolling] = useState(false);
  const [enrollMsg, setEnrollMsg] = useState("");

  const fetchCoursePreview = async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      const res = await fetch(`/api/courses/${slug}/preview`);
      const data = await res.json();

      if (data.success && data.data.course) {
        const fetchedCourse = data.data.course;
        setCourse(fetchedCourse);

        // Open first section by default
        if (fetchedCourse.sections?.length > 0) {
          setOpenSections({ [fetchedCourse.sections[0].id]: true });

          // Auto-select first preview-enabled lesson or first lesson in curriculum
          let firstPreviewLesson: any = null;
          for (const sec of fetchedCourse.sections) {
            for (const les of sec.lessons) {
              if (les.isPreview) {
                firstPreviewLesson = les;
                break;
              }
            }
            if (firstPreviewLesson) break;
          }

          if (!firstPreviewLesson && fetchedCourse.sections[0]?.lessons?.length > 0) {
            firstPreviewLesson = fetchedCourse.sections[0].lessons[0];
          }

          if (firstPreviewLesson) {
            loadLessonVideo(fetchedCourse.id, firstPreviewLesson);
          }
        }
      } else {
        setErrorMsg(data.error || "Unable to load course preview.");
      }
    } catch (err: any) {
      console.error("Failed to load preview:", err);
      setErrorMsg("Unable to load course preview. Please check your network connection.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (slug) fetchCoursePreview();
  }, [slug]);

  const toggleSection = (id: string) => {
    setOpenSections((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const loadLessonVideo = async (courseId: string, lesson: any) => {
    setActiveLesson(lesson);
    setLoadingPlayback(true);
    setPlaybackError("");
    setPlaybackData(null);

    try {
      const res = await fetch(`/api/courses/${courseId}/lessons/${lesson.id}/playback`);
      const data = await res.json();

      if (data.success && data.data) {
        setPlaybackData(data.data);
      } else {
        setPlaybackError(data.error || "Preview video is currently unavailable.");
      }
    } catch (err) {
      setPlaybackError("Failed to load video stream token.");
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
          router.push(`/learn/${course.slug}`);
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
        <div className="flex-1 max-w-7xl w-full mx-auto px-4 py-32 flex flex-col items-center justify-center space-y-4">
          <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
          <p className="text-sm font-semibold text-slate-400">Loading course preview...</p>
        </div>
        <Footer />
      </div>
    );
  }

  if (errorMsg || !course) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
        <Navbar />
        <div className="flex-1 max-w-3xl w-full mx-auto px-4 py-32 text-center space-y-6">
          <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center mx-auto">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-slate-100">Course Preview Unavailable</h2>
            <p className="text-sm text-slate-400 max-w-md mx-auto">{errorMsg || "The course you requested could not be found."}</p>
          </div>
          <div className="pt-2">
            <BackButton fallbackUrl="/courses" label="Back to Courses" variant="dark" />
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 selection:bg-blue-500 selection:text-white">
      <Navbar />

      {/* Header Banner */}
      <section className="relative pt-24 pb-12 bg-gradient-to-b from-slate-900 via-slate-900/90 to-slate-950 border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
            <BackButton fallbackUrl={`/courses/${course.slug}`} label="Back to Course Details" variant="dark" />
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 text-xs font-bold uppercase rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">
                Course Preview Mode
              </span>
              {course.status !== "PUBLISHED" && (
                <span className="px-3 py-1 text-xs font-bold uppercase rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  {course.status} (Owner/Admin Only)
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            {/* Course Title & Meta Header */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-slate-800 text-blue-400 border border-slate-700 uppercase">
                  {course.subject}
                </span>
                <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-slate-800 text-slate-300 border border-slate-700 uppercase">
                  {course.level}
                </span>
              </div>

              <h1 className="text-2xl sm:text-4xl font-black text-slate-50 tracking-tight leading-tight">
                {course.title}
              </h1>

              {course.subtitle && (
                <p className="text-base text-slate-300 font-medium">
                  {course.subtitle}
                </p>
              )}

              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed line-clamp-3">
                {course.description}
              </p>

              {/* Meta stats */}
              <div className="flex flex-wrap items-center gap-5 pt-2 text-xs text-slate-300 font-medium">
                <div className="flex items-center gap-1 text-amber-400 font-bold">
                  <Star className="w-4 h-4 fill-amber-400 stroke-amber-400" />
                  <span>{course.rating.toFixed(1)}</span>
                  <span className="text-slate-400 font-normal">({course.reviewCount} reviews)</span>
                </div>
                <div className="flex items-center gap-1">
                  <Users className="w-4 h-4 text-blue-400" />
                  <span>{course.enrollmentCount} Enrolled</span>
                </div>
                <div className="flex items-center gap-1">
                  <BookOpen className="w-4 h-4 text-indigo-400" />
                  <span>{course.lessonCount} Lessons</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4 text-purple-400" />
                  <span>{course.durationHours} Hours</span>
                </div>
                <div className="flex items-center gap-1">
                  <Globe className="w-4 h-4 text-emerald-400" />
                  <span>{course.language}</span>
                </div>
              </div>
            </div>

            {/* Price & Enrollment Card */}
            <div className="lg:col-span-1">
              <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
                <div className="flex items-baseline justify-between">
                  <span className="text-xs text-slate-400 uppercase font-semibold">Course Price</span>
                  {course.price === 0 ? (
                    <span className="text-2xl font-black text-emerald-400">FREE</span>
                  ) : (
                    <span className="text-2xl font-black text-slate-50">
                      {formatCurrency(course.price)}
                    </span>
                  )}
                </div>

                {enrollMsg && (
                  <div className="p-3 text-xs rounded-xl bg-blue-500/20 text-blue-300 border border-blue-500/30">
                    {enrollMsg}
                  </div>
                )}

                {course.isEnrolled ? (
                  <Link
                    href={`/learn/${course.slug}`}
                    className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-sm text-center block shadow-lg shadow-blue-600/30 hover:scale-[1.02] transition"
                  >
                    Continue Learning
                  </Link>
                ) : (
                  <button
                    onClick={handleEnroll}
                    disabled={enrolling}
                    className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-sm text-center shadow-lg shadow-blue-600/30 hover:scale-[1.02] transition disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {enrolling ? "Enrolling..." : course.price === 0 ? "Enroll Free" : "Enroll Now"}
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}

                <div className="pt-2 border-t border-slate-800/80 space-y-2 text-[11px] text-slate-400 font-medium">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>Free Lesson Preview Available</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>Full Lifetime Course Access</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>Access on Mobile and Desktop</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Preview Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex-1 w-full space-y-10">
        {/* Video Player Display Area */}
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <PlayCircle className="w-5 h-5 text-blue-400" />
              <h3 className="font-bold text-base text-slate-100">
                {activeLesson ? `Preview: ${activeLesson.title}` : "Select a preview lesson below to watch"}
              </h3>
            </div>
            {activeLesson && (
              <span className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-blue-500/20 text-blue-400 border border-blue-500/30">
                Sample Preview Video
              </span>
            )}
          </div>

          {/* Player Box */}
          <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-slate-950 border border-slate-800 flex items-center justify-center">
            {loadingPlayback ? (
              <div className="flex flex-col items-center space-y-3 p-6 text-center">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                <p className="text-xs text-slate-400 font-medium">Loading video stream...</p>
              </div>
            ) : playbackError ? (
              <div className="p-6 max-w-md text-center space-y-3">
                <AlertTriangle className="w-8 h-8 text-amber-400 mx-auto" />
                <p className="text-sm font-semibold text-amber-200">{playbackError}</p>
                <p className="text-xs text-slate-400">
                  Select another preview lesson from the curriculum or enroll in the course for full access.
                </p>
              </div>
            ) : playbackData?.isMux && playbackData.playbackId ? (
              <MuxPlayer
                streamType="on-demand"
                playbackId={playbackData.playbackId}
                tokens={{ playback: playbackData.signedToken }}
                autoPlay={false}
                className="w-full h-full object-contain"
              />
            ) : playbackData?.playbackUrl ? (
              <video
                src={playbackData.playbackUrl}
                controls
                preload="metadata"
                playsInline
                className="w-full h-full object-contain"
              />
            ) : (
              <div className="p-8 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
                  <PlayCircle className="w-6 h-6" />
                </div>
                <p className="text-sm font-medium text-slate-300">
                  Select any lesson marked with <span className="text-blue-400 font-bold">[Preview]</span> below to play.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Course Curriculum & Locked/Unlocked Lessons */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-indigo-400" /> Course Curriculum & Lessons
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
                        <div>
                          <span className="font-bold text-sm text-slate-200">{sec.title}</span>
                          {sec.description && <p className="text-xs text-slate-400 mt-0.5">{sec.description}</p>}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-slate-400 shrink-0">
                          <span>{sec.lessons.length} lessons</span>
                          {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </div>
                      </button>

                      {isOpen && (
                        <div className="divide-y divide-slate-800/60 bg-slate-950/40">
                          {sec.lessons.map((les: any) => {
                            const isSelected = activeLesson?.id === les.id;
                            return (
                              <div
                                key={les.id}
                                className={`p-4 flex items-center justify-between transition ${
                                  isSelected ? "bg-blue-600/10 border-l-4 border-blue-500" : "hover:bg-slate-900/40"
                                }`}
                              >
                                <div className="flex items-center gap-3 pr-4">
                                  {les.isPreview ? (
                                    <PlayCircle className="w-4 h-4 text-blue-400 shrink-0" />
                                  ) : (
                                    <Lock className="w-4 h-4 text-slate-500 shrink-0" />
                                  )}
                                  <div>
                                    <span className="text-xs sm:text-sm font-semibold text-slate-200">{les.title}</span>
                                    {les.description && <p className="text-[11px] text-slate-400 line-clamp-1">{les.description}</p>}
                                  </div>
                                </div>

                                <div className="flex items-center gap-3 shrink-0">
                                  {les.durationSeconds > 0 && (
                                    <span className="text-[11px] text-slate-500 font-medium">
                                      {Math.round(les.durationSeconds / 60)}m
                                    </span>
                                  )}

                                  <button
                                    onClick={() => loadLessonVideo(course.id, les)}
                                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
                                      isSelected
                                        ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                                        : "bg-blue-500/20 text-blue-400 border border-blue-500/30 hover:bg-blue-500/30"
                                    }`}
                                  >
                                    {isSelected ? "Playing" : "Preview"}
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* What You'll Learn */}
            {course.learningOutcomes && course.learningOutcomes.length > 0 && (
              <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
                <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-blue-400" /> What You'll Learn
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  {course.learningOutcomes.map((outcome: string, i: number) => (
                    <div key={i} className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-300">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <span>{outcome}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Requirements */}
            {course.requirements && course.requirements.length > 0 && (
              <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
                <h3 className="text-lg font-bold text-slate-100">Prerequisites & Requirements</h3>
                <ul className="list-disc list-inside space-y-1 text-xs sm:text-sm text-slate-300">
                  {course.requirements.map((req: string, i: number) => (
                    <li key={i}>{req}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Sidebar Teacher Info */}
          <div className="lg:col-span-1 space-y-6">
            <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
              <h3 className="text-base font-bold text-slate-100">Instructor Information</h3>
              <div className="flex items-start gap-3.5">
                <div className="w-12 h-12 rounded-full overflow-hidden bg-slate-800 shrink-0 flex items-center justify-center text-slate-400">
                  {course.teacher.avatarUrl ? (
                    <img src={course.teacher.avatarUrl} alt={course.teacher.name} className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-6 h-6" />
                  )}
                </div>
                <div className="space-y-1 min-w-0 flex-1">
                  <h4 className="text-sm font-bold text-slate-100 flex items-center gap-1.5 min-w-0">
                    <span className="truncate min-w-0" title={course.teacher.name}>{course.teacher.name}</span>
                    {course.teacher.isVerified && (
                      <span title="Verified Instructor" className="shrink-0"><CheckCircle2 className="w-4 h-4 text-blue-400 fill-blue-400/20" /></span>
                    )}
                  </h4>
                  <p className="text-xs text-blue-400 font-medium truncate" title={course.teacher.headline}>{course.teacher.headline}</p>
                </div>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">{course.teacher.bio}</p>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
