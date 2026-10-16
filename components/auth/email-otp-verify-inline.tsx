"use client";

import React, { useState, useEffect, useRef } from "react";
import { Mail, CheckCircle2, RefreshCw, AlertCircle, ShieldCheck } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { extractOtpDigits } from "@/lib/auth/otp-utils";

interface EmailOtpVerifyInlineProps {
  email: string;
  roleContext?: "student" | "teacher";
  onVerified?: (email: string) => void;
  onStatusChange?: (isVerified: boolean) => void;
  className?: string;
}

export function EmailOtpVerifyInline({
  email,
  roleContext = "student",
  onVerified,
  onStatusChange,
  className = "",
}: EmailOtpVerifyInlineProps) {
  const { showToast } = useToast();

  const [isOpen, setIsOpen] = useState(false);
  const [otp, setOtp] = useState<string[]>(Array(6).fill(""));
  const [isVerified, setIsVerified] = useState(false);
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const isEducator = roleContext === "teacher";
  const primaryColor = isEducator ? "#0F766E" : "#2563EB";

  // Reset verification when email changes
  const prevEmailRef = useRef(email);
  useEffect(() => {
    if (prevEmailRef.current !== email) {
      prevEmailRef.current = email;
      setIsVerified(false);
      setIsOpen(false);
      setOtp(Array(6).fill(""));
      setErrorMsg(null);
      if (onStatusChange) {
        onStatusChange(false);
      }
    }
  }, [email, onStatusChange]);

  // Cooldown countdown timer
  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  const cleanEmail = email.trim().toLowerCase();
  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail);

  // Send Email OTP
  const handleSendOtp = async () => {
    if (!isValidEmail) {
      showToast("Invalid Email", "Please enter a valid email address first.", "error");
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/auth/email/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: cleanEmail,
          role: isEducator ? "TEACHER" : "STUDENT",
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to dispatch email verification code.");
      }

      setIsOpen(true);
      setCooldown(60);
      showToast("OTP Sent! ✉️", `A 6-digit verification code was sent to ${cleanEmail}.`, "info");
      setTimeout(() => inputRefs.current[0]?.focus(), 150);
    } catch (err: any) {
      setErrorMsg(err.message);
      showToast("Notice", err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  // Handle digit input
  const handleOtpChange = (index: number, val: string) => {
    const digits = extractOtpDigits(val);
    setErrorMsg(null);

    // Pasted full 6-digit OTP
    if (digits.length === 6) {
      const arr = digits.split("");
      setOtp(arr);
      arr.forEach((d, i) => {
        if (inputRefs.current[i]) inputRefs.current[i]!.value = d;
      });
      inputRefs.current[5]?.focus();
      return;
    }

    const single = digits.slice(-1) || "";
    const newOtp = [...otp];
    newOtp[index] = single;
    setOtp(newOtp);

    // Auto-advance
    if (single && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  // Verify OTP
  const handleVerify = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const entered = otp.join("");
    if (entered.length !== 6) {
      setErrorMsg("Please enter all 6 digits.");
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/auth/email/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: cleanEmail,
          otp: entered,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Invalid or expired verification code.");
      }

      setIsVerified(true);
      setIsOpen(false);
      showToast("Email Verified! ✓", "Your email address has been verified.", "success");
      if (onVerified) onVerified(cleanEmail);
      if (onStatusChange) onStatusChange(true);
    } catch (err: any) {
      setErrorMsg(err.message);
      showToast("Verification Error", err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  // If already verified, show green Email Verified status badge
  if (isVerified) {
    return (
      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold ${className}`}>
        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
        <span>Email Verified</span>
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {!isOpen ? (
        isValidEmail && (
          <button
            type="button"
            onClick={handleSendOtp}
            disabled={loading}
            className="inline-flex items-center gap-1.5 text-xs font-bold hover:underline disabled:opacity-50 transition-colors cursor-pointer"
            style={{ color: primaryColor }}
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>{loading ? "Sending OTP..." : "Verify Email"}</span>
          </button>
        )
      ) : (
        <div className="p-3.5 rounded-2xl bg-white/95 border border-slate-200 shadow-md space-y-3 mt-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
              <Mail className="h-3.5 w-3.5" style={{ color: primaryColor }} />
              <span>Verify Email ({cleanEmail})</span>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-xs text-slate-400 hover:text-slate-600"
            >
              Cancel
            </button>
          </div>

          {errorMsg && (
            <div className="text-[11px] text-red-600 font-semibold flex items-center gap-1">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="flex justify-center gap-1.5">
            {otp.map((digit, i) => (
              <input
                key={i}
                ref={(el) => {
                  inputRefs.current[i] = el;
                }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleOtpChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                className="w-8 h-9 text-center text-sm font-black rounded-lg border border-slate-300 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2"
                style={{ "--tw-ring-color": primaryColor } as any}
              />
            ))}
          </div>

          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={handleSendOtp}
              disabled={cooldown > 0 || loading}
              className="text-[11px] text-slate-500 font-semibold hover:text-slate-700 disabled:opacity-40 flex items-center gap-1 cursor-pointer"
            >
              <RefreshCw className="h-3 w-3" />
              <span>{cooldown > 0 ? `Resend in ${cooldown}s` : "Resend OTP"}</span>
            </button>

            <button
              type="button"
              onClick={() => handleVerify()}
              disabled={loading || otp.join("").length !== 6}
              className="px-3 py-1.5 rounded-xl text-white text-xs font-bold disabled:opacity-50 transition-all cursor-pointer shadow-sm"
              style={{ backgroundColor: primaryColor }}
            >
              {loading ? "Verifying..." : "Confirm OTP"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
