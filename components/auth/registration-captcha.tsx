"use client";

import React, { useState, useEffect } from "react";
import { ShieldCheck, RotateCcw, Loader2 } from "lucide-react";

export interface RegistrationCaptchaProps {
  onVerifyChange: (token: string, answer: string) => void;
  error?: string;
}

export function RegistrationCaptcha({ onVerifyChange, error }: RegistrationCaptchaProps) {
  const [question, setQuestion] = useState<string>("");
  const [token, setToken] = useState<string>("");
  const [userAnswer, setUserAnswer] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);

  const fetchCaptcha = async () => {
    setLoading(true);
    setUserAnswer("");
    onVerifyChange("", "");

    try {
      const res = await fetch("/api/auth/captcha", { cache: "no-store" });
      const json = await res.json();
      if (json.success && json.data) {
        setQuestion(json.data.question);
        setToken(json.data.token);
      }
    } catch (err) {
      console.error("Failed to load CAPTCHA:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCaptcha();
  }, []);

  const handleAnswerChange = (val: string) => {
    setUserAnswer(val);
    onVerifyChange(token, val.trim());
  };

  return (
    <div className="w-full p-4.5 sm:p-5 rounded-2xl bg-gradient-to-b from-blue-50/50 via-slate-50/70 to-slate-50/90 border border-blue-100/90 shadow-2xs space-y-3.5 scroll-mt-24 scroll-mb-36">
      <div className="flex items-center justify-between pb-2 border-b border-slate-200/60">
        <div className="flex items-center gap-2 text-slate-800 text-xs font-bold uppercase tracking-wider">
          <div className="w-6 h-6 rounded-lg bg-blue-600/10 flex items-center justify-center text-blue-600 shrink-0">
            <ShieldCheck className="h-4 w-4" />
          </div>
          <span>Security Verification</span>
        </div>
        <button
          type="button"
          onClick={fetchCaptcha}
          disabled={loading}
          className="min-h-[36px] px-3 py-1.5 rounded-lg bg-white border border-blue-200/80 text-xs font-semibold text-blue-600 hover:text-blue-700 hover:bg-blue-50/80 active:bg-blue-100 flex items-center gap-1.5 transition-all shadow-2xs disabled:opacity-50 cursor-pointer"
          title="Get a new verification challenge"
        >
          <RotateCcw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>Refresh</span>
        </button>
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="min-h-[48px] px-5 py-3 bg-white border-2 border-blue-200/90 rounded-xl text-center select-none font-black text-base text-slate-900 tracking-wider shadow-2xs shrink-0 flex items-center justify-center">
          {loading ? (
            <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
              <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
              <span>Loading challenge...</span>
            </div>
          ) : (
            question || "Security Check"
          )}
        </div>

        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          enterKeyHint="done"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          required
          aria-label="Security CAPTCHA answer"
          placeholder="Enter answer"
          value={userAnswer}
          onChange={(e) => handleAnswerChange(e.target.value)}
          onFocus={(e) => {
            setTimeout(() => {
              e.currentTarget.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
            }, 150);
          }}
          className="w-full flex-1 min-h-[48px] h-12 px-4 text-base bg-white border border-slate-300 rounded-xl text-slate-900 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 font-semibold shadow-2xs placeholder:text-slate-400 placeholder:font-normal"
        />
      </div>

      {error && (
        <p className="text-xs text-rose-600 font-semibold pt-0.5">{error}</p>
      )}
      <p className="text-xs text-slate-500 leading-relaxed pt-0.5">
        Anti-bot protection to ensure genuine learner registration.
      </p>
    </div>
  );
}
