"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { BackButton } from "@/components/ui/back-button";
import {
  ArrowLeft,
  Clock,
  Users,
  Play,
  CheckCircle2,
  XCircle,
  Video,
  FileText,
  Calendar,
  Shield,
  Layers,
  Sparkles,
  Lock,
  ShieldAlert,
  ArrowRight,
  Copy,
  Share2,
} from "lucide-react";
import { getLearnerClassroomUrl } from "@/lib/app-url";

export default function TeacherLiveClassDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const slotId = params?.id as string;
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState("Educator");
  const [userEmail, setUserEmail] = useState("");
  const [verificationStatus, setVerificationStatus] = useState<string>("PENDING");
  const [slot, setSlot] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"OVERVIEW" | "BOOKINGS" | "ATTENDANCE" | "CLASSROOM">("OVERVIEW");
  const [isCopied, setIsCopied] = useState(false);

  const handleCopyLearnerLink = () => {
    const link = slot?.shareableUrl || (slotId ? getLearnerClassroomUrl(slotId) : "");
    if (!link) return;

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(link);
    } else {
      const textArea = document.createElement("textarea");
      textArea.value = link;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
    }

    setIsCopied(true);
    showToast("Link Copied! 📋", "Learner classroom link copied to clipboard. Share it with your students.", "success");
    setTimeout(() => setIsCopied(false), 2500);
  };

  const fetchSlotDetails = async () => {
    setLoading(true);
    try {
      const profileRes = await fetch("/api/teacher/onboarding");
      const profileJson = await profileRes.json();
      if (profileJson.data) {
        setUserName(`${profileJson.data.profile.firstName} ${profileJson.data.profile.lastName}`.trim() || profileJson.data.user.email);
        setUserEmail(profileJson.data.user.email);
        if (profileJson.data.teacherProfile) {
          setVerificationStatus(profileJson.data.teacherProfile.verificationStatus || "PENDING");
        }
      }

      const res = await fetch(`/api/teacher/live-classes/${slotId}`);
      const json = await res.json();
      if (json.success && json.data.slot) {
        setSlot(json.data.slot);
      } else {
        showToast("Error", "Live class slot not found.", "error");
      }
    } catch (err) {
      console.error("Failed to load slot details:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (slotId) fetchSlotDetails();
  }, [slotId]);

  const handleLaunchClassroom = async () => {
    if (verificationStatus !== "VERIFIED") {
      showToast("Verification Required 🔒", "Your educator account is pending verification. Teaching, live classes, course publishing, and content publishing will be available after verification.", "error");
      router.push("/teacher/onboarding");
      return;
    }

    try {
      const res = await fetch(`/api/teacher/live-classes/${slotId}/start-session`, {
        method: "POST",
      });
      const json = await res.json();
      if (json.success && json.data.sessionId) {
        showToast("Launching Classroom", "Connecting to virtual classroom...", "info");
        router.push(`/classroom/${json.data.sessionId}`);
      } else {
        showToast("Error", json.error?.message || "Could not start classroom session.", "error");
      }
    } catch (err) {
      showToast("Error", "Failed to launch session.", "error");
    }
  };

  return (
    <DashboardLayout role="TEACHER" userName={userName} userEmail={userEmail}>
      <div className="space-y-6">
        {/* Verification Required Banner for Unverified Educators */}
        {verificationStatus !== "VERIFIED" && (
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-center gap-3">
              <ShieldAlert className="h-5 w-5 text-amber-600 shrink-0" />
              <div>
                <h4 className="text-xs font-black text-amber-950">Educator Verification Required for Live Classes</h4>
                <p className="text-[11px] text-amber-800 font-semibold leading-relaxed">
                  Your educator account is pending verification. Teaching, live classes, course publishing, and content publishing will be available after verification.
                </p>
              </div>
            </div>
            <Link href="/teacher/onboarding" className="shrink-0 w-full sm:w-auto">
              <Button size="sm" variant="secondary" rightIcon={<ArrowRight className="h-3.5 w-3.5" />} className="w-full sm:w-auto text-xs font-bold bg-amber-600 text-white hover:bg-amber-700">
                Complete Verification
              </Button>
            </Link>
          </div>
        )}

        {/* Top Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <BackButton
              fallbackUrl="/teacher/live-classes"
              label="Back to Live Classes"
              variant="default"
            />
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 text-[10px] font-bold uppercase rounded-md bg-teal-100 text-[#0F766E]">
                  {slot?.subject || "Subject"}
                </span>
                <span
                  className={`px-2.5 py-0.5 text-[10px] font-bold uppercase rounded-full ${
                    slot?.status === "CANCELLED"
                      ? "bg-rose-100 text-rose-700"
                      : slot?.status === "COMPLETED" || (slot?.endTime && new Date(slot.endTime).getTime() <= Date.now())
                      ? "bg-slate-100 text-slate-600"
                      : slot?.status === "LIVE"
                      ? "bg-rose-500 text-white animate-pulse"
                      : "bg-emerald-100 text-emerald-800"
                  }`}
                >
                  ● {slot?.status === "CANCELLED" ? "CANCELLED" : slot?.status === "COMPLETED" || (slot?.endTime && new Date(slot.endTime).getTime() <= Date.now()) ? "COMPLETED" : slot?.status || "SCHEDULED"}
                </span>
              </div>
              <h1 className="text-2xl font-black text-slate-900 mt-1">{slot?.title || "Loading Class..."}</h1>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              onClick={handleCopyLearnerLink}
              variant="outline"
              size="md"
              className="border-teal-200 text-[#0F766E] hover:bg-teal-50 font-semibold"
            >
              {isCopied ? (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-1.5 text-emerald-600" /> Copied!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-1.5 text-[#0F766E]" /> Copy Learner Link
                </>
              )}
            </Button>

            {slot?.status === "COMPLETED" || (slot?.endTime && new Date(slot.endTime).getTime() <= Date.now()) ? (
              <Button
                variant="outline"
                size="md"
                disabled
                className="bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed font-bold"
              >
                <CheckCircle2 className="h-4 w-4 mr-1.5 text-emerald-600" /> Class Ended
              </Button>
            ) : slot?.status === "CANCELLED" ? (
              <Button
                variant="outline"
                size="md"
                disabled
                className="bg-rose-50 text-rose-500 border-rose-200 cursor-not-allowed font-bold"
              >
                <XCircle className="h-4 w-4 mr-1.5 text-rose-500" /> Class Cancelled
              </Button>
            ) : verificationStatus === "VERIFIED" ? (
              <Button
                onClick={handleLaunchClassroom}
                variant="teacher"
                size="md"
                leftIcon={<Play className="h-4 w-4" />}
              >
                Enter Classroom
              </Button>
            ) : (
              <Button
                variant="outline"
                size="md"
                disabled
                className="bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed font-bold"
              >
                <Lock className="h-4 w-4 mr-1.5 text-slate-400" /> Locked
              </Button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="h-64 bg-slate-100 rounded-2xl animate-pulse" />
        ) : !slot ? (
          <Card className="p-12 text-center">Live Class slot not found.</Card>
        ) : (
          <div className="space-y-6">
            {/* Shareable Learner Link Card */}
            <Card className="p-5 bg-teal-50/40 border border-teal-200/80 rounded-2xl space-y-3 shadow-2xs">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-[#0F766E]" />
                    <h4 className="text-xs sm:text-sm font-black text-slate-900">
                      Permanent Learner Classroom Link
                    </h4>
                  </div>
                  <p className="text-[11px] sm:text-xs text-slate-600">
                    Share this unique URL with your students. Logged-in learners enter directly; new learners are guided through login and immediately returned to this classroom.
                  </p>
                </div>
                <Button
                  onClick={handleCopyLearnerLink}
                  variant="teacher"
                  size="sm"
                  className="shrink-0 w-full sm:w-auto"
                  leftIcon={isCopied ? <CheckCircle2 className="h-3.5 w-3.5 text-white" /> : <Copy className="h-3.5 w-3.5 text-white" />}
                >
                  {isCopied ? "Link Copied!" : "Copy Learner Link"}
                </Button>
              </div>
              <div className="flex items-center gap-2 bg-white border border-teal-200/90 rounded-xl px-3 py-2 text-xs font-mono text-slate-800 overflow-x-auto select-all">
                <span className="truncate">{slot?.shareableUrl || (slotId ? getLearnerClassroomUrl(slotId) : "")}</span>
              </div>
            </Card>

            {/* Navigation Tabs */}
            <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
              {(["OVERVIEW", "BOOKINGS", "ATTENDANCE", "CLASSROOM"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 text-xs font-bold rounded-xl transition ${
                    activeTab === tab
                      ? "bg-[#0F766E] text-white shadow-xs"
                      : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* OVERVIEW TAB */}
            {activeTab === "OVERVIEW" && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                  <Card className="p-6 space-y-4">
                    <h3 className="text-base font-bold text-slate-900">About this Class</h3>
                    <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line">
                      {slot.description || "No specific description provided."}
                    </p>
                  </Card>
                </div>

                <div className="space-y-6">
                  <Card className="p-6 space-y-4">
                    <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">Schedule Details</h3>
                    <div className="space-y-2 text-xs text-slate-700">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Date:</span>
                        <span className="font-bold">{new Date(slot.startTime).toLocaleDateString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Time:</span>
                        <span className="font-bold">
                          {new Date(slot.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} -{" "}
                          {new Date(slot.endTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Duration:</span>
                        <span className="font-bold">{slot.durationMinutes} Minutes</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Capacity:</span>
                        <span className="font-bold">{slot.bookings?.length || 0} / {slot.maxCapacity}</span>
                      </div>
                    </div>
                  </Card>
                </div>
              </div>
            )}

            {/* BOOKINGS TAB */}
            {activeTab === "BOOKINGS" && (
              <Card className="p-6 space-y-4">
                <h3 className="text-base font-bold text-slate-900">Enrolled Student Bookings</h3>
                {slot.bookings?.length === 0 ? (
                  <p className="text-xs text-slate-500">No students have booked this class yet.</p>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {slot.bookings.map((b: any) => (
                      <div key={b.id} className="py-3 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-[#0F766E] text-white font-bold flex items-center justify-center">
                            {b.student.profile?.firstName ? b.student.profile.firstName.charAt(0) : "S"}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900">
                              {`${b.student.profile?.firstName || ""} ${b.student.profile?.lastName || ""}`.trim() ||
                                b.student.email}
                            </div>
                            <div className="text-[10px] text-slate-500">{b.student.email}</div>
                          </div>
                        </div>
                        <span className="px-2.5 py-0.5 text-[10px] font-bold rounded-full bg-emerald-100 text-emerald-800">
                          {b.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            )}

            {/* ATTENDANCE TAB */}
            {activeTab === "ATTENDANCE" && (
              <Card className="p-6 space-y-4">
                <h3 className="text-base font-bold text-slate-900">Live Attendance Log</h3>
                {!slot.session?.attendances || slot.session.attendances.length === 0 ? (
                  <p className="text-xs text-slate-500">Attendance records will be automatically logged when the classroom starts.</p>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {slot.session.attendances.map((att: any) => (
                      <div key={att.id} className="py-3 flex items-center justify-between text-xs">
                        <div>
                          <div className="font-bold text-slate-900">
                            {`${att.student.profile?.firstName || ""} ${att.student.profile?.lastName || ""}`.trim() ||
                              att.student.email}
                          </div>
                          <div className="text-[10px] text-slate-500">
                            Joined: {new Date(att.joinedAt).toLocaleTimeString()}
                          </div>
                        </div>
                        <span className="px-2.5 py-0.5 text-[10px] font-bold rounded-full bg-blue-100 text-blue-800">
                          {att.status} ({Math.round(att.duration / 60)} mins)
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            )}

            {/* CLASSROOM TAB */}
            {activeTab === "CLASSROOM" && (
              <Card className="p-6 space-y-4">
                <h3 className="text-base font-bold text-slate-900">Classroom Permissions</h3>
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div className="p-3 bg-slate-50 rounded-xl">
                    <span className="font-bold block">Camera Required:</span> {slot.cameraRequired ? "Yes" : "No"}
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl">
                    <span className="font-bold block">Mic Required:</span> {slot.micRequired ? "Yes" : "No"}
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl">
                    <span className="font-bold block">Interactive Whiteboard:</span> {slot.whiteboardAllowed ? "Allowed" : "Disabled"}
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl">
                    <span className="font-bold block">Screen Sharing:</span> {slot.screenSharingAllowed ? "Allowed" : "Disabled"}
                  </div>
                </div>
              </Card>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
