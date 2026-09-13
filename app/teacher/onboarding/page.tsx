"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { GlassCard } from "@/components/glass/glass-card";
import { GlassButton } from "@/components/glass/glass-button";
import { StatusBadge } from "@/components/ui/status-badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { DocumentViewerModal } from "@/components/shared/document-viewer-modal";
import { BackButton } from "@/components/ui/back-button";
import { QualificationItem, CertificateItem, DocumentItem, VerificationStatus } from "@/types/auth";
import { formatCurrency } from "@/lib/currency";
import {
  CheckCircle2,
  User,
  Briefcase,
  GraduationCap,
  Award,
  FileText,
  ShieldCheck,
  Plus,
  Trash2,
  Upload,
  Eye,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Loader2,
  Sparkles,
  Lock,
  Landmark,
  Clock,
  ExternalLink,
} from "lucide-react";

export default function TeacherOnboardingPage() {
  const router = useRouter();
  const { showToast } = useToast();

  const [activeStep, setActiveStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submittedSuccess, setSubmittedSuccess] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);

  // User state
  const [userInfo, setUserInfo] = useState({
    id: "",
    email: "",
    emailVerified: false,
    role: "TEACHER",
  });

  // Step 1: Personal Form State
  const [personal, setPersonal] = useState({
    firstName: "",
    lastName: "",
    avatarUrl: "",
    phone: "",
    bio: "",
    location: "",
  });

  // Step 2: Educator & Professional Details State
  const [professional, setProfessional] = useState({
    headline: "",
    subjects: ["Mathematics", "Physics"],
    experienceYears: 5,
    hourlyRate: 500,
    languages: ["English"],
    teachingMode: "ONLINE",
    verificationStatus: "PENDING" as VerificationStatus,
    submittedAt: null as string | null,
  });

  // Step 4: Bank Account Details State
  const [bankDetails, setBankDetails] = useState({
    accountHolderName: "",
    accountNumber: "",
    bankName: "",
    ifscCode: "",
    cancelledChequeUrl: "",
  });

  // Lists State
  const [qualifications, setQualifications] = useState<QualificationItem[]>([]);
  const [certificates, setCertificates] = useState<CertificateItem[]>([]);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [readiness, setReadiness] = useState({ isReady: false, completionPercentage: 0, missingItems: [] as string[] });

  // Modal / Form States
  const [viewDoc, setViewDoc] = useState<DocumentItem | null>(null);

  // Add Qualification Form Modal
  const [showQualModal, setShowQualModal] = useState(false);
  const [newQual, setNewQual] = useState({ degree: "", institution: "", specialization: "", year: new Date().getFullYear(), description: "" });

  // Add Certificate Form Modal
  const [showCertModal, setShowCertModal] = useState(false);
  const [newCert, setNewCert] = useState({ name: "", issuer: "", issueDate: "", expiryDate: "", description: "" });

  // Document Upload Form
  const [showDocModal, setShowDocModal] = useState(false);
  const [uploadCategory, setUploadCategory] = useState("IDENTITY");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadingDoc, setUploadingDoc] = useState(false);

  // Dedicated Cheque Upload State
  const [uploadingCheque, setUploadingCheque] = useState(false);

  // Subject options
  const AVAILABLE_SUBJECTS = ["Mathematics", "Physics", "Chemistry", "Biology", "Computer Science", "Programming", "English", "Economics", "Statistics", "Commerce"];
  const AVAILABLE_LANGUAGES = ["English", "Hindi", "Bengali", "Marathi", "Telugu", "Tamil", "Gujarati", "Kannada", "Spanish", "French"];

  useEffect(() => {
    fetchOnboardingData();
  }, []);

  const fetchOnboardingData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/teacher/onboarding");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load onboarding status");

      setUserInfo(json.data.user);
      setPersonal(json.data.profile);
      setProfessional(json.data.teacherProfile);
      setBankDetails({
        accountHolderName: json.data.teacherProfile.accountHolderName || "",
        accountNumber: json.data.teacherProfile.accountNumber || "",
        bankName: json.data.teacherProfile.bankName || "",
        ifscCode: json.data.teacherProfile.ifscCode || "",
        cancelledChequeUrl: json.data.teacherProfile.cancelledChequeUrl || "",
      });
      setQualifications(json.data.qualifications || []);
      setCertificates(json.data.certificates || []);
      setDocuments(json.data.documents || []);
      setReadiness(json.data.readiness || { isReady: false, completionPercentage: 0, missingItems: [] });

      // If already submitted and under review, show submitted confirmation view
      if (json.data.teacherProfile.verificationStatus === "PENDING" && json.data.teacherProfile.submittedAt) {
        setSubmittedSuccess(true);
      }
    } catch (err: any) {
      showToast("Error Loading Onboarding", err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  // STEP VALIDATION LOGIC FOR THE 5 STEPS
  const isStepValid = (stepNum: number): { valid: boolean; reason?: string } => {
    if (stepNum === 1) {
      if (!personal.firstName?.trim()) return { valid: false, reason: "First name is required." };
      if (!personal.lastName?.trim()) return { valid: false, reason: "Last name is required." };
      if (!personal.phone?.trim() || personal.phone.trim().length < 8) {
        return { valid: false, reason: "A valid contact phone number is required." };
      }
      if (!personal.bio?.trim() || personal.bio.trim().length < 10) {
        return { valid: false, reason: "Biography is required (minimum 10 characters)." };
      }
      return { valid: true };
    }

    if (stepNum === 2) {
      if (!professional.headline?.trim()) return { valid: false, reason: "Professional headline is required." };
      if (!professional.subjects || professional.subjects.length === 0) {
        return { valid: false, reason: "At least one teaching subject must be selected." };
      }
      if (professional.experienceYears === undefined || professional.experienceYears < 0) {
        return { valid: false, reason: "Years of experience is required." };
      }
      if (!professional.hourlyRate || professional.hourlyRate <= 0) {
        return { valid: false, reason: "Hourly rate must be greater than ₹0." };
      }
      if (!qualifications || qualifications.length === 0) {
        return { valid: false, reason: "At least one Educational Qualification must be added." };
      }
      return { valid: true };
    }

    if (stepNum === 3) {
      const hasIdentityDoc = documents.some((d) => d.category === "IDENTITY");
      if (!hasIdentityDoc) {
        return { valid: false, reason: "At least one Identity Document (Passport / Aadhaar / Driving License) must be uploaded." };
      }
      return { valid: true };
    }

    if (stepNum === 4) {
      if (!bankDetails.accountHolderName?.trim()) return { valid: false, reason: "Account Holder Name is required." };
      if (!bankDetails.accountNumber?.trim() || bankDetails.accountNumber.trim().length < 6) {
        return { valid: false, reason: "Valid Bank Account Number is required." };
      }
      if (!bankDetails.bankName?.trim()) return { valid: false, reason: "Bank Name is required." };
      if (!bankDetails.ifscCode?.trim() || bankDetails.ifscCode.trim().length < 8) {
        return { valid: false, reason: "Valid Bank IFSC Code is required." };
      }
      const hasCancelledCheque = !!bankDetails.cancelledChequeUrl || documents.some((d) => d.category === "CANCELLED_CHEQUE");
      if (!hasCancelledCheque) {
        return { valid: false, reason: "Cancelled Cheque upload (JPG/PNG/PDF <= 10MB) is required." };
      }
      return { valid: true };
    }

    if (stepNum === 5) {
      return { valid: termsAccepted, reason: "Please review and accept the terms declaration checkbox before submitting." };
    }

    return { valid: true };
  };

  const canAccessStep = (targetStep: number): boolean => {
    if (targetStep <= 1) return true;
    for (let i = 1; i < targetStep; i++) {
      if (!isStepValid(i).valid) return false;
    }
    return true;
  };

  const handleStepClick = (targetStep: number) => {
    if (targetStep === activeStep) return;
    if (targetStep < activeStep) {
      setActiveStep(targetStep);
      return;
    }
    for (let i = 1; i < targetStep; i++) {
      const check = isStepValid(i);
      if (!check.valid) {
        showToast("Step Locked 🔒", `Complete Step 0${i} first: ${check.reason}`, "error");
        setActiveStep(i);
        return;
      }
    }
    setActiveStep(targetStep);
  };

  // Handlers for profile updates
  const handleSaveProfile = async (quiet = false) => {
    setSaving(true);
    try {
      const res = await fetch("/api/teacher/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...personal,
          ...professional,
          ...bankDetails,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to save profile details");

      await fetchOnboardingData();
      if (!quiet) showToast("Profile Saved", "Educator profile details updated successfully.", "success");
      return true;
    } catch (err: any) {
      showToast("Save Error", err.message, "error");
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleNextStep = async () => {
    const currentValidation = isStepValid(activeStep);
    if (!currentValidation.valid) {
      showToast("Step Incomplete 🔒", currentValidation.reason || "Please complete all required fields.", "error");
      return;
    }

    // Auto-save on next
    const saved = await handleSaveProfile(true);
    if (!saved) return;

    if (activeStep < 5) {
      setActiveStep((prev) => prev + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handlePrevStep = () => {
    if (activeStep > 1) {
      setActiveStep((prev) => prev - 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  // Qualification CRUD
  const handleAddQualification = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/teacher/qualifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newQual),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to add qualification");

      showToast("Qualification Added", "Educational degree added.", "success");
      setShowQualModal(false);
      setNewQual({ degree: "", institution: "", specialization: "", year: new Date().getFullYear(), description: "" });
      fetchOnboardingData();
    } catch (err: any) {
      showToast("Qualification Error", err.message, "error");
    }
  };

  const handleDeleteQualification = async (id: string) => {
    try {
      const res = await fetch(`/api/teacher/qualifications/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete qualification");
      showToast("Qualification Removed", "", "info");
      fetchOnboardingData();
    } catch (err: any) {
      showToast("Error", err.message, "error");
    }
  };

  // Certificate CRUD
  const handleAddCertificate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/teacher/certificates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newCert),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to add certificate");

      showToast("Certificate Added", "Certification record saved.", "success");
      setShowCertModal(false);
      setNewCert({ name: "", issuer: "", issueDate: "", expiryDate: "", description: "" });
      fetchOnboardingData();
    } catch (err: any) {
      showToast("Certificate Error", err.message, "error");
    }
  };

  const handleDeleteCertificate = async (id: string) => {
    try {
      const res = await fetch(`/api/teacher/certificates/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete certificate");
      showToast("Certificate Removed", "", "info");
      fetchOnboardingData();
    } catch (err: any) {
      showToast("Error", err.message, "error");
    }
  };

  // General Document Upload (Identity / Qualification)
  const handleUploadDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) {
      showToast("File Required", "Please select a file to upload.", "error");
      return;
    }

    if (uploadFile.size > 10 * 1024 * 1024) {
      showToast("File Too Large", "File size must not exceed 10MB.", "error");
      return;
    }

    setUploadingDoc(true);
    try {
      const formData = new FormData();
      formData.append("file", uploadFile);
      formData.append("category", uploadCategory);

      const res = await fetch("/api/teacher/documents", {
        method: "POST",
        body: formData,
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Document upload failed");

      showToast("Document Uploaded", `${uploadFile.name} uploaded securely.`, "success");
      setShowDocModal(false);
      setUploadFile(null);
      fetchOnboardingData();
    } catch (err: any) {
      showToast("Upload Error", err.message, "error");
    } finally {
      setUploadingDoc(false);
    }
  };

  // Dedicated Cancelled Cheque Upload Handler
  const handleUploadCancelledCheque = async (file: File) => {
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      showToast("File Too Large", "Cancelled cheque file size must not exceed 10MB.", "error");
      return;
    }

    setUploadingCheque(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("category", "CANCELLED_CHEQUE");

      const res = await fetch("/api/teacher/documents", {
        method: "POST",
        body: formData,
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Cancelled cheque upload failed");

      const chequeDocId = json.data?.document?.id;
      const chequeUrl = chequeDocId ? `/api/documents/${chequeDocId}` : "";

      setBankDetails((prev) => ({
        ...prev,
        cancelledChequeUrl: chequeUrl,
      }));

      showToast("Cancelled Cheque Uploaded", "Cheque document saved securely.", "success");
      await fetchOnboardingData();
    } catch (err: any) {
      showToast("Upload Error", err.message, "error");
    } finally {
      setUploadingCheque(false);
    }
  };

  const handleDeleteDocument = async (id: string) => {
    try {
      const res = await fetch(`/api/teacher/documents/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete document");
      showToast("Document Deleted", "", "info");
      fetchOnboardingData();
    } catch (err: any) {
      showToast("Error", err.message, "error");
    }
  };

  // Submit Application for Verification (Step 5)
  const handleSubmitVerification = async () => {
    if (!termsAccepted) {
      showToast("Confirmation Required", "Please check the confirmation declaration box before submitting.", "error");
      return;
    }

    setSubmitting(true);
    try {
      await handleSaveProfile(true);

      const res = await fetch("/api/teacher/verification/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...bankDetails,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to submit verification application");

      setSubmittedSuccess(true);
      showToast("Application Submitted! 🎓", "Your educator application has been submitted for verification.", "success");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err: any) {
      showToast("Submission Failed", err.message, "error");
    } finally {
      setSubmitting(false);
    }
  };

  const steps = [
    { number: 1, title: "Personal Information", icon: User },
    { number: 2, title: "Educator Details", icon: Briefcase },
    { number: 3, title: "Identity Documents", icon: FileText },
    { number: 4, title: "Bank Account Details", icon: Landmark },
    { number: 5, title: "Review & Submit", icon: ShieldCheck },
  ];

  if (loading) {
    return (
      <DashboardLayout role="TEACHER" userName={personal.firstName || "Educator"} userEmail={userInfo.email}>
        <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
          <Loader2 className="h-10 w-10 text-emerald-600 animate-spin" />
          <p className="text-sm font-semibold text-slate-600">Loading Educator Verification System...</p>
        </div>
      </DashboardLayout>
    );
  }

  // =========================================================================
  // CONFIRMATION VIEW (AFTER SUBMISSION OR WHEN UNDER REVIEW)
  // =========================================================================
  if (submittedSuccess) {
    return (
      <DashboardLayout role="TEACHER" userName={personal.firstName || "Educator"} userEmail={userInfo.email}>
        <div className="max-w-3xl mx-auto py-8 space-y-8">
          <div className="bg-white rounded-3xl border border-emerald-200 shadow-xl p-8 sm:p-10 space-y-8 text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-2.5 bg-gradient-to-r from-emerald-500 via-teal-500 to-blue-500" />

            <div className="mx-auto w-20 h-20 bg-emerald-100 rounded-3xl flex items-center justify-center text-emerald-600 shadow-inner">
              <CheckCircle2 className="h-12 w-12" />
            </div>

            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-black bg-amber-100 text-amber-900 border border-amber-300 uppercase tracking-wider">
                <Clock className="h-3.5 w-3.5 animate-pulse" />
                <span>Verification Status: UNDER REVIEW</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                Application Submitted Successfully
              </h1>
            </div>

            {/* EXACT CONFIRMATION MESSAGE REQUIRED BY SPEC */}
            <div className="p-6 rounded-2xl bg-emerald-50/80 border border-emerald-200 text-left space-y-3 shadow-2xs">
              <div className="flex items-center gap-2 text-emerald-900 font-extrabold text-sm">
                <ShieldCheck className="h-5 w-5 text-emerald-600" />
                <span>Official EduConnects Submission Confirmation</span>
              </div>
              <p className="text-sm sm:text-base font-bold text-emerald-950 leading-relaxed">
                Thank You for applying. We shall verify your documents, and if they meet our policy requirements, the next round will proceed. You will be informed through our official email, WhatsApp, or via call.
              </p>
            </div>

            {/* What happens next details */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-left text-xs">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
                <div className="font-black text-slate-900 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">1</span>
                  <span>Document Audit</span>
                </div>
                <p className="text-slate-600">Verification team checks your qualifications, KYC ID, and bank details.</p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
                <div className="font-black text-slate-900 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px]">2</span>
                  <span>Direct Outreach</span>
                </div>
                <p className="text-slate-600">We will reach out via email, WhatsApp, or phone call for the next round.</p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
                <div className="font-black text-slate-900 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-purple-600 text-white flex items-center justify-center text-[10px]">3</span>
                  <span>Teaching Unlocked</span>
                </div>
                <p className="text-slate-600">Upon approval, live classroom creation and course publishing are unlocked.</p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/teacher/dashboard" className="w-full sm:w-auto">
                <GlassButton variant="primary" size="md" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold">
                  Go to Educator Dashboard
                </GlassButton>
              </Link>
              <Link href="/teacher/verification" className="w-full sm:w-auto">
                <GlassButton variant="secondary" size="md" className="w-full font-bold">
                  View Verification Status
                </GlassButton>
              </Link>
              <button
                onClick={() => setSubmittedSuccess(false)}
                className="text-xs font-bold text-slate-500 hover:text-slate-700 underline"
              >
                Review or Edit Application Data
              </button>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const currentStepValidation = isStepValid(activeStep);
  const chequeDoc = documents.find((d) => d.category === "CANCELLED_CHEQUE");

  return (
    <DashboardLayout role="TEACHER" userName={personal.firstName || "Educator"} userEmail={userInfo.email}>
      <div className="space-y-8 pb-16 max-w-5xl mx-auto font-sans">
        {/* Top Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <BackButton
              fallbackUrl="/teacher/dashboard"
              label="Back to Dashboard"
              variant="default"
              className="mb-3"
            />
            <div className="flex items-center gap-3">
              <h1 className="text-2xl lg:text-3xl font-black text-slate-900 tracking-tight">
                Educator Verification & KYC Setup
              </h1>
              <StatusBadge status={professional.verificationStatus} />
            </div>
            <p className="text-xs lg:text-sm text-slate-500 mt-1">
              Complete the 5 required steps below to submit your profile for verified educator accreditation.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <div className="text-xs font-bold text-slate-700">Verification Readiness</div>
              <div className="text-sm font-black text-emerald-600">{readiness.completionPercentage}% Complete</div>
            </div>
            <div className="w-28 bg-slate-200 h-3 rounded-full overflow-hidden">
              <div
                className="bg-emerald-600 h-full transition-all duration-500 rounded-full"
                style={{ width: `${readiness.completionPercentage}%` }}
              />
            </div>
          </div>
        </div>

        {/* 5-Step Navigation Indicator with Next/Back and Lock Icons */}
        <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs overflow-x-auto">
          <div className="flex items-center justify-between min-w-[680px] px-2">
            {steps.map((step) => {
              const accessible = canAccessStep(step.number);
              const isCompleted = activeStep > step.number || (step.number === 5 && readiness.isReady);
              const isCurrent = activeStep === step.number;

              return (
                <button
                  key={step.number}
                  onClick={() => handleStepClick(step.number)}
                  disabled={!accessible}
                  className={`flex flex-col items-center gap-1.5 transition-all group ${
                    isCurrent
                      ? "text-emerald-700 font-black"
                      : isCompleted
                      ? "text-emerald-600 font-bold"
                      : accessible
                      ? "text-slate-600 hover:text-emerald-700 font-medium"
                      : "text-slate-300 cursor-not-allowed opacity-60 font-normal"
                  }`}
                  title={!accessible ? `Locked: Complete Step 0${step.number - 1} first` : step.title}
                >
                  <div
                    className={`w-10 h-10 rounded-2xl flex items-center justify-center text-xs font-black transition-all shadow-xs ${
                      isCurrent
                        ? "bg-emerald-600 text-white ring-4 ring-emerald-100 scale-105"
                        : isCompleted
                        ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                        : accessible
                        ? "bg-slate-100 text-slate-700 border border-slate-300"
                        : "bg-slate-100 text-slate-400 border border-slate-200"
                    }`}
                  >
                    {!accessible ? (
                      <Lock className="h-4 w-4 text-slate-400" />
                    ) : isCompleted ? (
                      <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                    ) : (
                      step.number
                    )}
                  </div>
                  <span className="text-xs whitespace-nowrap flex items-center gap-1">
                    Step {step.number}: {step.title}
                    {!accessible && <Lock className="h-3 w-3 text-slate-400" />}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* STEP CONTENT CONTAINER */}
        <GlassCard className="p-6 md:p-8 space-y-6 border border-slate-200 bg-white">
          {/* Validation Warning Alert for current step if invalid */}
          {!currentStepValidation.valid && (
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong className="block font-bold">Step 0{activeStep} Incomplete 🔒</strong>
                <span>{currentStepValidation.reason} Complete this step to proceed to the next step.</span>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 1: PERSONAL INFORMATION */}
          {/* ========================================================================= */}
          {activeStep === 1 && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
                  <User className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-900">Step 1: Personal Information</h2>
                  <p className="text-xs text-slate-500">Provide your legal personal and contact information</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    First Name <span className="text-rose-500">*</span>
                  </label>
                  <Input
                    placeholder="e.g. Sameer"
                    value={personal.firstName}
                    onChange={(e) => setPersonal({ ...personal, firstName: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Last Name <span className="text-rose-500">*</span>
                  </label>
                  <Input
                    placeholder="e.g. Shrivastava"
                    value={personal.lastName}
                    onChange={(e) => setPersonal({ ...personal, lastName: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Email Address (Account ID)
                  </label>
                  <Input
                    disabled
                    value={userInfo.email}
                    className="bg-slate-50 cursor-not-allowed font-medium text-slate-500"
                  />
                  <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3 text-emerald-500" /> Account email registered
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Contact Phone Number <span className="text-rose-500">*</span>
                  </label>
                  <Input
                    placeholder="e.g. +91 98765 43210"
                    value={personal.phone}
                    onChange={(e) => setPersonal({ ...personal, phone: e.target.value })}
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Used for interview calls and WhatsApp coordination for your next round.
                  </p>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Current City / State / Location
                  </label>
                  <Input
                    placeholder="e.g. Indore, Madhya Pradesh, India"
                    value={personal.location}
                    onChange={(e) => setPersonal({ ...personal, location: e.target.value })}
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Educator Biography <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    rows={4}
                    placeholder="Tell us about your teaching philosophy, expertise, background, and why you want to teach on EduConnects (minimum 10 characters)..."
                    value={personal.bio}
                    onChange={(e) => setPersonal({ ...personal, bio: e.target.value })}
                    className="w-full rounded-2xl border border-slate-200 p-4 text-xs font-medium text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Navigation Actions for Step 1 */}
              <div className="pt-6 border-t border-slate-100 flex items-center justify-between">
                <div className="text-xs text-slate-400">
                  Step 1 of 5: Personal Info
                </div>
                <GlassButton
                  variant="primary"
                  size="md"
                  onClick={handleNextStep}
                  isLoading={saving}
                  rightIcon={<ArrowRight className="h-4 w-4" />}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-black"
                >
                  Next: Educator Details
                </GlassButton>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 2: EDUCATOR DETAILS */}
          {/* ========================================================================= */}
          {activeStep === 2 && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
                  <Briefcase className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-900">Step 2: Educator Details & Qualifications</h2>
                  <p className="text-xs text-slate-500">Subjects taught, teaching experience, and educational degrees</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Professional Educator Headline <span className="text-rose-500">*</span>
                  </label>
                  <Input
                    placeholder="e.g. Senior IIT-JEE Mathematics Specialist & EdTech Mentor"
                    value={professional.headline}
                    onChange={(e) => setProfessional({ ...professional, headline: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Teaching Experience (Years) <span className="text-rose-500">*</span>
                    </label>
                    <Input
                      type="number"
                      min={0}
                      value={professional.experienceYears}
                      onChange={(e) => setProfessional({ ...professional, experienceYears: Number(e.target.value) })}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Target Hourly Rate (₹/hr) <span className="text-rose-500">*</span>
                    </label>
                    <Input
                      type="number"
                      min={0}
                      value={professional.hourlyRate}
                      onChange={(e) => setProfessional({ ...professional, hourlyRate: Number(e.target.value) })}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Preferred Teaching Mode
                    </label>
                    <select
                      value={professional.teachingMode}
                      onChange={(e) => setProfessional({ ...professional, teachingMode: e.target.value })}
                      className="w-full rounded-2xl border border-slate-200 p-3 text-xs font-bold text-slate-900 bg-white"
                    >
                      <option value="ONLINE">Live Online Only</option>
                      <option value="HYBRID">Hybrid (Online & In-person)</option>
                      <option value="OFFLINE">In-Person Only</option>
                    </select>
                  </div>
                </div>

                {/* Teaching Subjects Selection */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2">
                    Primary Teaching Subjects <span className="text-rose-500">*</span>
                  </label>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {AVAILABLE_SUBJECTS.map((sub) => {
                      const isSelected = professional.subjects.includes(sub);
                      return (
                        <button
                          key={sub}
                          type="button"
                          onClick={() => {
                            if (isSelected) {
                              setProfessional({
                                ...professional,
                                subjects: professional.subjects.filter((s) => s !== sub),
                              });
                            } else {
                              setProfessional({
                                ...professional,
                                subjects: [...professional.subjects, sub],
                              });
                            }
                          }}
                          className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all ${
                            isSelected
                              ? "bg-emerald-600 text-white shadow-xs"
                              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                          }`}
                        >
                          {isSelected ? `✓ ${sub}` : `+ ${sub}`}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Educational Qualifications Section */}
                <div className="pt-4 border-t border-slate-100 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-black text-slate-900 flex items-center gap-1.5">
                        <GraduationCap className="h-4 w-4 text-emerald-600" />
                        <span>Academic Qualifications</span>
                        <span className="text-rose-500">*</span>
                      </h3>
                      <p className="text-[11px] text-slate-500">At least one completed degree or qualification is required</p>
                    </div>

                    <GlassButton
                      variant="secondary"
                      size="sm"
                      onClick={() => setShowQualModal(true)}
                      leftIcon={<Plus className="h-3.5 w-3.5" />}
                      className="font-bold text-xs"
                    >
                      Add Degree
                    </GlassButton>
                  </div>

                  {qualifications.length === 0 ? (
                    <div className="p-6 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                      <GraduationCap className="h-8 w-8 text-slate-400 mx-auto mb-1" />
                      <p className="text-xs font-bold text-slate-600">No educational qualifications added yet.</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">Click "Add Degree" to add your Bachelor's, Master's, or PhD.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {qualifications.map((q) => (
                        <div key={q.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-start justify-between gap-3">
                          <div className="space-y-1">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800">
                              Year {q.year}
                            </span>
                            <h4 className="text-xs font-black text-slate-900">{q.degree}</h4>
                            <p className="text-[11px] font-bold text-slate-600">{q.institution}</p>
                            {q.specialization && (
                              <p className="text-[11px] text-slate-500">Specialization: {q.specialization}</p>
                            )}
                          </div>
                          <button
                            onClick={() => handleDeleteQualification(q.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                            title="Remove Qualification"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Navigation Actions for Step 2 */}
              <div className="pt-6 border-t border-slate-100 flex items-center justify-between">
                <GlassButton
                  variant="secondary"
                  size="md"
                  onClick={handlePrevStep}
                  leftIcon={<ArrowLeft className="h-4 w-4" />}
                  className="font-bold"
                >
                  Back: Personal Info
                </GlassButton>

                <GlassButton
                  variant="primary"
                  size="md"
                  onClick={handleNextStep}
                  isLoading={saving}
                  rightIcon={<ArrowRight className="h-4 w-4" />}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-black"
                >
                  Next: Identity Documents
                </GlassButton>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 3: IDENTITY & CREDENTIAL DOCUMENTS */}
          {/* ========================================================================= */}
          {activeStep === 3 && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                <div className="p-3 bg-purple-50 text-purple-600 rounded-2xl">
                  <FileText className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-900">Step 3: Identity & Credential Documents</h2>
                  <p className="text-xs text-slate-500">Upload government ID (Passport, National ID, Driving License) and degrees</p>
                </div>
              </div>

              {/* Document Actions Header */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl bg-purple-50/60 border border-purple-100">
                <div className="space-y-1">
                  <h3 className="text-xs font-black text-purple-950 flex items-center gap-1.5">
                    <ShieldCheck className="h-4 w-4 text-purple-600" />
                    <span>Regulatory KYC Compliance (JPG, PNG, or PDF &le; 10MB)</span>
                  </h3>
                  <p className="text-[11px] text-purple-800">
                    Your documents are stored in secure private storage and only accessed by authorized verification staff.
                  </p>
                </div>

                <GlassButton
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    setUploadCategory("IDENTITY");
                    setShowDocModal(true);
                  }}
                  leftIcon={<Upload className="h-3.5 w-3.5" />}
                  className="bg-purple-600 hover:bg-purple-700 text-white font-black shrink-0 text-xs"
                >
                  Upload Document
                </GlassButton>
              </div>

              {/* Uploaded Documents List */}
              <div className="space-y-3">
                <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider">
                  Uploaded Verification Documents ({documents.filter((d) => d.category !== "CANCELLED_CHEQUE").length})
                </h3>

                {documents.filter((d) => d.category !== "CANCELLED_CHEQUE").length === 0 ? (
                  <div className="p-8 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50 space-y-2">
                    <FileText className="h-10 w-10 text-slate-400 mx-auto" />
                    <p className="text-xs font-black text-slate-700">No Identity or Credential Documents Uploaded</p>
                    <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                      Please upload at least one government-issued Identity Document (Passport, Aadhaar card, Driving License, or Voter ID).
                    </p>
                    <GlassButton
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        setUploadCategory("IDENTITY");
                        setShowDocModal(true);
                      }}
                      className="mt-2 font-bold text-xs"
                    >
                      Upload Identity Document Now
                    </GlassButton>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {documents
                      .filter((d) => d.category !== "CANCELLED_CHEQUE")
                      .map((doc) => (
                        <div
                          key={doc.id}
                          className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                        >
                          <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-blue-100 text-blue-700 rounded-xl">
                              <FileText className="h-5 w-5" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="text-xs font-black text-slate-900">{doc.fileName}</h4>
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-slate-200 text-slate-800 uppercase">
                                  {doc.category}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-500 mt-0.5">
                                {doc.fileType} • {(doc.fileSize / 1024).toFixed(1)} KB • Uploaded {new Date(doc.uploadedAt).toLocaleDateString()}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 self-end sm:self-center">
                            <button
                              onClick={() => setViewDoc(doc)}
                              className="px-3 py-1.5 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition-colors flex items-center gap-1 shadow-xs"
                            >
                              <Eye className="h-3.5 w-3.5" /> Preview
                            </button>
                            <button
                              onClick={() => handleDeleteDocument(doc.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 rounded-xl hover:bg-rose-50 transition-colors"
                              title="Delete Document"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>

              {/* Navigation Actions for Step 3 */}
              <div className="pt-6 border-t border-slate-100 flex items-center justify-between">
                <GlassButton
                  variant="secondary"
                  size="md"
                  onClick={handlePrevStep}
                  leftIcon={<ArrowLeft className="h-4 w-4" />}
                  className="font-bold"
                >
                  Back: Educator Details
                </GlassButton>

                <GlassButton
                  variant="primary"
                  size="md"
                  onClick={handleNextStep}
                  isLoading={saving}
                  rightIcon={<ArrowRight className="h-4 w-4" />}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-black"
                >
                  Next: Bank Account Details
                </GlassButton>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 4: BANK ACCOUNT DETAILS & CANCELLED CHEQUE */}
          {/* ========================================================================= */}
          {activeStep === 4 && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl">
                  <Landmark className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-900">Step 4: Bank Account Details & Cancelled Cheque</h2>
                  <p className="text-xs text-slate-500">Provide bank information for settlement payouts and upload cancelled cheque</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Account Holder Name <span className="text-rose-500">*</span>
                  </label>
                  <Input
                    placeholder="e.g. SAMEER SHRIVASTAVA"
                    value={bankDetails.accountHolderName}
                    onChange={(e) => setBankDetails({ ...bankDetails, accountHolderName: e.target.value })}
                  />
                  <p className="text-[11px] text-slate-400 mt-1">Must match the name on your identity document and bank passbook.</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Bank Name <span className="text-rose-500">*</span>
                  </label>
                  <Input
                    placeholder="e.g. HDFC Bank / State Bank of India / ICICI"
                    value={bankDetails.bankName}
                    onChange={(e) => setBankDetails({ ...bankDetails, bankName: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Account Number <span className="text-rose-500">*</span>
                  </label>
                  <Input
                    type="password"
                    placeholder="Enter bank account number"
                    value={bankDetails.accountNumber}
                    onChange={(e) => setBankDetails({ ...bankDetails, accountNumber: e.target.value.replace(/\s+/g, "") })}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    IFSC Code <span className="text-rose-500">*</span>
                  </label>
                  <Input
                    placeholder="e.g. HDFC0001234"
                    value={bankDetails.ifscCode}
                    onChange={(e) => setBankDetails({ ...bankDetails, ifscCode: e.target.value.toUpperCase().trim() })}
                    className="uppercase font-mono font-bold"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">11-character Indian Financial System Code printed on cheque.</p>
                </div>
              </div>

              {/* Cancelled Cheque Upload Area */}
              <div className="pt-4 border-t border-slate-100 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-black text-slate-900 flex items-center gap-1.5">
                      <FileText className="h-4 w-4 text-amber-600" />
                      <span>Cancelled Cheque Upload</span>
                      <span className="text-rose-500">*</span>
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Upload a clear photo or scanned PDF of your cancelled cheque (max 10MB, JPG/PNG/PDF)
                    </p>
                  </div>
                </div>

                {/* If already uploaded, show preview / status card */}
                {chequeDoc ? (
                  <div className="p-5 rounded-2xl bg-emerald-50/70 border border-emerald-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-emerald-600 text-white rounded-2xl shadow-xs">
                        <CheckCircle2 className="h-6 w-6" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-black text-slate-900">{chequeDoc.fileName}</h4>
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-200 text-emerald-900 uppercase">
                            Cheque Uploaded
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600 mt-0.5">
                          {(chequeDoc.fileSize / 1024).toFixed(1)} KB • Uploaded {new Date(chequeDoc.uploadedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setViewDoc(chequeDoc)}
                        className="px-3.5 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition-colors flex items-center gap-1.5 shadow-xs"
                      >
                        <Eye className="h-3.5 w-3.5" /> Preview Cheque
                      </button>
                      <button
                        onClick={() => handleDeleteDocument(chequeDoc.id)}
                        className="p-2 text-slate-400 hover:text-rose-600 rounded-xl hover:bg-rose-50 transition-colors"
                        title="Remove and Re-upload Cheque"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="p-8 border-2 border-dashed border-amber-300 rounded-3xl bg-amber-50/40 text-center space-y-3">
                    <Upload className="h-10 w-10 text-amber-500 mx-auto" />
                    <div>
                      <p className="text-xs font-black text-slate-900">Upload Cancelled Cheque</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Ensure your name, account number, and IFSC code are clearly visible. Max size: 10MB (PDF, JPG, PNG).
                      </p>
                    </div>

                    <div>
                      <label className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-black cursor-pointer shadow-sm transition-all hover:scale-102">
                        {uploadingCheque ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span>Uploading Cheque...</span>
                          </>
                        ) : (
                          <>
                            <Upload className="h-4 w-4" />
                            <span>Select Cheque File</span>
                          </>
                        )}
                        <input
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png"
                          disabled={uploadingCheque}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleUploadCancelledCheque(file);
                          }}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>
                )}
              </div>

              {/* Navigation Actions for Step 4 */}
              <div className="pt-6 border-t border-slate-100 flex items-center justify-between">
                <GlassButton
                  variant="secondary"
                  size="md"
                  onClick={handlePrevStep}
                  leftIcon={<ArrowLeft className="h-4 w-4" />}
                  className="font-bold"
                >
                  Back: Identity Documents
                </GlassButton>

                <GlassButton
                  variant="primary"
                  size="md"
                  onClick={handleNextStep}
                  isLoading={saving}
                  rightIcon={<ArrowRight className="h-4 w-4" />}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-black"
                >
                  Next: Review & Submit
                </GlassButton>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 5: REVIEW & SUBMIT */}
          {/* ========================================================================= */}
          {activeStep === 5 && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-900">Step 5: Review & Submit Application</h2>
                  <p className="text-xs text-slate-500">Carefully review all submitted details before final administrative submission</p>
                </div>
              </div>

              {/* Summary Cards of Prior 4 Steps */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                {/* 1. Personal Summary */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between border-b border-slate-200/80 pb-1.5">
                    <h3 className="font-black text-slate-900 flex items-center gap-1.5">
                      <User className="h-4 w-4 text-blue-600" />
                      <span>Personal Information</span>
                    </h3>
                    <button onClick={() => setActiveStep(1)} className="text-blue-600 font-extrabold hover:underline">
                      Edit
                    </button>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Full Name:</span>
                    <strong className="text-slate-900">{personal.firstName} {personal.lastName}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Phone & Email:</span>
                    <span className="text-slate-900">{personal.phone} • {userInfo.email}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Location:</span>
                    <span className="text-slate-900">{personal.location || "Not provided"}</span>
                  </div>
                </div>

                {/* 2. Educator Details Summary */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between border-b border-slate-200/80 pb-1.5">
                    <h3 className="font-black text-slate-900 flex items-center gap-1.5">
                      <Briefcase className="h-4 w-4 text-emerald-600" />
                      <span>Educator Credentials</span>
                    </h3>
                    <button onClick={() => setActiveStep(2)} className="text-emerald-600 font-extrabold hover:underline">
                      Edit
                    </button>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Headline:</span>
                    <strong className="text-slate-900">{professional.headline}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Experience & Rate:</span>
                    <span className="text-slate-900">{professional.experienceYears} Years • {formatCurrency(professional.hourlyRate)}/hr</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Subjects:</span>
                    <span className="text-slate-900">{professional.subjects.join(", ")}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Degrees:</span>
                    <span className="text-slate-900">{qualifications.map((q) => q.degree).join(", ") || "None"}</span>
                  </div>
                </div>

                {/* 3. Documents Summary */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between border-b border-slate-200/80 pb-1.5">
                    <h3 className="font-black text-slate-900 flex items-center gap-1.5">
                      <FileText className="h-4 w-4 text-purple-600" />
                      <span>KYC Documents</span>
                    </h3>
                    <button onClick={() => setActiveStep(3)} className="text-purple-600 font-extrabold hover:underline">
                      Edit
                    </button>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Uploaded Credentials:</span>
                    <span className="text-slate-900">
                      {documents.filter((d) => d.category !== "CANCELLED_CHEQUE").length} document(s) on file
                    </span>
                  </div>
                  <div className="space-y-1">
                    {documents
                      .filter((d) => d.category !== "CANCELLED_CHEQUE")
                      .map((d) => (
                        <div key={d.id} className="text-[11px] text-slate-600 flex items-center gap-1.5">
                          <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                          <span>{d.fileName} ({d.category})</span>
                        </div>
                      ))}
                  </div>
                </div>

                {/* 4. Bank Account Summary */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between border-b border-slate-200/80 pb-1.5">
                    <h3 className="font-black text-slate-900 flex items-center gap-1.5">
                      <Landmark className="h-4 w-4 text-amber-600" />
                      <span>Bank & Cancelled Cheque</span>
                    </h3>
                    <button onClick={() => setActiveStep(4)} className="text-amber-600 font-extrabold hover:underline">
                      Edit
                    </button>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Account Holder:</span>
                    <strong className="text-slate-900">{bankDetails.accountHolderName}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Bank & Account:</span>
                    <span className="text-slate-900 font-mono">
                      {bankDetails.bankName} • {bankDetails.accountNumber ? `•••• ${bankDetails.accountNumber.slice(-4)}` : "None"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">IFSC Code:</span>
                    <span className="text-emerald-700 font-mono font-bold uppercase">{bankDetails.ifscCode}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Cancelled Cheque:</span>
                    <span className="text-slate-900 font-bold flex items-center gap-1">
                      {chequeDoc ? (
                        <>
                          <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                          <span>{chequeDoc.fileName}</span>
                        </>
                      ) : (
                        <span className="text-rose-600 font-normal">Not uploaded</span>
                      )}
                    </span>
                  </div>
                </div>
              </div>

              {/* Confirmation Policy Checkbox */}
              <div className="p-5 rounded-2xl bg-emerald-50/60 border border-emerald-200 space-y-3">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={termsAccepted}
                    onChange={(e) => setTermsAccepted(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded-md border-emerald-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <div className="text-xs text-slate-800 space-y-1">
                    <strong className="block font-black text-slate-900">
                      Educator Verification & Platform Policy Agreement
                    </strong>
                    <p className="text-slate-600 leading-relaxed font-medium">
                      I solemnly confirm that all information provided, educational qualifications, identity credentials, and bank account details are true, authentic, and belong to me. I agree to EduConnects terms of educator verification, code of conduct, and background verification procedures.
                    </p>
                  </div>
                </label>
              </div>

              {/* Navigation Actions for Step 5 */}
              <div className="pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                <GlassButton
                  variant="secondary"
                  size="md"
                  onClick={handlePrevStep}
                  leftIcon={<ArrowLeft className="h-4 w-4" />}
                  className="font-bold w-full sm:w-auto"
                >
                  Back: Bank Details
                </GlassButton>

                <GlassButton
                  variant="primary"
                  size="md"
                  onClick={handleSubmitVerification}
                  disabled={!termsAccepted || submitting}
                  isLoading={submitting}
                  rightIcon={<ShieldCheck className="h-4 w-4" />}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-black w-full sm:w-auto shadow-md"
                >
                  Submit Application for Verification
                </GlassButton>
              </div>
            </div>
          )}
        </GlassCard>

        {/* Modal: Add Qualification */}
        {showQualModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
            <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full border border-slate-200 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
              <h3 className="text-lg font-black text-slate-900">Add Academic Degree</h3>
              <form onSubmit={handleAddQualification} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Degree Title *</label>
                  <Input
                    required
                    placeholder="e.g. B.Tech in Computer Science / M.Sc Mathematics"
                    value={newQual.degree}
                    onChange={(e) => setNewQual({ ...newQual, degree: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">University / College *</label>
                  <Input
                    required
                    placeholder="e.g. IIT Delhi / Delhi University"
                    value={newQual.institution}
                    onChange={(e) => setNewQual({ ...newQual, institution: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Specialization</label>
                    <Input
                      placeholder="e.g. Applied Mathematics"
                      value={newQual.specialization}
                      onChange={(e) => setNewQual({ ...newQual, specialization: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Year of Graduation *</label>
                    <Input
                      type="number"
                      required
                      value={newQual.year}
                      onChange={(e) => setNewQual({ ...newQual, year: Number(e.target.value) })}
                    />
                  </div>
                </div>
                <div className="flex items-center justify-end gap-2 pt-2">
                  <GlassButton type="button" variant="secondary" size="sm" onClick={() => setShowQualModal(false)}>
                    Cancel
                  </GlassButton>
                  <GlassButton type="submit" variant="primary" size="sm" className="bg-emerald-600 text-white font-bold">
                    Save Qualification
                  </GlassButton>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Upload Document */}
        {showDocModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
            <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full border border-slate-200 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
              <h3 className="text-lg font-black text-slate-900">Upload Verification Document</h3>
              <form onSubmit={handleUploadDocument} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Document Category</label>
                  <select
                    value={uploadCategory}
                    onChange={(e) => setUploadCategory(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 p-3 text-xs font-bold text-slate-900 bg-white"
                  >
                    <option value="IDENTITY">Identity Document (Passport, Aadhaar, License)</option>
                    <option value="QUALIFICATION">Educational Degree / Transcript</option>
                    <option value="CERTIFICATE">Professional Certification</option>
                    <option value="EXPERIENCE">Teaching Experience Letter</option>
                    <option value="OTHER">Other Credential</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Select File (PDF, JPG, PNG &le; 10MB)</label>
                  <input
                    type="file"
                    required
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                    className="w-full text-xs text-slate-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-black file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <GlassButton type="button" variant="secondary" size="sm" onClick={() => setShowDocModal(false)}>
                    Cancel
                  </GlassButton>
                  <GlassButton
                    type="submit"
                    variant="primary"
                    size="sm"
                    isLoading={uploadingDoc}
                    className="bg-purple-600 text-white font-bold"
                  >
                    Upload Document
                  </GlassButton>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Document Viewer */}
        <DocumentViewerModal
          isOpen={!!viewDoc}
          document={viewDoc}
          onClose={() => setViewDoc(null)}
        />
      </div>
    </DashboardLayout>
  );
}
