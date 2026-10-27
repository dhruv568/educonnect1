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
import { PhoneOtpVerifyInline } from "@/components/auth/phone-otp-verify-inline";
import { EmailOtpVerifyInline } from "@/components/auth/email-otp-verify-inline";
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
  PhoneCall,
  CheckCheck,
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
  emailVerified?: boolean;
  phoneVerified?: boolean;
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
    emailVerified: false,
    phoneVerified: false,
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

  // Optional Callback Request State
  const [callbackOpen, setCallbackOpen] = useState(false);
  const [callbackName, setCallbackName] = useState("");
  const [callbackPhone, setCallbackPhone] = useState("");
  const [callbackSlot, setCallbackSlot] = useState("Morning (9 AM - 12 PM)");
  const [callbackTopic, setCallbackTopic] = useState("Course & Syllabus Guidance");
  const [callbackConsent, setCallbackConsent] = useState(false);
  const [submittingCallback, setSubmittingCallback] = useState(false);
  const [callbackSubmittedRef, setCallbackSubmittedRef] = useState<string | null>(null);

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
            step: prev.step === 1 ? 2 : prev.step,
          }));
        }
      })
      .catch(() => {})
      .finally(() => setLoadingInitial(false));

    setState((prev) => {
      let resolvedStep = prev.step;
      if (orderId) {
        resolvedStep = 5;
      } else if (stepParam) {
        const parsed = parseInt(stepParam, 10);
        if (parsed >= 1 && parsed <= 7) {
          resolvedStep = parsed;
        } else {
          resolvedStep = savedState.step && savedState.step <= 7 ? savedState.step : (prev.step <= 7 ? prev.step : 2);
        }
      } else if (savedState.step) {
        resolvedStep = savedState.step <= 7 ? savedState.step : 2;
      }

      return {
        ...prev,
        ...savedState,
        selectedCourseId: courseId || savedState.selectedCourseId || prev.selectedCourseId,
        selectedEducatorId: educatorId || savedState.selectedEducatorId || prev.selectedEducatorId,
        isTrial: trial || savedState.isTrial || prev.isTrial,
        selectionType: educatorId ? "EDUCATOR" : courseId ? "COURSE" : savedState.selectionType || "COURSE",
        step: resolvedStep,
      };
    });
  }, [searchParams]);

  // Sync callback defaults with learner info
  useEffect(() => {
    if (state.fullName && !callbackName) setCallbackName(state.fullName);
    if (state.phone && !callbackPhone) setCallbackPhone(state.phone);
  }, [state.fullName, state.phone, callbackName, callbackPhone]);

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

  // Fetch courses and educators for catalog selection
  useEffect(() => {
    async function loadCatalog() {
      setLoadingCatalog(true);
      try {
        const [cRes, tRes] = await Promise.all([
          fetch("/api/courses?limit=25"),
          fetch("/api/teachers?limit=25&sortBy=rating"),
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

  // Fetch educator live availability when an educator is selected
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

      if (state.emailVerified) {
        setIsUserLoggedIn(true);
        showToast("Profile Created!", "Your registration details have been saved and verified.", "success");
        const hasProgram = state.selectedCourseId || state.selectedEducatorId;
        setState((prev) => ({
          ...prev,
          step: hasProgram ? 3 : 2,
        }));
        return;
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
      showToast("Email Verified!", "Your free learner account is confirmed. Welcome to EduConnects!", "success");

      // Advance to Step 3 if pre-selected, otherwise to Step 2 (Optional Program Exploration)
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

  // Trigger Payment (Only invoked when user explicitly clicks "Pay" or "Enroll Free")
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
            activeEnrollmentNotice: "You are already enrolled in this course.",
          }));
          return;
        }
        throw new Error(errMsg);
      }

      // 1. FREE PRODUCT (price === 0): No Cashfree checkout needed
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

      // 2. PAID PRODUCT: Launch Cashfree PG only after explicit user checkout
      const order = data.data;
      setState((prev) => ({ ...prev, orderData: order }));

      if (order.paymentSessionId) {
        const isProd = order.env === "PRODUCTION";
        const Cashfree = await loadCashfreeSdk();
        const cashfree = Cashfree({ mode: isProd ? "production" : "sandbox" });
        const returnUrl = `${window.location.origin}/student/register?order_id=${encodeURIComponent(order.cfOrderId || order.internalReference)}&step=5`;

        await cashfree.checkout({
          paymentSessionId: order.paymentSessionId,
          returnUrl,
        });
      } else {
        throw new Error("Unable to establish Cashfree payment session. Please try again.");
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
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success || data.data?.status !== "CAPTURED") {
        throw new Error(data.error || "Payment was not completed or verification failed with Cashfree.");
      }

      setState((prev) => ({
        ...prev,
        transactionData: data.data,
        step: 6,
        paymentLoading: false,
      }));

      // Auto advance to Step 7 (Ready Screen) only after verified capture
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

  // Handle Optional Callback Request Submit
  const handleCallbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!callbackConsent) {
      showToast("Consent Required", "Please check the consent box to request a counseling callback.", "error");
      return;
    }
    const clean = callbackPhone.replace(/\D/g, "");
    if (clean.length !== 10) {
      showToast("Invalid Phone", "Please enter a valid 10-digit mobile number.", "error");
      return;
    }
    setSubmittingCallback(true);
    try {
      const res = await fetch("/api/student/callback-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: callbackName.trim() || state.fullName || "Learner",
          email: state.email || undefined,
          phone: clean,
          preferredSlot: callbackSlot,
          topic: callbackTopic,
          consent: true,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to submit callback request.");
      }
      setCallbackSubmittedRef(json.data?.referenceId || "CB-SUCCESS");
      showToast("Callback Requested!", "Our academic advisor will reach out during your preferred time.", "success");
    } catch (err: any) {
      showToast("Request Error", err.message, "error");
    } finally {
      setSubmittingCallback(false);
    }
  };

  // Filter courses for Step 2
  const filteredCourses = coursesList.filter((c) => {
    const matchSearch =
      !courseSearch.trim() ||
      c.title?.toLowerCase().includes(courseSearch.toLowerCase()) ||
      c.subject?.toLowerCase().includes(courseSearch.toLowerCase());
    
    if (selectedSubject === "FREE") {
      return matchSearch && c.price === 0;
    }
    const matchSubject = selectedSubject === "ALL" || c.subject?.toLowerCase() === selectedSubject.toLowerCase();
    return matchSearch && matchSubject;
  });

  // Filter educators for Step 2
  const filteredEducators = educatorsList.filter((e) => {
    return (
      !educatorSearch.trim() ||
      e.name?.toLowerCase().includes(educatorSearch.toLowerCase()) ||
      e.subjects?.some((s: string) => s.toLowerCase().includes(educatorSearch.toLowerCase()))
    );
  });

  const activePrice = state.selectedCourse ? state.selectedCourse.price : state.isTrial ? (state.selectedEducator?.hourlyRate || 499) : 0;

  // Determine whether the user has entered a paid checkout path
  const isPaidCheckoutFlow = (state.step >= 3 && state.step <= 6) || (state.step === 7 && (state.transactionData || state.orderData?.isFree));

  // Contextual step progress configuration
  const PROGRESS_STEPS = isPaidCheckoutFlow
    ? [
        { id: 1, stepNumber: 1, label: "Learner Profile" },
        { id: 2, stepNumber: 2, label: "Program Selection" },
        { id: 3, stepNumber: 3, label: "Review Selection" },
        { id: 4, stepNumber: 4, label: "Payment & Checkout" },
        { id: 7, stepNumber: 7, label: "Account Ready" },
      ]
    : [
        { id: 1, stepNumber: 1, label: "Learner Profile" },
        { id: 2, stepNumber: 2, label: "Explore Programs (Optional)" },
        { id: 7, stepNumber: 7, label: "Account Ready" },
      ];

  if (loadingInitial) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-[#2563EB]/30 border-t-[#2563EB] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto space-y-8 font-sans">
      {/* ========================================================================= */}
      {/* RESPONSIVE PROGRESS INDICATOR */}
      {/* ========================================================================= */}
      {(() => {
        const currentStepIdx = PROGRESS_STEPS.findIndex((s) => s.stepNumber === state.step);
        const activeStepNumber = currentStepIdx !== -1 ? currentStepIdx + 1 : 1;
        const currentStepObj = PROGRESS_STEPS[currentStepIdx] || PROGRESS_STEPS[0];
        const progressPercent = Math.round((activeStepNumber / PROGRESS_STEPS.length) * 100);

        return (
          <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-xs p-4 sm:p-5 lg:p-6 transition-all">
            {/* Mobile compact step indicator (< sm) */}
            <div className="flex sm:hidden items-center justify-between mb-3.5 pb-2.5 border-b border-slate-100 text-xs">
              <div className="flex items-center gap-2">
                <span className="flex h-2 w-2 rounded-full bg-[#2563EB] animate-pulse" />
                <span className="font-bold text-slate-900">
                  Step {activeStepNumber} of {PROGRESS_STEPS.length}:{" "}
                  <span className="text-[#2563EB]">{currentStepObj.label.replace(" (Optional)", "")}</span>
                </span>
              </div>
              <span className="text-[11px] font-semibold text-slate-500 bg-slate-50 px-2 py-0.5 rounded-full border border-slate-200/60">
                {progressPercent}% Complete
              </span>
            </div>

            {/* Stepper Track */}
            <nav aria-label="Registration Progress">
              <ol className="flex items-start w-full">
                {PROGRESS_STEPS.map((s, idx) => {
                  const isCompleted = state.step > s.stepNumber || (s.stepNumber === 7 && state.step === 7);
                  const isCurrent = state.step === s.stepNumber && !(s.stepNumber === 7 && state.step === 7);
                  const isConnectorCompleted = state.step > s.stepNumber;
                  const isLast = idx === PROGRESS_STEPS.length - 1;

                  return (
                    <li
                      key={s.id}
                      className="flex-1 relative flex flex-col items-center group"
                      aria-current={isCurrent ? "step" : undefined}
                    >
                      {/* Independent Connector Line to next step */}
                      {!isLast && (
                        <div
                          className="absolute top-4 sm:top-[18px] md:top-5 left-[calc(50%+0.875rem)] sm:left-[calc(50%+1rem)] md:left-[calc(50%+1.125rem)] right-[calc(-50%+0.875rem)] sm:right-[calc(-50%+1rem)] md:right-[calc(-50%+1.125rem)] h-0.5 -translate-y-1/2 -z-0 pointer-events-none"
                          aria-hidden="true"
                        >
                          <div
                            className={`w-full h-full transition-colors duration-300 rounded-full ${
                              isConnectorCompleted ? "bg-[#2563EB]" : "bg-slate-200"
                            }`}
                          />
                        </div>
                      )}

                      {/* Numbered Step Circle */}
                      <div
                        className={`relative z-10 w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold transition-all duration-300 select-none ${
                          isCompleted
                            ? "bg-blue-50 text-[#2563EB] border-2 border-[#2563EB] shadow-2xs"
                            : isCurrent
                            ? "bg-[#2563EB] text-white border-2 border-[#2563EB] shadow-md shadow-blue-500/20 ring-4 ring-blue-500/15"
                            : "bg-slate-50 text-slate-400 border-2 border-slate-200"
                        }`}
                      >
                        {isCompleted ? (
                          <Check className="w-4 h-4 sm:w-4.5 sm:h-4.5 stroke-[3] text-[#2563EB]" />
                        ) : (
                          <span>{idx + 1}</span>
                        )}
                      </div>

                      {/* Step Label */}
                      <div className="mt-2.5 sm:mt-3 text-center px-1 max-w-full">
                        <span className="sr-only">
                          {isCompleted ? "Completed: " : isCurrent ? "Current Step: " : "Upcoming: "}
                        </span>
                        <div
                          className={`text-[11px] sm:text-xs md:text-sm leading-tight transition-colors duration-200 ${
                            isCurrent
                              ? "font-bold text-[#2563EB]"
                              : isCompleted
                              ? "font-semibold text-slate-800"
                              : "font-medium text-slate-400"
                          }`}
                        >
                          {s.label.includes(" (Optional)") ? (
                            <>
                              <span className="block">{s.label.replace(" (Optional)", "")}</span>
                              <span
                                className={`block text-[10px] sm:text-[11px] mt-0.5 font-normal ${
                                  isCurrent
                                    ? "text-blue-500/90"
                                    : isCompleted
                                    ? "text-slate-500"
                                    : "text-slate-400"
                                }`}
                              >
                                (Optional)
                              </span>
                            </>
                          ) : (
                            <span>{s.label}</span>
                          )}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </nav>
          </div>
        );
      })()}

      {/* ========================================================================= */}
      {/* STEP 1: LEARNER INFORMATION & VERIFICATION */}
      {/* ========================================================================= */}
      {state.step === 1 && (
        <GlassCard glowColor="rgba(37, 99, 235, 0.15)" className="p-6 sm:p-8 md:p-10 border border-white/90 shadow-xl space-y-6 sm:space-y-8">
          <div className="text-center sm:text-left space-y-2.5 sm:space-y-3 border-b border-slate-100 pb-5 sm:pb-6">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#2563EB]/10 text-[#2563EB] text-xs font-bold uppercase tracking-wider border border-[#2563EB]/20">
              <Sparkles className="w-3.5 h-3.5" /> Free Learner Registration
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-snug sm:leading-tight">
              Create Your Free Learner Account
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 leading-relaxed max-w-xl">
              Zero upfront fees or payment details required. Join the community to explore courses, free study guides, and verified educators.
            </p>
          </div>

          {!state.otpSent ? (
            <form
              onSubmit={handleStep1Submit}
              className="space-y-5 sm:space-y-6"
              onFocusCapture={(e) => {
                const target = e.target as HTMLElement;
                if (target && (target.tagName === "INPUT" || target.tagName === "SELECT" || target.tagName === "TEXTAREA")) {
                  setTimeout(() => {
                    target.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
                  }, 150);
                }
              }}
            >
              <Input
                label="Full Name"
                placeholder="e.g. Aarav Sharma"
                value={state.fullName}
                onChange={(e) => setState((p) => ({ ...p, fullName: e.target.value }))}
                required
                leftIcon={<User className="h-4 w-4 text-[#2563EB]" />}
                helperText="Enter your official first and last name"
                autoComplete="name"
                autoCapitalize="words"
                spellCheck={false}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-6">
                <div className="space-y-1.5">
                  <Input
                    label="Email Address"
                    type="email"
                    placeholder="aarav@example.com"
                    value={state.email}
                    onChange={(e) =>
                      setState((p) => ({
                        ...p,
                        email: e.target.value,
                        emailVerified: false,
                      }))
                    }
                    required
                    leftIcon={<Mail className="h-4 w-4 text-[#2563EB]" />}
                    helperText="Verification code will be sent here"
                    autoComplete="email"
                    inputMode="email"
                    autoCapitalize="none"
                    spellCheck={false}
                  />
                  <div className="pt-1">
                    <EmailOtpVerifyInline
                      email={state.email}
                      roleContext="student"
                      onVerified={(verifiedEmail) => {
                        setState((p) => ({
                          ...p,
                          email: verifiedEmail,
                          emailVerified: true,
                        }));
                      }}
                      onStatusChange={(verified) => {
                        setState((p) => ({ ...p, emailVerified: verified }));
                      }}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Input
                    label="Mobile Number"
                    type="tel"
                    placeholder="9876543210"
                    value={state.phone}
                    onChange={(e) =>
                      setState((p) => ({
                        ...p,
                        phone: e.target.value,
                        phoneVerified: false,
                      }))
                    }
                    required
                    maxLength={10}
                    leftIcon={<Phone className="h-4 w-4 text-[#2563EB]" />}
                    helperText="10-digit Indian mobile number"
                    autoComplete="tel-national"
                    inputMode="numeric"
                    pattern="[0-9]*"
                  />
                  <div className="pt-1">
                    <PhoneOtpVerifyInline
                      phone={state.phone}
                      email={state.email}
                      roleContext="student"
                      onVerified={(verified) => {
                        setState((p) => ({
                          ...p,
                          phone: verified.slice(-10),
                          phoneVerified: true,
                        }));
                      }}
                      onStatusChange={(verified) => {
                        setState((p) => ({ ...p, phoneVerified: verified }));
                      }}
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-6">
                <Input
                  label="Password"
                  type="password"
                  placeholder="••••••••"
                  value={state.password}
                  onChange={(e) => setState((p) => ({ ...p, password: e.target.value }))}
                  required
                  leftIcon={<Lock className="h-4 w-4 text-[#2563EB]" />}
                  helperText="Min. 8 characters, 1 uppercase, 1 number"
                  autoComplete="new-password"
                />

                <Input
                  label="Confirm Password"
                  type="password"
                  placeholder="••••••••"
                  value={state.confirmPassword}
                  onChange={(e) => setState((p) => ({ ...p, confirmPassword: e.target.value }))}
                  required
                  leftIcon={<Lock className="h-4 w-4 text-[#2563EB]" />}
                  helperText="Must match your password"
                  autoComplete="new-password"
                />
              </div>

              {/* Learner Academic Profile Selection */}
              <div className="pt-2 sm:pt-2.5">
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

              <div className="pt-2 sm:pt-4">
                <GlassButton
                  type="submit"
                  variant="learner"
                  className="w-full min-h-[52px] py-3.5 px-6 bg-[#2563EB] hover:bg-[#1E40AF] active:bg-[#1D4ED8] border border-[#2563EB] shadow-lg shadow-[#2563EB]/25 text-white text-sm sm:text-base font-bold rounded-2xl flex items-center justify-center gap-2 transition-all cursor-pointer scroll-mb-12"
                  isLoading={submittingStep1}
                  disabled={submittingStep1}
                  rightIcon={<ArrowRight className="h-4.5 w-4.5" />}
                >
                  Continue to Email Verification
                </GlassButton>
              </div>
            </form>
          ) : (
            /* Inline 6-Digit OTP Verification Form */
            <form onSubmit={handleVerifyOtp} className="space-y-5 bg-blue-50/60 p-6 sm:p-8 rounded-3xl border border-blue-200">
              <div className="text-center space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-[#2563EB]/10 text-[#2563EB] flex items-center justify-center mx-auto">
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
                  className="w-full text-center tracking-[0.5em] text-2xl font-black h-14 bg-white border-2 border-[#2563EB]/40 rounded-2xl outline-none focus:border-[#2563EB] focus:ring-4 focus:ring-[#2563EB]/10 text-slate-900"
                  required
                />
                <p className="text-[11px] text-center text-slate-500">Enter the 6 digits from your inbox</p>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={state.otpCooldown > 0}
                  className="text-xs font-bold text-[#2563EB] hover:text-[#1E40AF] disabled:text-slate-400 flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  {state.otpCooldown > 0 ? `Resend code in ${state.otpCooldown}s` : "Resend verification code"}
                </button>
              </div>

              <GlassButton
                type="submit"
                variant="learner"
                className="w-full bg-[#2563EB] hover:bg-[#1E40AF] text-white font-bold py-3.5 shadow-lg shadow-[#2563EB]/20"
                isLoading={submittingOtp}
                rightIcon={<CheckCircle2 className="h-4 w-4" />}
              >
                Verify Code & Complete Free Registration
              </GlassButton>
            </form>
          )}

          <div className="pt-5 sm:pt-6 border-t border-slate-100 text-center text-xs sm:text-sm text-slate-500">
            Already registered?{" "}
            <Link href="/student/login" className="font-bold text-[#2563EB] hover:underline ml-1">
              Sign in as Learner
            </Link>
          </div>
        </GlassCard>
      )}

      {/* ========================================================================= */}
      {/* STEP 2: EXPLORE PROGRAMS (OPTIONAL DISCOVERY — NO PAYMENT REQUIRED) */}
      {/* ========================================================================= */}
      {state.step === 2 && (
        <GlassCard glowColor="rgba(37, 99, 235, 0.15)" className="p-6 sm:p-10 border border-white/90 shadow-xl space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-5">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold uppercase tracking-wider border border-emerald-200">
                <Check className="w-3.5 h-3.5 text-emerald-600" /> Account Created & Verified
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mt-1.5">
                Explore Programs or Jump to Dashboard
              </h2>
              <p className="text-xs sm:text-sm text-slate-500">
                Your free account is ready. Browse courses and top mentors, or start exploring your dashboard immediately with no payment needed.
              </p>
            </div>

            {/* Switch Mode Pills */}
            <div className="inline-flex p-1 bg-slate-100 rounded-2xl border border-slate-200 shrink-0">
              <button
                type="button"
                onClick={() => setState((p) => ({ ...p, selectionType: "COURSE" }))}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  state.selectionType === "COURSE"
                    ? "bg-[#2563EB] text-white shadow-sm"
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
                    ? "bg-[#2563EB] text-white shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                👨‍🏫 Choose Educator
              </button>
            </div>
          </div>

          {/* Quick Action: Skip Directly to Free Dashboard */}
          <div className="p-5 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50/70 border border-blue-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-black uppercase tracking-wider text-blue-900">
                  Free Platform Access Unlocked
                </span>
              </div>
              <p className="text-xs text-slate-600 max-w-lg leading-relaxed">
                Want to explore the platform on your own first? You can skip program selection and jump directly to your free learner dashboard.
              </p>
            </div>
            <GlassButton
              type="button"
              variant="primary"
              onClick={() => setState((p) => ({ ...p, step: 7 }))}
              className="bg-[#2563EB] hover:bg-[#1E40AF] text-white font-bold px-5 py-2.5 text-xs shrink-0 shadow-md shadow-[#2563EB]/20"
              rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
            >
              Skip to Free Dashboard
            </GlassButton>
          </div>

          {/* If Course is Pre-selected */}
          {state.selectedCourse && (
            <div className="p-5 rounded-3xl bg-blue-50/70 border-2 border-[#2563EB] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[11px] font-bold">
                  <Check className="w-3 h-3" /> Selected Course
                </span>
                <h3 className="text-lg font-black text-slate-900">{state.selectedCourse.title}</h3>
                <p className="text-xs text-slate-600">
                  Subject: <span className="font-semibold">{state.selectedCourse.subject}</span> • Level: {state.selectedCourse.level || "All Levels"}
                </p>
              </div>
              <div className="text-right shrink-0">
                <div className="text-2xl font-black text-[#1E40AF]">
                  {state.selectedCourse.price === 0 ? "FREE" : formatCurrency(state.selectedCourse.price)}
                </div>
                <button
                  type="button"
                  onClick={() => setState((p) => ({ ...p, selectedCourseId: null, selectedCourse: null }))}
                  className="text-xs text-[#2563EB] hover:underline font-semibold"
                >
                  Change Course
                </button>
              </div>
            </div>
          )}

          {/* If Educator is Selected: Show Profile + Date & Time Slot Picker */}
          {state.selectedEducator && (
            <div className="space-y-4">
              <div className="p-5 rounded-3xl bg-blue-50/70 border-2 border-[#2563EB] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 min-w-0 overflow-hidden">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <img
                    src={state.selectedEducator.avatarUrl || "/images/educators/educator_01.jpg"}
                    alt={state.selectedEducator.name}
                    className="w-14 h-14 rounded-2xl object-cover ring-2 ring-[#2563EB]/20 shrink-0 aspect-square"
                  />
                  <div className="space-y-0.5 min-w-0 flex-1">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[11px] font-bold">
                      <Check className="w-3 h-3" /> Selected Educator
                    </span>
                    <h3 className="text-base font-black text-slate-900 truncate" title={state.selectedEducator.name}>{state.selectedEducator.name}</h3>
                    <p className="text-xs text-slate-600 truncate" title={state.selectedEducator.headline}>{state.selectedEducator.headline}</p>
                  </div>
                </div>
                <div className="text-right shrink-0 space-y-1">
                  <div className="text-xl font-black text-[#1E40AF]">
                    {formatCurrency(state.selectedEducator.hourlyRate || 499)}/session
                  </div>
                  <button
                    type="button"
                    onClick={() => setState((p) => ({ ...p, selectedEducatorId: null, selectedEducator: null }))}
                    className="text-xs text-[#2563EB] hover:underline font-semibold"
                  >
                    Change Educator
                  </button>
                </div>
              </div>

              {/* Educator Available Date & Time Slot Selector */}
              <div className="p-5 rounded-3xl bg-blue-50/80 border border-blue-200 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-[#2563EB]" /> Select Date & Live Session Slot
                  </h4>
                  <span className="text-[11px] font-bold text-blue-700 bg-blue-100/80 px-2.5 py-0.5 rounded-full">
                    1-on-1 Interactive Session
                  </span>
                </div>

                {loadingAvailability ? (
                  <div className="p-6 text-center text-xs text-slate-500 font-semibold animate-pulse">
                    Fetching Educator Live Availability...
                  </div>
                ) : (
                  <>
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
                                  ? "bg-[#2563EB] text-white border-[#2563EB] shadow-sm ring-2 ring-[#2563EB]/20"
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
                    className="w-full h-11 pl-10 pr-4 text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
                  />
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { label: "All Subjects", value: "ALL" },
                    { label: "🎁 Free Courses", value: "FREE" },
                    { label: "Mathematics", value: "Mathematics" },
                    { label: "Physics", value: "Physics" },
                    { label: "Chemistry", value: "Chemistry" },
                    { label: "Computer Science", value: "Computer Science" },
                  ].map((filterItem) => (
                    <button
                      key={filterItem.value}
                      type="button"
                      onClick={() => setSelectedSubject(filterItem.value)}
                      className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all ${
                        selectedSubject === filterItem.value
                          ? filterItem.value === "FREE"
                            ? "bg-emerald-600 text-white shadow-sm"
                            : "bg-[#2563EB] text-white shadow-sm"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      {filterItem.label}
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
                    const isFreeCourse = c.price === 0;
                    return (
                      <div
                        key={c.id}
                        onClick={() => setState((p) => ({ ...p, selectedCourseId: c.id, selectedCourse: c }))}
                        className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between space-y-3 ${
                          isSelected
                            ? "bg-blue-50/80 border-[#2563EB] shadow-md shadow-[#2563EB]/10"
                            : "bg-white border-slate-200 hover:border-blue-300 hover:bg-slate-50/50"
                        }`}
                      >
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between gap-2">
                            <span className="px-2 py-0.5 rounded-md bg-blue-100 text-[#2563EB] text-[10px] font-bold uppercase">
                              {c.subject}
                            </span>
                            {isFreeCourse ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-xs font-black">
                                <Sparkles className="w-3 h-3 text-emerald-600" /> FREE
                              </span>
                            ) : (
                              <span className="text-xs font-black text-slate-900">
                                {formatCurrency(c.price)}
                              </span>
                            )}
                          </div>
                          <h4 className="text-sm font-bold text-slate-900 line-clamp-1">{c.title}</h4>
                          <p className="text-xs text-slate-500 line-clamp-2">{c.description}</p>
                        </div>
                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600 font-medium">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-400" /> {c.durationHours || 12}h lessons
                          </span>
                          <span className={`font-bold ${isSelected ? "text-[#2563EB]" : isFreeCourse ? "text-emerald-700" : "text-slate-400"}`}>
                            {isSelected ? "✓ Selected" : isFreeCourse ? "Enroll Free →" : "Select Course →"}
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
                  className="w-full h-11 pl-10 pr-4 text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
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
                            ? "bg-blue-50/80 border-[#2563EB] shadow-md shadow-[#2563EB]/10"
                            : "bg-white border-slate-200 hover:border-blue-300 hover:bg-slate-50/50"
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <img
                            src={e.avatarUrl || "/images/educators/educator_01.jpg"}
                            alt={e.name}
                            className="w-12 h-12 rounded-xl object-cover ring-1 ring-slate-200 shrink-0 aspect-square"
                          />
                          <div className="min-w-0 flex-1">
                            <h4 className="text-xs font-bold text-slate-900 truncate" title={e.name}>{e.name}</h4>
                            <p className="text-[11px] text-slate-500 truncate" title={e.headline}>{e.headline}</p>
                            <div className="flex items-center gap-1 text-[10px] text-amber-600 font-bold mt-0.5">
                              <Star className="w-3 h-3 fill-amber-400 stroke-amber-500" />
                              <span>{e.rating ? Number(e.rating).toFixed(1) : "4.9"}</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-xs font-black text-slate-900">{formatCurrency(e.hourlyRate || 800)}</div>
                          <span className={`text-[10px] font-bold block ${isSelected ? "text-[#2563EB]" : "text-slate-400"}`}>
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

          {/* ========================================================================= */}
          {/* OPTIONAL ACADEMIC COUNSELING CALLBACK REQUEST CARD */}
          {/* ========================================================================= */}
          <div className="border border-slate-200/90 rounded-2xl bg-white/80 overflow-hidden shadow-sm">
            <button
              type="button"
              onClick={() => setCallbackOpen((prev) => !prev)}
              className="w-full p-4 sm:p-5 flex items-center justify-between text-left hover:bg-slate-50/80 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100/80 text-[#2563EB] flex items-center justify-center shrink-0">
                  <PhoneCall className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">
                    Need Help Deciding? Request a Free Counseling Callback
                  </h4>
                  <p className="text-xs text-slate-500">
                    Get 1-on-1 guidance from an EduConnects advisor. 100% free with zero obligation.
                  </p>
                </div>
              </div>
              <span className="text-xs font-bold text-[#2563EB] shrink-0 pl-2">
                {callbackOpen ? "Hide Form ↑" : "Request Call ↓"}
              </span>
            </button>

            {callbackOpen && (
              <div className="p-5 sm:p-6 border-t border-slate-100 bg-slate-50/50 space-y-4">
                {callbackSubmittedRef ? (
                  <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-center space-y-1.5">
                    <div className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800">
                      <CheckCheck className="w-4 h-4 text-emerald-600" /> Callback Scheduled Successfully
                    </div>
                    <p className="text-xs text-emerald-700">
                      Reference ID: <span className="font-mono font-bold">{callbackSubmittedRef}</span>. Our academic advisor will contact you during your preferred time window.
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleCallbackSubmit} className="space-y-4">
                    <div className="p-3 bg-blue-50/70 border border-blue-200/60 rounded-xl text-[11px] text-blue-900 leading-relaxed">
                      <strong>Privacy Notice:</strong> We collect your contact information solely to provide one-time course and curriculum guidance. Registering an account does NOT opt you into automated marketing communications.
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Input
                        label="Full Name"
                        value={callbackName}
                        onChange={(e) => setCallbackName(e.target.value)}
                        placeholder="Your full name"
                        required
                      />
                      <Input
                        label="Mobile Number for Callback"
                        type="tel"
                        maxLength={10}
                        value={callbackPhone}
                        onChange={(e) => setCallbackPhone(e.target.value)}
                        placeholder="10-digit mobile number"
                        required
                        helperText="Indian mobile number"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-bold text-slate-700 block mb-1">
                          Preferred Callback Window
                        </label>
                        <select
                          value={callbackSlot}
                          onChange={(e) => setCallbackSlot(e.target.value)}
                          className="w-full h-11 px-3 text-xs bg-white border border-slate-200 rounded-xl outline-none focus:border-[#2563EB]"
                        >
                          <option>Morning (9 AM - 12 PM)</option>
                          <option>Afternoon (12 PM - 5 PM)</option>
                          <option>Evening (5 PM - 8 PM)</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-xs font-bold text-slate-700 block mb-1">
                          Academic Interest / Topic
                        </label>
                        <select
                          value={callbackTopic}
                          onChange={(e) => setCallbackTopic(e.target.value)}
                          className="w-full h-11 px-3 text-xs bg-white border border-slate-200 rounded-xl outline-none focus:border-[#2563EB]"
                        >
                          <option>Course & Syllabus Guidance</option>
                          <option>1-on-1 Educator Matching</option>
                          <option>Exam Preparation (JEE / NEET / Boards)</option>
                          <option>Foundational Skills & Tutoring</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex items-start gap-2.5 pt-1">
                      <input
                        type="checkbox"
                        id="counseling-consent-check"
                        checked={callbackConsent}
                        onChange={(e) => setCallbackConsent(e.target.checked)}
                        className="mt-0.5 h-4 w-4 rounded border-slate-300 text-[#2563EB] focus:ring-[#2563EB]"
                        required
                      />
                      <label htmlFor="counseling-consent-check" className="text-xs text-slate-600 leading-normal cursor-pointer">
                        I explicitly consent to receive a one-time guidance call from an EduConnects academic advisor regarding my learning goals. (100% free with zero spam.)
                      </label>
                    </div>

                    <div className="flex justify-end gap-2 pt-1">
                      <GlassButton
                        type="submit"
                        variant="primary"
                        isLoading={submittingCallback}
                        disabled={!callbackConsent}
                        className="bg-[#2563EB] hover:bg-[#1E40AF] text-white font-bold px-6 py-2.5 text-xs shadow-md shadow-[#2563EB]/20"
                      >
                        Submit Callback Request
                      </GlassButton>
                    </div>
                  </form>
                )}
              </div>
            )}
          </div>

          {/* Step 2 Bottom Actions */}
          <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
            <button
              type="button"
              onClick={() => setState((p) => ({ ...p, step: 1 }))}
              className="text-xs font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1 cursor-pointer order-2 sm:order-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Profile Information
            </button>

            <div className="flex items-center gap-3 w-full sm:w-auto order-1 sm:order-2 justify-end">
              <button
                type="button"
                onClick={() => setState((p) => ({ ...p, step: 7 }))}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Skip to Dashboard (Free)
              </button>

              <GlassButton
                type="button"
                variant="learner"
                disabled={!state.selectedCourse && !state.selectedEducator}
                onClick={() => setState((p) => ({ ...p, step: 3 }))}
                className="w-full sm:w-auto bg-[#2563EB] hover:bg-[#1E40AF] text-white font-bold px-6 py-2.5 shadow-md shadow-[#2563EB]/20"
                rightIcon={<ArrowRight className="h-4 w-4" />}
              >
                Review Selection
              </GlassButton>
            </div>
          </div>
        </GlassCard>
      )}

      {/* ========================================================================= */}
      {/* STEP 3: REVIEW SELECTION & CONFIRMATION */}
      {/* ========================================================================= */}
      {state.step === 3 && (
        <GlassCard glowColor="rgba(37, 99, 235, 0.15)" className="p-6 sm:p-10 border border-white/90 shadow-xl space-y-6">
          <div className="text-center sm:text-left space-y-1.5 border-b border-slate-100 pb-5">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#2563EB]/10 text-[#2563EB] text-xs font-bold uppercase tracking-wider border border-[#2563EB]/20">
              <ShieldCheck className="w-3.5 h-3.5" /> Review Enrollment Selection
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Confirm Your Program Selection
            </h2>
            <p className="text-xs sm:text-sm text-slate-500">
              Verify your learner credentials and selected curriculum before proceeding. Payment is only initiated when you deliberately choose to check out.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Learner Info Summary */}
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-600">Learner Profile</span>
                <span className="text-[11px] text-emerald-600 font-bold">✓ Verified Free Account</span>
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
                <span className="text-xs font-bold uppercase tracking-wider text-blue-950">
                  {state.selectionType === "EDUCATOR" ? "1-on-1 Educator Booking" : "Course Enrollment"}
                </span>
                <span className="text-[11px] text-[#2563EB] font-bold">
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
                      <Clock className="w-3.5 h-3.5 text-[#2563EB]" /> Date: <span className="font-bold">{state.selectedDate}</span>
                    </div>
                    <div className="text-slate-700 text-xs font-semibold flex items-center gap-1.5">
                      <Video className="w-3.5 h-3.5 text-[#2563EB]" /> Time Slot: <span className="font-bold">{state.selectedSlotTime}</span>
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
              <span className="text-blue-400 font-medium">Included (₹0)</span>
            </div>
            <div className="flex justify-between text-xs text-slate-400">
              <span>Goods & Services Tax (GST)</span>
              <span className="text-white font-medium">Included</span>
            </div>
            <div className="border-t border-slate-800 pt-3 flex justify-between items-center">
              <div>
                <span className="text-sm font-bold text-white block">Total Payable</span>
                {activePrice > 0 && (
                  <span className="text-[11px] text-slate-400 font-normal">
                    Secure checkout via Cashfree Payments
                  </span>
                )}
              </div>
              <span className={`text-2xl font-black ${activePrice === 0 ? "text-emerald-400" : "text-blue-400"}`}>
                {activePrice === 0 ? "FREE" : formatCurrency(activePrice)}
              </span>
            </div>
          </div>

          {/* Navigation Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
            <button
              type="button"
              onClick={() => setState((p) => ({ ...p, step: 2 }))}
              className="text-xs font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1 cursor-pointer order-2 sm:order-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Modify Selection
            </button>

            <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto order-1 sm:order-2">
              {activePrice > 0 && (
                <button
                  type="button"
                  onClick={() => setState((p) => ({ ...p, step: 7 }))}
                  className="w-full sm:w-auto px-4 py-3 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Skip Payment & Go to Dashboard
                </button>
              )}

              <GlassButton
                type="button"
                variant="primary"
                onClick={handleInitiatePayment}
                className={`w-full sm:w-auto text-white font-bold px-8 py-3.5 shadow-lg ${
                  activePrice === 0
                    ? "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20"
                    : "bg-[#2563EB] hover:bg-[#1E40AF] shadow-[#2563EB]/25"
                }`}
                rightIcon={activePrice === 0 ? <Check className="h-4 w-4" /> : <CreditCard className="h-4 w-4" />}
              >
                {activePrice === 0
                  ? "Complete Free Enrollment"
                  : state.selectionType === "EDUCATOR" || state.isTrial
                  ? `Pay ${formatCurrency(activePrice)} & Book Session`
                  : `Pay ${formatCurrency(activePrice)} via Cashfree`}
              </GlassButton>
            </div>
          </div>
        </GlassCard>
      )}

      {/* ========================================================================= */}
      {/* STEP 4 & 5: CASHFREE PAYMENT & SERVER VERIFICATION */}
      {/* (Only reached when user deliberately clicked Pay in Step 3) */}
      {/* ========================================================================= */}
      {(state.step === 4 || state.step === 5) && (
        <GlassCard glowColor="rgba(37, 99, 235, 0.15)" className="p-8 sm:p-12 border border-white/90 shadow-2xl space-y-6 text-center">
          {state.paymentLoading ? (
            <div className="space-y-4 py-8">
              <div className="w-14 h-14 border-4 border-[#2563EB]/30 border-t-[#2563EB] rounded-full animate-spin mx-auto" />
              <div className="space-y-1">
                <h3 className="text-xl font-bold text-slate-900">
                  {state.step === 4 ? "Connecting to Cashfree Payments..." : "Verifying Payment with Cashfree..."}
                </h3>
                <p className="text-xs text-slate-500">
                  Please do not close or refresh this window while we verify your transaction.
                </p>
              </div>
              <div className="pt-4">
                <button
                  type="button"
                  onClick={() => setState((p) => ({ ...p, step: 3, paymentLoading: false }))}
                  className="text-xs text-slate-500 hover:text-slate-800 underline"
                >
                  Cancel and return to review
                </button>
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
                <GlassButton variant="primary" className="w-full bg-[#2563EB] hover:bg-[#1E40AF] text-white">
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
                <h3 className="text-lg font-bold text-slate-900">Payment Notice</h3>
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
                <button
                  type="button"
                  onClick={() => setState((p) => ({ ...p, step: 7, paymentError: null }))}
                  className="w-full py-3 rounded-xl border border-blue-200 text-[#2563EB] text-xs font-bold hover:bg-blue-50"
                >
                  Skip to Free Dashboard
                </button>
                <GlassButton
                  type="button"
                  variant="primary"
                  onClick={handleInitiatePayment}
                  className="w-full bg-[#2563EB] hover:bg-[#1E40AF] text-white font-bold"
                >
                  Retry Payment
                </GlassButton>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-full bg-blue-100 text-[#2563EB] flex items-center justify-center mx-auto">
                <CreditCard className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Cashfree Checkout Ready</h3>
              <p className="text-xs text-slate-500">Click below if checkout did not open automatically.</p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => setState((p) => ({ ...p, step: 7 }))}
                  className="px-5 py-3 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50"
                >
                  Skip to Dashboard
                </button>
                <GlassButton
                  type="button"
                  variant="primary"
                  onClick={handleInitiatePayment}
                  className="bg-[#2563EB] hover:bg-[#1E40AF] text-white font-bold px-8"
                >
                  {state.selectionType === "EDUCATOR" || state.isTrial ? "Book Now" : "Pay Now"}
                </GlassButton>
              </div>
            </div>
          )}
        </GlassCard>
      )}

      {/* ========================================================================= */}
      {/* STEP 6: ACCOUNT SETUP & ENROLLMENT FINALIZATION */}
      {/* ========================================================================= */}
      {state.step === 6 && (
        <GlassCard glowColor="rgba(37, 99, 235, 0.2)" className="p-8 sm:p-12 border border-white/90 shadow-2xl text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto animate-bounce">
            <CheckCircle2 className="w-9 h-9" />
          </div>
          <h2 className="text-2xl font-black text-slate-900">Configuring Your Account...</h2>
          <p className="text-xs text-slate-600 max-w-md mx-auto">
            Setting up your personalized learner privileges, classroom timetable, and verified dashboard...
          </p>
          <div className="w-32 h-1.5 bg-slate-100 rounded-full overflow-hidden mx-auto">
            <div className="w-full h-full bg-[#2563EB] animate-pulse" />
          </div>
        </GlassCard>
      )}

      {/* ========================================================================= */}
      {/* STEP 7: READY & DASHBOARD SUCCESS SCREEN */}
      {/* Handles both Free Learner Registration and Confirmed Program Enrollment */}
      {/* ========================================================================= */}
      {state.step === 7 && (
        <GlassCard glowColor="rgba(37, 99, 235, 0.2)" className="p-6 sm:p-10 lg:p-12 border border-white/90 shadow-2xl text-center max-w-xl mx-auto space-y-7">
          {/* Circular Welcome Icon with Balanced Vertical Spacing */}
          <div className="w-20 h-20 sm:w-22 sm:h-22 rounded-full bg-[#2563EB]/10 text-[#2563EB] border-2 border-[#2563EB]/25 flex items-center justify-center mx-auto shadow-xl shadow-[#2563EB]/15 mb-2 transition-transform hover:scale-105">
            <Sparkles className="w-9 h-9 sm:w-10 sm:h-10 text-[#2563EB]" />
          </div>

          {/* Differentiate between Confirmed Paid/Free Enrollment vs Free Registration Account */}
          {state.transactionData || state.orderData?.isFree ? (
            <>
              <div className="space-y-3.5 sm:space-y-4 max-w-lg mx-auto">
                <div>
                  <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold uppercase tracking-wider shadow-2xs">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> Registration & Enrollment Complete
                  </span>
                </div>
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 tracking-tight leading-snug sm:leading-tight pt-1">
                  Your EduConnects account is ready!
                </h1>
                <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
                  Welcome to the learner community, <span className="font-bold text-slate-900">{state.fullName || "Learner"}</span>! Your course enrollment is confirmed and your interactive classroom workspace is unlocked.
                </p>
              </div>

              {/* Enrolled Details Card */}
              <div className="p-6 sm:p-7 rounded-2xl bg-blue-50/80 border border-blue-200 text-left max-w-md mx-auto space-y-3 text-xs sm:text-sm shadow-xs">
                <div className="flex justify-between items-center text-slate-600 pb-3 border-b border-blue-200/80 font-medium">
                  <span>Status</span>
                  <span className="font-bold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-md text-xs">Active Enrollment ✓</span>
                </div>
                <div className="flex justify-between items-center gap-3">
                  <span className="text-slate-600 shrink-0 font-medium">Enrolled Program:</span>
                  <span className="font-bold text-slate-900 text-right truncate">
                    {state.selectedCourse ? state.selectedCourse.title : state.selectedEducator?.name || "EduConnects Curriculum"}
                  </span>
                </div>
                <div className="flex justify-between items-center gap-3">
                  <span className="text-slate-600 shrink-0 font-medium">Access Mode:</span>
                  <span className="font-semibold text-[#1E40AF]">Full Browser Classroom & LMS</span>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="space-y-3.5 sm:space-y-4 max-w-lg mx-auto">
                <div>
                  <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold uppercase tracking-wider shadow-2xs">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> Free Learner Account Active
                  </span>
                </div>
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 tracking-tight leading-snug sm:leading-tight pt-1">
                  Welcome to EduConnects, {state.fullName || "Learner"}!
                </h1>
                <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
                  Your account is verified and ready. You now have full free access to explore certified courses, view educator timetables, and access community learning resources.
                </p>
              </div>

              {/* Free Benefits Card with Spacious, Neatly Aligned Rows */}
              <div className="p-6 sm:p-7 rounded-2xl bg-slate-50/90 border border-slate-200/90 text-left max-w-md mx-auto shadow-xs">
                <div className="font-bold text-xs sm:text-sm text-slate-900 pb-3 mb-4 border-b border-slate-200/90 flex items-center justify-between">
                  <span>Your Free Learner Privileges:</span>
                  <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-700">Included</span>
                </div>

                <div className="space-y-3.5">
                  <div className="flex items-start gap-3 text-slate-700 text-xs sm:text-sm leading-relaxed">
                    <div className="p-0.5 rounded-full bg-emerald-100 text-emerald-700 shrink-0 mt-0.5">
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </div>
                    <span className="font-medium">Personalized learner dashboard and study progress tracking</span>
                  </div>

                  <div className="flex items-start gap-3 text-slate-700 text-xs sm:text-sm leading-relaxed">
                    <div className="p-0.5 rounded-full bg-emerald-100 text-emerald-700 shrink-0 mt-0.5">
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </div>
                    <span className="font-medium">Browse 100+ accredited curricula and verified tutor profiles</span>
                  </div>

                  <div className="flex items-start gap-3 text-slate-700 text-xs sm:text-sm leading-relaxed">
                    <div className="p-0.5 rounded-full bg-emerald-100 text-emerald-700 shrink-0 mt-0.5">
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </div>
                    <span className="font-medium">24/7 access to free study guides, sample lessons, and webinars</span>
                  </div>

                  <div className="flex items-start gap-3 text-slate-700 text-xs sm:text-sm leading-relaxed">
                    <div className="p-0.5 rounded-full bg-emerald-100 text-emerald-700 shrink-0 mt-0.5">
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </div>
                    <span className="font-medium">Zero upfront commitment — pay only when you enroll in paid programs</span>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Primary Action Button */}
          <div className="pt-4 sm:pt-6 max-w-md mx-auto w-full">
            <Link href="/student/dashboard" className="block w-full">
              <GlassButton
                variant="primary"
                size="lg"
                className="w-full min-h-[50px] sm:min-h-[52px] bg-[#2563EB] hover:bg-[#1E40AF] active:bg-[#1D4ED8] text-white font-bold py-3.5 px-6 rounded-2xl text-sm sm:text-base shadow-xl shadow-[#2563EB]/25 transition-all inline-flex items-center justify-center gap-2.5"
                rightIcon={<ArrowRight className="w-4 h-4 shrink-0" />}
              >
                Go to Learner Dashboard
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
