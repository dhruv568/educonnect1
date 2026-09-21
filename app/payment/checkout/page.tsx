"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Lock,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  CreditCard,
  Sparkles,
  Tag,
  X,
  MessageSquare,
  Phone,
} from "lucide-react";
import { formatPaise } from "@/lib/currency";
import { BackButton } from "@/components/ui/back-button";

function CheckoutContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const type = searchParams.get("type") || "COURSE_ENROLLMENT";
  const courseId = searchParams.get("courseId");
  const educatorId = searchParams.get("educatorId");
  const slotId = searchParams.get("slotId");
  const urlOffer =
    searchParams.get("offer") ||
    searchParams.get("code") ||
    searchParams.get("coupon") ||
    "";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [orderData, setOrderData] = useState<any>(null);
  const [processing, setProcessing] = useState(false);

  // WhatsApp Notification State
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [whatsappError, setWhatsappError] = useState<string | null>(null);

  // Coupon / Offer state
  const [inputCode, setInputCode] = useState(urlOffer.toUpperCase());
  const [appliedCode, setAppliedCode] = useState(urlOffer.toUpperCase());
  const [validatingOffer, setValidatingOffer] = useState(false);
  const [offerError, setOfferError] = useState<string | null>(null);

  // Pre-fill WhatsApp number from profile
  useEffect(() => {
    async function loadUserProfile() {
      try {
        const res = await fetch("/api/profile");
        const json = await res.json();
        if (json.success && json.data?.user?.phone) {
          setWhatsappNumber(json.data.user.phone);
        }
      } catch (err) {
        console.warn("Could not load user profile for WhatsApp pre-fill:", err);
      }
    }
    loadUserProfile();
  }, []);

  const validateWhatsAppNumber = (num: string): { valid: boolean; formatted?: string; error?: string } => {
    const trimmed = num.trim();
    if (!trimmed) {
      return { valid: false, error: "WhatsApp number is required for notifications before payment." };
    }
    if (trimmed.includes("@")) {
      return { valid: false, error: "Email addresses cannot be used as a WhatsApp number. Please enter a valid mobile number." };
    }
    const digitsOnly = trimmed.replace(/\D/g, "");
    if (digitsOnly.length < 10 || digitsOnly.length > 15) {
      return { valid: false, error: "Please enter a valid 10 to 15-digit WhatsApp number (e.g. 9876543210)." };
    }
    return { valid: true, formatted: trimmed };
  };

  const saveWhatsAppToProfile = async (num: string): Promise<boolean> => {
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: num }),
      });
      const json = await res.json();
      return res.ok && json.success;
    } catch {
      return false;
    }
  };

  const fetchOrder = useCallback(
    async (codeToApply?: string) => {
      setError(null);
      setOfferError(null);
      try {
        let activeCourseId = courseId;
        if (!activeCourseId && educatorId && type === "COURSE_ENROLLMENT") {
          try {
            const tRes = await fetch(`/api/teachers/${educatorId}`);
            const tJson = await tRes.json();
            if (tJson.success && tJson.data?.teacher?.courses?.length > 0) {
              activeCourseId = tJson.data.teacher.courses[0].id;
            } else {
              const cRes = await fetch("/api/courses?limit=1");
              const cJson = await cRes.json();
              if (cJson.success && cJson.data?.courses?.length > 0) {
                activeCourseId = cJson.data.courses[0].id;
              }
            }
          } catch {}
        }

        if (type === "COURSE_ENROLLMENT" && !activeCourseId) {
          throw new Error("BAD_REQUEST: courseId is required for course enrollment.");
        }
        if (type === "LIVE_CLASS_BOOKING" && !slotId) {
          throw new Error("BAD_REQUEST: liveClassSlotId is required for live class booking.");
        }

        const effectiveOfferCode = codeToApply !== undefined ? codeToApply : appliedCode;

        const res = await fetch("/api/payments/create-order", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type,
            courseId: activeCourseId || undefined,
            liveClassSlotId: slotId || undefined,
            offerCode: effectiveOfferCode?.trim() || undefined,
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          // If code was rejected, provide specific offer error if relevant
          if (effectiveOfferCode) {
            const cleanError = (data.error || "Invalid or expired offer code.")
              .replace(/^[A-Z_]+:\s*/, "");
            setOfferError(cleanError);

            // If we don't have orderData yet (e.g. invalid code from URL), initialize order WITHOUT the bad code so checkout doesn't stay blank
            if (!orderData) {
              const retryRes = await fetch("/api/payments/create-order", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  type,
                  courseId: activeCourseId || undefined,
                  liveClassSlotId: slotId || undefined,
                }),
              });
              const retryData = await retryRes.json();
              if (retryRes.ok && retryData.data) {
                setOrderData(retryData.data);
                setAppliedCode("");
                setInputCode("");
                return;
              }
            } else {
              // Existing orderData exists, keep checkout active
              return;
            }
          }
          throw new Error(data.error || "Failed to initialize payment order.");
        }

        if (data.data.isFree) {
          // Free product -> automatically redirected
          router.push(`/payment/success?transactionId=${data.data.transactionId}&free=true`);
          return;
        }

        setOrderData(data.data);
        if (data.data.appliedOffer?.code) {
          setAppliedCode(data.data.appliedOffer.code);
          setInputCode(data.data.appliedOffer.code);
        } else if (codeToApply === "") {
          setAppliedCode("");
          setInputCode("");
        }
      } catch (err: any) {
        setError(err.message || "Could not initialize checkout.");
      } finally {
        setLoading(false);
        setValidatingOffer(false);
      }
    },
    [type, courseId, educatorId, slotId, appliedCode, orderData, router]
  );

  useEffect(() => {
    if (courseId || educatorId || slotId) {
      setLoading(true);
      fetchOrder(urlOffer.toUpperCase());
    } else {
      setError("BAD_REQUEST: courseId is required for course enrollment.");
      setLoading(false);
    }
  }, [courseId, educatorId, slotId, urlOffer]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleApplyOffer = async (codeOverride?: string) => {
    const code = (codeOverride !== undefined ? codeOverride : inputCode).trim().toUpperCase();
    if (!code) {
      setOfferError("Please enter an offer code.");
      return;
    }

    setValidatingOffer(true);
    setOfferError(null);
    await fetchOrder(code);
  };

  const handleRemoveOffer = async () => {
    setValidatingOffer(true);
    setOfferError(null);
    setAppliedCode("");
    setInputCode("");
    await fetchOrder("");
  };

  const loadCashfreeSdk = (): Promise<any> => {
    return new Promise((resolve, reject) => {
      if ((window as any).Cashfree) {
        resolve((window as any).Cashfree);
        return;
      }
      const script = document.createElement("script");
      script.src = "https://sdk.cashfree.com/js/v3/cashfree.js";
      script.async = true;
      script.onload = () => {
        if ((window as any).Cashfree) {
          resolve((window as any).Cashfree);
        } else {
          reject(new Error("Cashfree SDK failed to initialize."));
        }
      };
      script.onerror = () => reject(new Error("Failed to load Cashfree SDK script."));
      document.body.appendChild(script);
    });
  };

  const handlePay = async () => {
    if (!orderData) return;
    setWhatsappError(null);

    // Validate WhatsApp number before payment
    const validation = validateWhatsAppNumber(whatsappNumber);
    if (!validation.valid) {
      setWhatsappError(validation.error || "Invalid WhatsApp number.");
      return;
    }

    setProcessing(true);

    try {
      // Save validated WhatsApp number to learner profile
      await saveWhatsAppToProfile(validation.formatted!);

      const isProd = orderData.env === "PRODUCTION";
      const isMockSession = orderData.paymentSessionId?.startsWith("session_mock_");

      // In production or when real Cashfree session exists, launch Cashfree Hosted Checkout SDK
      if (orderData.paymentSessionId && (isProd || !isMockSession)) {
        const Cashfree = await loadCashfreeSdk();
        const cashfree = Cashfree({ mode: isProd ? "production" : "sandbox" });
        const returnUrl = `${window.location.origin}/payment/success?order_id=${encodeURIComponent(
          orderData.cfOrderId || orderData.internalReference
        )}`;

        await cashfree.checkout({
          paymentSessionId: orderData.paymentSessionId,
          returnUrl,
        });
        return;
      }

      // Fallback for offline local dev/test mode without live gateway keys
      const res = await fetch("/api/payments/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          order_id: orderData.cfOrderId || orderData.internalReference,
          cf_payment_id: `cf_pay_mock_${Date.now()}`,
          payment_status: "SUCCESS",
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Payment verification failed.");
      }

      router.push(`/payment/success?transactionId=${data.data.transactionId}`);
    } catch (err: any) {
      setError(err.message || "Payment verification error.");
      setProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-4 relative overflow-hidden font-sans">
      {/* Background Gradients */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-blue-600/10 blur-[140px] rounded-full pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[400px] h-[400px] bg-purple-600/10 blur-[120px] rounded-full pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        <BackButton
          fallbackUrl="/courses"
          label="Back to Catalog"
          variant="dark"
          className="mb-6"
        />

        {loading ? (
          <div className="p-8 rounded-3xl bg-slate-900/60 border border-slate-800 backdrop-blur-xl text-center space-y-4 shadow-2xl">
            <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto" />
            <p className="text-sm font-medium text-slate-300">Preparing secure Cashfree checkout...</p>
          </div>
        ) : error && !orderData ? (
          <div className="p-8 rounded-3xl bg-red-950/40 border border-red-900/50 backdrop-blur-xl text-center space-y-4 shadow-2xl">
            <div className="w-12 h-12 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold text-white">Checkout Error</h2>
            <p className="text-xs text-red-300/80 leading-relaxed">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="w-full py-3 bg-red-600 hover:bg-red-500 text-white font-semibold rounded-xl text-sm transition-all cursor-pointer"
            >
              Try Payment Again
            </button>
          </div>
        ) : orderData ? (
          <div className="rounded-3xl bg-slate-900/70 border border-slate-800/80 backdrop-blur-xl p-6 sm:p-8 shadow-2xl space-y-6">
            {/* Header */}
            <div className="text-center space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 text-xs font-semibold border border-blue-500/20">
                <Sparkles className="w-3.5 h-3.5" /> Secure EduConnects Payment
              </div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Complete Checkout</h1>
              <p className="text-xs text-slate-400">Review purchase details and pay securely</p>
            </div>

            {/* Learner WhatsApp Notification Number Section */}
            <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800/80 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <MessageSquare className="w-4 h-4 text-emerald-400" /> WhatsApp Number for Notifications
                </span>
                <span className="text-[10px] text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                  Required
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-normal">
                Payment receipt, booking details, and class reminders will be sent to this WhatsApp number.
              </p>

              <div className="relative">
                <input
                  type="text"
                  placeholder="Enter 10-digit WhatsApp number (e.g. 9876543210)"
                  value={whatsappNumber}
                  onChange={(e) => {
                    setWhatsappNumber(e.target.value);
                    setWhatsappError(null);
                  }}
                  className={`w-full bg-slate-900 border ${
                    whatsappError ? "border-red-500/80 focus:border-red-400" : "border-slate-700/80 focus:border-emerald-500"
                  } rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 font-mono focus:outline-none transition-colors`}
                />
              </div>

              {whatsappError && (
                <p className="text-xs text-red-400 flex items-center gap-1 pt-0.5 font-medium">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {whatsappError}
                </p>
              )}
            </div>

            {/* Offer / Coupon Section */}
            <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800/80 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-blue-400" /> Apply Offer / Coupon
                </span>
                {orderData.appliedOffer && (
                  <button
                    type="button"
                    onClick={handleRemoveOffer}
                    disabled={validatingOffer}
                    className="text-[11px] text-red-400 hover:text-red-300 font-semibold cursor-pointer transition-colors"
                  >
                    Remove
                  </button>
                )}
              </div>

              {!orderData.appliedOffer ? (
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Enter coupon code, e.g. EDU40"
                    value={inputCode}
                    onChange={(e) => {
                      setInputCode(e.target.value.toUpperCase());
                      setOfferError(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleApplyOffer();
                      }
                    }}
                    className="flex-1 bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 font-mono tracking-wider uppercase focus:outline-none focus:border-blue-500 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => handleApplyOffer()}
                    disabled={!inputCode.trim() || validatingOffer}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:hover:bg-blue-600 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    {validatingOffer ? (
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      "Apply"
                    )}
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-700/40 text-emerald-300 text-xs">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <div>
                      <span className="font-mono font-bold tracking-wider">{orderData.appliedOffer.code}</span>
                      <span className="ml-1.5 text-[11px] text-emerald-300/80">Applied!</span>
                    </div>
                  </div>
                  <span className="text-[11px] font-bold text-emerald-400">
                    - {formatPaise(orderData.appliedOffer.discountAmountPaise)}
                  </span>
                </div>
              )}

              {offerError && (
                <p className="text-xs text-red-400 flex items-center gap-1 pt-1 font-medium">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {offerError}
                </p>
              )}
            </div>

            {/* Price Breakdown */}
            <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800/60 space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-400">Order Reference</span>
                <span className="font-mono text-xs text-slate-300">{orderData.internalReference}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-400">Payment Gateway</span>
                <span className="text-xs font-semibold text-slate-300">Cashfree Payments</span>
              </div>

              {orderData.appliedOffer && (
                <>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-400">Original Price</span>
                    <span className="text-sm line-through text-slate-500 font-medium">
                      {formatPaise(orderData.appliedOffer.originalAmountPaise)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm text-emerald-400 font-medium">
                    <span className="flex items-center gap-1.5">
                      <Tag className="w-3.5 h-3.5" />
                      Discount ({orderData.appliedOffer.code})
                    </span>
                    <span className="font-bold">- {formatPaise(orderData.appliedOffer.discountAmountPaise)}</span>
                  </div>
                </>
              )}

              <div className="border-t border-slate-800/80 pt-3 flex justify-between items-center">
                <div>
                  <span className="text-base font-semibold text-white">Final Payable</span>
                  {orderData.appliedOffer && (
                    <span className="block text-[10px] text-emerald-400 font-semibold">
                      {orderData.appliedOffer.summaryText}
                    </span>
                  )}
                </div>
                <span className="text-2xl font-extrabold text-blue-400">
                  {formatPaise(orderData.amountPaise)}
                </span>
              </div>
            </div>

            {/* Security Badges */}
            <div className="flex items-center justify-center gap-4 text-xs text-slate-400 py-1">
              <span className="flex items-center gap-1">
                <Lock className="w-3.5 h-3.5 text-emerald-400" /> 256-bit Encryption
              </span>
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-400" /> Cashfree Verified
              </span>
            </div>

            {/* CTA Button */}
            <button
              onClick={handlePay}
              disabled={processing || validatingOffer}
              className="w-full py-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold rounded-2xl shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 text-base transition-all disabled:opacity-50 cursor-pointer"
            >
              {processing ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Launching Cashfree Payment...
                </>
              ) : (
                <>
                  <CreditCard className="w-5 h-5" />{" "}
                  {type === "LIVE_CLASS_BOOKING" ? "Book & Pay" : "Pay Now"} (
                  {formatPaise(orderData.amountPaise)})
                </>
              )}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400 text-sm">
          Loading checkout...
        </div>
      }
    >
      <CheckoutContent />
    </Suspense>
  );
}
