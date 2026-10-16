"use client";

import React, { useState, useEffect, useRef } from "react";
import { ShieldCheck, Phone, CheckCircle2, RefreshCw, AlertCircle } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { extractOtpDigits, extractPhoneOtpDigits } from "@/lib/auth/otp-utils";

interface PhoneOtpVerifyInlineProps {
  phone: string;
  email?: string;
  onVerified?: (normalizedPhone: string) => void;
  onStatusChange?: (isVerified: boolean) => void;
  roleContext?: "student" | "teacher";
  className?: string;
}

/**
 * Sanitizes provider error messages for inline verification.
 */
function sanitizeInlineErrorMessage(rawMessage: string | undefined): string {
  if (!rawMessage) return "An unexpected error occurred. Please try again.";
  const lower = rawMessage.toLowerCase();
  if (
    lower.includes("authenticationfailure") ||
    lower.includes("invalid authkey") ||
    lower.includes("widget id")
  ) {
    return "SMS verification service is temporarily unavailable. Please try again in a few moments.";
  }
  if (lower.includes("invalid captcha") || lower.includes("captcha")) {
    return "Security verification required. Please complete the captcha verification to proceed.";
  }
  if (
    lower.includes("invalid otp") ||
    lower.includes("incorrect otp") ||
    lower.includes("otp not match")
  ) {
    return "Invalid or expired verification code. Please check the 4-digit code and try again.";
  }
  if (lower.includes("network") || lower.includes("failed to fetch")) {
    return "Network connection issue. Please check your internet connection.";
  }
  return rawMessage;
}

