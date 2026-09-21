"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { GlassCard } from "@/components/glass/glass-card";
import { GlassBadge } from "@/components/glass/glass-badge";
import { GlassButton } from "@/components/glass/glass-button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { RegistrationCaptcha } from "@/components/auth/registration-captcha";
import { formatCurrency } from "@/lib/currency";
import { extractOtpDigits } from "@/lib/auth/otp-utils";
import {
  User,
  Mail,
  Phone,
  Lock,
  BookOpen,
  GraduationCap,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  CreditCard,
  Sparkles,
  ShieldCheck,
  RotateCcw,
  Search,
  Star,
  Clock,
  Video,
  Check,
  LayoutDashboard,
} from "lucide-react";
import {
  LearnerAcademicFields,
  AcademicFieldsState,
} from "@/components/learner/learner-academic-fields";

interface FlowState {
  step: number;
  fullName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  academic: AcademicFieldsState;
  captchaToken: string;
  captchaAnswer: string;
  otp: string;
  otpSent: boolean;
  otpCooldown: number;
  selectionType: "COURSE" | "EDUCATOR";
  selectedCourseId: string | null;
  selectedCourse: any | null;
  selectedEducatorId: string | null;
  selectedEducator: any | null;
  selectedDate: string;
  selectedSlotTime: string;
  selectedSlotId: string | null;
  isTrial: boolean;
  orderData: any | null;
  paymentLoading: boolean;
  paymentError: string | null;
  activeEnrollmentNotice: string | null;
  transactionData: any | null;
}

const STORAGE_KEY = "educonnects_learner_flow_state";

const AVAILABLE_TIME_SLOTS = [
  "09:00 AM - 10:00 AM",
  "11:00 AM - 12:00 PM",
  "02:00 PM - 03:00 PM",
  "04:00 PM - 05:00 PM",
  "06:00 PM - 07:00 PM",
  "08:00 PM - 09:00 PM",
];

function getUpcomingDates() {
  const dates = [];
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  
  for (let i = 1; i <= 5; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    const dayName = i === 1 ? "Tomorrow" : days[d.getDay()];
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const displayDate = `${months[d.getMonth()]} ${d.getDate()}`;
    dates.push({ dayName, dateStr, displayDate });
  }
  return dates;
}

const STEPS = [
  { number: 1, label: "Learner Info" },
  { number: 2, label: "Choose Program" },
  { number: 3, label: "Review" },
  { number: 4, label: "Payment" },
  { number: 5, label: "Verification" },
  { number: 6, label: "Account Setup" },
  { number: 7, label: "Ready" },
];

function LearnerRegistrationFlowContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();

  const [state, setState] = useState<FlowState>({
    step: 1,
    fullName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    academic: {
      educationType: "SCHOOL",
      gradeLevel: "Grade 10",
      stream: "",
      competitiveExam: "",
      diplomaBranch: "",
    },
    captchaToken: "",
    captchaAnswer: "",
    otp: "",
    otpSent: false,
    otpCooldown: 0,
    selectionType: "COURSE",
    selectedCourseId: null,
    selectedCourse: null,
    selectedEducatorId: null,
    selectedEducator: null,
    selectedDate: getUpcomingDates()[0].dateStr,
    selectedSlotTime: AVAILABLE_TIME_SLOTS[0],
    selectedSlotId: null,
    isTrial: false,
    orderData: null,
    paymentLoading: false,
    paymentError: null,
    activeEnrollmentNotice: null,
    transactionData: null,
  });

  const [loadingInitial, setLoadingInitial] = useState(true);
  const [coursesList, setCoursesList] = useState<any[]>([]);
  const [educatorsList, setEducatorsList] = useState<any[]>([]);
  const [loadingCatalog, setLoadingCatalog] = useState(false);
  const [courseSearch, setCourseSearch] = useState("");
  const [educatorSearch, setEducatorSearch] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("ALL");
  const [submittingStep1, setSubmittingStep1] = useState(false);
  const [submittingOtp, setSubmittingOtp] = useState(false);
  const [isUserLoggedIn, setIsUserLoggedIn] = useState(false);
  const [educatorAvailability, setEducatorAvailability] = useState<any>(null);
  const [loadingAvailability, setLoadingAvailability] = useState(false);

  // Restore state from sessionStorage or URL query parameters on mount
  useEffect(() => {
    const courseId = searchParams.get("courseId");
    const educatorId = searchParams.get("educatorId");
    const trial = searchParams.get("trial") === "true";
    const orderId = searchParams.get("order_id") || searchParams.get("orderId");
    const stepParam = searchParams.get("step");

    let savedState: Partial<FlowState> = {};
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      if (stored) {
        savedState = JSON.parse(stored);
      }
    } catch {}

    // Check if user is already authenticated
    fetch("/api/auth/me", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (json?.data?.user) {
          const u = json.data.user;
          setIsUserLoggedIn(true);
          const fullName = [u.firstName, u.lastName].filter(Boolean).join(" ") || u.name || "";
          setState((prev) => ({
            ...prev,
            fullName: fullName || prev.fullName,
            email: u.email || prev.email,
            phone: u.phone || prev.phone,
            // If already logged in, they can advance beyond step 1
            step: prev.step === 1 ? 2 : prev.step,
          }));
        }
      })
      .catch(() => {})
      .finally(() => setLoadingInitial(false));

    setState((prev) => ({
      ...prev,
      ...savedState,
      selectedCourseId: courseId || savedState.selectedCourseId || prev.selectedCourseId,
      selectedEducatorId: educatorId || savedState.selectedEducatorId || prev.selectedEducatorId,
      isTrial: trial || savedState.isTrial || prev.isTrial,
      selectionType: educatorId ? "EDUCATOR" : courseId ? "COURSE" : savedState.selectionType || "COURSE",
      step: orderId ? 5 : stepParam ? parseInt(stepParam, 10) : savedState.step || prev.step,
    }));
  }, [searchParams]);

  // Persist state changes in sessionStorage
  useEffect(() => {
    try {
      sessionStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          step: state.step,
          fullName: state.fullName,
          email: state.email,
          phone: state.phone,
          selectionType: state.selectionType,
          selectedCourseId: state.selectedCourseId,
          selectedCourse: state.selectedCourse,
          selectedEducatorId: state.selectedEducatorId,
          selectedEducator: state.selectedEducator,
          isTrial: state.isTrial,
          orderData: state.orderData,
        })
      );
    } catch {}
  }, [state]);

  // OTP countdown timer
  useEffect(() => {
    if (state.otpCooldown <= 0) return;
    const t = setInterval(() => {
      setState((prev) => ({ ...prev, otpCooldown: Math.max(0, prev.otpCooldown - 1) }));
    }, 1000);
    return () => clearInterval(t);
  }, [state.otpCooldown]);

  // Fetch courses and educators for selection
  useEffect(() => {
    async function loadCatalog() {
      setLoadingCatalog(true);
      try {
        const [cRes, tRes] = await Promise.all([
          fetch("/api/courses?limit=20"),
          fetch("/api/teachers?limit=20&sortBy=rating"),
        ]);
        const cJson = await cRes.json();
        const tJson = await tRes.json();
        if (cJson.success && cJson.data?.courses) {
          setCoursesList(cJson.data.courses);
        }
        if (tJson.success && tJson.data?.teachers) {
          setEducatorsList(tJson.data.teachers);
        }
      } catch (err) {
        console.error("Failed to load catalog:", err);
      } finally {
        setLoadingCatalog(false);
      }
    }
    loadCatalog();
  }, []);

  // Hydrate selected course object if ID is present
  useEffect(() => {
    if (state.selectedCourseId && !state.selectedCourse) {
      fetch(`/api/courses/${state.selectedCourseId}`)
        .then((r) => r.json())
        .then((d) => {
          if (d.success && d.data?.course) {
            setState((prev) => ({ ...prev, selectedCourse: d.data.course }));
          }
        })
        .catch(() => {
          const found = coursesList.find((c) => c.id === state.selectedCourseId);
          if (found) setState((prev) => ({ ...prev, selectedCourse: found }));
        });
    }
  }, [state.selectedCourseId, coursesList, state.selectedCourse]);

  // Hydrate selected educator object if ID is present
  useEffect(() => {
    if (state.selectedEducatorId && !state.selectedEducator) {
      fetch(`/api/teachers/${state.selectedEducatorId}`)
        .then((r) => r.json())
        .then((d) => {
          if (d.success && d.data?.teacher) {
            setState((prev) => ({
              ...prev,
              selectedEducator: d.data.teacher,
            }));
          }
        })
        .catch(() => {
          const found = educatorsList.find((t) => t.id === state.selectedEducatorId);
          if (found) setState((prev) => ({ ...prev, selectedEducator: found }));
        });
    }
  }, [state.selectedEducatorId, educatorsList, state.selectedEducator]);

  // Dynamically fetch educator live availability when an educator is selected
  useEffect(() => {
    const targetTeacherId = state.selectedEducatorId || state.selectedEducator?.id;
    if (targetTeacherId) {
      setLoadingAvailability(true);
      fetch(`/api/teachers/${targetTeacherId}/availability`)
        .then((r) => r.json())
        .then((d) => {
          if (d.success && d.data) {
            setEducatorAvailability(d.data);
            const firstAvailDate = d.data.dates?.find(
              (dt: any) => dt.isAvailableDay && dt.slots?.some((s: any) => s.isAvailable)
            );
            if (firstAvailDate) {
              const firstAvailSlot = firstAvailDate.slots.find((s: any) => s.isAvailable);
              setState((prev) => ({
                ...prev,
                selectedDate: firstAvailDate.dateStr,
                selectedSlotTime: firstAvailSlot ? firstAvailSlot.time : prev.selectedSlotTime,
                selectedSlotId: firstAvailSlot ? firstAvailSlot.slotId : null,
              }));
            }
          }
        })
        .catch((err) => console.error("Failed to fetch educator availability:", err))
        .finally(() => setLoadingAvailability(false));
    }
  }, [state.selectedEducatorId, state.selectedEducator?.id]);

  // If order_id is present on URL on mount (e.g. Cashfree return redirect), auto-verify
  useEffect(() => {
    const orderId = searchParams.get("order_id") || searchParams.get("orderId");
    if (orderId && state.step === 5) {
      handleVerifyPayment(orderId);
    }
  }, [searchParams, state.step]);

  // Handle Step 1 Submit (Registration & OTP Dispatch)
  const handleStep1Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingStep1(true);

    // Form validations
    if (!state.fullName.trim() || state.fullName.trim().length < 2) {
      showToast("Validation Error", "Please enter your full name.", "error");
      setSubmittingStep1(false);
      return;
    }
    if (!state.email.trim() || !/\S+@\S+\.\S+/.test(state.email)) {
      showToast("Validation Error", "Please enter a valid email address.", "error");
      setSubmittingStep1(false);
      return;
    }
    const cleanPhone = state.phone.replace(/\D/g, "");
    if (cleanPhone.length !== 10) {
      showToast("Validation Error", "Please enter a valid 10-digit mobile number.", "error");
      setSubmittingStep1(false);
      return;
    }
    if (state.password.length < 8 || !/[A-Z]/.test(state.password) || !/[0-9]/.test(state.password)) {
      showToast(
        "Validation Error",
        "Password must be at least 8 characters and contain at least 1 uppercase letter and 1 number.",
        "error"
      );
      setSubmittingStep1(false);
      return;
    }
    if (state.password !== state.confirmPassword) {
      showToast("Validation Error", "Password and Confirm Password do not match.", "error");
      setSubmittingStep1(false);
      return;
    }
    if (!state.captchaAnswer.trim()) {
      showToast("Security Check Required", "Please complete the security CAPTCHA.", "error");
      setSubmittingStep1(false);
      return;
    }

    try {
      const parts = state.fullName.trim().split(" ");
      const firstName = parts[0];
      const lastName = parts.slice(1).join(" ") || "Learner";

      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName,
          lastName,
          email: state.email.trim().toLowerCase(),
          phone: cleanPhone,
          password: state.password,
          role: "STUDENT",
          captchaToken: state.captchaToken,
          captchaAnswer: state.captchaAnswer,
          educationType: state.academic.educationType,
          gradeLevel: state.academic.educationType === "SCHOOL" ? state.academic.gradeLevel : undefined,
          stream: state.academic.educationType === "SCHOOL" ? state.academic.stream : undefined,
          competitiveExam: state.academic.educationType === "SCHOOL" ? state.academic.competitiveExam : undefined,
          diplomaBranch: state.academic.educationType === "DIPLOMA" ? state.academic.diplomaBranch : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Registration failed. Please check your information.");
      }

      showToast("Verification Code Sent!", "Please check your email for the 6-digit OTP code.", "info");
      setState((prev) => ({
        ...prev,
        otpSent: true,
        otpCooldown: 60,
      }));
    } catch (err: any) {
      showToast("Registration Notice", err.message, "error");
    } finally {
      setSubmittingStep1(false);
    }
  };

  // Handle Resend OTP
  const handleResendOtp = async () => {
    if (state.otpCooldown > 0) return;
    try {
      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: state.email.trim().toLowerCase() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not resend OTP.");
      showToast("Code Sent!", "A new verification code has been dispatched to your email.", "success");
      setState((prev) => ({ ...prev, otpCooldown: 60 }));
    } catch (err: any) {
      showToast("Resend Error", err.message, "error");
    }
  };

  // Handle OTP Verification
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!state.otp.trim() || state.otp.trim().length !== 6) {
      showToast("Validation Error", "Please enter the complete 6-digit verification code.", "error");
      return;
    }
    setSubmittingOtp(true);
    try {
      const res = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: state.email.trim().toLowerCase(),
          otp: state.otp.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Invalid verification code.");
      }

      setIsUserLoggedIn(true);
      showToast("Email Verified!", "Your learner account credentials are confirmed.", "success");

      // Advance to Step 2 (or Step 3 if program is already selected)
      const hasProgram = state.selectedCourseId || state.selectedEducatorId;
      setState((prev) => ({
        ...prev,
        step: hasProgram ? 3 : 2,
      }));
    } catch (err: any) {
      showToast("Verification Error", err.message, "error");
    } finally {
      setSubmittingOtp(false);
    }
  };

  // Cashfree SDK loader helper
  const loadCashfreeSdk = (): Promise<any> => {
    return new Promise((resolve, reject) => {
      if ((window as any).Cashfree) {
        resolve((window as any).Cashfree);
        return;
      }
      const script = document.createElement("script");
      script.src = "https://sdk.cashfree.com/js/v3/cashfree.js";
      script.async = true;
      script.onload = () => {
        if ((window as any).Cashfree) resolve((window as any).Cashfree);
        else reject(new Error("Cashfree SDK failed to initialize."));
      };
      script.onerror = () => reject(new Error("Failed to load Cashfree checkout SDK."));
      document.body.appendChild(script);
    });
  };

  // Trigger Step 4 Payment
  const handleInitiatePayment = async () => {
    setState((prev) => ({
      ...prev,
      step: 4,
      paymentLoading: true,
      paymentError: null,
      activeEnrollmentNotice: null,
    }));

    try {
      let payload: any;

      if (state.selectionType === "EDUCATOR" || state.isTrial) {
        const targetTeacherId = state.selectedEducator?.id || state.selectedEducatorId;
        if (!targetTeacherId) {
          throw new Error("BAD_REQUEST: Please select an educator before booking.");
        }
        payload = {
          type: "LIVE_CLASS_BOOKING",
          teacherId: targetTeacherId,
          liveClassSlotId: state.selectedSlotId || undefined,
          selectedDate: state.selectedDate,
          selectedSlotTime: state.selectedSlotTime,
        };
      } else {
        const targetCourseId = state.selectedCourseId || state.selectedCourse?.id;
        if (!targetCourseId) {
          throw new Error("BAD_REQUEST: courseId is required for course enrollment.");
        }
        payload = {
          type: "COURSE_ENROLLMENT",
          courseId: targetCourseId,
        };
      }

      const res = await fetch("/api/payments/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        const errMsg = data.error || "Failed to create payment order.";
        if (
          errMsg.includes("DUPLICATE_PURCHASE") ||
          errMsg.toLowerCase().includes("already enrolled in this course")
        ) {
          setState((prev) => ({
            ...prev,
            paymentLoading: false,
            activeEnrollmentNotice:
              "You are already enrolled in this course.",
          }));
          return;
        }
        throw new Error(errMsg);
      }

      // 1. FREE PRODUCT (price === 0)
      if (data.data?.isFree) {
        setState((prev) => ({
          ...prev,
          orderData: data.data,
          step: 6,
          paymentLoading: false,
        }));
        setTimeout(() => {
          setState((prev) => ({ ...prev, step: 7 }));
        }, 1500);
        return;
      }

      // 2. PAID PRODUCT -> Launch Cashfree PG
      const order = data.data;
      setState((prev) => ({ ...prev, orderData: order }));

      const isProd = order.env === "PRODUCTION";
      const isMockSession = order.paymentSessionId?.startsWith("session_");

      if (order.paymentSessionId && (isProd || !isMockSession)) {
        const Cashfree = await loadCashfreeSdk();
        const cashfree = Cashfree({ mode: isProd ? "production" : "sandbox" });
        const returnUrl = `${window.location.origin}/student/register?order_id=${encodeURIComponent(order.cfOrderId || order.internalReference)}&step=5`;

        await cashfree.checkout({
          paymentSessionId: order.paymentSessionId,
          returnUrl,
        });
      } else {
        // Dev/Mock verification fallback
        handleVerifyPayment(order.cfOrderId || order.internalReference);
      }
    } catch (err: any) {
      setState((prev) => ({
        ...prev,
        paymentLoading: false,
        paymentError: err.message || "Payment initiation error. Please try again.",
      }));
    }
  };

  // Handle Step 5 Payment Verification
  const handleVerifyPayment = async (orderIdToVerify?: string) => {
    const orderId = orderIdToVerify || state.orderData?.cfOrderId || state.orderData?.internalReference;
    if (!orderId) return;

    setState((prev) => ({
      ...prev,
      step: 5,
      paymentLoading: true,
      paymentError: null,
    }));

    try {
      const res = await fetch("/api/payments/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          order_id: orderId,
          cf_payment_id: `cf_pay_${Date.now()}`,
          payment_status: "SUCCESS",
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Server-side payment verification failed.");
      }

      setState((prev) => ({
        ...prev,
        transactionData: data.data,
        step: 6,
        paymentLoading: false,
      }));

      // Auto advance to Step 7 (Ready Screen)
      setTimeout(() => {
        setState((prev) => ({ ...prev, step: 7 }));
      }, 1200);
    } catch (err: any) {
      setState((prev) => ({
        ...prev,
        paymentLoading: false,
        paymentError: err.message || "Could not verify payment with Cashfree. Please retry verification.",
      }));
    }
  };

  // Filter courses for step 2
  const filteredCourses = coursesList.filter((c) => {
    const matchSearch =
      !courseSearch.trim() ||
      c.title?.toLowerCase().includes(courseSearch.toLowerCase()) ||
      c.subject?.toLowerCase().includes(courseSearch.toLowerCase());
    const matchSubject = selectedSubject === "ALL" || c.subject?.toLowerCase() === selectedSubject.toLowerCase();
    return matchSearch && matchSubject;
  });

  // Filter educators for step 2
  const filteredEducators = educatorsList.filter((e) => {
    return (
      !educatorSearch.trim() ||
      e.name?.toLowerCase().includes(educatorSearch.toLowerCase()) ||
      e.subjects?.some((s: string) => s.toLowerCase().includes(educatorSearch.toLowerCase()))
    );
  });

  const activePrice = state.selectedCourse ? state.selectedCourse.price : state.isTrial ? (state.selectedEducator?.hourlyRate || 499) : 0;

  if (loadingInitial) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-[#3157D5]/30 border-t-[#3157D5] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto space-y-8 font-sans">
      {/* ========================================================================= */}
      {/* 7-STEP PROGRESS INDICATOR */}
      {/* ========================================================================= */}
      <div className="bg-white/90 backdrop-blur-md p-4 sm:p-5 rounded-3xl border border-slate-200/90 shadow-sm">
        <div className="flex items-center justify-between overflow-x-auto pb-2 sm:pb-0 gap-2">
          {STEPS.map((s, idx) => {
            const isCompleted = state.step > s.number;
            const isCurrent = state.step === s.number;
            return (
              <div key={s.number} className="flex items-center gap-2 shrink-0">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black transition-all ${
                    isCompleted
                      ? "bg-emerald-500 text-white shadow-sm"
                      : isCurrent
                      ? "bg-[#3157D5] text-white shadow-md shadow-[#3157D5]/20 ring-4 ring-[#3157D5]/15"
                      : "bg-slate-100 text-slate-400"
                  }`}
                >
                  {isCompleted ? <Check className="w-4 h-4 stroke-[3]" /> : s.number}
                </div>
                <div className="hidden sm:block text-left">
                  <div
                    className={`text-[11px] font-bold uppercase tracking-wider ${
                      isCurrent ? "text-[#243B9B]" : isCompleted ? "text-emerald-700" : "text-slate-400"
                    }`}
                  >
                    {s.label}
                  </div>
                </div>
                {idx < STEPS.length - 1 && (
                  <div
                    className={`w-4 lg:w-8 h-0.5 rounded-full hidden sm:block ${
                      state.step > s.number ? "bg-emerald-400" : "bg-slate-200"
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* STEP 1: LEARNER INFORMATION */}
      {/* ========================================================================= */}
      {state.step === 1 && (
        <GlassCard glowColor="rgba(49, 87, 213, 0.15)" className="p-7 sm:p-10 border border-white/90 shadow-xl space-y-6">
          <div className="text-center sm:text-left space-y-1.5 border-b border-slate-100 pb-5">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#3157D5]/10 text-[#3157D5] text-xs font-bold uppercase tracking-wider border border-[#3157D5]/20">
              <Sparkles className="w-3.5 h-3.5" /> Step 1 of 7: Learner Profile
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Create Your Learner Account
            </h1>
            <p className="text-xs sm:text-sm text-slate-500">
              Enter your details to begin your personalized learning journey with verified educators.
            </p>
          </div>

          {!state.otpSent ? (
            <form onSubmit={handleStep1Submit} className="space-y-4">
              <Input
                label="Full Name"
                placeholder="e.g. Aarav Sharma"
                value={state.fullName}
                onChange={(e) => setState((p) => ({ ...p, fullName: e.target.value }))}
                required
                leftIcon={<User className="h-4 w-4 text-[#3157D5]" />}
                helperText="Enter your official first and last name"
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Email Address"
                  type="email"
                  placeholder="aarav@example.com"
                  value={state.email}
                  onChange={(e) => setState((p) => ({ ...p, email: e.target.value }))}
                  required
                  leftIcon={<Mail className="h-4 w-4 text-[#3157D5]" />}
                  helperText="Verification code will be sent here"
                />

                <Input
                  label="Mobile Number"
                  type="tel"
                  placeholder="9876543210"
                  value={state.phone}
                  onChange={(e) => setState((p) => ({ ...p, phone: e.target.value }))}
                  required
                  maxLength={10}
                  leftIcon={<Phone className="h-4 w-4 text-[#3157D5]" />}
                  helperText="10-digit Indian mobile number"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Password"
                  type="password"
                  placeholder="••••••••"
                  value={state.password}
                  onChange={(e) => setState((p) => ({ ...p, password: e.target.value }))}
                  required
                  leftIcon={<Lock className="h-4 w-4 text-[#3157D5]" />}
                  helperText="Min. 8 characters, 1 uppercase, 1 number"
                />

                <Input
                  label="Confirm Password"
                  type="password"
                  placeholder="••••••••"
                  value={state.confirmPassword}
                  onChange={(e) => setState((p) => ({ ...p, confirmPassword: e.target.value }))}
                  required
                  leftIcon={<Lock className="h-4 w-4 text-[#3157D5]" />}
                  helperText="Must match your password"
                />
              </div>

              {/* Learner Academic Profile Selection */}
              <div className="pt-1">
                <LearnerAcademicFields
                  value={state.academic}
                  onChange={(academic) => setState((p) => ({ ...p, academic }))}
                  compact
                />
              </div>

              {/* Anti-bot Security CAPTCHA */}
              <RegistrationCaptcha
                onVerifyChange={(token, answer) => {
                  setState((p) => ({ ...p, captchaToken: token, captchaAnswer: answer }));
                }}
              />

              <GlassButton
                type="submit"
                variant="primary"
                className="w-full mt-4 bg-[#3157D5] hover:bg-[#243B9B] border-[#3157D5] shadow-lg shadow-[#3157D5]/20 text-white font-bold py-3.5"
                isLoading={submittingStep1}
                rightIcon={<ArrowRight className="h-4 w-4" />}
              >
                Continue to Email Verification
              </GlassButton>
            </form>
          ) : (
            /* Inline 6-Digit OTP Verification Form */
            <form onSubmit={handleVerifyOtp} className="space-y-5 bg-blue-50/60 p-6 sm:p-8 rounded-3xl border border-blue-200">
              <div className="text-center space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-[#3157D5]/10 text-[#3157D5] flex items-center justify-center mx-auto">
                  <Mail className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">Verify Your Email Address</h3>
                <p className="text-xs text-slate-600 max-w-sm mx-auto">
                  We sent a 6-digit security verification code to{" "}
                  <span className="font-bold text-slate-900">{state.email}</span>.
                </p>
              </div>

              <div className="max-w-xs mx-auto space-y-2">
                <input
                  type="text"
                  maxLength={32}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="[0-9]*"
                  value={state.otp}
                  onChange={(e) => setState((p) => ({ ...p, otp: extractOtpDigits(e.target.value) }))}
                  onPaste={(e) => {
                    e.preventDefault();
                    const pasted = e.clipboardData?.getData("text") || "";
                    setState((p) => ({ ...p, otp: extractOtpDigits(pasted) }));
                  }}
                  placeholder="000000"
                  autoFocus
                  className="w-full text-center tracking-[0.5em] text-2xl font-black h-14 bg-white border-2 border-[#3157D5]/40 rounded-2xl outline-none focus:border-[#3157D5] focus:ring-4 focus:ring-[#3157D5]/10 text-slate-900"
                  required
                />
                <p className="text-[11px] text-center text-slate-500">Enter the 6 digits from your inbox</p>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={state.otpCooldown > 0}
                  className="text-xs font-bold text-[#3157D5] hover:text-[#243B9B] disabled:text-slate-400 flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  {state.otpCooldown > 0 ? `Resend code in ${state.otpCooldown}s` : "Resend verification code"}
                </button>
              </div>

              <GlassButton
                type="submit"
                variant="primary"
                className="w-full bg-[#3157D5] hover:bg-[#243B9B] text-white font-bold py-3.5"
                isLoading={submittingOtp}
                rightIcon={<CheckCircle2 className="h-4 w-4" />}
              >
                Verify Code & Continue
              </GlassButton>
            </form>
          )}

          <div className="pt-4 border-t border-slate-100 text-center text-xs text-slate-500">
            Already registered?{" "}
            <Link href="/student/login" className="font-bold text-[#3157D5] hover:underline">
              Sign in as Learner
            </Link>
          </div>
        </GlassCard>
      )}

      {/* ========================================================================= */}
      {/* STEP 2: CHOOSE WHAT THE LEARNER WANTS (COURSE OR EDUCATOR) */}
      {/* ========================================================================= */}
      {state.step === 2 && (
        <GlassCard glowColor="rgba(49, 87, 213, 0.15)" className="p-7 sm:p-10 border border-white/90 shadow-xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-5">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#3157D5]/10 text-[#3157D5] text-xs font-bold uppercase tracking-wider border border-[#3157D5]/20">
                <BookOpen className="w-3.5 h-3.5" /> Step 2 of 7: Choose Your Program
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mt-1.5">
                Select Your Course or Educator
              </h2>
              <p className="text-xs sm:text-sm text-slate-500">
                Pick an accredited curriculum or book a 1-on-1 trial class with a verified mentor.
              </p>
            </div>

            {/* Switch Mode Pills */}
            <div className="inline-flex p-1 bg-slate-100 rounded-2xl border border-slate-200 shrink-0">
              <button
                type="button"
                onClick={() => setState((p) => ({ ...p, selectionType: "COURSE" }))}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  state.selectionType === "COURSE"
                    ? "bg-[#3157D5] text-white shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                📚 Choose Course
              </button>
              <button
                type="button"
                onClick={() => setState((p) => ({ ...p, selectionType: "EDUCATOR" }))}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  state.selectionType === "EDUCATOR"
                    ? "bg-[#3157D5] text-white shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                👨‍🏫 Choose Educator
              </button>
            </div>
          </div>

          {/* If Course is Pre-selected */}
          {state.selectedCourse && (
            <div className="p-5 rounded-3xl bg-blue-50/70 border-2 border-[#3157D5] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[11px] font-bold">
                  <Check className="w-3 h-3" /> Selected Course
                </span>
                <h3 className="text-lg font-black text-slate-900">{state.selectedCourse.title}</h3>
                <p className="text-xs text-slate-600">
                  Subject: <span className="font-semibold">{state.selectedCourse.subject}</span> • Level: {state.selectedCourse.level || "All Levels"}
                </p>
              </div>
              <div className="text-right shrink-0">
                <div className="text-2xl font-black text-[#243B9B]">
                  {state.selectedCourse.price === 0 ? "FREE" : formatCurrency(state.selectedCourse.price)}
                </div>
                <button
                  type="button"
                  onClick={() => setState((p) => ({ ...p, selectedCourseId: null, selectedCourse: null }))}
                  className="text-xs text-[#3157D5] hover:underline font-semibold"
                >
                  Change Course
                </button>
              </div>
            </div>
          )}

          {/* If Educator is Selected: Show Profile + Date & Time Slot Picker */}
          {state.selectedEducator && (
            <div className="space-y-4">
              <div className="p-5 rounded-3xl bg-indigo-50/70 border-2 border-[#3157D5] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <img
                    src={state.selectedEducator.avatarUrl || "/images/educators/educator_01.jpg"}
                    alt={state.selectedEducator.name}
                    className="w-14 h-14 rounded-2xl object-cover ring-2 ring-[#3157D5]/20 shrink-0"
                  />
                  <div className="space-y-0.5">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[11px] font-bold">
                      <Check className="w-3 h-3" /> Selected Educator
                    </span>
                    <h3 className="text-base font-black text-slate-900">{state.selectedEducator.name}</h3>
                    <p className="text-xs text-slate-600">{state.selectedEducator.headline}</p>
                  </div>
                </div>
                <div className="text-right shrink-0 space-y-1">
                  <div className="text-xl font-black text-[#243B9B]">
                    {formatCurrency(state.selectedEducator.hourlyRate || 499)}/session
                  </div>
                  <button
                    type="button"
                    onClick={() => setState((p) => ({ ...p, selectedEducatorId: null, selectedEducator: null }))}
                    className="text-xs text-[#3157D5] hover:underline font-semibold"
                  >
                    Change Educator
                  </button>
                </div>
              </div>

              {/* Educator Available Date & Time Slot Selector */}
              <div className="p-5 rounded-3xl bg-blue-50/80 border border-blue-200 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-[#3157D5]" /> Select Date & Live Session Slot
                  </h4>
                  <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100/80 px-2.5 py-0.5 rounded-full">
                    1-on-1 Interactive Session
                  </span>
                </div>

                {loadingAvailability ? (
                  <div className="p-6 text-center text-xs text-slate-500 font-semibold animate-pulse">
                    Fetching Educator Live Availability...
                  </div>
                ) : (
                  <>
                    {/* Available Date Pills */}
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Available Dates:</label>
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                        {(educatorAvailability?.dates || getUpcomingDates()).map((d: any) => {
                          const isSelected = state.selectedDate === d.dateStr;
                          const hasAvail = d.isAvailableDay !== false;
                          return (
                            <button
                              key={d.dateStr}
                              type="button"
                              disabled={!hasAvail}
                              onClick={() => {
                                const firstAvailSlot = d.slots?.find((s: any) => s.isAvailable);
                                setState((p) => ({
                                  ...p,
                                  selectedDate: d.dateStr,
                                  selectedSlotTime: firstAvailSlot ? firstAvailSlot.time : p.selectedSlotTime,
                                  selectedSlotId: firstAvailSlot ? firstAvailSlot.slotId : null,
                                }));
                              }}
                              className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all text-center ${
                                !hasAvail
                                  ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-60"
                                  : isSelected
                                  ? "bg-[#3157D5] text-white border-[#3157D5] shadow-sm ring-2 ring-[#3157D5]/20"
                                  : "bg-white text-slate-700 border-slate-200 hover:border-blue-300"
                              }`}
                            >
                              <div>{d.dayName}</div>
                              <div className="text-[10px] opacity-80 font-normal">{d.displayDate}</div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Available Time Slot Pills */}
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        Available Time Slots for {state.selectedDate} (IST):
                      </label>
                      {(() => {
                        const selectedDateObj = educatorAvailability?.dates?.find((d: any) => d.dateStr === state.selectedDate);
                        const availableSlots = selectedDateObj?.slots || AVAILABLE_TIME_SLOTS.map((t) => ({ time: t, isAvailable: true, status: "AVAILABLE" }));

                        if (!availableSlots || availableSlots.length === 0) {
                          return (
                            <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-800 font-semibold text-center">
                              No slots available on this date. Please select another date.
                            </div>
                          );
                        }

                        return (
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {availableSlots.map((slotObj: any) => {
                              const slotLabel = typeof slotObj === "string" ? slotObj : slotObj.time;
                              const isAvail = typeof slotObj === "string" ? true : slotObj.isAvailable;
                              const status = typeof slotObj === "string" ? "AVAILABLE" : slotObj.status;
                              const isSelected = state.selectedSlotTime === slotLabel;

                              return (
                                <button
                                  key={slotLabel}
                                  type="button"
                                  disabled={!isAvail}
                                  onClick={() =>
                                    setState((p) => ({
                                      ...p,
                                      selectedSlotTime: slotLabel,
                                      selectedSlotId: slotObj.slotId || null,
                                    }))
                                  }
                                  className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all text-center flex flex-col items-center justify-center ${
                                    !isAvail
                                      ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
                                      : isSelected
                                      ? "bg-slate-900 text-white border-slate-900 shadow-sm ring-2 ring-slate-900/20"
                                      : "bg-white text-slate-700 border-slate-200 hover:border-slate-400"
                                  }`}
                                >
                                  <div>{slotLabel}</div>
                                  {!isAvail && (
                                    <div className="text-[9px] font-extrabold uppercase text-rose-600 tracking-wider">
                                      {status === "CONFIRMED" ? "BOOKED" : status}
                                    </div>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        );
                      })()}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* COURSE SELECTION CATALOG */}
          {state.selectionType === "COURSE" && !state.selectedCourse && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search courses by topic (e.g. Python, Calculus, NEET)..."
                    value={courseSearch}
                    onChange={(e) => setCourseSearch(e.target.value)}
                    className="w-full h-11 pl-10 pr-4 text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#3157D5]/20 focus:border-[#3157D5]"
                  />
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {["ALL", "Mathematics", "Physics", "Chemistry", "Computer Science"].map((subj) => (
                    <button
                      key={subj}
                      type="button"
                      onClick={() => setSelectedSubject(subj)}
                      className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all ${
                        selectedSubject === subj
                          ? "bg-[#3157D5] text-white"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      {subj}
                    </button>
                  ))}
                </div>
              </div>

              {loadingCatalog ? (
                <div className="p-8 text-center text-xs text-slate-400">Loading published courses...</div>
              ) : filteredCourses.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                  <BookOpen className="w-8 h-8 text-slate-400 mx-auto" />
                  <p className="text-xs text-slate-500 font-semibold">No courses match your filter criteria.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-96 overflow-y-auto pr-1">
                  {filteredCourses.map((c) => {
                    const isSelected = state.selectedCourseId === c.id;
                    return (
                      <div
                        key={c.id}
                        onClick={() => setState((p) => ({ ...p, selectedCourseId: c.id, selectedCourse: c }))}
                        className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between space-y-3 ${
                          isSelected
                            ? "bg-blue-50/80 border-[#3157D5] shadow-md shadow-[#3157D5]/10"
                            : "bg-white border-slate-200 hover:border-blue-300 hover:bg-slate-50/50"
                        }`}
                      >
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between gap-2">
                            <span className="px-2 py-0.5 rounded-md bg-blue-100 text-[#3157D5] text-[10px] font-bold uppercase">
                              {c.subject}
                            </span>
                            <span className="text-xs font-black text-slate-900">
                              {c.price === 0 ? "FREE" : formatCurrency(c.price)}
                            </span>
                          </div>
                          <h4 className="text-sm font-bold text-slate-900 line-clamp-1">{c.title}</h4>
                          <p className="text-xs text-slate-500 line-clamp-2">{c.description}</p>
                        </div>
                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600 font-medium">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-400" /> {c.durationHours || 12}h lessons
                          </span>
                          <span className={`font-bold ${isSelected ? "text-[#3157D5]" : "text-slate-400"}`}>
                            {isSelected ? "✓ Selected" : "Select Course →"}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* EDUCATOR SELECTION CATALOG */}
          {state.selectionType === "EDUCATOR" && !state.selectedEducator && (
            <div className="space-y-4">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search educators by name or specialization..."
                  value={educatorSearch}
                  onChange={(e) => setEducatorSearch(e.target.value)}
                  className="w-full h-11 pl-10 pr-4 text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#3157D5]/20 focus:border-[#3157D5]"
                />
              </div>

              {loadingCatalog ? (
                <div className="p-8 text-center text-xs text-slate-400">Loading verified educators...</div>
              ) : filteredEducators.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                  <GraduationCap className="w-8 h-8 text-slate-400 mx-auto" />
                  <p className="text-xs text-slate-500 font-semibold">No educators found matching that search.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-96 overflow-y-auto pr-1">
                  {filteredEducators.map((e) => {
                    const isSelected = state.selectedEducatorId === e.id;
                    return (
                      <div
                        key={e.id}
                        onClick={() => {
                          setState((p) => ({
                            ...p,
                            selectionType: "EDUCATOR",
                            selectedEducatorId: e.id,
                            selectedEducator: e,
                            isTrial: true,
                            selectedCourseId: null,
                            selectedCourse: null,
                          }));
                        }}
                        className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between gap-3 ${
                          isSelected
                            ? "bg-indigo-50/80 border-[#3157D5] shadow-md shadow-[#3157D5]/10"
                            : "bg-white border-slate-200 hover:border-indigo-300 hover:bg-slate-50/50"
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <img
                            src={e.avatarUrl || "/images/educators/educator_01.jpg"}
                            alt={e.name}
                            className="w-12 h-12 rounded-xl object-cover ring-1 ring-slate-200 shrink-0"
                          />
                          <div className="min-w-0">
                            <h4 className="text-xs font-bold text-slate-900 truncate">{e.name}</h4>
                            <p className="text-[11px] text-slate-500 truncate">{e.headline}</p>
                            <div className="flex items-center gap-1 text-[10px] text-amber-600 font-bold mt-0.5">
                              <Star className="w-3 h-3 fill-amber-400 stroke-amber-500" />
                              <span>{e.rating ? Number(e.rating).toFixed(1) : "4.9"}</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-xs font-black text-slate-900">{formatCurrency(e.hourlyRate || 800)}</div>
                          <span className={`text-[10px] font-bold block ${isSelected ? "text-[#3157D5]" : "text-slate-400"}`}>
                            {isSelected ? "✓ Selected" : "Book Demo"}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Continue Button */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-4">
            <button
              type="button"
              onClick={() => setState((p) => ({ ...p, step: 1 }))}
              className="text-xs font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Information
            </button>

            <GlassButton
              type="button"
              variant="primary"
              disabled={!state.selectedCourse && !state.selectedEducator}
              onClick={() => setState((p) => ({ ...p, step: 3 }))}
              className="bg-[#3157D5] hover:bg-[#243B9B] text-white font-bold px-6"
              rightIcon={<ArrowRight className="h-4 w-4" />}
            >
              Review Selection
            </GlassButton>
          </div>
        </GlassCard>
      )}

      {/* ========================================================================= */}
      {/* STEP 3: REVIEW SELECTION */}
      {/* ========================================================================= */}
      {state.step === 3 && (
        <GlassCard glowColor="rgba(49, 87, 213, 0.15)" className="p-7 sm:p-10 border border-white/90 shadow-xl space-y-6">
          <div className="text-center sm:text-left space-y-1.5 border-b border-slate-100 pb-5">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#3157D5]/10 text-[#3157D5] text-xs font-bold uppercase tracking-wider border border-[#3157D5]/20">
              <ShieldCheck className="w-3.5 h-3.5" /> Step 3 of 7: Review Selection
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Confirm Your Enrollment
            </h2>
            <p className="text-xs sm:text-sm text-slate-500">
              Please verify your learner account information and selected curriculum before proceeding to checkout.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Learner Info Summary */}
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-600">Learner Profile</span>
                <span className="text-[11px] text-emerald-600 font-bold">✓ Verified</span>
              </div>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Name:</span>
                  <span className="font-bold text-slate-900">{state.fullName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Email:</span>
                  <span className="font-semibold text-slate-900">{state.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Mobile:</span>
                  <span className="font-semibold text-slate-900">+91 {state.phone}</span>
                </div>
              </div>
            </div>

            {/* Selected Product Summary */}
            <div className="p-5 rounded-2xl bg-blue-50/60 border border-blue-200 space-y-3">
              <div className="flex items-center justify-between border-b border-blue-200 pb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-blue-900">
                  {state.selectionType === "EDUCATOR" ? "1-on-1 Educator Booking" : "Course Enrollment"}
                </span>
                <span className="text-[11px] text-[#3157D5] font-bold">
                  {state.selectionType === "EDUCATOR" ? "Live Classroom Session" : "Full LMS Access"}
                </span>
              </div>
              <div className="space-y-1.5 text-xs">
                <div className="font-black text-slate-900 text-sm">
                  {state.selectionType === "EDUCATOR" ? `1-on-1 Class with ${state.selectedEducator?.name || "Educator"}` : state.selectedCourse?.title}
                </div>
                {state.selectionType === "EDUCATOR" ? (
                  <>
                    <div className="text-slate-700 text-xs font-semibold flex items-center gap-1.5 mt-1">
                      <Clock className="w-3.5 h-3.5 text-[#3157D5]" /> Date: <span className="font-bold">{state.selectedDate}</span>
                    </div>
                    <div className="text-slate-700 text-xs font-semibold flex items-center gap-1.5">
                      <Video className="w-3.5 h-3.5 text-[#3157D5]" /> Time Slot: <span className="font-bold">{state.selectedSlotTime}</span>
                    </div>
                  </>
                ) : (
                  <div className="text-slate-600 text-xs">
                    Subject: {state.selectedCourse?.subject}
                  </div>
                )}
                <div className="text-[11px] text-slate-500 pt-1">
                  Format: Live WebRTC Classrooms + 24/7 LMS Replays
                </div>
              </div>
            </div>
          </div>

          {/* ONE COURSE RULE NOTICE */}
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-800 space-y-1">
            <div className="font-bold flex items-center gap-1.5 text-amber-900">
              <AlertCircle className="w-4 h-4 shrink-0 text-amber-700" /> Focus Policy: One Course per Learner
            </div>
            <p className="leading-relaxed">
              To guarantee mastery and active teacher engagement, learners may enroll in 1 active course curriculum at a time. Completing or graduating unlocks subsequent courses.
            </p>
          </div>

          {/* Price Breakdown */}
          <div className="p-5 rounded-2xl bg-slate-900 text-white space-y-3">
            <div className="flex justify-between text-xs text-slate-400">
              <span>Tuition / Session Fee</span>
              <span className="text-white font-medium">
                {activePrice === 0 ? "FREE" : formatCurrency(activePrice)}
              </span>
            </div>
            <div className="flex justify-between text-xs text-slate-400">
              <span>Platform Access & Cloud Sandbox</span>
              <span className="text-emerald-400 font-medium">Included (₹0)</span>
            </div>
            <div className="flex justify-between text-xs text-slate-400">
              <span>Goods & Services Tax (GST)</span>
              <span className="text-white font-medium">Included</span>
            </div>
            <div className="border-t border-slate-800 pt-3 flex justify-between items-center">
              <span className="text-sm font-bold text-white">Total Amount</span>
              <span className="text-2xl font-black text-blue-400">
                {activePrice === 0 ? "FREE" : formatCurrency(activePrice)}
              </span>
            </div>
          </div>

          {/* Navigation Action Buttons */}
          <div className="flex items-center justify-between gap-4 pt-2">
            <button
              type="button"
              onClick={() => setState((p) => ({ ...p, step: 2 }))}
              className="text-xs font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Modify Selection
            </button>

            <GlassButton
              type="button"
              variant="primary"
              onClick={handleInitiatePayment}
              className="bg-[#3157D5] hover:bg-[#243B9B] text-white font-bold px-8 py-3.5 shadow-lg shadow-[#3157D5]/20"
              rightIcon={<CreditCard className="h-4 w-4" />}
            >
              {activePrice === 0
                ? "Complete Free Enrollment"
                : state.selectionType === "EDUCATOR" || state.isTrial
                ? "Book Now"
                : "Pay Now"}
            </GlassButton>
          </div>
        </GlassCard>
      )}

      {/* ========================================================================= */}
      {/* STEP 4 & 5: CASHFREE PAYMENT & SERVER VERIFICATION */}
      {/* ========================================================================= */}
      {(state.step === 4 || state.step === 5) && (
        <GlassCard glowColor="rgba(49, 87, 213, 0.15)" className="p-8 sm:p-12 border border-white/90 shadow-2xl space-y-6 text-center">
          {state.paymentLoading ? (
            <div className="space-y-4 py-8">
              <div className="w-14 h-14 border-4 border-[#3157D5]/30 border-t-[#3157D5] rounded-full animate-spin mx-auto" />
              <div className="space-y-1">
                <h3 className="text-xl font-bold text-slate-900">
                  {state.step === 4 ? "Connecting to Cashfree Payments..." : "Verifying Payment with Cashfree..."}
                </h3>
                <p className="text-xs text-slate-500">
                  Please do not close or refresh this window while we verify your transaction.
                </p>
              </div>
            </div>
          ) : state.activeEnrollmentNotice ? (
            <div className="space-y-5 py-4 max-w-md mx-auto text-center">
              <div className="w-14 h-14 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto">
                <AlertCircle className="w-8 h-8" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-bold text-slate-900">Active Enrollment Exists</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {state.activeEnrollmentNotice}
                </p>
              </div>
              <Link href="/student/dashboard" className="w-full block">
                <GlassButton variant="primary" className="w-full bg-[#3157D5] hover:bg-[#243B9B] text-white">
                  Continue to Learner Dashboard
                </GlassButton>
              </Link>
            </div>
          ) : state.paymentError ? (
            <div className="space-y-5 py-4 max-w-md mx-auto text-center">
              <div className="w-14 h-14 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
                <AlertCircle className="w-8 h-8" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-bold text-slate-900">Payment Verification Issue</h3>
                <p className="text-xs text-rose-600/90 leading-relaxed">{state.paymentError}</p>
              </div>
              <div className="flex flex-col sm:flex-row items-center gap-3">
                <button
                  type="button"
                  onClick={() => setState((p) => ({ ...p, step: 3, paymentError: null }))}
                  className="w-full py-3 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50"
                >
                  Change Selection
                </button>
                <GlassButton
                  type="button"
                  variant="primary"
                  onClick={handleInitiatePayment}
                  className="w-full bg-[#3157D5] hover:bg-[#243B9B] text-white font-bold"
                >
                  Retry Payment
                </GlassButton>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-full bg-blue-100 text-[#3157D5] flex items-center justify-center mx-auto">
                <CreditCard className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Cashfree Checkout Ready</h3>
              <p className="text-xs text-slate-500">Click below if checkout did not open automatically.</p>
              <GlassButton
                type="button"
                variant="primary"
                onClick={handleInitiatePayment}
                className="bg-[#3157D5] hover:bg-[#243B9B] text-white font-bold px-8"
              >
                {state.selectionType === "EDUCATOR" || state.isTrial ? "Book Now" : "Pay Now"}
              </GlassButton>
            </div>
          )}
        </GlassCard>
      )}

      {/* ========================================================================= */}
      {/* STEP 6: ACCOUNT CREATION & ENROLLMENT FINALIZATION */}
      {/* ========================================================================= */}
      {state.step === 6 && (
        <GlassCard glowColor="rgba(16, 185, 129, 0.2)" className="p-8 sm:p-12 border border-white/90 shadow-2xl text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto animate-bounce">
            <CheckCircle2 className="w-9 h-9" />
          </div>
          <h2 className="text-2xl font-black text-slate-900">Enrollment Verified!</h2>
          <p className="text-xs text-slate-600 max-w-md mx-auto">
            Configuring your learner classroom privileges, syllabus timetable, and verified credentials...
          </p>
          <div className="w-32 h-1.5 bg-slate-100 rounded-full overflow-hidden mx-auto">
            <div className="w-full h-full bg-[#3157D5] animate-pulse" />
          </div>
        </GlassCard>
      )}

      {/* ========================================================================= */}
      {/* STEP 7: READY & DASHBOARD SUCCESS SCREEN */}
      {/* ========================================================================= */}
      {state.step === 7 && (
        <GlassCard glowColor="rgba(49, 87, 213, 0.2)" className="p-8 sm:p-12 border border-white/90 shadow-2xl text-center space-y-6">
          <div className="w-20 h-20 rounded-3xl bg-[#3157D5]/10 text-[#3157D5] border border-[#3157D5]/30 flex items-center justify-center mx-auto shadow-xl shadow-[#3157D5]/15">
            <Sparkles className="w-10 h-10 text-[#3157D5]" />
          </div>

          <div className="space-y-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold uppercase tracking-wider">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Registration & Enrollment Complete
            </span>
            <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
              Your EduConnects account is ready!
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 max-w-lg mx-auto leading-relaxed">
              Welcome to the learner community, <span className="font-bold text-slate-900">{state.fullName || "Learner"}</span>! Your course enrollment is confirmed and your interactive classroom workspace is unlocked.
            </p>
          </div>

          {/* Enrolled Details Card */}
          <div className="p-5 rounded-2xl bg-blue-50/80 border border-blue-200 text-left max-w-md mx-auto space-y-2 text-xs">
            <div className="flex justify-between items-center text-slate-500 pb-2 border-b border-blue-100">
              <span>Status</span>
              <span className="font-bold text-emerald-600">Active Enrollment ✓</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-600">Enrolled Program:</span>
              <span className="font-bold text-slate-900 text-right truncate max-w-[200px]">
                {state.selectedCourse ? state.selectedCourse.title : state.selectedEducator?.name || "EduConnects Curriculum"}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-600">Access Mode:</span>
              <span className="font-semibold text-[#243B9B]">Full Browser Classroom & LMS</span>
            </div>
          </div>

          {/* Primary Action Button */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4 max-w-md mx-auto">
            <Link href="/student/dashboard" className="w-full">
              <GlassButton
                variant="primary"
                size="lg"
                className="w-full bg-[#3157D5] hover:bg-[#243B9B] text-white font-bold py-4 text-sm shadow-xl shadow-[#3157D5]/25"
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                Continue to Learner Dashboard
              </GlassButton>
            </Link>
          </div>
        </GlassCard>
      )}
    </div>
  );
}

export function LearnerRegistrationFlow() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-slate-400 text-xs">Loading registration flow...</div>}>
      <LearnerRegistrationFlowContent />
    </Suspense>
  );
}
