"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import MuxPlayer from "@mux/mux-player-react";
import {
  GraduationCap,
  Award,
  Video,
  CheckCircle2,
  Check,
  Lock,
  PlayCircle,
  HelpCircle,
  Clock,
  ArrowRight,
  Sparkles,
  BookOpen,
  FileText,
  ExternalLink,
  ChevronRight,
  RotateCcw,
  ShieldCheck,
  AlertCircle,
  Loader2,
} from "lucide-react";

export default function EducatorTrainingLearnPage() {
  const router = useRouter();
  const { showToast } = useToast();

  const [loadingRoadmap, setLoadingRoadmap] = useState(true);
  const [roadmap, setRoadmap] = useState<any>(null);
  const [selectedDayNumber, setSelectedDayNumber] = useState<number>(1);

  // Active day details
  const [dayDetails, setDayDetails] = useState<any>(null);
  const [loadingDay, setLoadingDay] = useState(false);
  const [quiz, setQuiz] = useState<any>(null);
  const [signedToken, setSignedToken] = useState<string | null>(null);

  // Quiz state
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, "A" | "B" | "C" | "D">>({});
  const [submittingQuiz, setSubmittingQuiz] = useState(false);
  const [quizResult, setQuizResult] = useState<any>(null);

  // Video complete state
  const [completingContent, setCompletingContent] = useState(false);

  // 1. Fetch Educator Roadmap
  const loadRoadmap = async (targetDay?: number) => {
    try {
      const res = await fetch("/api/teacher/training/program");
      if (res.status === 401) {
        window.location.replace("/teacher/login");
        return;
      }
      const json = await res.json();
      if (json.success && json.data) {
        setRoadmap(json.data);

        // Find the first unlocked incomplete day, or default to Day 1
        if (!targetDay) {
          const firstIncomplete = json.data.days.find(
            (d: any) => d.isUnlocked && !d.isCompleted
          );
          const initialDay = firstIncomplete ? firstIncomplete.dayNumber : 1;
          setSelectedDayNumber(initialDay);
          loadDayDetails(initialDay);
        } else {
          loadDayDetails(targetDay);
        }
      }
    } catch {
      showToast("Failed to load training program", "error");
    } finally {
      setLoadingRoadmap(false);
    }
  };

  // 2. Fetch Day Details
  const loadDayDetails = async (dayNumber: number) => {
    setLoadingDay(true);
    setQuizResult(null);
    setSelectedAnswers({});
    try {
      const res = await fetch(`/api/teacher/training/days/${dayNumber}`);
      const json = await res.json();
      if (json.success && json.data) {
        setDayDetails(json.data.day);
        setQuiz(json.data.quiz);
        setSignedToken(json.data.signedPlaybackToken || null);
      } else {
        showToast(json.error || `Failed to load Day ${dayNumber}`, "error");
      }
    } catch {
      showToast("Error loading day content", "error");
    } finally {
      setLoadingDay(false);
    }
  };

  useEffect(() => {
    loadRoadmap();
  }, []);

  // Handle Day Tab Click
  const handleSelectDay = (day: any) => {
    if (!day.isUnlocked) {
      showToast(`Day ${day.dayNumber} is locked. Complete Day ${day.dayNumber - 1} first.`, "warning");
      return;
    }
    setSelectedDayNumber(day.dayNumber);
    loadDayDetails(day.dayNumber);
  };

  // Mark Video / Content Complete
  const handleCompleteContent = async () => {
    setCompletingContent(true);
    try {
      const res = await fetch(`/api/teacher/training/days/${selectedDayNumber}/complete`, {
        method: "POST",
      });
      const json = await res.json();
      if (json.success) {
        showToast(`Day ${selectedDayNumber} lesson completed! Now take the concept quiz below.`, "success");
        loadRoadmap(selectedDayNumber);
      } else {
        showToast(json.error || "Failed to mark complete", "error");
      }
    } catch {
      showToast("Network error", "error");
    } finally {
      setCompletingContent(false);
    }
  };

  // Submit Quiz Answers
  const handleSubmitQuiz = async () => {
    if (!quiz?.questions || quiz.questions.length === 0) return;

    // Verify all questions are answered
    const unanswered = quiz.questions.find((q: any) => !selectedAnswers[q.id]);
    if (unanswered) {
      showToast("Please answer all questions before submitting.", "warning");
      return;
    }

    setSubmittingQuiz(true);
    try {
      const res = await fetch(`/api/teacher/training/days/${selectedDayNumber}/quiz/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: selectedAnswers }),
      });
      const json = await res.json();

      if (json.success && json.data) {
        setQuizResult(json.data);
        if (json.data.passed) {
          showToast(`Outstanding! You passed with ${json.data.scorePercentage}%. Day ${selectedDayNumber} completed!`, "success");
          loadRoadmap(selectedDayNumber);
        } else {
          showToast(`Score: ${json.data.scorePercentage}%. Minimum ${json.data.passingScore}% required. Review explanations and retry.`, "warning");
        }
      } else {
        showToast(json.error || "Failed to submit quiz", "error");
      }
    } catch {
      showToast("Network error submitting quiz", "error");
    } finally {
      setSubmittingQuiz(false);
    }
  };

  // Retake Quiz
  const handleRetakeQuiz = () => {
    setSelectedAnswers({});
    setQuizResult(null);
  };

  if (loadingRoadmap) {
    return (
      <DashboardLayout role="TEACHER">
        <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-[#0F766E]" />
          <p className="text-sm font-semibold text-slate-650">Loading your 15-Day Training Program...</p>
        </div>
      </DashboardLayout>
    );
  }

  const enrollment = roadmap?.enrollment;
  const isCertificateEligible = enrollment?.isCertificateEligible;
  const hasCertificate = enrollment?.hasCertificate;

  return (
    <DashboardLayout role="TEACHER">
      <div className="space-y-8 pb-16">
        {/* Top Progress & Certification Header */}
        <div className="bg-gradient-to-r from-[#115E59] via-[#0F766E] to-[#115E59] text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 border border-white/20 text-teal-200 text-xs font-extrabold uppercase tracking-wider">
                <GraduationCap className="h-4 w-4 text-[#2DD4BF]" />
                <span>EduConnects Educator Academy</span>
                <span className="w-1.5 h-1.5 rounded-full bg-[#2DD4BF]" />
                <span>15-Day Intensive</span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                15-Day Educator Training &amp; Certification Program
              </h1>

              {/* Progress Indicator */}
              <div className="flex items-center gap-3 pt-1">
                <span className="text-sm sm:text-base font-bold text-teal-100">
                  {enrollment?.completedDaysCount || 0} / 15 Days Completed — {enrollment?.completionPercentage || 0}%
                </span>
                <div className="w-32 sm:w-48 bg-white/20 h-2.5 rounded-full overflow-hidden">
                  <div
                    className="bg-[#2DD4BF] h-full rounded-full transition-all duration-500"
                    style={{ width: `${enrollment?.completionPercentage || 0}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Certification Status CTA */}
            <div className="shrink-0 flex flex-col sm:flex-row gap-3">
              {hasCertificate ? (
                <Link
                  href={`/certificate/verify/${enrollment.certificateNumber}`}
                  className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-white text-[#115E59] hover:bg-teal-50 font-black text-xs sm:text-sm shadow-xl transition-transform hover:-translate-y-0.5 cursor-pointer"
                >
                  <ShieldCheck className="h-5 w-5 text-[#0F766E]" />
                  <span>View Verified Certificate</span>
                </Link>
              ) : isCertificateEligible ? (
                <Link
                  href="/teacher/training/verify-certificate"
                  className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-amber-400 text-slate-950 hover:bg-amber-300 font-black text-xs sm:text-sm shadow-xl transition-transform hover:-translate-y-0.5 animate-pulse cursor-pointer"
                >
                  <Award className="h-5 w-5 text-slate-950" />
                  <span>Claim Certificate →</span>
                </Link>
              ) : (
                <div className="bg-white/10 px-4 py-2.5 rounded-2xl border border-white/20 text-xs font-semibold text-teal-200 flex items-center gap-2">
                  <Clock className="h-4 w-4 text-[#2DD4BF]" />
                  <span>Complete all 15 days to unlock official certification</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Prominent Certificate Eligibility Banner */}
        {isCertificateEligible && !hasCertificate && (
          <div className="bg-amber-50 border-2 border-amber-300 rounded-3xl p-6 shadow-md flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center shrink-0 shadow-sm">
                <Award className="h-7 w-7" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-black text-slate-900">
                  🎉 Training Completed — Certificate Eligible!
                </h2>
                <p className="text-xs sm:text-sm text-slate-700 mt-0.5">
                  You have successfully satisfied all 15 training days and required concept quizzes. Please confirm your verified educator details to generate your official PDF certificate.
                </p>
              </div>
            </div>

            <Link
              href="/teacher/training/verify-certificate"
              className="px-6 py-3 rounded-2xl bg-[#0F766E] text-white hover:bg-[#115E59] font-extrabold text-xs sm:text-sm shrink-0 shadow-md flex items-center gap-2"
            >
              <span>Verify Name &amp; Claim Certificate</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        )}

        {/* Main Grid: Left 15-Day Navigator (4 cols) & Right Day Workspace (8 cols) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* ========================================================================= */}
          {/* LEFT: 15-DAY PROGRESS NAVIGATOR */}
          {/* ========================================================================= */}
          <div className="lg:col-span-4 space-y-3">
            <div className="flex items-center justify-between pb-1">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700">15-Day Curriculum</h2>
              <span className="text-xs font-semibold text-slate-650">Sequential Track</span>
            </div>

            <div className="space-y-2.5 max-h-[85vh] overflow-y-auto pr-1">
              {roadmap?.days?.map((day: any) => {
                const isSelected = day.dayNumber === selectedDayNumber;
                const isCompleted = day.isCompleted;
                const isUnlocked = day.isUnlocked;

                return (
                  <button
                    key={day.id}
                    type="button"
                    onClick={() => handleSelectDay(day)}
                    className={`w-full text-left p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                      isSelected
                        ? "border-[#0F766E] bg-teal-50/80 shadow-md ring-1 ring-[#0F766E]"
                        : isCompleted
                        ? "border-teal-200 bg-white hover:border-teal-400"
                        : isUnlocked
                        ? "border-slate-200 bg-white hover:border-slate-400"
                        : "border-slate-100 bg-slate-50/70 opacity-60 cursor-not-allowed"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-8 h-8 rounded-xl font-mono text-xs font-black flex items-center justify-center shrink-0 ${
                          isCompleted
                            ? "bg-[#0F766E] text-white"
                            : isSelected
                            ? "bg-teal-200 text-[#115E59]"
                            : isUnlocked
                            ? "bg-slate-100 text-slate-800"
                            : "bg-slate-200 text-slate-650"
                        }`}
                      >
                        {isCompleted ? <CheckCircle2 className="h-4 w-4" /> : day.dayNumber}
                      </div>

                      <div className="min-w-0">
                        <div className="text-[11px] font-bold text-slate-650 uppercase">
                          DAY {day.dayNumber}
                        </div>
                        <h3 className="text-xs font-bold text-slate-900 truncate">{day.title}</h3>
                      </div>
                    </div>

                    <div className="shrink-0">
                      {isCompleted ? (
                        <span className="text-[10px] font-bold text-[#0F766E] bg-teal-100 px-2 py-0.5 rounded-full">
                          ✓ Completed
                        </span>
                      ) : isUnlocked ? (
                        day.progress?.videoWatched ? (
                          <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                            Quiz Due
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-[#0F766E] bg-teal-100 px-2 py-0.5 rounded-full">
                            Available
                          </span>
                        )
                      ) : (
                        <Lock className="h-4 w-4 text-slate-400" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ========================================================================= */}
          {/* RIGHT: ACTIVE DAY WORKSPACE */}
          {/* ========================================================================= */}
          <div className="lg:col-span-8 space-y-6">
            {loadingDay ? (
              <Card className="p-16 text-center text-slate-650 flex items-center justify-center gap-3">
                <Loader2 className="h-6 w-6 animate-spin text-[#0F766E]" />
                <span className="text-sm font-semibold">Loading Day {selectedDayNumber}...</span>
              </Card>
            ) : dayDetails ? (
              <div className="space-y-6">
                {/* Day Header Card */}
                <Card className="p-6 border-slate-200 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1 rounded-full bg-teal-100 text-[#115E59] font-mono text-xs font-black">
                        DAY {dayDetails.dayNumber} OF 15
                      </span>
                      {dayDetails.isCompleted && (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-teal-700 bg-teal-50 px-2.5 py-0.5 rounded-full border border-teal-200">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Day Completed
                        </span>
                      )}
                    </div>

                    <span className="text-xs font-semibold text-slate-650">
                      {dayDetails.videoDuration
                        ? `Approx. ${Math.round(dayDetails.videoDuration / 60)} mins`
                        : "Standard Module"}
                    </span>
                  </div>

                  <div>
                    <h2 className="text-xl sm:text-2xl font-black text-slate-900">{dayDetails.title}</h2>
                    <p className="text-xs sm:text-sm text-slate-650 leading-relaxed mt-1 font-medium">
                      {dayDetails.description}
                    </p>
                  </div>

                  {/* Learning Objectives */}
                  {dayDetails.learningObjectives?.length > 0 && (
                    <div className="p-4 rounded-2xl bg-[#F0FDFA] border border-teal-100 space-y-2">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-[#115E59]">
                        Today&apos;s Learning Objectives
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {dayDetails.learningObjectives.map((obj: string, i: number) => (
                          <div key={i} className="flex items-start gap-2 text-xs text-slate-700">
                            <CheckCircle2 className="h-3.5 w-3.5 text-[#0F766E] shrink-0 mt-0.5" />
                            <span>{obj}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Instructions */}
                  {dayDetails.instructions && (
                    <div className="text-xs text-slate-700 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                      <strong className="text-slate-900 font-bold">Action Steps: </strong>
                      {dayDetails.instructions}
                    </div>
                  )}
                </Card>

                {/* Training Video Player (Mux Infrastructure) */}
                <Card className="p-5 border-slate-200 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <Video className="h-4 w-4 text-[#0F766E]" /> Training Video
                    </h3>

                    {dayDetails.progress?.videoWatched ? (
                      <span className="text-xs font-bold text-teal-700 flex items-center gap-1">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Video Watched
                      </span>
                    ) : (
                      <span className="text-xs text-slate-650">Watch video to satisfy completion</span>
                    )}
                  </div>

                  {/* Player Canvas */}
                  <div className="rounded-2xl overflow-hidden bg-slate-950 aspect-video flex items-center justify-center relative shadow-inner">
                    {dayDetails.videoPlaybackId && !dayDetails.videoPlaybackId.startsWith("demo_") ? (
                      <MuxPlayer
                        streamType="on-demand"
                        playbackId={dayDetails.videoPlaybackId}
                        tokens={signedToken ? { playback: signedToken } : undefined}
                        onEnded={handleCompleteContent}
                        autoPlay={false}
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      /* Demo / Placeholder Player */
                      <div className="text-center p-8 space-y-3">
                        <div className="w-16 h-16 rounded-full bg-white/10 text-teal-300 flex items-center justify-center mx-auto shadow-md">
                          <PlayCircle className="h-8 w-8" />
                        </div>
                        <div className="space-y-1">
                          <h4 className="text-white text-base font-bold">
                            Day {dayDetails.dayNumber} Video Masterclass
                          </h4>
                          <p className="text-xs text-slate-300 max-w-sm mx-auto">
                            High-definition training lecture covering {dayDetails.title}.
                          </p>
                        </div>
                        <div className="pt-2">
                          <Button
                            size="sm"
                            onClick={handleCompleteContent}
                            disabled={completingContent || dayDetails.progress?.videoWatched}
                            className="bg-[#0F766E] hover:bg-[#115E59] text-white font-bold text-xs"
                          >
                            {completingContent ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                            ) : (
                              <Check className="h-3.5 w-3.5 mr-1.5" />
                            )}
                            {dayDetails.progress?.videoWatched
                              ? "Lesson Content Verified"
                              : "Complete Watching Lecture"}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </Card>

                {/* Supporting Resources & Materials */}
                {dayDetails.resources?.length > 0 && (
                  <Card className="p-5 border-slate-200 space-y-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-650 flex items-center gap-1.5">
                      <FileText className="h-4 w-4 text-[#0F766E]" /> Supporting Resources &amp; Guides
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {dayDetails.resources.map((res: any, idx: number) => (
                        <div
                          key={idx}
                          className="p-3 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between gap-2"
                        >
                          <div className="min-w-0">
                            <span className="text-[10px] font-bold text-[#0F766E] block uppercase">
                              {res.type || "GUIDE"}
                            </span>
                            <span className="text-xs font-bold text-slate-900 truncate block">
                              {res.title}
                            </span>
                          </div>
                          <span className="text-xs text-slate-650 font-semibold shrink-0">
                            Included
                          </span>
                        </div>
                      ))}
                    </div>
                  </Card>
                )}

                {/* AI Concept Quiz Panel */}
                {quiz ? (
                  <Card className="p-6 border-slate-200 space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
                      <div>
                        <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0F766E] bg-teal-50 px-2.5 py-0.5 rounded-full mb-1">
                          <Sparkles className="h-3.5 w-3.5" /> Day {dayDetails.dayNumber} Concept Quiz
                        </div>
                        <h3 className="text-lg font-black text-slate-900">{quiz.title}</h3>
                        <p className="text-xs text-slate-650 mt-0.5">
                          Score at least {quiz.passingScore}% to pass and unlock Day {selectedDayNumber + 1}.
                        </p>
                      </div>

                      {dayDetails.progress?.quizPassed && (
                        <Badge className="bg-teal-100 text-[#115E59] border border-teal-200 text-xs font-bold self-start sm:self-center">
                          ✓ Quiz Passed ({dayDetails.progress.bestScore}%)
                        </Badge>
                      )}
                    </div>

                    {/* Quiz Result Review Display */}
                    {quizResult ? (
                      <div className="space-y-5">
                        <div
                          className={`p-5 rounded-2xl border text-center space-y-2 ${
                            quizResult.passed
                              ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                              : "bg-amber-50 border-amber-200 text-amber-900"
                          }`}
                        >
                          <div className="text-3xl font-black">{quizResult.scorePercentage}%</div>
                          <h4 className="text-base font-bold">
                            {quizResult.passed
                              ? "🎉 Congratulations! You Passed the Assessment."
                              : "Need A Little More Review to Pass"}
                          </h4>
                          <p className="text-xs max-w-md mx-auto">
                            You answered {quizResult.correctAnswersCount} of {quizResult.totalQuestions} questions correctly. Passing threshold is {quizResult.passingScore}%.
                          </p>

                          <div className="pt-2 flex justify-center gap-3">
                            {!quizResult.passed && (
                              <Button
                                size="sm"
                                onClick={handleRetakeQuiz}
                                className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs"
                              >
                                <RotateCcw className="h-3.5 w-3.5 mr-1" /> Retake Quiz
                              </Button>
                            )}
                            {quizResult.passed && selectedDayNumber < 15 && (
                              <Button
                                size="sm"
                                onClick={() => handleSelectDay({ dayNumber: selectedDayNumber + 1, isUnlocked: true })}
                                className="bg-[#0F766E] hover:bg-[#115E59] text-white font-bold text-xs"
                              >
                                <span>Continue to Day {selectedDayNumber + 1}</span>
                                <ArrowRight className="h-3.5 w-3.5 ml-1" />
                              </Button>
                            )}
                          </div>
                        </div>

                        {/* Detailed Answer Review */}
                        <div className="space-y-4 pt-2">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">Answer Review</h4>
                          {quizResult.review?.map((rev: any, rIdx: number) => (
                            <div
                              key={rIdx}
                              className={`p-4 rounded-2xl border space-y-2 text-xs ${
                                rev.isCorrect
                                  ? "border-emerald-200 bg-emerald-50/40"
                                  : "border-rose-200 bg-rose-50/40"
                              }`}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <span className="font-bold text-slate-900">
                                  Q{rIdx + 1}. {rev.question}
                                </span>
                                <span
                                  className={`font-bold px-2 py-0.5 rounded text-[10px] shrink-0 ${
                                    rev.isCorrect
                                      ? "bg-emerald-100 text-emerald-800"
                                      : "bg-rose-100 text-rose-800"
                                  }`}
                                >
                                  {rev.isCorrect ? "Correct" : "Incorrect"}
                                </span>
                              </div>

                              <div className="text-slate-650 text-[11px] space-y-1">
                                <div>Your answer: <strong>{rev.selectedAnswer || "None"}</strong></div>
                                <div>Correct answer: <strong className="text-emerald-800">{rev.correctAnswer}</strong></div>
                              </div>

                              <p className="text-[11px] text-slate-700 bg-white/80 p-2.5 rounded-xl border border-slate-200 mt-2">
                                💡 <strong>Explanation:</strong> {rev.explanation}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      /* Active Question Form */
                      <div className="space-y-6">
                        {quiz.questions?.map((q: any, qIdx: number) => (
                          <div key={q.id || qIdx} className="space-y-3 p-4 rounded-2xl bg-slate-50 border border-slate-200">
                            <div className="flex items-start gap-2 text-sm font-bold text-slate-900">
                              <span className="w-6 h-6 rounded-lg bg-teal-100 text-[#115E59] flex items-center justify-center text-xs shrink-0 mt-0.5 font-bold">
                                {qIdx + 1}
                              </span>
                              <span>{q.question}</span>
                            </div>

                            <div className="grid grid-cols-1 gap-2 pt-1">
                              {q.options?.map((opt: any) => {
                                const isChecked = selectedAnswers[q.id] === opt.key;
                                return (
                                  <label
                                    key={opt.key}
                                    className={`p-3 rounded-xl border flex items-center gap-3 cursor-pointer transition-colors ${
                                      isChecked
                                        ? "border-[#0F766E] bg-teal-50/70 text-[#115E59] font-bold"
                                        : "border-slate-200 bg-white hover:bg-slate-100/70 text-slate-800 text-xs font-medium"
                                    }`}
                                  >
                                    <input
                                      type="radio"
                                      name={`question-${q.id}`}
                                      checked={isChecked}
                                      onChange={() =>
                                        setSelectedAnswers((prev) => ({ ...prev, [q.id]: opt.key }))
                                      }
                                      className="accent-[#0F766E] h-4 w-4 shrink-0"
                                    />
                                    <span className="w-5 font-bold">{opt.key}.</span>
                                    <span className="text-xs leading-relaxed">{opt.text}</span>
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        ))}

                        <div className="pt-2 flex items-center justify-between">
                          <span className="text-xs text-slate-650">
                            {Object.keys(selectedAnswers).length} of {quiz.questions?.length} answered
                          </span>

                          <Button
                            onClick={handleSubmitQuiz}
                            disabled={submittingQuiz}
                            className="bg-[#0F766E] hover:bg-[#115E59] text-white font-black text-xs px-6 py-2.5 rounded-xl shadow-md cursor-pointer"
                          >
                            {submittingQuiz ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> Grading Quiz...
                              </>
                            ) : (
                              "Submit Answers for Grading →"
                            )}
                          </Button>
                        </div>
                      </div>
                    )}
                  </Card>
                ) : (
                  <Card className="p-8 text-center text-slate-650">
                    <p className="text-xs font-medium">No quiz configured for this day.</p>
                  </Card>
                )}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