export function PhoneOtpVerifyInline({
  phone,
  email,
  onVerified,
  onStatusChange,
  roleContext = "student",
  className = "",
}: PhoneOtpVerifyInlineProps) {
  const { showToast } = useToast();

  const [isOpen, setIsOpen] = useState(false);
  const [reqId, setReqId] = useState<string>("");
  const [otp, setOtp] = useState<string[]>(Array(4).fill(""));
  const [isVerified, setIsVerified] = useState(false);
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const captchaContainerId = useRef(
    `msg91-captcha-inline-${Math.random().toString(36).substring(2, 8)}`
  ).current;

  const isEducator = roleContext === "teacher";
  const primaryColor = isEducator ? "#0F766E" : "#2563EB";

  // Reset verification when phone number changes
  const prevPhoneRef = useRef(phone);
  useEffect(() => {
    if (prevPhoneRef.current !== phone) {
      prevPhoneRef.current = phone;
      setIsVerified(false);
      setIsOpen(false);
      setOtp(Array(4).fill(""));
      setErrorMsg(null);
      if (onStatusChange) {
        onStatusChange(false);
      }
    }
  }, [phone, onStatusChange]);

  useEffect(() => {
    if (cooldown > 0) {
      const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [cooldown]);

  // Initialize MSG91 Web SDK for client-side Captcha & OTP handling
  useEffect(() => {
    let isMounted = true;

    const initWidget = async () => {
      try {
        let wid = process.env.NEXT_PUBLIC_MSG91_WIDGET_ID || "";
        let tokenAuth = process.env.NEXT_PUBLIC_MSG91_TOKEN_AUTH || "";

        if (!wid || !tokenAuth) {
          const res = await fetch("/api/auth/phone/config", { cache: "no-store" });
          if (res.ok) {
            const json = await res.json();
            if (!wid) wid = json.data?.widgetId || "";
            if (!tokenAuth) tokenAuth = json.data?.tokenAuth || "";
          }
        }
        if (!wid || wid.startsWith("your_")) return;

        const setupMsg91 = () => {
          if (!isMounted) return;
          if (typeof (window as any).initSendOTP === "function") {
            try {
              const initConfig: Record<string, any> = {
                widgetId: wid,
                exposeMethods: true,
                captchaRenderId: captchaContainerId,
                success: (data: any) => {
                  console.log("[MSG91 Web SDK] Verified inline:", data);
                },
                failure: (err: any) => {
                  console.warn("[MSG91 Web SDK] Notice inline:", err);
                },
              };
              if (tokenAuth) {
                initConfig.tokenAuth = tokenAuth;
              }
              (window as any).initSendOTP(initConfig);
            } catch (initErr) {
              console.warn("[MSG91 Web SDK] init error inline:", initErr);
            }
          }
        };

        if (typeof (window as any).initSendOTP === "function") {
          setupMsg91();
        } else if (!document.getElementById("msg91-otp-provider-script")) {
          const script = document.createElement("script");
          script.id = "msg91-otp-provider-script";
          script.src = "https://verify.msg91.com/otp-provider.js";
          script.async = true;
          script.onload = setupMsg91;
          document.body.appendChild(script);
        }
      } catch (err) {
        console.warn("[MSG91 Web SDK] Setup error inline:", err);
      }
    };

    initWidget();

    return () => {
      isMounted = false;
    };
  }, []);

  const cleanPhone = phone.replace(/\D/g, "");
  const isValidLength = cleanPhone.length === 10 || (cleanPhone.length === 12 && cleanPhone.startsWith("91"));

  const handleSendOtp = async () => {
    if (!isValidLength) {
      showToast("Invalid Mobile", "Please enter a valid 10-digit mobile number first.", "error");
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    try {
      // 1. Pre-check with server: validate duplicate phone prevention
      const preCheckRes = await fetch("/api/auth/phone/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: cleanPhone,
          purpose: "SIGNUP",
          role: roleContext === "student" ? "STUDENT" : "TEACHER",
          checkOnly: true,
        }),
      });

      const preCheckData = await preCheckRes.json();
      if (!preCheckRes.ok) {
        throw new Error(preCheckData.error || "Unable to process phone verification.");
      }

      const normalized = preCheckData.data?.phone || cleanPhone;

      let dispatched = false;

      // 2. If Web SDK is available, attempt dispatch via window.sendOtp
      if (typeof window !== "undefined" && typeof (window as any).sendOtp === "function") {
        try {
          await new Promise<void>((resolve, reject) => {
            (window as any).sendOtp(
              normalized,
              (res: any) => {
                const returnedReqId = res?.requestId || res?.reqId || res?.message || "";
                setReqId(returnedReqId);
                setIsOpen(true);
                setCooldown(60);
                showToast("Verification Code Sent! 📱", "Enter the 4-digit code received on your mobile.", "info");
                setTimeout(() => inputRefs.current[0]?.focus(), 150);
                dispatched = true;
                resolve();
              },
              (err: any) => {
                console.warn("[MSG91 Web SDK inline] sendOtp notice:", err);
                if (err && typeof err === "object" && (err.pending || err.siteKeyError)) {
                  reject(new Error("Security verification required. Please complete the captcha verification to receive your OTP."));
                } else {
                  reject(err);
                }
              }
            );
          });
        } catch (sdkErr: any) {
          if (sdkErr?.message?.includes("Security verification required")) {
            throw sdkErr;
          }
          dispatched = false;
        }
      }

      // 3. Fallback to server dispatch (if client SDK was unavailable or failed)
      if (!dispatched) {
        const res = await fetch("/api/auth/phone/send-otp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            phone: cleanPhone,
            purpose: "SIGNUP",
            role: roleContext === "student" ? "STUDENT" : "TEACHER",
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Failed to dispatch verification code.");
        }

        setReqId(data.data?.reqId || "");
        setIsOpen(true);
        setCooldown(60);
        showToast("Verification Code Sent! 📱", "Enter the 4-digit code received on your mobile.", "info");

        setTimeout(() => inputRefs.current[0]?.focus(), 150);
      }
    } catch (err: any) {
      const safeMsg = sanitizeInlineErrorMessage(err.message);
      setErrorMsg(safeMsg);
      showToast("Notice", safeMsg, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (index: number, val: string) => {
    const digits = extractPhoneOtpDigits(val);
    setErrorMsg(null);

    if (digits.length === 4) {
      const arr = digits.split("");
      setOtp(arr);
      arr.forEach((d, i) => {
        if (inputRefs.current[i]) inputRefs.current[i]!.value = d;
      });
      inputRefs.current[3]?.focus();
      return;
    }

    const single = digits.slice(-1) || "";
    const newOtp = [...otp];
    newOtp[index] = single;
    setOtp(newOtp);

    if (single && index < 3) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const submitServerVerify = async (payload: { accessToken?: string; otp: string; reqId?: string }) => {
    const res = await fetch("/api/auth/phone/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        phone: cleanPhone,
        email,
        ...payload,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Verification failed. Invalid code.");
    }

    setIsVerified(true);
    setIsOpen(false);
    showToast("Phone Verified! ✓", "Your phone number has been verified via MSG91.", "success");
    if (onVerified) {
      onVerified(data.data?.phone || cleanPhone);
    }
    if (onStatusChange) {
      onStatusChange(true);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    const entered = otp.join("");
    if (entered.length !== 4) {
      setErrorMsg("Please enter all 4 digits.");
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    try {
      if (typeof window !== "undefined" && typeof (window as any).verifyOtp === "function") {
        await new Promise<void>((resolve, reject) => {
          (window as any).verifyOtp(
            entered,
            async (data: any) => {
              try {
                const token =
                  typeof data === "string" && data.length > 20
                    ? data
                    : data?.["access-token"] ||
                      data?.accessToken ||
                      data?.token ||
                      (typeof data?.message === "string" && data.message.length > 20 ? data.message : undefined);
                await submitServerVerify({ accessToken: token, otp: entered, reqId });
                resolve();
              } catch (subErr) {
                reject(subErr);
              }
            },
            async (err: any) => {
              try {
                await submitServerVerify({ otp: entered, reqId });
                resolve();
              } catch (fallbackErr: any) {
                const errMsg = typeof err === "string" ? err : err?.message || fallbackErr?.message || "Invalid OTP entered.";
                reject(new Error(errMsg));
              }
            },
            reqId
          );
        });
      } else {
        await submitServerVerify({ otp: entered, reqId });
      }
    } catch (err: any) {
      const safeMsg = sanitizeInlineErrorMessage(err.message);
      setErrorMsg(safeMsg);
      showToast("Verification Error", safeMsg, "error");
    } finally {
      setLoading(false);
    }
  };

  if (isVerified) {
    return (
      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold ${className}`}>
        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
        <span>Phone Verified</span>
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {!isOpen ? (
        isValidLength && (
          <button
            type="button"
            onClick={handleSendOtp}
            disabled={loading}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-800 disabled:opacity-50 transition-colors cursor-pointer"
            style={{ color: primaryColor }}
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>{loading ? "Sending OTP..." : "Verify Phone"}</span>
          </button>
        )
      ) : (
        <div className="p-3.5 rounded-2xl bg-white/95 border border-slate-200 shadow-md space-y-3 mt-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
              <Phone className="h-3.5 w-3.5" style={{ color: primaryColor }} />
              <span>Verify Mobile Number (+91 {cleanPhone.slice(-10)})</span>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-xs text-slate-400 hover:text-slate-600"
            >
              Cancel
            </button>
          </div>

          {/* MSG91 inline CAPTCHA container */}
          <div id={captchaContainerId} className="flex justify-center my-1.5" />

          {errorMsg && (
            <div className="text-[11px] text-red-600 font-semibold flex items-center gap-1">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="flex justify-center gap-2">
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
                aria-label={`Digit ${i + 1} of 4`}
                onChange={(e) => handleOtpChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                className="w-10 h-11 shrink-0 text-center text-base font-black rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2"
                style={{ "--tw-ring-color": primaryColor } as any}
              />
            ))}
          </div>

          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={handleSendOtp}
              disabled={cooldown > 0 || loading}
              className="text-[11px] text-slate-500 font-semibold hover:text-slate-700 disabled:opacity-40 flex items-center gap-1"
            >
              <RefreshCw className="h-3 w-3" />
              <span>{cooldown > 0 ? `Resend in ${cooldown}s` : "Resend OTP"}</span>
            </button>

            <button
              type="button"
              onClick={handleVerify}
              disabled={loading || otp.join("").length !== 4}
              className="px-3.5 py-1.5 rounded-xl text-white text-xs font-bold disabled:opacity-50 transition-all cursor-pointer shadow-sm"
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
