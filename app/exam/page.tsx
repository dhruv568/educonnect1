"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { FloatingNavbar } from "@/components/homepage/floating-navbar";
import { PremiumFooter } from "@/components/homepage/premium-footer";
import {
  Sparkles,
  BookOpen,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  HelpCircle,
  RotateCcw,
  Loader2,
  Users,
  Award,
  Clock,
  Target,
  ChevronRight,
  GraduationCap,
} from "lucide-react";
import { useToast } from "@/components/ui/toast";
import {
  SCHOOL_GRADES,
  SENIOR_SECONDARY_STREAMS,
  COMPETITIVE_EXAMS,
  DIPLOMA_BRANCHES,
  isSeniorSecondaryGrade,
} from "@/lib/constants/academic";

interface SubjectOption {
  id: string;
  name: string;
  slug: string;
  description: string | null;
}

interface QuestionOption {
  key: "A" | "B" | "C" | "D";
  text: string;
}

interface ClientQuestion {
  id: string;
  questionNumber: number;
  question: string;
  options: QuestionOption[];
}

interface ExamResultReviewItem {
  id: string;
  questionNumber: number;
  question: string;
  options: QuestionOption[];
  selectedAnswer: "A" | "B" | "C" | "D" | null;
  correctAnswer: "A" | "B" | "C" | "D";
  isCorrect: boolean;
  explanation: string;
}

interface ExamResult {
  examId: string;
  subject: string;
  difficulty: string;
  totalQuestions: number;
  correctCount: number;
  incorrectCount: number;
  scorePercentage: number;
  performanceSummary: string;
  recommendedSubject: string;
  recommendedNextStep: string;
  findTeachersUrl: string;
  review: ExamResultReviewItem[];
}

