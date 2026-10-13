"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import {
  Award,
  ShieldCheck,
  Download,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  Share2,
  Linkedin,
  Twitter,
  ArrowRight,
  BookOpen,
  Video,
  Star,
  Copy,
  Check,
  Loader2,
  GraduationCap,
} from "lucide-react";

export default function EducatorVerifyCertificatePage() {
  const router = useRouter();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [confirmedName, setConfirmedName] = useState("");
  const [confirmedEmail, setConfirmedEmail] = useState("");
  const [hasConfirmedCheckbox, setHasConfirmedCheckbox] = useState(false);
  const [issuing, setIssuing] = useState(false);
  const [issuedResult, setIssuedResult] = useState<any>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    fetchIdentity();
  }, []);

  const fetchIdentity = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/teacher/training/certificate/verify-identity");
      if (res.status === 401) {
        window.location.replace("/teacher/login");
        return;
      }
      const json = await res.json();
      if (json.success && json.data) {
        setData(json.data);
        setConfirmedName(json.data.fullName || "");
        setConfirmedEmail(json.data.email || "");
        if (json.data.existingCertificate) {
          setIssuedResult({
            certificateNumber: json.data.existingCertificate.certificateNumber,
            downloadUrl: "/api/teacher/training/certificate/download",
            verificationUrl: `${window.location.origin}/certificate/verify/${json.data.existingCertificate.certificateNumber}`,
          });
        }
      } else {
        showToast(json.error || "Failed to load verification status", "error");
      }
    } catch {
      showToast("Network error loading verification profile", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleIssueCertificate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!hasConfirmedCheckbox) {
      showToast("Please confirm the verification checkbox to proceed.", "warning");
      return;
    }

    if (!confirmedName.trim() || confirmedName.trim().length < 2) {
      showToast("Please enter a valid full legal name for your certificate.", "warning");
      return;
    }

    if (!confirmedEmail.trim()) {
      showToast("Please enter a valid destination email address.", "warning");
      return;
    }

    setIssuing(true);
    try {
      const res = await fetch("/api/teacher/training/certificate/verify-identity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          confirmedName: confirmedName.trim(),
          confirmedEmail: confirmedEmail.trim(),
        }),
      });

      const json = await res.json();
      if (json.success && json.data) {
        setIssuedResult(json.data);
        showToast("Certificate minted successfully! Check your inbox for the attached PDF.", "success");
      } else {
        showToast(json.error || "Failed to issue certificate", "error");
      }
    } catch {
      showToast("Network error issuing certificate", "error");
    } finally {
      setIssuing(false);
    }
  };

  const handleCopyVerificationLink = (url: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url);
      setCopiedLink(true);
      showToast("Verification link copied to clipboard!", "success");
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  if (loading) {
    return (
      <DashboardLayout role="TEACHER">
        <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
          <Loader2 className="h-9 w-9 animate-spin text-[#0F766E]" />
          <p className="text-sm font-semibold text-slate-650">Verifying training progress and eligibility...</p>
        </div>
      </DashboardLayout>
    );
  }

  // Case 1: Ineligible (has not completed 15 days)
  if (!data?.isEligible && !data?.existingCertificate) {
    return (
      <DashboardLayout role="TEACHER">
        <div className="max-w-2xl mx-auto py-12 px-4 space-y-6">
          <Card className="p-8 border-2 border-amber-200 bg-amber-50/50 rounded-3xl text-center space-y-5 shadow-lg">
            <div className="w-16 h-16 rounded-3xl bg-amber-100 border border-amber-300 flex items-center justify-center mx-auto text-amber-700 shadow-sm">
              <Clock className="h-8 w-8" />
            </div>

            <div className="space-y-2">
              <Badge className="bg-amber-100 text-amber-900 border-amber-300 font-bold px-3 py-1">
                Training Incomplete
              </Badge>
              <h1 className="text-2xl font-black text-slate-900">
                15-Day Completion Required
              </h1>
              <p className="text-sm text-slate-650 max-w-md mx-auto leading-relaxed">
                You have completed{" "}
                <span className="font-extrabold text-slate-900">{data?.completedDaysCount || 0}</span> of 15 days.
                Certification requires completing all training videos and passing each daily concept assessment.
              </p>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link href="/teacher/training/learn">
                <Button className="bg-[#0F766E] hover:bg-[#115E59] text-white font-bold rounded-2xl px-6 py-2.5">
                  Continue Training Roadmap →
                </Button>
              </Link>
            </div>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  // Case 2: Certificate Issued (either just now or previously)
  if (issuedResult) {
    const certNumber = issuedResult.certificateNumber;
    const publicUrl = issuedResult.verificationUrl || `${typeof window !== "undefined" ? window.location.origin : ""}/certificate/verify/${certNumber}`;
    const now = new Date();
    const issueYear = now.getFullYear();
    const issueMonth = now.getMonth() + 1;

    const linkedInShareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(publicUrl)}`;
    const twitterShareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent("I am proud to announce that I have successfully completed the 15-Day Educator Training Program and earned my Verified Educator Credential from @EduConnects! Check my verified certificate:")}&url=${encodeURIComponent(publicUrl)}`;
    const whatsAppShareUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent("I have earned my official 15-Day Educator Certification from EduConnects! Verify my credential here: " + publicUrl)}`;
    const linkedInAddToProfileUrl = `https://www.linkedin.com/profile/add?startTask=CERTIFICATION_NAME&name=${encodeURIComponent("15-Day Educator Certification")}&organizationName=${encodeURIComponent("EduConnects")}&issueYear=${issueYear}&issueMonth=${issueMonth}&certUrl=${encodeURIComponent(publicUrl)}&certId=${encodeURIComponent(certNumber)}`;

    return (
      <DashboardLayout role="TEACHER">
        <div className="max-w-4xl mx-auto py-8 px-4 space-y-8 pb-20">
          {/* Celebratory Hero Card */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#115E59] via-[#0F766E] to-[#042F2E] text-white p-8 sm:p-12 shadow-2xl">
            <div className="absolute top-0 right-0 -mt-12 -mr-12 w-64 h-64 rounded-full bg-white/10 blur-2xl pointer-events-none" />
            <div className="relative z-10 flex flex-col items-center text-center space-y-4">
              <div className="w-20 h-20 rounded-3xl bg-amber-400 text-slate-950 flex items-center justify-center shadow-xl transform rotate-3 animate-bounce">
                <Award className="h-10 w-10" />
              </div>

              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/15 border border-white/20 text-teal-200 text-xs font-black uppercase tracking-wider">
                <ShieldCheck className="h-4 w-4 text-teal-300" />
                <span>Officially Certified Educator</span>
              </div>

              <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
                Congratulations, {confirmedName || data?.fullName}!
              </h1>

              <p className="text-teal-100 max-w-xl text-sm sm:text-base leading-relaxed">
                You have successfully mastered the 15-Day Educator Training Program. Your high-resolution vector PDF certificate has been generated and dispatched to your email address.
              </p>

              {/* Certificate ID Pill */}
              <div className="bg-black/30 backdrop-blur-md px-5 py-2.5 rounded-2xl border border-white/20 flex items-center gap-3 mt-2">
                <span className="text-xs text-teal-300 font-bold uppercase tracking-wider">Certificate ID:</span>
                <code className="text-sm sm:text-base font-black text-white font-mono">{certNumber}</code>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
                <a
                  href="/api/teacher/training/certificate/download"
                  download
                  className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-amber-400 text-slate-950 hover:bg-amber-300 font-black text-sm shadow-xl transition-transform hover:-translate-y-0.5 cursor-pointer"
                >
                  <Download className="h-4 w-4" />
                  <span>Download High-Res PDF</span>
                </a>

                <Link
                  href={`/certificate/verify/${certNumber}`}
                  target="_blank"
                  className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-white/15 hover:bg-white/25 text-white border border-white/30 font-bold text-sm backdrop-blur-md shadow-lg transition-transform hover:-translate-y-0.5 cursor-pointer"
                >
                  <ExternalLink className="h-4 w-4 text-teal-300" />
                  <span>Public Verification Ledger</span>
                </Link>
              </div>
            </div>
          </div>

          {/* Social Share & LinkedIn Integration Card */}
          <Card className="p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-md space-y-6">
            <div>
              <h2 className="text-lg sm:text-xl font-black text-slate-900 flex items-center gap-2">
                <Share2 className="h-5 w-5 text-[#0F766E]" />
                <span>Share Your Credential &amp; Build Authority</span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-650 mt-1">
                Showcase your verified achievement to prospective learners, institutions, and peer educators worldwide.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* LinkedIn Add to Profile */}
              <a
                href={linkedInAddToProfileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-[#0A66C2] text-white hover:bg-[#095196] font-bold text-xs shadow-sm transition-transform hover:-translate-y-0.5 cursor-pointer"
              >
                <Linkedin className="h-4 w-4" />
                <span>Add to LinkedIn</span>
              </a>

              {/* LinkedIn Feed Share */}
              <a
                href={linkedInShareUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-slate-900 text-white hover:bg-slate-800 font-bold text-xs shadow-sm transition-transform hover:-translate-y-0.5 cursor-pointer"
              >
                <Linkedin className="h-4 w-4" />
                <span>Share on Feed</span>
              </a>

              {/* Twitter / X */}
              <a
                href={twitterShareUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-black text-white hover:bg-neutral-800 font-bold text-xs shadow-sm transition-transform hover:-translate-y-0.5 cursor-pointer"
              >
                <Twitter className="h-4 w-4" />
                <span>Post on X</span>
              </a>

              {/* WhatsApp */}
              <a
                href={whatsAppShareUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-[#25D366] text-white hover:bg-[#1EBE5D] font-bold text-xs shadow-sm transition-transform hover:-translate-y-0.5 cursor-pointer"
              >
                <span>Share via WhatsApp</span>
              </a>
            </div>

            {/* Copy Verification Link Box */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="w-full truncate text-xs font-mono text-slate-700">
                {publicUrl}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleCopyVerificationLink(publicUrl)}
                className="shrink-0 rounded-xl font-bold flex items-center gap-2 bg-white"
              >
                {copiedLink ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4 text-slate-600" />}
                <span>{copiedLink ? "Copied!" : "Copy Link"}</span>
              </Button>
            </div>
          </Card>

          {/* Next Steps for Certified Educators */}
          <div className="space-y-4">
            <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-amber-500" />
              <span>Next Steps for Certified Educators</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card className="p-6 rounded-3xl border border-slate-200 hover:border-teal-300 transition-all shadow-sm flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <div className="w-10 h-10 rounded-2xl bg-teal-100 text-[#0F766E] flex items-center justify-center">
                    <BookOpen className="h-5 w-5" />
                  </div>
                  <h3 className="font-extrabold text-slate-900 text-sm">Launch Your First Course</h3>
                  <p className="text-xs text-slate-650 leading-relaxed">
                    Turn your syllabus into published interactive modules with video lessons, resources, and automated assessments.
                  </p>
                </div>
                <Link href="/teacher/courses">
                  <Button variant="outline" className="w-full text-xs font-bold rounded-xl border-teal-200 text-[#0F766E] hover:bg-teal-50">
                    Open Course Studio →
                  </Button>
                </Link>
              </Card>

              <Card className="p-6 rounded-3xl border border-slate-200 hover:border-teal-300 transition-all shadow-sm flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <div className="w-10 h-10 rounded-2xl bg-teal-100 text-[#0F766E] flex items-center justify-center">
                    <Video className="h-5 w-5" />
                  </div>
                  <h3 className="font-extrabold text-slate-900 text-sm">Host an Interactive Live Class</h3>
                  <p className="text-xs text-slate-650 leading-relaxed">
                    Engage students in real time with LiveKit HD streaming, interactive whiteboards, and instant doubt clearing.
                  </p>
                </div>
                <Link href="/teacher/classes">
                  <Button variant="outline" className="w-full text-xs font-bold rounded-xl border-teal-200 text-[#0F766E] hover:bg-teal-50">
                    Schedule Live Class →
                  </Button>
                </Link>
              </Card>

              <Card className="p-6 rounded-3xl border border-amber-200 bg-amber-50/40 hover:border-amber-300 transition-all shadow-sm flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center">
                    <Star className="h-5 w-5" />
                  </div>
                  <h3 className="font-extrabold text-slate-900 text-sm">Apply for Featured Status</h3>
                  <p className="text-xs text-slate-650 leading-relaxed">
                    Certified educators receive priority spotlight on the public discovery marketplace and higher student enrollment reach.
                  </p>
                </div>
                <div className="inline-flex items-center justify-center py-2 text-xs font-extrabold text-amber-800 bg-amber-200/60 rounded-xl">
                  ✨ Automatic Priority Activated
                </div>
              </Card>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // Case 3: Eligible, Identity Confirmation Form
  return (
    <DashboardLayout role="TEACHER">
      <div className="max-w-2xl mx-auto py-10 px-4 space-y-8 pb-20">
        {/* Header */}
        <div className="space-y-2 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-100 text-[#0F766E] text-xs font-black uppercase tracking-wider">
            <GraduationCap className="h-4 w-4" />
            <span>Step 2 of 2: Credential Issuance</span>
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">
            Educator Identity Confirmation
          </h1>
          <p className="text-sm text-slate-650 max-w-lg mx-auto">
            You have satisfied all 15 training curriculum modules. Confirm your legal name and contact details before your official certificate is issued.
          </p>
        </div>

        {/* Verification Form Card */}
        <Card className="p-8 rounded-3xl border border-slate-200 shadow-xl bg-white space-y-6">
          <div className="bg-teal-50/70 border border-teal-200 rounded-2xl p-4 text-xs text-teal-900 flex items-start gap-3">
            <ShieldCheck className="h-5 w-5 text-[#0F766E] shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-extrabold">Permanent Identity Registration</p>
              <p className="text-teal-800">
                Your certificate will be minted in the EduConnects Public Verification Ledger with a tamper-evident serial ID. Please ensure your legal name is spelled exactly as you wish it to appear.
              </p>
            </div>
          </div>

          <form onSubmit={handleIssueCertificate} className="space-y-5">
            {/* Legal Full Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-black text-slate-800 uppercase tracking-wider">
                Full Legal Name (as printed on certificate)
              </label>
              <input
                type="text"
                required
                value={confirmedName}
                onChange={(e) => setConfirmedName(e.target.value)}
                placeholder="e.g. Dr. Rajesh Kumar Sharma"
                className="w-full px-4 py-3 rounded-2xl border border-slate-300 focus:outline-none focus:border-[#0F766E] focus:ring-2 focus:ring-teal-200 font-semibold text-slate-900 text-sm"
              />
              <p className="text-[11px] text-slate-650">
                This name will be rendered on your vector PDF certificate and verified in public records.
              </p>
            </div>

            {/* Destination Email */}
            <div className="space-y-1.5">
              <label className="text-xs font-black text-slate-800 uppercase tracking-wider">
                Destination Email (for PDF delivery)
              </label>
              <input
                type="email"
                required
                value={confirmedEmail}
                onChange={(e) => setConfirmedEmail(e.target.value)}
                placeholder="you@domain.com"
                className="w-full px-4 py-3 rounded-2xl border border-slate-300 focus:outline-none focus:border-[#0F766E] focus:ring-2 focus:ring-teal-200 font-semibold text-slate-900 text-sm"
              />
              <p className="text-[11px] text-slate-650">
                Your high-resolution PDF certificate will be emailed directly to this address.
              </p>
            </div>

            {/* Checkbox Confirmation */}
            <div className="pt-2">
              <label className="flex items-start gap-3 p-4 rounded-2xl border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={hasConfirmedCheckbox}
                  onChange={(e) => setHasConfirmedCheckbox(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-[#0F766E] focus:ring-[#0F766E]"
                />
                <span className="text-xs text-slate-700 font-medium leading-relaxed">
                  I confirm that I have personally completed all 15 days of training and required quizzes, and that the name and email address provided above are accurate.
                </span>
              </label>
            </div>

            {/* Submit Action */}
            <div className="pt-3">
              <Button
                type="submit"
                disabled={issuing || !hasConfirmedCheckbox || !confirmedName.trim()}
                className="w-full py-6 rounded-2xl bg-[#0F766E] hover:bg-[#115E59] text-white font-black text-sm shadow-xl flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {issuing ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Minting Certificate &amp; Sending PDF...</span>
                  </>
                ) : (
                  <>
                    <Award className="h-5 w-5 text-amber-300" />
                    <span>Confirm &amp; Issue My Official Certificate →</span>
                  </>
                )}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </DashboardLayout>
  );
}
