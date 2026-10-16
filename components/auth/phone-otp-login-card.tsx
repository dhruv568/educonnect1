"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Phone, ArrowRight, RefreshCw, CheckCircle2, ShieldCheck, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { GlassButton } from "@/components/glass/glass-button";
import { useToast } from "@/components/ui/toast";
import { extractOtpDigits, extractPhoneOtpDigits } from "@/lib/auth/otp-utils";
import { isSafeRedirectPath, sanitizeRedirectUrl } from "@/lib/auth/redirect-validator";

interface PhoneOtpLoginCardProps {
  roleContext?: "student" | "teacher" | "general";
  onSuccess?: (user: any, redirectPath: string) => void;
  className?: string;
}

/**
 * Sanitizes provider error messages to prevent raw technical leaks (e.g. AuthenticationFailure)
 * and provide friendly, actionable feedback to users.
 */
function sanitizeClientErrorMessage(rawMessage: string | undefined): string {
  if (!rawMessage) return "An unexpected error occurred. Please try again.";
  const lower = rawMessage.toLowerCase();
  if (
    lower.includes("authenticationfailure") ||
    lower.includes("invalid authkey") ||
    lower.includes("widget id")
  ) {
    return "SMS verification service is temporarily unavailable. Please try again in a few moments or use Email & Password.";
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
  if (lower.includes("no account is registered")) {
    return "No account is registered with this phone number. Please create an account first.";
  }
  if (lower.includes("network") || lower.includes("failed to fetch")) {
    return "Network connection issue. Please check your internet connection and try again.";
  }
  return rawMessage;
}

/**
 * Robustly extracts an MSG91 access-token from diverse response shapes returned by the Web SDK.
 */
function extractAccessToken(data: any): string | undefined {
  if (!data) return undefined;
  if (typeof data === "string" && data.length > 20) {
    return data;
  }
  if (typeof data === "object") {
    if (typeof data["access-token"] === "string" && data["access-token"]) {
      return data["access-token"];
    }
    if (typeof data.accessToken === "string" && data.accessToken) {
      return data.accessToken;
    }
    if (typeof data.token === "string" && data.token) {
      return data.token;
    }
    if (typeof data.message === "string" && data.message.length > 20) {
      return data.message;
    }
    if (data.data && typeof data.data === "object") {
      return extractAccessToken(data.data);
    }
  }
  return undefined;
}

export function PhoneOtpLoginCard({
  roleContext = "student",
  onSuccess,
  className = "",
}: PhoneOtpLoginCardProps) {
  const router = useRouter();
  const { showToast } = useToast();

  const [phone, setPhone] = useState("");
  const [step, setStep] = useState<"PHONE" | "OTP">("PHONE");
  const [reqId, setReqId] = useState<string>("");
  const [maskedPhone, setMaskedPhone] = useState<string>("");
  const [otp, setOtp] = useState<string[]>(Array(4).fill(""));
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Theme configuration based on roleContext
  const isEducator = roleContext === "teacher";
  const primaryColor = isEducator ? "#0F766E" : "#2563EB";
  const hoverColor = isEducator ? "#115E59" : "#1E40AF";
  const buttonVariant = isEducator ? "educator" : "learner";
  const registerUrl = isEducator ? "/teacher/register" : "/student/register";

  // Countdown timer for resend cooldown
  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
      return () => clearTimeout(timer);
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
                captchaRenderId: "msg91-captcha-login",
                success: (data: any) => {
                  console.log("[MSG91 Web SDK] Verified event received:", data);
                },
                failure: (err: any) => {
                  console.warn("[MSG91 Web SDK] Notice:", err);
                },
              };
              if (tokenAuth) {
                initConfig.tokenAuth = tokenAuth;
              }
              (window as any).initSendOTP(initConfig);
            } catch (initErr) {
              console.warn("[MSG91 Web SDK] init error:", initErr);
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
        console.warn("[MSG91 Web SDK] Setup error:", err);
      }
    };

    initWidget();

    return () => {
      isMounted = false;
    };
  }, []);

  // Handle Send OTP
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const clean = phone.replace(/\D/g, "");
    if (clean.length < 10) {
      setErrorMessage("Please enter a valid 10-digit mobile number.");
      showToast("Validation Error", "Please enter a valid mobile number.", "error");
      return;
    }

    setLoading(true);
    try {
      // 1. Pre-check phone with backend: validates rate limits & account existence
      // (Requirement 7: Do not send OTP to unknown numbers!)
      const preCheckRes = await fetch("/api/auth/phone/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: clean,
          purpose: "LOGIN",
          role: roleContext === "student" ? "STUDENT" : roleContext === "teacher" ? "TEACHER" : undefined,
          checkOnly: true,
        }),
      });

      const preCheckData = await preCheckRes.json();
      if (!preCheckRes.ok) {
        throw new Error(preCheckData.error || "Unable to process phone login request.");
      }

      const normalized = preCheckData.data?.phone || clean;
      const masked = preCheckData.data?.maskedPhone || clean;

      let dispatched = false;

      // 2. If MSG91 Web SDK is available in browser, attempt dispatch via window.sendOtp
      if (typeof window !== "undefined" && typeof (window as any).sendOtp === "function") {
        try {
          await new Promise<void>((resolve, reject) => {
            (window as any).sendOtp(
              normalized,
              (res: any) => {
                const returnedReqId = res?.requestId || res?.reqId || res?.message || "";
                setReqId(returnedReqId);
                setMaskedPhone(masked);
                setStep("OTP");
                setCooldown(60);
                showToast("OTP Sent! 📱", `A 4-digit verification code has been dispatched to ${masked}.`, "info");
                setTimeout(() => {
                  inputRefs.current[0]?.focus();
                }, 100);
                dispatched = true;
                resolve();
              },
              (err: any) => {
                console.warn("[MSG91 Web SDK] sendOtp notice:", err);
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
          // Fall through to server-side dispatch
          dispatched = false;
        }
      }

      // 3. Fallback to server-side dispatch (for testing, simulation mode, or if client SDK failed)
      if (!dispatched) {
        const res = await fetch("/api/auth/phone/send-otp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            phone: clean,
            purpose: "LOGIN",
            role: roleContext === "student" ? "STUDENT" : roleContext === "teacher" ? "TEACHER" : undefined,
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Failed to send verification code.");
        }

        setReqId(data.data?.reqId || "");
        setMaskedPhone(data.data?.maskedPhone || clean);
        setStep("OTP");
        setCooldown(60);
        showToast("OTP Sent! 📱", `A 4-digit verification code has been dispatched to ${data.data?.maskedPhone || clean}.`, "info");

        setTimeout(() => {
          inputRefs.current[0]?.focus();
        }, 100);
      }
    } catch (err: any) {
      const safeMsg = sanitizeClientErrorMessage(err.message);
      setErrorMessage(safeMsg);
      showToast("Notice", safeMsg, "error");
    } finally {
      setLoading(false);
    }
  };

  // Handle Resend OTP
  const handleResend = async () => {
    if (cooldown > 0 || resending) return;
    setResending(true);
    setErrorMessage(null);

    try {
      const clean = phone.replace(/\D/g, "");
      const norm = "91" + (clean.length === 10 ? clean : clean.slice(-10));
      let resent = false;

      if (typeof window !== "undefined" && typeof (window as any).retryOtp === "function") {
        try {
          await new Promise<void>((resolve, reject) => {
            (window as any).retryOtp(
              "11", // SMS channel
              () => {
                setCooldown(60);
                showToast("Code Resent!", "A fresh OTP has been dispatched to your mobile number.", "success");
                resent = true;
                resolve();
              },
              (err: any) => {
                console.warn("[MSG91 Web SDK] retryOtp failed, attempting server-side fallback:", err);
                reject(err);
              },
              reqId
            );
          });
        } catch {
          resent = false;
        }
      }

      if (!resent) {
        const res = await fetch("/api/auth/phone/send-otp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            phone: clean,
            purpose: "LOGIN",
            role: roleContext === "student" ? "STUDENT" : roleContext === "teacher" ? "TEACHER" : undefined,
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Failed to resend code.");
        }

        setReqId(data.data?.reqId || reqId);
        setCooldown(60);
        showToast("Code Resent!", "A fresh OTP has been dispatched to your mobile number.", "success");
      }
    } catch (err: any) {
      const safeMsg = sanitizeClientErrorMessage(err.message);
      setErrorMessage(safeMsg);
      showToast("Resend Error", safeMsg, "error");
    } finally {
      setResending(false);
    }
  };

  // Handle OTP Slot Inputs
  const handleOtpChange = (index: number, value: string) => {
    const digits = extractPhoneOtpDigits(value);
    setErrorMessage(null);

    // If pasted full 4-digit code
    if (digits.length === 4) {
      const arr = digits.split("");
      setOtp(arr);
      arr.forEach((d, i) => {
        if (inputRefs.current[i]) inputRefs.current[i]!.value = d;
      });
      inputRefs.current[3]?.focus();
      return;
    }

    const singleDigit = digits.slice(-1) || "";
    const newOtp = [...otp];
    newOtp[index] = singleDigit;
    setOtp(newOtp);

    // Auto-advance
    if (singleDigit && index < 3) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      if (!otp[index] && index > 0) {
        e.preventDefault();
        const newOtp = [...otp];
        newOtp[index - 1] = "";
        setOtp(newOtp);
        inputRefs.current[index - 1]?.focus();
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      e.preventDefault();
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < 3) {
      e.preventDefault();
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text");
    const digits = extractPhoneOtpDigits(pasted);
    if (digits) {
      const arr = Array(4).fill("");
      for (let i = 0; i < Math.min(digits.length, 4); i++) {
        arr[i] = digits[i];
      }
      setOtp(arr);
      const focusIndex = Math.min(digits.length - 1, 3);
      inputRefs.current[focusIndex]?.focus();
    }
  };

  // Helper to submit verified result to our server for session creation & role redirect
  const submitServerLogin = async (payload: { accessToken?: string; otp?: string; reqId?: string }) => {
    const searchParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
    const returnParam = searchParams?.get("returnTo") || searchParams?.get("redirectTo");
    const safeReturn = returnParam && isSafeRedirectPath(returnParam) ? sanitizeRedirectUrl(returnParam) : undefined;

    const res = await fetch("/api/auth/phone/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        phone: phone.replace(/\D/g, ""),
        role: roleContext === "student" ? "STUDENT" : roleContext === "teacher" ? "TEACHER" : undefined,
        returnTo: safeReturn,
        redirectTo: safeReturn,
        ...payload,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Phone OTP verification failed.");
    }

    showToast("Signed In Successfully! 🎉", `Welcome back, ${data.data?.user?.firstName || "User"}!`, "success");

    const destination = data.data?.redirectPath || safeReturn || (isEducator ? "/teacher/dashboard" : "/student/dashboard");

    if (onSuccess) {
      onSuccess(data.data.user, destination);
    } else {
      window.location.replace(destination);
    }
  };

  // Handle OTP Verification & Login
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const enteredOtp = otp.join("");
    if (enteredOtp.length !== 4) {
      setErrorMessage("Please enter the complete 4-digit verification code.");
      showToast("Validation Error", "Please enter all 4 digits of the verification code.", "error");
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      // If MSG91 Web SDK verifyOtp is available, verify via client SDK to get access token
      if (typeof window !== "undefined" && typeof (window as any).verifyOtp === "function") {
        await new Promise<void>((resolve, reject) => {
          (window as any).verifyOtp(
            enteredOtp,
            async (data: any) => {
              try {
                const token = extractAccessToken(data);

                await submitServerLogin({
                  accessToken: token,
                  otp: enteredOtp,
                  reqId,
                });
                resolve();
              } catch (subErr) {
                reject(subErr);
              }
            },
            async (err: any) => {
              // If client verify fails, fallback to direct server verification
              try {
                await submitServerLogin({ otp: enteredOtp, reqId });
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
        // Direct server verification
        await submitServerLogin({ otp: enteredOtp, reqId });
      }
    } catch (err: any) {
      const safeMsg = sanitizeClientErrorMessage(err.message);
      setErrorMessage(safeMsg);
      showToast("Authentication Error", safeMsg, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`w-full space-y-4 ${className}`}>
      {errorMessage && (
        <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-xs font-semibold flex items-center gap-2.5">
          <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {step === "PHONE" ? (
        <form onSubmit={handleSendOtp} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Mobile Phone Number
            </label>
            <div className="relative flex items-center">
              <div className="absolute left-3.5 flex items-center gap-1.5 pointer-events-none text-slate-500 font-bold text-xs border-r border-slate-200 pr-2.5">
                <Phone className="h-3.5 w-3.5 text-slate-400" />
                <span>+91</span>
              </div>
              <input
                type="tel"
                placeholder="98765 43210"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                maxLength={15}
                required
                className="w-full pl-20 pr-4 py-3 rounded-2xl bg-white/80 border border-slate-200 text-slate-900 text-sm font-semibold tracking-wider placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:border-transparent transition-all shadow-2xs"
                style={{ "--tw-ring-color": primaryColor } as any}
              />
            </div>
            <p className="text-[11px] text-slate-500 mt-1.5">
              Enter the registered phone number linked to your account.
            </p>
          </div>

          {/* MSG91 CAPTCHA challenge container row */}
          <div className="w-full flex justify-center items-center py-1">
            <div
              id="msg91-captcha-login"
              className="flex justify-center items-center min-h-[78px] max-w-full overflow-x-auto"
            />
          </div>

          <div className="flex items-center justify-between text-xs font-semibold">
            <Link href={registerUrl} className="text-slate-600 hover:text-slate-900 hover:underline">
              Don&apos;t have an account? Sign up
            </Link>
          </div>

          <GlassButton
            type="submit"
            variant={buttonVariant}
            className="w-full text-white font-bold py-3"
            style={{ backgroundColor: primaryColor, borderColor: primaryColor }}
            isLoading={loading}
            rightIcon={<ArrowRight className="h-4 w-4" />}
          >
            Get OTP via SMS
          </GlassButton>
        </form>
      ) : (
        <form onSubmit={handleVerifyOtp} className="space-y-4">
          <div className="text-center space-y-1.5 pb-1">
            <div className="text-xs font-bold text-slate-600 uppercase tracking-wider">
              Enter 4-digit verification code
            </div>
            <div className="text-sm font-black text-slate-900 flex items-center justify-center gap-2">
              <span className="tracking-wide">{maskedPhone}</span>
              <button
                type="button"
                onClick={() => setStep("PHONE")}
                className="text-xs font-bold hover:underline cursor-pointer transition-colors"
                style={{ color: primaryColor }}
              >
                Change
              </button>
            </div>
          </div>

          {/* Requirement 3: Separate, properly spaced row for hCaptcha widget */}
          <div className="w-full flex justify-center items-center py-1">
            <div
              id="msg91-captcha-login"
              className="flex justify-center items-center min-h-[78px] max-w-full overflow-x-auto"
            />
          </div>

          {/* Requirement 2 & 4: Exactly 4 clearly visible, responsive OTP input boxes */}
          <div className="w-full flex justify-center items-center gap-2.5 sm:gap-3.5 py-1">
            {otp.map((digit, index) => (
              <input
                key={index}
                ref={(el) => {
                  inputRefs.current[index] = el;
                }}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={1}
                value={digit}
                autoComplete="one-time-code"
                aria-label={`Digit ${index + 1} of 4`}
                onChange={(e) => handleOtpChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                onPaste={handlePaste}
                className="w-12 h-14 sm:w-14 sm:h-16 shrink-0 text-center text-xl sm:text-2xl font-black rounded-xl sm:rounded-2xl border-2 border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:border-transparent transition-all shadow-xs"
                style={{
                  borderColor: digit ? primaryColor : undefined,
                  "--tw-ring-color": primaryColor,
                } as any}
              />
            ))}
          </div>

          {/* Requirement 5: Keep resend countdown and Back to Phone controls aligned and usable */}
          <div className="flex items-center justify-between text-xs px-1 pt-1">
            <button
              type="button"
              onClick={handleResend}
              disabled={cooldown > 0 || resending}
              className="text-slate-600 font-semibold hover:text-slate-900 disabled:opacity-50 flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${resending ? "animate-spin" : ""}`} />
              <span>{cooldown > 0 ? `Resend in ${cooldown}s` : "Resend Code"}</span>
            </button>
            <button
              type="button"
              onClick={() => setStep("PHONE")}
              className="text-slate-500 hover:text-slate-800 font-medium cursor-pointer transition-colors"
            >
              Back to Phone
            </button>
          </div>

          {/* Submit Button */}
          <GlassButton
            type="submit"
            variant={buttonVariant}
            className="w-full text-white font-bold py-3 mt-1"
            style={{ backgroundColor: primaryColor, borderColor: primaryColor }}
            isLoading={loading}
            disabled={loading || otp.join("").length !== 4}
            rightIcon={<ShieldCheck className="h-4 w-4" />}
          >
            Verify & Sign In
          </GlassButton>
        </form>
      )}
    </div>
  );
}