export default function FreeExamPage() {
  const { showToast } = useToast();

  // Step state: "SETUP" | "TAKING" | "RESULT"
  const [step, setStep] = useState<"SETUP" | "TAKING" | "RESULT">("SETUP");

  // Setup options
  const [subjects, setSubjects] = useState<SubjectOption[]>([]);
  const [loadingSubjects, setLoadingSubjects] = useState(true);
  const [selectedSubject, setSelectedSubject] = useState<string>("");
  const [difficulty, setDifficulty] = useState<"Beginner" | "Intermediate" | "Advanced">("Intermediate");
  const [questionCount, setQuestionCount] = useState<number>(5);
  const [academicLevel, setAcademicLevel] = useState<"ALL" | "SCHOOL" | "DIPLOMA">("ALL");
  const [gradeLevel, setGradeLevel] = useState<string>("Grade 10");
  const [stream, setStream] = useState<string>("Science");
  const [competitiveExam, setCompetitiveExam] = useState<string>("");
  const [diplomaBranch, setDiplomaBranch] = useState<string>("Computer Engineering");

  // Active exam state
  const [examId, setExamId] = useState("");
  const [questions, setQuestions] = useState<ClientQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<string, "A" | "B" | "C" | "D">>({});
  const [generating, setGenerating] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Result state
  const [result, setResult] = useState<ExamResult | null>(null);

  // Load platform subjects and auto-detect learner's profile
  useEffect(() => {
    fetch("/api/subjects")
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (json?.data?.subjects && json.data.subjects.length > 0) {
          setSubjects(json.data.subjects);
          setSelectedSubject(json.data.subjects[0].name);
        }
      })
      .catch(() => {})
      .finally(() => setLoadingSubjects(false));

    fetch("/api/profile")
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (json?.data?.academicProfile) {
          const ap = json.data.academicProfile;
          if (ap.educationType) setAcademicLevel(ap.educationType);
          if (ap.gradeLevel) setGradeLevel(ap.gradeLevel);
          if (ap.stream) setStream(ap.stream);
          if (ap.competitiveExam) setCompetitiveExam(ap.competitiveExam);
          if (ap.diplomaBranch) setDiplomaBranch(ap.diplomaBranch);
        }
      })
      .catch(() => {});
  }, []);

  const handleStartExam = async () => {
    if (!selectedSubject) {
      showToast("Select Subject", "Please select a subject to begin your free exam.", "info");
      return;
    }

    setGenerating(true);
    try {
      const res = await fetch("/api/exam/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: selectedSubject,
          difficulty,
          count: questionCount,
          academicLevel,
          gradeLevel: academicLevel === "SCHOOL" ? gradeLevel : undefined,
          stream: academicLevel === "SCHOOL" && isSeniorSecondaryGrade(gradeLevel) ? stream : undefined,
          competitiveExam: academicLevel === "SCHOOL" && isSeniorSecondaryGrade(gradeLevel) ? competitiveExam : undefined,
          diplomaBranch: academicLevel === "DIPLOMA" ? diplomaBranch : undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to generate exam.");

      setExamId(json.data.examId);
      setQuestions(json.data.questions);
      setCurrentQuestionIndex(0);
      setUserAnswers({});
      setStep("TAKING");
    } catch (err: any) {
      showToast("Exam Error", err.message || "Unable to start exam. Please try again.", "error");
    } finally {
      setGenerating(false);
    }
  };

  const handleSelectAnswer = (optionKey: "A" | "B" | "C" | "D") => {
    const currentQ = questions[currentQuestionIndex];
    if (!currentQ) return;
    setUserAnswers((prev) => ({
      ...prev,
      [currentQ.id]: optionKey,
    }));
  };

  const handleSubmitExam = async () => {
    const answeredCount = Object.keys(userAnswers).length;
    if (answeredCount < questions.length) {
      const confirmSubmit = window.confirm(
        `You have answered ${answeredCount} of ${questions.length} questions. Do you want to submit anyway?`
      );
      if (!confirmSubmit) return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/exam/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          examId,
          answers: userAnswers,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to grade exam.");

      setResult(json.data);
      setStep("RESULT");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err: any) {
      showToast("Submission Error", err.message || "Unable to grade exam.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRetake = () => {
    setStep("SETUP");
    setResult(null);
    setUserAnswers({});
    setQuestions([]);
    setCurrentQuestionIndex(0);
  };

  const currentQ = questions[currentQuestionIndex];
  const progressPercent = questions.length > 0 ? ((currentQuestionIndex + 1) / questions.length) * 100 : 0;
  const answeredCount = Object.keys(userAnswers).length;

  return (
    <div data-theme="learner" className="min-h-screen flex flex-col bg-[#F0FAF5]/40 relative overflow-hidden font-sans text-slate-900">
      <FloatingNavbar variant="student" />

      <main className="flex-1 pt-32 sm:pt-36 pb-24 max-w-4xl mx-auto px-4 sm:px-6 w-full">
        {/* ========================================================================= */}
        {/* STEP 1: EXAM SETUP */}
        {/* ========================================================================= */}
        {step === "SETUP" && (
          <div className="space-y-8 animate-in fade-in duration-300">
            {/* Header */}
            <div className="text-center max-w-2xl mx-auto space-y-3">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-black uppercase tracking-wider">
                <Sparkles className="h-3.5 w-3.5 text-[#16805B]" />
                <span>EduConnects Free Skill Test</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
                Take a Free Exam
              </h1>
              <p className="text-sm text-slate-600 leading-relaxed font-normal">
                Assess your current subject proficiency with instant objective-style questions, understand your key strengths, and discover verified educators tailored to your learning goals.
              </p>
            </div>

            {/* Setup Card */}
            <div className="p-7 sm:p-9 rounded-3xl bg-white border border-slate-200/90 shadow-xl space-y-6">
              {/* Subject Selection */}
              <div className="space-y-3">
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center justify-between">
                  <span>1. Choose Subject</span>
                  <span className="text-[11px] text-[#16805B] font-normal">
                    {subjects.length} Subjects Available
                  </span>
                </label>

                {loadingSubjects ? (
                  <div className="p-6 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-[#16805B]" />
                    <span>Loading platform subjects...</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {subjects.map((sub) => {
                      const isSelected = selectedSubject === sub.name;
                      return (
                        <button
                          key={sub.id}
                          type="button"
                          onClick={() => setSelectedSubject(sub.name)}
                          className={`p-3.5 rounded-2xl border text-left transition-all ${
                            isSelected
                              ? "bg-emerald-50/90 border-[#16805B] text-emerald-950 shadow-sm ring-1 ring-[#16805B]"
                              : "bg-slate-50/60 border-slate-200 hover:border-slate-300 text-slate-800"
                          }`}
                        >
                          <div className="font-bold text-xs">{sub.name}</div>
                          {sub.description && (
                            <div className="text-[10px] text-slate-500 truncate mt-0.5">
                              {sub.description}
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Academic Target / Syllabus Selection */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <GraduationCap className="w-4 h-4 text-[#16805B]" /> 2. Academic Focus (Optional)
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "ALL", label: "General Level" },
                    { id: "SCHOOL", label: "School Education" },
                    { id: "DIPLOMA", label: "Diploma Studies" },
                  ].map((lvl) => (
                    <button
                      key={lvl.id}
                      type="button"
                      onClick={() => setAcademicLevel(lvl.id as any)}
                      className={`py-2 px-2.5 rounded-xl border text-xs font-bold text-center transition-all ${
                        academicLevel === lvl.id
                          ? "bg-emerald-50 border-[#16805B] text-[#16805B] ring-1 ring-[#16805B]"
                          : "bg-white text-slate-700 border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      {lvl.label}
                    </button>
                  ))}
                </div>

                {academicLevel === "SCHOOL" && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Grade Level</label>
                      <select
                        value={gradeLevel}
                        onChange={(e) => setGradeLevel(e.target.value)}
                        className="w-full text-xs h-9 px-2.5 rounded-xl border border-slate-200 bg-white font-medium"
                      >
                        {SCHOOL_GRADES.map((g) => (
                          <option key={g.value} value={g.value}>{g.label}</option>
                        ))}
                      </select>
                    </div>

                    {isSeniorSecondaryGrade(gradeLevel) && (
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Stream</label>
                        <select
                          value={stream}
                          onChange={(e) => setStream(e.target.value)}
                          className="w-full text-xs h-9 px-2.5 rounded-xl border border-slate-200 bg-white font-medium"
                        >
                          {SENIOR_SECONDARY_STREAMS.map((s) => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    {isSeniorSecondaryGrade(gradeLevel) && (
                      <div className="sm:col-span-2">
                        <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Target Exam (Optional)</label>
                        <select
                          value={competitiveExam}
                          onChange={(e) => setCompetitiveExam(e.target.value)}
                          className="w-full text-xs h-9 px-2.5 rounded-xl border border-slate-200 bg-white font-medium"
                        >
                          <option value="">General School Curriculum</option>
                          {COMPETITIVE_EXAMS.map((x) => (
                            <option key={x} value={x}>{x}</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                )}

                {academicLevel === "DIPLOMA" && (
                  <div className="pt-1">
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Diploma Branch</label>
                    <select
                      value={diplomaBranch}
                      onChange={(e) => setDiplomaBranch(e.target.value)}
                      className="w-full text-xs h-9 px-2.5 rounded-xl border border-slate-200 bg-white font-medium"
                    >
                      {DIPLOMA_BRANCHES.map((b) => (
                        <option key={b} value={b}>{b}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Difficulty Selection */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                  3. Select Difficulty Level
                </label>
                <div className="grid grid-cols-3 gap-2.5">
                  {(["Beginner", "Intermediate", "Advanced"] as const).map((lvl) => {
                    const isSelected = difficulty === lvl;
                    return (
                      <button
                        key={lvl}
                        type="button"
                        onClick={() => setDifficulty(lvl)}
                        className={`py-2.5 px-3 rounded-xl border text-xs font-bold text-center transition-all ${
                          isSelected
                            ? "bg-[#16805B] text-white border-[#16805B] shadow-xs"
                            : "bg-white text-slate-700 border-slate-200 hover:border-slate-300"
                        }`}
                      >
                        {lvl}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Question Count Selection */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                  4. Question Count
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  {[5, 10].map((num) => {
                    const isSelected = questionCount === num;
                    return (
                      <button
                        key={num}
                        type="button"
                        onClick={() => setQuestionCount(num)}
                        className={`py-2 px-3 rounded-xl border text-xs font-bold text-center transition-all ${
                          isSelected
                            ? "bg-[#16805B] text-white border-[#16805B] shadow-xs"
                            : "bg-white text-slate-700 border-slate-200 hover:border-slate-300"
                        }`}
                      >
                        {num} Questions ({num * 2} mins)
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleStartExam}
                  disabled={generating || !selectedSubject}
                  className="w-full h-12 bg-[#16805B] hover:bg-[#0D5C41] text-white text-sm font-black rounded-2xl shadow-lg shadow-[#16805B]/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {generating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Generating Objective Exam...</span>
                    </>
                  ) : (
                    <>
                      <span>Start Free Exam Now</span>
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
                <p className="text-[11px] text-slate-500 text-center mt-2.5">
                  100% Free • Objective Multiple Choice • Instant Results
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 2: TAKING EXAM */}
        {/* ========================================================================= */}
        {step === "TAKING" && currentQ && (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* Top Toolbar */}
            <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-sm flex items-center justify-between gap-4">
              <div>
                <span className="text-[10px] font-black uppercase text-[#16805B] tracking-wider">
                  {selectedSubject} • {difficulty}
                </span>
                <div className="text-sm font-black text-slate-900">
                  Question {currentQuestionIndex + 1} of {questions.length}
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
                <Target className="h-4 w-4 text-[#16805B]" />
                <span>
                  {answeredCount}/{questions.length} Answered
                </span>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#16805B] transition-all duration-300 rounded-full"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            {/* Question Navigation Palette */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {questions.map((q, idx) => {
                const isCurrent = idx === currentQuestionIndex;
                const isAnswered = !!userAnswers[q.id];
                return (
                  <button
                    key={q.id}
                    type="button"
                    onClick={() => setCurrentQuestionIndex(idx)}
                    className={`w-8 h-8 rounded-xl text-xs font-bold transition-all ${
                      isCurrent
                        ? "bg-[#16805B] text-white shadow-sm ring-2 ring-emerald-400"
                        : isAnswered
                        ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                        : "bg-white text-slate-700 border border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>

            {/* Question Card */}
            <div className="p-7 sm:p-9 rounded-3xl bg-white border border-slate-200/90 shadow-xl space-y-6">
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Question {currentQ.questionNumber}
                </span>
                <h2 className="text-lg sm:text-xl font-black text-slate-900 leading-snug">
                  {currentQ.question}
                </h2>
              </div>

              {/* 4 Options */}
              <div className="space-y-3">
                {currentQ.options.map((opt) => {
                  const isSelected = userAnswers[currentQ.id] === opt.key;
                  return (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => handleSelectAnswer(opt.key)}
                      className={`w-full p-4 rounded-2xl border text-left transition-all flex items-center gap-3.5 cursor-pointer ${
                        isSelected
                          ? "bg-emerald-50/90 border-[#16805B] shadow-xs ring-1 ring-[#16805B]"
                          : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50"
                      }`}
                    >
                      <div
                        className={`w-7 h-7 rounded-xl flex items-center justify-center font-black text-xs shrink-0 transition-colors ${
                          isSelected
                            ? "bg-[#16805B] text-white"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {opt.key}
                      </div>
                      <span className="text-xs sm:text-sm font-semibold text-slate-800 leading-relaxed">
                        {opt.text}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Navigation Controls */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setCurrentQuestionIndex((prev) => Math.max(0, prev - 1))}
                  disabled={currentQuestionIndex === 0}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-30 disabled:pointer-events-none transition-colors flex items-center gap-1.5"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  <span>Previous</span>
                </button>

                {currentQuestionIndex < questions.length - 1 ? (
                  <button
                    type="button"
                    onClick={() => setCurrentQuestionIndex((prev) => prev + 1)}
                    className="px-5 py-2.5 rounded-xl bg-[#16805B] hover:bg-[#0D5C41] text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
                  >
                    <span>Next Question</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleSubmitExam}
                    disabled={submitting}
                    className="px-6 py-2.5 rounded-xl bg-[#16805B] hover:bg-[#0D5C41] text-white text-xs font-black transition-all shadow-md shadow-[#16805B]/20 flex items-center gap-1.5"
                  >
                    {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    <span>Submit Exam</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 3: EXAM RESULTS & REVIEW */}
        {/* ========================================================================= */}
        {step === "RESULT" && result && (
          <div className="space-y-8 animate-in fade-in duration-300">
            {/* Score Banner Card */}
            <div className="p-8 sm:p-10 rounded-3xl bg-white border border-slate-200/90 shadow-xl space-y-6 text-center">
              <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto text-[#16805B] shadow-sm">
                <Award className="h-8 w-8" />
              </div>

              <div className="space-y-2">
                <span className="text-xs font-black uppercase text-[#16805B] tracking-wider">
                  Test Results • {result.subject}
                </span>
                <h1 className="text-4xl sm:text-5xl font-black text-slate-900 tracking-tight">
                  Your {result.subject} score: {result.scorePercentage}%
                </h1>
                <p className="text-sm text-slate-600 max-w-xl mx-auto font-normal leading-relaxed">
                  {result.performanceSummary}
                </p>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-3 gap-3 max-w-md mx-auto pt-2">
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
                  <div className="text-xl font-black text-slate-900">{result.totalQuestions}</div>
                  <div className="text-[10px] text-slate-500 font-bold uppercase">Total</div>
                </div>
                <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-700">
                  <div className="text-xl font-black">{result.correctCount}</div>
                  <div className="text-[10px] font-bold uppercase">Correct</div>
                </div>
                <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-100 text-rose-700">
                  <div className="text-xl font-black">{result.incorrectCount}</div>
                  <div className="text-[10px] font-bold uppercase">Incorrect</div>
                </div>
              </div>

              {/* Recommended Next Step Box */}
              <div className="p-5 rounded-2xl bg-emerald-50/80 border border-emerald-200/80 text-left space-y-3">
                <div className="flex items-center gap-2 text-xs font-black text-emerald-950 uppercase tracking-wider">
                  <GraduationCap className="h-4 w-4 text-[#16805B]" />
                  <span>Recommended Next Step</span>
                </div>
                <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-medium">
                  {result.recommendedNextStep}
                </p>
                <div>
                  <Link
                    href={result.findTeachersUrl}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-[#16805B] hover:bg-[#0D5C41] text-white text-xs font-black rounded-xl shadow-sm transition-all"
                  >
                    <span>Find Verified {result.subject} Educators</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>

              {/* Retake Button */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleRetake}
                  className="text-xs font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1.5 mx-auto transition-colors"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>Take Another Free Exam</span>
                </button>
              </div>
            </div>

            {/* Detailed Question Review */}
            <div className="space-y-4">
              <h2 className="text-lg font-black text-slate-900">Detailed Answer Review</h2>

              <div className="space-y-4">
                {result.review.map((item) => (
                  <div
                    key={item.id}
                    className={`p-6 rounded-3xl bg-white border shadow-xs space-y-4 ${
                      item.isCorrect ? "border-emerald-200" : "border-rose-200"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2">
                        {item.isCorrect ? (
                          <div className="flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                            <CheckCircle2 className="h-3.5 w-3.5" /> Correct
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-xs font-bold text-rose-700 bg-rose-100 px-2.5 py-0.5 rounded-full">
                            <XCircle className="h-3.5 w-3.5" /> Incorrect
                          </div>
                        )}
                        <span className="text-xs font-bold text-slate-400">
                          Q{item.questionNumber}
                        </span>
                      </div>
                    </div>

                    <h3 className="text-sm font-bold text-slate-900 leading-snug">
                      {item.question}
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      {item.options.map((opt) => {
                        const isSelected = item.selectedAnswer === opt.key;
                        const isCorrectKey = item.correctAnswer === opt.key;
                        return (
                          <div
                            key={opt.key}
                            className={`p-3 rounded-xl border flex items-center gap-2.5 ${
                              isCorrectKey
                                ? "bg-emerald-50 border-emerald-300 text-emerald-900 font-bold"
                                : isSelected
                                ? "bg-rose-50 border-rose-300 text-rose-900"
                                : "bg-slate-50/50 border-slate-200 text-slate-600"
                            }`}
                          >
                            <span className="font-mono font-black">{opt.key}.</span>
                            <span>{opt.text}</span>
                            {isCorrectKey && (
                              <span className="ml-auto text-[10px] font-black text-emerald-700 uppercase">
                                Correct
                              </span>
                            )}
                            {isSelected && !isCorrectKey && (
                              <span className="ml-auto text-[10px] font-black text-rose-700 uppercase">
                                Your Choice
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {item.explanation && (
                      <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-600 space-y-1">
                        <span className="font-bold text-slate-700 block text-[11px] uppercase">
                          Explanation:
                        </span>
                        <p className="leading-relaxed">{item.explanation}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      <PremiumFooter />
    </div>
  );
}
