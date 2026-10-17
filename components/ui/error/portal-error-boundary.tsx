"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  RefreshCw,
  ArrowLeft,
  Copy,
  Check,
  ShieldCheck,
  Home,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export interface PortalErrorBoundaryProps {
  error: Error & { digest?: string; errorId?: string };
  reset: () => void;
  portalName?: "Main Website" | "Learner Portal" | "Educator Portal" | "Admin Panel";
  homeUrl?: string;
}

export function PortalErrorBoundary({
  error,
  reset,
  portalName = "Main Website",
  homeUrl = "/",
}: PortalErrorBoundaryProps) {
  const [copied, setCopied] = useState(false);
  const [errorId, setErrorId] = useState<string>("");

  useEffect(() => {
    // Generate or use existing error reference ID
    const refId = error.errorId || error.digest || `ERR-${Date.now().toString(36).toUpperCase()}`;
    setErrorId(refId);

    // Safe client-side logging (sanitized)
    console.error(`[${portalName} Error Boundary]: Reference ID ${refId}:`, error.message);
  }, [error, portalName]);

  const handleCopy = () => {
    if (!errorId) return;
    navigator.clipboard.writeText(errorId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4 bg-slate-50 text-center">
      <div className="max-w-md w-full bg-white rounded-3xl p-8 shadow-xl border border-red-100 space-y-6">
        <div className="w-16 h-16 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mx-auto shadow-xs">
          <AlertCircle className="h-8 w-8" />
        </div>

        <div className="space-y-2">
          <span className="text-[10px] font-black uppercase tracking-wider text-red-600 bg-red-50 px-2.5 py-1 rounded-full border border-red-100">
            {portalName}
          </span>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Something went wrong</h1>
          <p className="text-xs text-slate-500 leading-relaxed">
            An unexpected error occurred while rendering this page. Our security controls prevented sensitive data exposure.
          </p>
        </div>

        {/* Error Reference ID */}
        {errorId && (
          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between gap-2 text-left">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Error Reference ID
              </span>
              <span className="text-xs font-mono font-bold text-slate-800">{errorId}</span>
            </div>
            <button
              type="button"
              onClick={handleCopy}
              className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-600 text-xs font-bold inline-flex items-center gap-1 hover:bg-slate-50 transition cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
              <span>{copied ? "Copied" : "Copy"}</span>
            </button>
          </div>
        )}

        {/* Resolution Steps */}
        <div className="text-left text-xs bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-2">
          <span className="font-extrabold text-slate-700 uppercase text-[10px] tracking-wider block">
            What you can do:
          </span>
          <ul className="space-y-1.5 text-slate-600 list-disc pl-4">
            <li>Click <strong>Try Again</strong> to reload this component.</li>
            <li>Return to the portal dashboard if the issue persists.</li>
            <li>If contacting technical support, provide your Error Reference ID above.</li>
          </ul>
        </div>

        {/* Action Buttons */}
        <div className="pt-2 flex flex-col gap-2.5">
          <Button
            variant="primary"
            onClick={() => reset()}
            className="w-full"
            leftIcon={<RefreshCw className="h-4 w-4" />}
          >
            Try Again
          </Button>

          <Link href={homeUrl} className="w-full">
            <Button
              variant="outline"
              className="w-full"
              leftIcon={<Home className="h-4 w-4" />}
            >
              Return to {portalName}
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
