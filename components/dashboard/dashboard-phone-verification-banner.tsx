"use client";

import React, { useState, useEffect } from "react";
import {
  ShieldAlert,
  ShieldCheck,
  Phone,
  CheckCircle2,
  X,
  AlertCircle,
  Edit3,
  Check,
  Clock,
  ArrowRight,
} from "lucide-react";
import { PhoneOtpVerifyInline } from "@/components/auth/phone-otp-verify-inline";
import { useToast } from "@/components/ui/toast";

interface DashboardPhoneVerificationBannerProps {
  role: "student" | "teacher";
  className?: string;
}

interface PhoneStatus {
  hasPhone: boolean;
  phone: string | null;
  maskedPhone: string | null;
  isVerified: boolean;
}

export function DashboardPhoneVerificationBanner({
  role,
  className = "",
}: DashboardPhoneVerificationBannerProps) {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<PhoneStatus>({
    hasPhone: false,
    phone: null,
    maskedPhone: null,
    isVerified: false,
  });

  const [isDismissed, setIsDismissed] = useState(false);
  const [isEditingPhone, setIsEditingPhone] = useState(false);
  const [phoneInput, setPhoneInput] = useState("");
  const [justVerified, setJustVerified] = useState(false);

  const isEducator = role === "teacher";
  const primaryColor = isEducator ? "#0F766E" : "#2563EB";
  const accentLight = isEducator ? "bg-teal-50 border-teal-200" : "bg-blue-50 border-blue-200";
  const textDark = isEducator ? "text-teal-950" : "text-blue-950";
  const textMuted = isEducator ? "text-teal-700" : "text-blue-700";
  const storageKey = `educonnects_phone_banner_dismissed_${role}`;

  // Check dismissal state in sessionStorage
  useEffect(() => {
    try {
      const dismissed = sessionStorage.getItem(storageKey);
      if (dismissed === "true") {
        setIsDismissed(true);
      }
    } catch {}
  }, [storageKey]);

  // Fetch current phone verification status
  useEffect(() => {
    let isMounted = true;

    const fetchStatus = async () => {
      try {
        const res = await fetch("/api/auth/phone/status", { cache: "no-store" });
        if (!res.ok) {
          if (res.status === 401) return; // not logged in
          return;
        }
        const json = await res.json();
        if (isMounted && json.data) {
          setStatus(json.data);
          if (json.data.phone) {
            setPhoneInput(json.data.phone.slice(-10));
          }
        }
      } catch (err) {
        console.warn("Failed to retrieve phone status:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchStatus();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleDismiss = () => {
    setIsDismissed(true);
    try {
      sessionStorage.setItem(storageKey, "true");
    } catch {}
  };

  const handlePhoneVerified = (normalized: string) => {
    setStatus((prev) => ({
      ...prev,
      hasPhone: true,
      phone: normalized,
      maskedPhone: `+91 ******${normalized.slice(-4)}`,
      isVerified: true,
    }));
    setJustVerified(true);
    setIsEditingPhone(false);
    showToast("Mobile Verified!", "Your phone number is now confirmed and protected.", "success");
    try {
      sessionStorage.removeItem(storageKey);
    } catch {}
  };

  if (loading) {
    return null;
  }

  // If phone is verified and was already verified previously, don't show the nag reminder.
  // Instead, show a persistent compact "Phone Verified" indicator or nothing if already dismissed.
  if (status.isVerified && !justVerified) {
    return null;
  }

  // If verified just now in this session, show a persistent success banner
  if (status.isVerified && justVerified) {
    return (
      <div
        className={`p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 shadow-sm flex items-center justify-between gap-3 ${className}`}
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-100 rounded-xl text-emerald-700">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-emerald-900">Phone Number Verified</h4>
            <p className="text-xs text-emerald-700">
              Mobile alerts and security notifications are now active for{" "}
              <span className="font-semibold">+91 {phoneInput || status.phone?.slice(-10)}</span>.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setJustVerified(false)}
          className="text-emerald-500 hover:text-emerald-700 p-1"
          title="Close confirmation"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  // If unverified but user dismissed the reminder during this session, do not block dashboard access
  if (isDismissed) {
    return null;
  }

  const rawClean = phoneInput.replace(/\D/g, "");
  const hasValidPhoneFormat = rawClean.length === 10 || (rawClean.length === 12 && rawClean.startsWith("91"));

  return (
    <div
      className={`rounded-2xl sm:rounded-3xl p-4 sm:p-5 border shadow-sm transition-all relative overflow-hidden ${accentLight} ${className}`}
    >
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        {/* Left icon & text */}
        <div className="flex items-start gap-3 sm:gap-4 min-w-0">
          <div
            className="p-2.5 sm:p-3 rounded-2xl shrink-0 text-white shadow-sm"
            style={{ backgroundColor: primaryColor }}
          >
            <ShieldAlert className="h-5 w-5 sm:h-6 sm:w-6" />
          </div>

          <div className="space-y-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className={`text-sm sm:text-base font-black tracking-tight ${textDark}`}>
                Verify Your Mobile Number
              </h3>
              <span
                className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider text-white"
                style={{ backgroundColor: primaryColor }}
              >
                {isEducator ? "Educator Security" : "Learner Security"}
              </span>
            </div>

            <p className={`text-xs sm:text-sm leading-relaxed ${textMuted}`}>
              Verify your mobile number via SMS OTP to receive real-time class schedule alerts, demo bookings, and security verification.
            </p>

            {/* Current stored phone or input */}
            <div className="pt-2">
              {!isEditingPhone && status.hasPhone && status.phone ? (
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="font-semibold text-slate-600">Stored Mobile:</span>
                  <span className="font-black text-slate-900 bg-white/80 px-2 py-0.5 rounded-md border border-slate-200">
                    +91 {status.phone.slice(-10)}
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsEditingPhone(true)}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-500 hover:text-slate-800 underline cursor-pointer"
                  >
                    <Edit3 className="h-3 w-3" />
                    <span>Change</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-2 max-w-sm">
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">
                        +91
                      </span>
                      <input
                        type="tel"
                        maxLength={10}
                        placeholder="Enter 10-digit mobile"
                        value={phoneInput}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, "");
                          setPhoneInput(val);
                        }}
                        className="w-full pl-10 pr-3 py-1.5 text-xs font-bold rounded-xl border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2"
                        style={{ "--tw-ring-color": primaryColor } as any}
                      />
                    </div>
                    {status.hasPhone && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsEditingPhone(false);
                          if (status.phone) setPhoneInput(status.phone.slice(-10));
                        }}
                        className="text-xs text-slate-500 hover:text-slate-700 font-semibold px-2 py-1"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                  {!hasValidPhoneFormat && phoneInput.length > 0 && (
                    <p className="text-[11px] text-red-600 font-medium">
                      Please enter a valid 10-digit Indian phone number.
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Inline OTP Verification Widget */}
            {hasValidPhoneFormat && (
              <div className="pt-2 max-w-md">
                <PhoneOtpVerifyInline
                  phone={phoneInput}
                  roleContext={role}
                  onVerified={handlePhoneVerified}
                />
              </div>
            )}
          </div>
        </div>

        {/* Right action / dismiss controls */}
        <div className="flex items-center gap-2 self-end md:self-center shrink-0">
          <button
            type="button"
            onClick={handleDismiss}
            className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-black/5 transition-colors cursor-pointer"
          >
            Remind Me Later
          </button>
          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Dismiss banner"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-black/5 transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
