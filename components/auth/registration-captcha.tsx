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
    <div className="p-4 rounded-2xl bg-slate-50/90 border border-slate-200/90 space-y-2.5 scroll-mt-24 scroll-mb-36">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-slate-800 text-xs font-bold uppercase tracking-wider">
          <ShieldCheck className="h-4 w-4 text-blue-600" />
          <span>Security Verification</span>
        </div>
        <button
          type="button"
          onClick={fetchCaptcha}
          disabled={loading}
          className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1 font-semibold transition-colors disabled:opacity-50"
          title="Get a new verification challenge"
        >
          <RotateCcw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>Refresh</span>
        </button>
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-center select-none font-black text-sm text-slate-900 tracking-wider shadow-2xs shrink-0">
          {loading ? (
            <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              <span>Loading...</span>
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
          placeholder="Enter number"
          value={userAnswer}
          onChange={(e) => handleAnswerChange(e.target.value)}
          onFocus={(e) => {
            setTimeout(() => {
              e.currentTarget.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
            }, 150);
          }}
          className="flex-1 h-11 px-3.5 text-base sm:text-sm bg-white border border-slate-200 rounded-xl text-slate-900 outline-none focus:ring-2 focus:ring-blue-500/20 font-medium"
        />
      </div>

      {error && (
        <p className="text-[11px] text-rose-600 font-medium pt-0.5">{error}</p>
      )}
      <p className="text-[10px] text-slate-400">
        Anti-bot protection to ensure genuine learner registration.
      </p>
    </div>
  );
}
