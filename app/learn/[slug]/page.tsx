"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import MuxPlayer from "@mux/mux-player-react";
import {
  Play,
  PlayCircle,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  CheckCircle2,
  Lock,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  Download,
  FileText,
  Star,
  Award,
  Sparkles,
  RotateCcw,
  Check,
  X,
  MessageSquare,
  AlertCircle,
} from "lucide-react";
import { BackButton } from "@/components/ui/back-button";
import { BackToHomeButton } from "@/components/ui/back-to-home-button";
import { Logo } from "@/components/brand/logo";

export default function LmsClassroomPlayerPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params?.slug as string;

  const [courseData, setCourseData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeLesson, setActiveLesson] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "resources" | "review">("overview");

  // Video player state
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [videoError, setVideoError] = useState(false);

  // Mux & Direct Video playback state
  const [muxPlaybackData, setMuxPlaybackData] = useState<{
    playbackId?: string | null;
    signedToken?: string | null;
    playbackUrl?: string | null;
    isMux?: boolean;
  } | null>(null);

  // Review form state
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewText, setReviewText] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewSuccessMsg, setReviewSuccessMsg] = useState("");

  // Completion modal
  const [showCompletionModal, setShowCompletionModal] = useState(false);

  const fetchClassroomData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/student/courses/${slug}/learn`);
      const data = await res.json();
      if (data.success && data.data) {
        setCourseData(data.data);

        // Find initial active lesson (first uncompleted accessible lesson or first lesson)
        let foundLesson: any = null;
        for (const sec of data.data.sections) {
          for (const les of sec.lessons) {
            if (les.isAccessible && !les.isCompleted && !foundLesson) {
              foundLesson = les;
            }
          }
        }
        if (!foundLesson && data.data.sections[0]?.lessons[0]) {
          foundLesson = data.data.sections[0].lessons[0];
        }
        setActiveLesson(foundLesson);
      }
    } catch (err) {
      console.error("Failed to load classroom data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (slug) fetchClassroomData();
  }, [slug]);

  // Reset video player states when active lesson changes
  useEffect(() => {
    setVideoError(false);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
  }, [activeLesson?.id]);

  // Fetch video playback details (Mux or Direct) whenever active lesson changes
  useEffect(() => {
    async function loadMuxPlayback() {
      if (!courseData?.courseId || !activeLesson?.id || !activeLesson?.isAccessible) return;
      setMuxPlaybackData(null);
      setVideoError(false);

      try {
        const res = await fetch(`/api/courses/${courseData.courseId}/lessons/${activeLesson.id}/playback`);
        const data = await res.json();
        if (data.success && data.data) {
          setMuxPlaybackData({
            playbackId: data.data.playbackId || null,
            playbackUrl: data.data.playbackUrl || null,
            signedToken: data.data.signedToken || null,
            isMux: Boolean(data.data.isMux),
          });
        }
      } catch (err) {
        console.warn("Video playback token fetch issue:", err);
      }
    }

    loadMuxPlayback();
  }, [activeLesson?.id, courseData?.courseId]);

  // Periodic video progress saving (every 10s)
  useEffect(() => {
    if (!activeLesson || !isPlaying) return;

    const interval = setInterval(() => {
      saveProgress(false);
    }, 10000);

    return () => clearInterval(interval);
  }, [activeLesson, isPlaying, currentTime]);

  const saveProgress = async (forceComplete: boolean = false) => {
    if (!activeLesson || !videoRef.current) return;
    const timeSec = Math.round(videoRef.current.currentTime || 0);

    try {
      const res = await fetch(`/api/lessons/${activeLesson.id}/progress`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          progressSeconds: timeSec,
          forceComplete,
        }),
      });
      const data = await res.json();
      if (data.success) {
        if (data.data.lessonCompleted && !activeLesson.isCompleted) {
          setActiveLesson((prev: any) => ({ ...prev, isCompleted: true }));
        }
        if (data.data.courseCompleted) {
          setShowCompletionModal(true);
        }
        // Update local course progress
        setCourseData((prev: any) => ({
          ...prev,
          overallProgressPercent: data.data.progressPercent,
        }));
      }
    } catch (err) {
      console.error("Failed to save video progress:", err);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
      setDuration(videoRef.current.duration || 0);
    }
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
      saveProgress(false);
    } else {
      videoRef.current.play().then(() => setIsPlaying(true)).catch(() => setVideoError(true));
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = Number(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
      saveProgress(false);
    }
  };

  const handleSpeedChange = (speed: number) => {
    setPlaybackSpeed(speed);
    if (videoRef.current) videoRef.current.playbackRate = speed;
  };

  const handleVideoEnded = () => {
    setIsPlaying(false);
    saveProgress(true);
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseData?.courseId) return;
    setSubmittingReview(true);
    setReviewSuccessMsg("");
    try {
      const res = await fetch(`/api/courses/${courseData.courseId}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rating: reviewRating,
          review: reviewText,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setReviewSuccessMsg("Review submitted successfully! Thank you.");
        setReviewText("");
      } else {
        setReviewSuccessMsg(data.error || "Failed to submit review.");
      }
    } catch (err) {
      setReviewSuccessMsg("Failed to submit review.");
    } finally {
      setSubmittingReview(false);
    }
  };

  // Find next and previous lessons
  const getAllLessonsOrdered = () => {
    if (!courseData) return [];
    const list: any[] = [];
    courseData.sections.forEach((sec: any) => {
      sec.lessons.forEach((les: any) => list.push(les));
    });
    return list;
  };

  const allLessons = getAllLessonsOrdered();
  const currentIndex = allLessons.findIndex((l) => l.id === activeLesson?.id);
  const prevLesson = currentIndex > 0 ? allLessons[currentIndex - 1] : null;
  const nextLesson = currentIndex >= 0 && currentIndex < allLessons.length - 1 ? allLessons[currentIndex + 1] : null;

  if (loading || !courseData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 selection:bg-blue-500 selection:text-white">
      {/* Top LMS Header */}
      <header className="h-16 px-4 sm:px-6 bg-slate-900 border-b border-slate-800 flex items-center justify-between z-30 shrink-0">
        <div className="flex items-center gap-4">
          <Logo
            variant="compact"
            size="sm"
            theme="dark"
            href="/"
            showTagline={false}
            priority
          />
          <span className="text-slate-700 hidden sm:inline">|</span>
          <BackButton
            fallbackUrl="/student/courses"
            label="My Courses"
            variant="dark"
            size="sm"
          />
          <span className="text-slate-700 hidden md:inline">|</span>
          <h1 className="text-sm font-bold text-slate-100 truncate max-w-xs sm:max-w-md hidden md:block">
            {courseData.title}
          </h1>
        </div>

        <div className="flex items-center gap-3 sm:gap-4">
          <BackToHomeButton variant="dark" />

          {/* Progress Pill */}
          <div className="hidden sm:flex items-center gap-3">
            <span className="text-xs font-bold text-slate-300">
              {courseData.overallProgressPercent}% Complete
            </span>
            <div className="w-28 h-2 rounded-full bg-slate-800 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 rounded-full transition-all duration-300"
                style={{ width: `${courseData.overallProgressPercent}%` }}
              />
            </div>
          </div>
        </div>
      </header>

      {/* Main Workspace (Video Player + Sidebar) */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Left Center Content Area (Player & Lesson Details) */}
        <div className="flex-1 flex flex-col overflow-y-auto bg-slate-950">
          {/* Video Player Container (Supports Mux & HTML5 Direct Video) */}
          <div className="relative w-full aspect-video bg-black flex items-center justify-center group overflow-hidden">
            {videoError ? (
              <div className="p-8 text-center space-y-3">
                <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
                <div className="text-sm font-bold text-slate-200">
                  Unable to load video stream
                </div>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Please check your internet connection or check if the video file is accessible.
                </p>
                <button
                  onClick={() => setVideoError(false)}
                  className="px-4 py-2 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-500 text-white transition"
                >
                  Retry Loading
                </button>
              </div>
            ) : !activeLesson?.isAccessible ? (
              <div className="p-8 text-center space-y-3">
                <Lock className="w-12 h-12 text-slate-600 mx-auto" />
                <div className="text-sm font-bold text-slate-300">
                  Lesson Locked
                </div>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Enroll in this course to unlock protected lessons and resources.
                </p>
              </div>
            ) : muxPlaybackData?.isMux && muxPlaybackData?.playbackId ? (
              <MuxPlayer
                streamType="on-demand"
                playbackId={muxPlaybackData.playbackId}
                tokens={muxPlaybackData.signedToken ? { playback: muxPlaybackData.signedToken } : undefined}
                autoPlay={false}
                onEnded={handleVideoEnded}
                onError={() => setVideoError(true)}
                className="w-full h-full object-contain"
              />
            ) : (muxPlaybackData?.playbackUrl || activeLesson?.videoUrl) ? (
              <video
                ref={videoRef}
                src={muxPlaybackData?.playbackUrl || activeLesson?.videoUrl}
                onLoadedMetadata={() => {
                  if (videoRef.current) {
                    setDuration(videoRef.current.duration || 0);
                  }
                }}
                onTimeUpdate={handleTimeUpdate}
                onEnded={handleVideoEnded}
                onError={() => setVideoError(true)}
                className="w-full h-full object-contain cursor-pointer"
                onClick={togglePlay}
              />
            ) : (
              <div className="p-8 text-center space-y-3">
                <PlayCircle className="w-12 h-12 text-slate-600 mx-auto" />
                <div className="text-sm font-bold text-slate-300">
                  {activeLesson?.type === "LIVE" ? "Live Class Session" : "No Video File Attached"}
                </div>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  {activeLesson?.type === "LIVE"
                    ? "This is a scheduled live class session. Join through your Live Classes dashboard."
                    : "This lesson contains reading materials and downloadable resources below."}
                </p>
              </div>
            )}

            {/* Custom Overlay Video Controls Bar - Render ONLY when valid video is loaded */}
            {activeLesson?.isAccessible && activeLesson?.videoUrl && !videoError && (
              <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-slate-950 via-slate-950/80 to-transparent flex flex-col gap-2 opacity-90 transition-opacity">
                {/* Seek Bar */}
                <input
                  type="range"
                  min="0"
                  max={duration || 100}
                  value={currentTime}
                  onChange={handleSeek}
                  className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                />

                <div className="flex items-center justify-between text-xs text-slate-300 font-semibold">
                  <div className="flex items-center gap-4">
                    <button onClick={togglePlay} className="hover:text-blue-400">
                      {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                    </button>

                    <span>
                      {Math.floor(currentTime / 60)}:
                      {Math.floor(currentTime % 60).toString().padStart(2, "0")} /{" "}
                      {Math.floor(duration / 60)}:
                      {Math.floor(duration % 60).toString().padStart(2, "0")}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    {/* Speed Selector */}
                    <div className="flex items-center gap-1 text-[11px] bg-slate-900/80 px-2 py-0.5 rounded-lg border border-slate-800">
                      {[0.75, 1, 1.25, 1.5, 2].map((spd) => (
                        <button
                          key={spd}
                          onClick={() => handleSpeedChange(spd)}
                          className={`px-1.5 py-0.5 rounded ${playbackSpeed === spd ? "bg-blue-600 text-white font-bold" : "text-slate-400"}`}
                        >
                          {spd}x
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Lesson Navigation Toolbar */}
          <div className="p-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between text-xs font-bold">
            <button
              disabled={!prevLesson}
              onClick={() => {
                if (prevLesson && prevLesson.isAccessible) setActiveLesson(prevLesson);
              }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-700"
            >
              <ChevronLeft className="w-4 h-4" /> Previous Lesson
            </button>

            <button
              onClick={() => saveProgress(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30"
            >
              <CheckCircle2 className="w-4 h-4" /> Mark Complete
            </button>

            <button
              disabled={!nextLesson}
              onClick={() => {
                if (nextLesson && nextLesson.isAccessible) setActiveLesson(nextLesson);
              }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-blue-700 shadow-md shadow-blue-500/20"
            >
              Next Lesson <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Lesson Details Tabs Area */}
          <div className="p-6 space-y-6 flex-1">
            <div className="flex items-center gap-4 border-b border-slate-800 pb-2">
              <button
                onClick={() => setActiveTab("overview")}
                className={`text-xs font-bold pb-2 transition ${
                  activeTab === "overview" ? "text-blue-400 border-b-2 border-blue-500" : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Overview & Description
              </button>
              <button
                onClick={() => setActiveTab("resources")}
                className={`text-xs font-bold pb-2 transition ${
                  activeTab === "resources" ? "text-blue-400 border-b-2 border-blue-500" : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Resources & Downloads ({activeLesson?.resources?.length || 0})
              </button>
              <button
                onClick={() => setActiveTab("review")}
                className={`text-xs font-bold pb-2 transition ${
                  activeTab === "review" ? "text-blue-400 border-b-2 border-blue-500" : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Course Review
              </button>
            </div>

            {activeTab === "overview" && (
              <div className="space-y-3">
                <h3 className="text-lg font-bold text-slate-100">{activeLesson?.title}</h3>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  {activeLesson?.description || "No specific lesson notes provided for this topic."}
                </p>
                {activeLesson?.content && (
                  <div className="mt-4 p-4 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-200 leading-relaxed whitespace-pre-wrap">
                    {activeLesson.content}
                  </div>
                )}
              </div>
            )}

            {activeTab === "resources" && (
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-slate-100">Downloadable Resources</h3>
                {activeLesson?.resources?.length === 0 ? (
                  <p className="text-xs text-slate-400">No PDF or file resources attached to this lesson.</p>
                ) : (
                  <div className="space-y-2">
                    {activeLesson.resources.map((res: any) => (
                      <div key={res.id} className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <FileText className="w-4 h-4 text-blue-400" />
                          <span className="text-xs font-semibold text-slate-200">{res.name}</span>
                        </div>
                        <a
                          href={`/api/resources/${res.id}/download`}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-blue-600 text-white shadow"
                        >
                          <Download className="w-3.5 h-3.5" /> Download
                        </a>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === "review" && (
              <div className="max-w-md space-y-4">
                <h3 className="text-sm font-bold text-slate-100">Rate & Review This Course</h3>

                <form onSubmit={handleReviewSubmit} className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-slate-300 block mb-1">Rating (1 to 5 Stars)</label>
                    <div className="flex items-center gap-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setReviewRating(star)}
                          className="p-1 text-amber-400"
                        >
                          <Star className={`w-6 h-6 ${star <= reviewRating ? "fill-amber-400" : "stroke-slate-600"}`} />
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-300 block mb-1">Review Details</label>
                    <textarea
                      required
                      rows={3}
                      placeholder="Share your learning experience with fellow students..."
                      value={reviewText}
                      onChange={(e) => setReviewText(e.target.value)}
                      className="w-full px-4 py-2 text-xs bg-slate-900 border border-slate-800 rounded-xl text-slate-100 outline-none"
                    />
                  </div>

                  {reviewSuccessMsg && (
                    <div className="p-3 text-xs rounded-xl bg-blue-500/20 text-blue-300 border border-blue-500/30">
                      {reviewSuccessMsg}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={submittingReview}
                    className="px-5 py-2.5 text-xs font-bold rounded-xl bg-blue-600 text-white shadow-md shadow-blue-500/20 disabled:opacity-50"
                  >
                    {submittingReview ? "Submitting..." : "Submit Course Review"}
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>

        {/* Right Collapsible Curriculum Sidebar */}
        <aside className="w-full lg:w-80 shrink-0 bg-slate-900 border-l border-slate-800 flex flex-col overflow-y-auto">
          <div className="p-4 border-b border-slate-800 font-bold text-xs text-slate-200 uppercase tracking-wider flex items-center justify-between">
            <span className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-blue-400" /> Curriculum Overview
            </span>
          </div>

          <div className="divide-y divide-slate-800/80 flex-1">
            {courseData.sections.map((sec: any, secIdx: number) => (
              <div key={sec.id} className="p-4 space-y-2">
                <div className="text-xs font-bold text-slate-300">
                  Section {secIdx + 1}: {sec.title}
                </div>

                <div className="space-y-1 pt-1">
                  {sec.lessons.map((les: any) => {
                    const isActive = les.id === activeLesson?.id;
                    return (
                      <button
                        key={les.id}
                        disabled={!les.isAccessible}
                        onClick={() => {
                          if (les.isAccessible) setActiveLesson(les);
                        }}
                        className={`w-full p-2.5 rounded-xl text-left text-xs flex items-center justify-between transition ${
                          isActive
                            ? "bg-blue-600 text-white font-bold shadow-md"
                            : les.isCompleted
                            ? "bg-slate-950/60 text-slate-300 hover:bg-slate-850"
                            : les.isAccessible
                            ? "text-slate-400 hover:bg-slate-850 hover:text-slate-200"
                            : "text-slate-600 cursor-not-allowed opacity-60"
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          {les.isCompleted ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                          ) : les.isAccessible ? (
                            <Play className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                          ) : (
                            <Lock className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                          )}
                          <span className="truncate">{les.title}</span>
                        </div>

                        {les.durationSeconds > 0 && (
                          <span className="text-[10px] text-slate-500 shrink-0">
                            {Math.round(les.durationSeconds / 60)}m
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </aside>
      </div>

      {/* Completion Modal */}
      {showCompletionModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center space-y-4 shadow-2xl">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/30">
              <Award className="w-8 h-8" />
            </div>

            <h2 className="text-2xl font-black text-slate-50">🎓 Course Completed!</h2>

            <p className="text-xs text-slate-300 leading-relaxed">
              Congratulations! You have completed 100% of the lessons in <span className="font-bold text-white">{courseData.title}</span>.
            </p>

            <button
              onClick={() => setShowCompletionModal(false)}
              className="mt-4 px-6 py-3 text-xs font-bold rounded-xl bg-emerald-600 text-white shadow-lg shadow-emerald-500/20"
            >
              Continue Exploring
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
