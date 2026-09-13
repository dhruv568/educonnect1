"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card } from "@/components/ui/card";
import { GlassButton } from "@/components/glass/glass-button";
import { StatusBadge } from "@/components/ui/status-badge";
import { useToast } from "@/components/ui/toast";
import { DocumentViewerModal } from "@/components/shared/document-viewer-modal";
import { DocumentItem } from "@/types/auth";
import { formatCurrency } from "@/lib/currency";
import { BackButton } from "@/components/ui/back-button";
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertOctagon,
  FileText,
  Eye,
  Download,
  GraduationCap,
  Award,
  Briefcase,
  User,
  History,
  MessageSquare,
  ArrowLeft,
  Loader2,
  Plus,
  Lock,
  Landmark,
} from "lucide-react";

export default function AdminTeacherReviewPage() {
  const params = useParams();
  const router = useRouter();
  const { showToast } = useToast();
  const teacherId = params.teacherId as string;

  const [loading, setLoading] = useState(true);
  const [application, setApplication] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "qualifications" | "documents" | "bank" | "history" | "notes">("overview");

  // Modal / Decision Action States
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [approveNote, setApproveNote] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [suspendReason, setSuspendReason] = useState("");

  // Document Viewer Modal State
  const [viewDoc, setViewDoc] = useState<DocumentItem | null>(null);

  // Admin Note State
  const [newNoteContent, setNewNoteContent] = useState("");
  const [addingNote, setAddingNote] = useState(false);

  useEffect(() => {
    fetchApplicationDetails();
  }, [teacherId]);

  const fetchApplicationDetails = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/verification/${teacherId}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load application");
      setApplication(json.data.application);
    } catch (err: any) {
      showToast("Error Loading Review Details", err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  // 1. APPROVE ACTION
  const handleApprove = async () => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/verification/${teacherId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: approveNote }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to approve teacher");

      showToast("Teacher Approved! 🎓", "Status set to VERIFIED. Email notification sent.", "success");
      setShowApproveModal(false);
      setApproveNote("");
      fetchApplicationDetails();
    } catch (err: any) {
      showToast("Approval Error", err.message, "error");
    } finally {
      setActionLoading(false);
    }
  };

  // 2. REJECT ACTION
  const handleReject = async () => {
    if (!rejectReason.trim()) {
      showToast("Reason Required", "Please specify why the application is being rejected.", "error");
      return;
    }
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/verification/${teacherId}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: rejectReason }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to reject teacher");

      showToast("Application Rejected", "Rejection notice sent to teacher with feedback.", "info");
      setShowRejectModal(false);
      setRejectReason("");
      fetchApplicationDetails();
    } catch (err: any) {
      showToast("Rejection Error", err.message, "error");
    } finally {
      setActionLoading(false);
    }
  };

  // 3. SUSPEND ACTION
  const handleSuspend = async () => {
    if (!suspendReason.trim()) {
      showToast("Reason Required", "Please specify the suspension reason.", "error");
      return;
    }
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/verification/${teacherId}/suspend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: suspendReason }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to suspend teacher");

      showToast("Teacher Suspended", "Teacher account privileges suspended.", "error");
      setShowSuspendModal(false);
      setSuspendReason("");
      fetchApplicationDetails();
    } catch (err: any) {
      showToast("Suspension Error", err.message, "error");
    } finally {
      setActionLoading(false);
    }
  };

  // 4. REACTIVATE ACTION
  const handleReactivate = async () => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/verification/${teacherId}/reactivate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: "Reactivated by admin" }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to reactivate teacher");

      showToast("Teacher Reactivated", "Account reactivated to VERIFIED status.", "success");
      fetchApplicationDetails();
    } catch (err: any) {
      showToast("Reactivation Error", err.message, "error");
    } finally {
      setActionLoading(false);
    }
  };

  // 5. ADD ADMIN NOTE
  const handleAddAdminNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteContent.trim()) return;

    setAddingNote(true);
    try {
      const res = await fetch(`/api/admin/verification/${teacherId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newNoteContent }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to add admin note");

      showToast("Internal Note Saved", "Note added to teacher record.", "success");
      setNewNoteContent("");
      fetchApplicationDetails();
    } catch (err: any) {
      showToast("Note Error", err.message, "error");
    } finally {
      setAddingNote(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout role="ADMIN" userName="System Administrator" userEmail="admin@educonnects.com">
        <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
          <Loader2 className="h-10 w-10 text-blue-600 animate-spin" />
          <p className="text-sm font-semibold text-slate-600">Loading Application Review Bundle...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (!application) {
    return (
      <DashboardLayout role="ADMIN" userName="System Administrator" userEmail="admin@educonnects.com">
        <div className="p-12 text-center space-y-4">
          <p className="text-sm font-bold text-slate-700">Teacher record not found.</p>
          <Link href="/admin/verification">
            <GlassButton variant="secondary" size="sm">Back to Queue</GlassButton>
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  const { profile, professional, user, verificationStatus, documents, qualifications, certificates, history, adminNotes, bankDetails } = application;

  return (
    <DashboardLayout role="ADMIN" userName="System Administrator" userEmail="admin@educonnects.com">
      <div className="space-y-6 pb-16 max-w-6xl mx-auto">
        {/* Top Back Link & Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <BackButton
              fallbackUrl="/admin/verification"
              label="Back to Queue"
              variant="default"
            />
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl lg:text-3xl font-black text-slate-900 tracking-tight">
                  {profile.firstName} {profile.lastName}
                </h1>
                <StatusBadge status={verificationStatus} />
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {user.email} • Registered {new Date(user.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>

          {/* ACTION BUTTONS */}
          <div className="flex flex-wrap items-center gap-2">
            {verificationStatus !== "VERIFIED" && (
              <GlassButton
                variant="primary"
                size="sm"
                onClick={() => setShowApproveModal(true)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                leftIcon={<CheckCircle2 className="h-4 w-4" />}
              >
                Approve Teacher
              </GlassButton>
            )}

            {verificationStatus !== "REJECTED" && verificationStatus !== "SUSPENDED" && (
              <GlassButton
                variant="secondary"
                size="sm"
                onClick={() => setShowRejectModal(true)}
                className="bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100"
                leftIcon={<XCircle className="h-4 w-4" />}
              >
                Reject Application
              </GlassButton>
            )}

            {verificationStatus === "VERIFIED" && (
              <GlassButton
                variant="secondary"
                size="sm"
                onClick={() => setShowSuspendModal(true)}
                className="bg-slate-900 text-rose-400 border-rose-500/30 hover:bg-slate-800"
                leftIcon={<AlertOctagon className="h-4 w-4" />}
              >
                Suspend Teacher
              </GlassButton>
            )}

            {verificationStatus === "SUSPENDED" && (
              <GlassButton
                variant="primary"
                size="sm"
                onClick={handleReactivate}
                isLoading={actionLoading}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                leftIcon={<ShieldCheck className="h-4 w-4" />}
              >
                Reactivate Teacher
              </GlassButton>
            )}
          </div>
        </div>

        {/* WORKSPACE NAVIGATION TABS */}
        <div className="flex items-center gap-2 border-b border-slate-200 overflow-x-auto pb-2">
          {[
            { id: "overview", label: "Profile & Overview", icon: User },
            { id: "qualifications", label: `Qualifications & Certs (${qualifications.length + certificates.length})`, icon: GraduationCap },
            { id: "documents", label: `Secure Documents (${documents.length})`, icon: FileText },
            { id: "bank", label: "Bank & Cheque", icon: Landmark },
            { id: "history", label: `Audit History (${history.length})`, icon: History },
            { id: "notes", label: `Admin Notes (${adminNotes.length})`, icon: MessageSquare },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-2.5 rounded-2xl text-xs font-extrabold transition-all whitespace-nowrap flex items-center gap-2 ${
                  isActive
                    ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                    : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                }`}
              >
                <tab.icon className={`h-4 w-4 ${isActive ? "text-white" : "text-slate-400"}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* TAB 1: OVERVIEW */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            <Card className="p-6 border-slate-200 bg-white space-y-4">
              <h3 className="text-base font-extrabold text-slate-900 border-b border-slate-100 pb-2">
                Personal Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div>
                  <span className="text-slate-500 font-semibold block">Full Name</span>
                  <span className="font-extrabold text-slate-900 text-sm">{profile.firstName} {profile.lastName}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-semibold block">Email Address</span>
                  <span className="font-extrabold text-slate-900 text-sm">{user.email}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-semibold block">Contact Phone</span>
                  <span className="font-bold text-slate-900">{profile.phone || "Not specified"}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-semibold block">City / Location</span>
                  <span className="font-bold text-slate-900">{profile.location || "Not specified"}</span>
                </div>
              </div>

              <div className="pt-2">
                <span className="text-slate-500 font-semibold block text-xs mb-1">Biography</span>
                <p className="text-xs text-slate-700 bg-slate-50 p-4 rounded-2xl border border-slate-200 leading-relaxed font-medium">
                  {profile.bio || "No biography provided."}
                </p>
              </div>
            </Card>

            <Card className="p-6 border-slate-200 bg-white space-y-4">
              <h3 className="text-base font-extrabold text-slate-900 border-b border-slate-100 pb-2">
                Professional Educator Credentials
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div>
                  <span className="text-slate-500 font-semibold block">Headline</span>
                  <span className="font-extrabold text-slate-900">{professional.headline || "Educator"}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-semibold block">Experience</span>
                  <span className="font-extrabold text-slate-900">{professional.experienceYears} Years</span>
                </div>
                <div>
                  <span className="text-slate-500 font-semibold block">Hourly Rate</span>
                  <span className="font-extrabold text-slate-900">{formatCurrency(professional.hourlyRate)} / hr</span>
                </div>
                <div>
                  <span className="text-slate-500 font-semibold block">Teaching Mode</span>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-blue-100 text-blue-800 uppercase">
                    {professional.teachingMode}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 font-semibold block">Languages Spoken</span>
                  <span className="font-bold text-slate-900">{professional.languages.join(", ")}</span>
                </div>
              </div>

              <div className="pt-2">
                <span className="text-slate-500 font-semibold block text-xs mb-2">Teaching Subjects</span>
                <div className="flex flex-wrap gap-2">
                  {professional.subjects.map((s: string) => (
                    <span key={s} className="px-3 py-1 rounded-xl bg-slate-100 border border-slate-200 text-xs font-extrabold text-slate-800">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            </Card>

            {/* Bank Details Summary Card */}
            <Card className="p-6 border-slate-200 bg-white space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <Landmark className="h-5 w-5 text-emerald-600" /> Bank & Settlement Account Details
                </h3>
                <button
                  onClick={() => setActiveTab("bank")}
                  className="text-xs font-extrabold text-blue-600 hover:text-blue-700 underline"
                >
                  View Bank Documents →
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                <div>
                  <span className="text-slate-500 font-semibold block">Account Holder</span>
                  <span className="font-extrabold text-slate-900 text-sm">
                    {bankDetails?.accountHolderName || "Pending submission"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 font-semibold block">Account Number</span>
                  <span className="font-mono font-extrabold text-slate-900 text-sm">
                    {bankDetails?.accountNumber ? `•••• ${bankDetails.accountNumber.slice(-4)}` : "Pending submission"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 font-semibold block">Bank Name</span>
                  <span className="font-extrabold text-slate-900 text-sm">
                    {bankDetails?.bankName || "Pending submission"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 font-semibold block">IFSC Code</span>
                  <span className="font-mono font-extrabold text-emerald-700 text-sm uppercase">
                    {bankDetails?.ifscCode || "Pending submission"}
                  </span>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* TAB 2: QUALIFICATIONS & CERTIFICATES */}
        {activeTab === "qualifications" && (
          <div className="space-y-6">
            <Card className="p-6 border-slate-200 bg-white space-y-4">
              <h3 className="text-base font-extrabold text-slate-900 border-b border-slate-100 pb-2">
                Academic Qualifications ({qualifications.length})
              </h3>
              {qualifications.length === 0 ? (
                <p className="text-xs text-slate-500 italic">No qualifications recorded.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {qualifications.map((q: any) => (
                    <div key={q.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-blue-100 text-blue-700">
                        Completed {q.year}
                      </span>
                      <h4 className="text-sm font-extrabold text-slate-900">{q.degree}</h4>
                      <p className="text-xs font-bold text-slate-600">{q.institution}</p>
                      {q.specialization && <p className="text-xs text-slate-500">Specialization: {q.specialization}</p>}
                      {q.description && <p className="text-xs text-slate-500 italic">"{q.description}"</p>}
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card className="p-6 border-slate-200 bg-white space-y-4">
              <h3 className="text-base font-extrabold text-slate-900 border-b border-slate-100 pb-2">
                Professional Certifications ({certificates.length})
              </h3>
              {certificates.length === 0 ? (
                <p className="text-xs text-slate-500 italic">No certificates recorded.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {certificates.map((c: any) => (
                    <div key={c.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
                      <h4 className="text-sm font-extrabold text-slate-900">{c.name}</h4>
                      <p className="text-xs font-bold text-slate-600">Issuer: {c.issuer}</p>
                      <p className="text-[11px] text-slate-500">Issued: {new Date(c.issueDate).toLocaleDateString()}</p>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        )}

        {/* TAB 3: UPLOADED DOCUMENTS */}
        {activeTab === "documents" && (
          <Card className="p-6 border-slate-200 bg-white space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-base font-extrabold text-slate-900">
                Secure Uploaded Identity & Verification Documents
              </h3>
              <span className="text-xs font-semibold text-slate-500 flex items-center gap-1">
                <Lock className="h-3.5 w-3.5 text-emerald-600" /> Private Authorized Stream
              </span>
            </div>

            {documents.length === 0 ? (
              <p className="text-xs text-slate-500 italic">No identity or qualification documents uploaded by teacher.</p>
            ) : (
              <div className="space-y-3">
                {documents.map((doc: DocumentItem) => (
                  <div key={doc.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-blue-100 text-blue-700 rounded-2xl">
                        <FileText className="h-6 w-6" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-extrabold text-slate-900">{doc.fileName}</h4>
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-slate-200 text-slate-800 uppercase">
                            {doc.category}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          {doc.fileType} • {(doc.fileSize / 1024).toFixed(1)} KB • Uploaded {new Date(doc.uploadedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setViewDoc(doc)}
                        className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-extrabold hover:bg-blue-700 transition-colors flex items-center gap-1.5 shadow-xs"
                      >
                        <Eye className="h-4 w-4" /> Preview Stream
                      </button>
                      <a
                        href={`/api/documents/${doc.id}`}
                        download={doc.fileName}
                        target="_blank"
                        rel="noreferrer"
                        className="p-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-100"
                        title="Download Document"
                      >
                        <Download className="h-4 w-4" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}

        {/* TAB 4: BANK & CANCELLED CHEQUE */}
        {activeTab === "bank" && (
          <div className="space-y-6">
            <Card className="p-6 border-slate-200 bg-white space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <Landmark className="h-5 w-5 text-emerald-600" /> Bank Account Details (Settlements & Payouts)
                </h3>
                <span className="text-xs font-bold text-slate-500">
                  {bankDetails?.accountNumber ? "Details Provided" : "Pending Submission"}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                  <span className="text-slate-500 font-semibold block mb-1">Account Holder Name</span>
                  <span className="font-extrabold text-slate-900 text-sm">
                    {bankDetails?.accountHolderName || "Not provided"}
                  </span>
                </div>
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                  <span className="text-slate-500 font-semibold block mb-1">Account Number</span>
                  <span className="font-mono font-extrabold text-slate-900 text-sm tracking-wide">
                    {bankDetails?.accountNumber ? `${bankDetails.accountNumber}` : "Not provided"}
                  </span>
                </div>
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                  <span className="text-slate-500 font-semibold block mb-1">Bank Name</span>
                  <span className="font-extrabold text-slate-900 text-sm">
                    {bankDetails?.bankName || "Not provided"}
                  </span>
                </div>
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                  <span className="text-slate-500 font-semibold block mb-1">IFSC Code</span>
                  <span className="font-mono font-extrabold text-emerald-700 text-sm uppercase">
                    {bankDetails?.ifscCode || "Not provided"}
                  </span>
                </div>
              </div>
            </Card>

            {/* Cancelled Cheque Card */}
            <Card className="p-6 border-slate-200 bg-white space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <FileText className="h-5 w-5 text-blue-600" /> Cancelled Cheque Verification
                </h3>
                <span className="text-xs font-semibold text-slate-500 flex items-center gap-1">
                  <Lock className="h-3.5 w-3.5 text-emerald-600" /> KYC Regulatory Requirement
                </span>
              </div>

              {(() => {
                const chequeDoc = documents.find((d: DocumentItem) => d.category === "CANCELLED_CHEQUE");
                if (chequeDoc) {
                  return (
                    <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="p-3 bg-emerald-600 text-white rounded-2xl shadow-sm">
                          <FileText className="h-6 w-6" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-extrabold text-slate-900">{chequeDoc.fileName}</h4>
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-200 text-emerald-900 uppercase">
                              Uploaded Cheque
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-600 mt-0.5">
                            {chequeDoc.fileType} • {(chequeDoc.fileSize / 1024).toFixed(1)} KB • Uploaded {new Date(chequeDoc.uploadedAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setViewDoc(chequeDoc)}
                          className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-extrabold hover:bg-blue-700 transition-colors flex items-center gap-1.5 shadow-xs"
                        >
                          <Eye className="h-4 w-4" /> Preview Cheque
                        </button>
                        <a
                          href={`/api/documents/${chequeDoc.id}`}
                          download={chequeDoc.fileName}
                          target="_blank"
                          rel="noreferrer"
                          className="p-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-100"
                          title="Download Cancelled Cheque"
                        >
                          <Download className="h-4 w-4" />
                        </a>
                      </div>
                    </div>
                  );
                } else if (bankDetails?.cancelledChequeUrl) {
                  return (
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <FileText className="h-6 w-6 text-slate-500" />
                        <div>
                          <h4 className="text-sm font-extrabold text-slate-900">Cancelled Cheque on File</h4>
                          <p className="text-xs text-slate-500">{bankDetails.cancelledChequeUrl}</p>
                        </div>
                      </div>
                      <a
                        href={bankDetails.cancelledChequeUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-extrabold hover:bg-blue-700 transition-colors"
                      >
                        View Cheque
                      </a>
                    </div>
                  );
                } else {
                  return (
                    <div className="p-6 text-center bg-amber-50/50 border border-amber-200 rounded-2xl">
                      <p className="text-xs font-bold text-amber-800">
                        No cancelled cheque uploaded by educator. Cheque is required for payout verification.
                      </p>
                    </div>
                  );
                }
              })()}
            </Card>
          </div>
        )}

        {/* TAB 5: AUDIT HISTORY */}
        {activeTab === "history" && (
          <Card className="p-6 border-slate-200 bg-white space-y-4">
            <h3 className="text-base font-extrabold text-slate-900 border-b border-slate-100 pb-2">
              Verification Decision Audit History
            </h3>
            {history.length === 0 ? (
              <p className="text-xs text-slate-500 italic">No decision history recorded yet.</p>
            ) : (
              <div className="space-y-4">
                {history.map((h: any, idx: number) => (
                  <div key={h.id || idx} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="font-extrabold text-slate-900">
                        {h.previousStatus} → <span className="text-blue-600 uppercase">{h.newStatus}</span>
                      </div>
                      <span className="text-slate-400 font-medium">{new Date(h.createdAt).toLocaleString()}</span>
                    </div>
                    <div className="text-slate-600">Decision By: <strong>{h.adminName || "System Admin"}</strong></div>
                    {h.reason && <p className="text-slate-700 italic bg-white p-2 rounded-xl border border-slate-200 mt-1">"{h.reason}"</p>}
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}

        {/* TAB 5: ADMIN NOTES */}
        {activeTab === "notes" && (
          <Card className="p-6 border-slate-200 bg-white space-y-6">
            <h3 className="text-base font-extrabold text-slate-900 border-b border-slate-100 pb-2">
              Internal Admin Notes (Private & Non-Public)
            </h3>

            <form onSubmit={handleAddAdminNote} className="space-y-3">
              <textarea
                value={newNoteContent}
                onChange={(e) => setNewNoteContent(e.target.value)}
                rows={3}
                placeholder="Add confidential internal admin notes regarding credentials, interview feedback, or compliance checks..."
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-900 outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
              <div className="flex justify-end">
                <GlassButton type="submit" variant="primary" size="sm" isLoading={addingNote} leftIcon={<Plus className="h-4 w-4" />}>
                  Save Internal Note
                </GlassButton>
              </div>
            </form>

            <div className="space-y-3">
              {adminNotes.length === 0 ? (
                <p className="text-xs text-slate-500 italic">No admin notes added yet.</p>
              ) : (
                adminNotes.map((n: any) => (
                  <div key={n.id} className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200/80 text-xs space-y-1">
                    <div className="flex items-center justify-between font-bold text-amber-900">
                      <span>{n.adminName}</span>
                      <span className="text-[10px] text-amber-700 font-semibold">{new Date(n.createdAt).toLocaleString()}</span>
                    </div>
                    <p className="text-slate-800 font-medium leading-relaxed">{n.content}</p>
                  </div>
                ))
              )}
            </div>
          </Card>
        )}
      </div>

      {/* APPROVE MODAL */}
      {showApproveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl border border-slate-200">
            <h3 className="text-lg font-black text-slate-900 flex items-center gap-2 text-emerald-600">
              <CheckCircle2 className="h-6 w-6" /> Approve Teacher Application?
            </h3>
            <p className="text-xs text-slate-600">
              This action will transition the teacher status to <strong>VERIFIED</strong>. The profile will immediately become eligible for platform publication.
            </p>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase">Optional Approval Note</label>
              <textarea
                value={approveNote}
                onChange={(e) => setApproveNote(e.target.value)}
                placeholder="e.g. Identity & Degree credentials verified against official university registry."
                rows={3}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs outline-none"
              />
            </div>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setShowApproveModal(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <GlassButton
                variant="primary"
                size="sm"
                isLoading={actionLoading}
                onClick={handleApprove}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                Confirm Approval
              </GlassButton>
            </div>
          </div>
        </div>
      )}

      {/* REJECT MODAL */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl border border-slate-200">
            <h3 className="text-lg font-black text-slate-900 flex items-center gap-2 text-rose-600">
              <XCircle className="h-6 w-6" /> Reject Teacher Application
            </h3>
            <p className="text-xs text-slate-600">
              Please specify the rejection reason. This feedback will be sent directly to the teacher so they can correct their documents and resubmit.
            </p>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase">Rejection Reason *</label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="e.g. Uploaded degree certificate image is blurred and unreadable. Please upload a clear PDF."
                rows={3}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs outline-none focus:ring-2 focus:ring-rose-500"
                required
              />
            </div>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setShowRejectModal(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <GlassButton
                variant="primary"
                size="sm"
                isLoading={actionLoading}
                onClick={handleReject}
                className="bg-rose-600 hover:bg-rose-700 text-white"
              >
                Reject Application
              </GlassButton>
            </div>
          </div>
        </div>
      )}

      {/* SUSPEND MODAL */}
      {showSuspendModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl border border-slate-200">
            <h3 className="text-lg font-black text-slate-900 flex items-center gap-2 text-rose-600">
              <AlertOctagon className="h-6 w-6" /> Suspend Verified Teacher
            </h3>
            <p className="text-xs text-slate-600">
              This will suspend the teacher's platform visibility and live class hosting privileges. Account data and history will be preserved.
            </p>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase">Suspension Reason *</label>
              <textarea
                value={suspendReason}
                onChange={(e) => setSuspendReason(e.target.value)}
                placeholder="e.g. Investigation regarding student attendance complaints."
                rows={3}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs outline-none focus:ring-2 focus:ring-rose-500"
                required
              />
            </div>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setShowSuspendModal(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <GlassButton
                variant="primary"
                size="sm"
                isLoading={actionLoading}
                onClick={handleSuspend}
                className="bg-slate-900 hover:bg-slate-800 text-rose-400"
              >
                Confirm Suspension
              </GlassButton>
            </div>
          </div>
        </div>
      )}

      {/* SECURE DOCUMENT VIEWER MODAL */}
      <DocumentViewerModal document={viewDoc} isOpen={!!viewDoc} onClose={() => setViewDoc(null)} />
    </DashboardLayout>
  );
}
