"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Phone, ArrowRight, RefreshCw, CheckCircle2, ShieldCheck, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { GlassButton } from "@/components/glass/glass-button";
import { useToast } from "@/components/ui/toast";
import { extractOtpDigits } from "@/lib/auth/otp-utils";
import { isSafeRedirectPath, sanitizeRedirectUrl } from "@/lib/auth/redirect-validator";

interface PhoneOtpLoginCardProps {
  roleContext?: "student" | "teacher" | "general";
  onSuccess?: (user: any, redirectPath: string) => void;
  className?: string;
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
  const [otp, setOtp] = useState<string[]>(Array(6).fill(""));
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
    const initWidget = async () => {
      try {
        let wid = process.env.NEXT_PUBLIC_MSG91_WIDGET_ID || "";
        if (!wid) {
          const res = await fetch("/api/auth/phone/config", { cache: "no-store" });
          if (res.ok) {
            const json = await res.json();
            wid = json.data?.widgetId || "";
          }
        }
        if (!wid || wid.startsWith("your_")) return;

        const setupMsg91 = () => {
          if (typeof (window as any).initSendOTP === "function") {
            try {
              (window as any).initSendOTP({
                widgetId: wid,
                exposeMethods: true,
                success: (data: any) => {
                  console.log("[MSG91 Web SDK] Verified:", data);
                },
                failure: (err: any) => {
                  console.warn("[MSG91 Web SDK] Notice:", err);
                },
              });
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

      // 2. If MSG91 Web SDK is available in browser, dispatch via window.sendOtp
      // This natively executes Google reCAPTCHA in the client browser, satisfying MSG91's widget security check!
      if (typeof window !== "undefined" && typeof (window as any).sendOtp === "function") {
        await new Promise<void>((resolve, reject) => {
          (window as any).sendOtp(
            normalized,
            (res: any) => {
              const returnedReqId = res?.requestId || res?.reqId || res?.message || "";
              setReqId(returnedReqId);
              setMaskedPhone(masked);
              setStep("OTP");
              setCooldown(60);
              showToast("OTP Sent! 📱", `A 6-digit verification code has been dispatched to ${masked}.`, "info");
              setTimeout(() => {
                inputRefs.current[0]?.focus();
              }, 100);
              resolve();
            },
            (err: any) => {
              const errMsg = typeof err === "string" ? err : err?.message || "Failed to dispatch verification code.";
              reject(new Error(errMsg));
            }
          );
        });
      } else {
        // 3. Fallback to server-side dispatch (for testing, simulation mode, or if script is blocked)
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
        showToast("OTP Sent! 📱", `A 6-digit verification code has been dispatched to ${data.data?.maskedPhone || clean}.`, "info");

        setTimeout(() => {
          inputRefs.current[0]?.focus();
        }, 100);
      }
    } catch (err: any) {
      setErrorMessage(err.message);
      showToast("Notice", err.message, "error");
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

      if (typeof window !== "undefined" && typeof (window as any).retryOtp === "function") {
        await new Promise<void>((resolve, reject) => {
          (window as any).retryOtp(
            "11", // SMS channel
            () => {
              setCooldown(60);
              showToast("Code Resent!", "A fresh OTP has been dispatched to your mobile number.", "success");
              resolve();
            },
            (err: any) => {
              reject(new Error(typeof err === "string" ? err : err?.message || "Failed to resend code."));
            },
            reqId
          );
        });
      } else {
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
      setErrorMessage(err.message);
      showToast("Resend Error", err.message, "error");
    } finally {
      setResending(false);
    }
  };

  // Handle OTP Slot Inputs
  const handleOtpChange = (index: number, value: string) => {
    const digits = extractOtpDigits(value);
    setErrorMessage(null);

    // If pasted full 6-digit code
    if (digits.length === 6) {
      const arr = digits.split("");
      setOtp(arr);
      arr.forEach((d, i) => {
        if (inputRefs.current[i]) inputRefs.current[i]!.value = d;
      });
      inputRefs.current[5]?.focus();
      return;
    }

    const singleDigit = digits.slice(-1) || "";
    const newOtp = [...otp];
    newOtp[index] = singleDigit;
    setOtp(newOtp);

    // Auto-advance
    if (singleDigit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      if (!otp[index] && index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
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
    if (enteredOtp.length !== 6) {
      setErrorMessage("Please enter the complete 6-digit verification code.");
      showToast("Validation Error", "Please enter all 6 digits of the verification code.", "error");
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
                const token =
                  data?.["access-token"] ||
                  data?.accessToken ||
                  (typeof data?.message === "string" && data.message.length > 20 ? data.message : undefined);

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
      setErrorMessage(err.message);
      showToast("Authentication Error", err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {errorMessage && (
        <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs font-semibold flex items-center gap-2">
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
              <div className="absolute left-3 flex items-center gap-1.5 pointer-events-none text-slate-500 font-bold text-xs border-r border-slate-200 pr-2">
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
                className="w-full pl-20 pr-4 py-3 rounded-2xl bg-white/80 border border-slate-200 text-slate-900 text-sm font-semibold tracking-wider placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:border-transparent transition-all"
                style={{ "--tw-ring-color": primaryColor } as any}
              />
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Enter the registered phone number linked to your account.
            </p>
          </div>

          <div className="flex items-center justify-between text-xs font-semibold">
            <Link href={registerUrl} className="text-slate-600 hover:text-slate-900 hover:underline">
              Don&apos;t have an account? Sign up
            </Link>
          </div>

          <GlassButton
            type="submit"
            variant={buttonVariant}
            className="w-full text-white font-bold"
            style={{ backgroundColor: primaryColor, borderColor: primaryColor }}
            isLoading={loading}
            rightIcon={<ArrowRight className="h-4 w-4" />}
          >
            Get OTP via SMS
          </GlassButton>
        </form>
      ) : (
        <form onSubmit={handleVerifyOtp} className="space-y-4">
          <div className="text-center space-y-1">
            <div className="text-xs font-bold text-slate-700">
              Enter 6-digit code sent to
            </div>
            <div className="text-sm font-black text-slate-900 flex items-center justify-center gap-1.5">
              <span>{maskedPhone}</span>
              <button
                type="button"
                onClick={() => setStep("PHONE")}
                className="text-xs font-semibold text-blue-600 hover:underline ml-1"
              >
                Change
              </button>
            </div>
          </div>

          {/* 6 OTP Input Boxes */}
          <div className="flex justify-center gap-2 py-2">
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
                onChange={(e) => handleOtpChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                className="w-11 h-12 text-center text-lg font-black rounded-xl border border-slate-200 bg-white/90 text-slate-900 focus:outline-none focus:ring-2 transition-all"
                style={{ "--tw-ring-color": primaryColor } as any}
              />
            ))}
          </div>

          <div className="flex items-center justify-between text-xs">
            <button
              type="button"
              onClick={handleResend}
              disabled={cooldown > 0 || resending}
              className="text-slate-600 font-semibold hover:text-slate-900 disabled:opacity-50 flex items-center gap-1.5"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${resending ? "animate-spin" : ""}`} />
              <span>{cooldown > 0 ? `Resend in ${cooldown}s` : "Resend Code"}</span>
            </button>
            <button
              type="button"
              onClick={() => setStep("PHONE")}
              className="text-slate-500 hover:text-slate-700"
            >
              Back to Phone
            </button>
          </div>

          <GlassButton
            type="submit"
            variant={buttonVariant}
            className="w-full text-white font-bold"
            style={{ backgroundColor: primaryColor, borderColor: primaryColor }}
            isLoading={loading}
            rightIcon={<ShieldCheck className="h-4 w-4" />}
          >
            Verify & Sign In
          </GlassButton>
        </form>
      )}
    </div>
  );
}
