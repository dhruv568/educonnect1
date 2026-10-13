"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Video, Lock, ArrowRight, Calendar, Clock, CheckCircle2, AlertCircle, Sparkles, User, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LoadingSkeleton } from "@/components/shared/loading-skeleton";

export default function LiveClassEntryPage() {
  const params = useParams();
  const router = useRouter();
  const classId = params?.id as string;

  const [loading, setLoading] = useState(true);
  const [errorReason, setErrorReason] = useState<string | null>(null);
  const [sessionDetails, setSessionDetails] = useState<any>(null);
  const [requiresBooking, setRequiresBooking] = useState(false);
  const [bookingInProgress, setBookingInProgress] = useState(false);

  useEffect(() => {
    if (!classId) return;

    let isMounted = true;

    async function checkAccess() {
      try {
        setLoading(true);
        setErrorReason(null);

        const res = await fetch(`/api/classroom/${classId}`);

        // If not authenticated, redirect to learner login preserving returnTo
        if (res.status === 401) {
          const returnDestination = `/live-class/${classId}`;
          window.location.replace(`/student/login?returnTo=${encodeURIComponent(returnDestination)}&redirectTo=${encodeURIComponent(returnDestination)}`);
          return;
        }

        const data = await res.json();

        if (!isMounted) return;

        if (data.success && data.data?.authorized) {
          // Authorized -> Enter classroom directly
          const targetSessionId = data.data.sessionDetails?.id || classId;
          router.replace(`/classroom/${targetSessionId}`);
          return;
        }

        // Store session details if returned with error
        if (data.data?.sessionDetails) {
          setSessionDetails(data.data.sessionDetails);
        }

        const reason = data.error || data.data?.reason || "Classroom access denied.";
        setErrorReason(reason);

        // Check if student just needs to book or claim free seat
        if (
          reason.includes("booking") ||
          reason.includes("book") ||
          reason.includes("not have a confirmed booking")
        ) {
          setRequiresBooking(true);
        }
      } catch (err: any) {
        if (!isMounted) return;
        setErrorReason(err.message || "Failed to connect to classroom server.");
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    checkAccess();

    return () => {
      isMounted = false;
    };
  }, [classId, router]);

  // Handle 1-click free booking enrollment & entry
  const handleAutoBookAndJoin = async () => {
    if (!classId) return;
    setBookingInProgress(true);
    try {
      const res = await fetch(`/api/student/live-classes/${classId}/book`, {
        method: "POST",
      });
      const data = await res.json();
      if (data.success) {
        // Enrolled! Re-enter classroom
        router.replace(`/classroom/${classId}`);
      } else {
        setErrorReason(data.error || "Could not complete class enrollment.");
      }
    } catch (err: any) {
      setErrorReason(err.message || "Failed to book session.");
    } finally {
      setBookingInProgress(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-white space-y-4">
        <div className="relative">
          <div className="w-16 h-16 rounded-full border-4 border-blue-500/30 border-t-blue-500 animate-spin" />
          <Video className="w-7 h-7 text-blue-400 absolute inset-0 m-auto" />
        </div>
        <div className="text-center space-y-1">
          <h2 className="text-base font-bold text-slate-100">Entering Live Classroom...</h2>
          <p className="text-xs text-slate-400">Verifying learner credentials and classroom session</p>
        </div>
      </div>
    );
  }

  // If requires booking
  if (requiresBooking) {
    const isFree = sessionDetails?.price === 0 || !sessionDetails?.price;
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 sm:p-6 text-slate-100 font-sans">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl">
          <div className="text-center space-y-2">
            <div className="w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center mx-auto">
              <GraduationCap className="w-7 h-7" />
            </div>
            <h1 className="text-xl font-black text-white">
              {sessionDetails?.title || "Live Classroom Session"}
            </h1>
            <p className="text-xs text-slate-400">
              Educator: <span className="text-slate-200 font-semibold">{sessionDetails?.teacherName || "Verified Educator"}</span> • {sessionDetails?.subject || "Live Session"}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800/80 space-y-2.5 text-xs text-slate-300">
            {sessionDetails?.scheduledStartAt && (
              <div className="flex items-center justify-between">
                <span className="text-slate-500 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-blue-400" /> Start Date:
                </span>
                <span className="font-semibold text-slate-200">
                  {new Date(sessionDetails.scheduledStartAt).toLocaleDateString()}
                </span>
              </div>
            )}
            {sessionDetails?.scheduledStartAt && (
              <div className="flex items-center justify-between">
                <span className="text-slate-500 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-blue-400" /> Start Time:
                </span>
                <span className="font-semibold text-slate-200">
                  {new Date(sessionDetails.scheduledStartAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
            )}
            <div className="flex items-center justify-between pt-1 border-t border-slate-800">
              <span className="text-slate-500">Access Fee:</span>
              <span className="font-bold text-emerald-400 text-sm">
                {isFree ? "Free Access" : `₹${sessionDetails?.price}`}
              </span>
            </div>
          </div>

          <div className="space-y-3 pt-1">
            {isFree ? (
              <Button
                variant="primary"
                size="md"
                className="w-full bg-[#2563EB] hover:bg-[#1E40AF] text-white font-black shadow-lg shadow-blue-600/20"
                onClick={handleAutoBookAndJoin}
                isLoading={bookingInProgress}
                leftIcon={<Video className="w-4 h-4" />}
              >
                Join Classroom Now
              </Button>
            ) : (
              <Link href={`/payment/checkout?type=LIVE_CLASS_BOOKING&slotId=${classId}`} className="block">
                <Button
                  variant="primary"
                  size="md"
                  className="w-full bg-[#2563EB] hover:bg-[#1E40AF] text-white font-black shadow-lg shadow-blue-600/20"
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                >
                  Book & Enter Classroom (₹{sessionDetails?.price})
                </Button>
              </Link>
            )}

            <Link href="/student/live-classes" className="block text-center">
              <button type="button" className="text-xs text-slate-400 hover:text-slate-200 font-semibold py-1">
                View My Enrolled Classes
              </button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Access denied / session state screen
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 sm:p-6 text-slate-100 font-sans">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl text-center">
        <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
          <AlertCircle className="w-7 h-7" />
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-black text-white">Classroom Status</h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            {errorReason || "You are currently not authorized to enter this classroom."}
          </p>
        </div>

        {sessionDetails && (
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800/80 text-left text-xs space-y-1.5 text-slate-300">
            <div className="font-bold text-white text-sm truncate">{sessionDetails.title}</div>
            <div className="text-slate-400">Educator: {sessionDetails.teacherName}</div>
            <div className="text-[11px] text-slate-500">Status: {sessionDetails.status}</div>
          </div>
        )}

        <div className="pt-2 flex flex-col gap-2">
          <Link href="/student/live-classes" className="block">
            <Button variant="primary" size="sm" className="w-full bg-[#2563EB] hover:bg-[#1E40AF]">
              Go to My Live Classes
            </Button>
          </Link>
          <Link href="/student/dashboard" className="block">
            <Button variant="outline" size="sm" className="w-full border-slate-700 text-slate-300 hover:bg-slate-800">
              Return to Dashboard
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
