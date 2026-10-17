"use client";

import React, { useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  Info,
  Check,
  Copy,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  X,
  ShieldAlert,
} from "lucide-react";
import { StructuredErrorMetadata, ErrorSeverity } from "@/lib/errors/types";

export interface ErrorAction {
  label: string;
  onClick: () => void | Promise<void>;
  variant?: "primary" | "secondary" | "danger" | "outline";
  icon?: React.ReactNode;
  disabled?: boolean;
  loading?: boolean;
}

export interface ErrorBannerProps {
  error: StructuredErrorMetadata | string | null;
  title?: string;
  onDismiss?: () => void;
  onRetry?: () => void | Promise<void>;
  retryLoading?: boolean;
  actions?: ErrorAction[];
  showAdminGuidance?: boolean;
  className?: string;
}

export function ErrorBanner({
  error,
  title,
  onDismiss,
  onRetry,
  retryLoading = false,
  actions = [],
  showAdminGuidance = false,
  className = "",
}: ErrorBannerProps) {
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);

  if (!error) return null;

  const isStructured = typeof error === "object" && error !== null;
  const metadata: Partial<StructuredErrorMetadata> = isStructured
    ? (error as StructuredErrorMetadata)
    : {
        title: title || "An Error Occurred",
        message: String(error),
        severity: "error",
      };

  const severity: ErrorSeverity = metadata.severity || "error";
  const displayTitle = title || metadata.title || "An error occurred";
  const errorId = metadata.errorId;

  const handleCopyId = () => {
    if (!errorId) return;
    navigator.clipboard.writeText(errorId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getTheme = () => {
    switch (severity) {
      case "critical":
      case "error":
        return {
          bg: "bg-rose-50 border-rose-200 text-rose-950",
          iconColor: "text-rose-600 bg-rose-100",
          badgeBg: "bg-rose-100 text-rose-800 border-rose-200",
          bulletColor: "bg-rose-500",
          Icon: AlertCircle,
        };
      case "warning":
        return {
          bg: "bg-amber-50 border-amber-200 text-amber-950",
          iconColor: "text-amber-600 bg-amber-100",
          badgeBg: "bg-amber-100 text-amber-800 border-amber-200",
          bulletColor: "bg-amber-500",
          Icon: AlertTriangle,
        };
      case "info":
      default:
        return {
          bg: "bg-blue-50 border-blue-200 text-blue-950",
          iconColor: "text-blue-600 bg-blue-100",
          badgeBg: "bg-blue-100 text-blue-800 border-blue-200",
          bulletColor: "bg-blue-500",
          Icon: Info,
        };
    }
  };

  const theme = getTheme();
  const IconComponent = theme.Icon;

  return (
    <div
      role="alert"
      aria-live="polite"
      className={`rounded-2xl border p-4 sm:p-5 shadow-xs transition-all ${theme.bg} ${className}`}
    >
      <div className="flex items-start gap-3.5">
        <div className={`p-2 rounded-xl shrink-0 ${theme.iconColor}`}>
          <IconComponent className="w-5 h-5" aria-hidden="true" />
        </div>

        <div className="flex-1 min-w-0 space-y-2">
          {/* Header Row */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-extrabold tracking-tight">{displayTitle}</h3>
              {metadata.category && (
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider ${theme.badgeBg}`}
                >
                  {metadata.category.replace(/_/g, " ")}
                </span>
              )}
            </div>

            {errorId && (
              <button
                type="button"
                onClick={handleCopyId}
                title="Click to copy Error Reference ID for technical support"
                className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white/70 hover:bg-white text-[10px] font-mono font-bold text-slate-700 border border-slate-200 transition-colors cursor-pointer"
              >
                <span>ID: {errorId}</span>
                {copied ? (
                  <Check className="w-3 h-3 text-emerald-600" />
                ) : (
                  <Copy className="w-3 h-3 text-slate-400" />
                )}
              </button>
            )}
          </div>

          {/* 1. What Happened */}
          <p className="text-xs font-semibold leading-relaxed opacity-90">{metadata.message}</p>

          {/* 2. Why Did It Happen */}
          {metadata.why && (
            <div className="text-xs bg-white/60 rounded-xl p-2.5 border border-black/5 space-y-1">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-600 block">
                Why this happened:
              </span>
              <p className="text-slate-800 leading-normal">{metadata.why}</p>
            </div>
          )}

          {/* 3. How Can The Current User Resolve It */}
          {metadata.resolution && metadata.resolution.length > 0 && (
            <div className="text-xs space-y-1.5 pt-1">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-700 block">
                Recommended Resolution Steps:
              </span>
              <ul className="space-y-1 pl-1">
                {metadata.resolution.map((step, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-slate-800">
                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-white/80 text-slate-700 border border-black/10 shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <span>{step}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* 4. Administrator Guidance (Collapsible or Shown for Admins) */}
          {metadata.adminGuidance && metadata.adminGuidance.length > 0 && (
            <div className="pt-1">
              <button
                type="button"
                onClick={() => setExpanded(!expanded)}
                className="text-[11px] font-bold text-slate-600 hover:text-slate-900 inline-flex items-center gap-1 cursor-pointer transition-colors"
              >
                <ShieldAlert className="w-3.5 h-3.5 text-purple-600" />
                <span>Administrator Resolution Guidance</span>
                {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>

              {(expanded || showAdminGuidance) && (
                <div className="mt-2 text-xs bg-purple-50/70 border border-purple-200 rounded-xl p-3 space-y-1.5 text-purple-950">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-purple-800 block">
                    Admin Playbook:
                  </span>
                  <ul className="space-y-1 list-disc pl-4 text-purple-900">
                    {metadata.adminGuidance.map((guide, idx) => (
                      <li key={idx}>{guide}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Action Toolbar */}
          <div className="flex flex-wrap items-center gap-2 pt-2">
            {metadata.retryable && onRetry && (
              <button
                type="button"
                onClick={() => onRetry()}
                disabled={retryLoading}
                className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold inline-flex items-center gap-1.5 disabled:opacity-50 transition cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${retryLoading ? "animate-spin" : ""}`} />
                <span>{retryLoading ? "Retrying..." : "Try Again"}</span>
              </button>
            )}

            {actions.map((act, idx) => (
              <button
                key={idx}
                type="button"
                onClick={act.onClick}
                disabled={act.disabled || act.loading}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition cursor-pointer ${
                  act.variant === "primary"
                    ? "bg-[#0B4F4B] hover:bg-[#083a37] text-white"
                    : act.variant === "danger"
                    ? "bg-rose-600 hover:bg-rose-700 text-white"
                    : "bg-white hover:bg-slate-100 text-slate-800 border border-slate-300"
                }`}
              >
                {act.icon}
                <span>{act.label}</span>
              </button>
            ))}

            {onDismiss && (
              <button
                type="button"
                onClick={onDismiss}
                className="px-3 py-1.5 rounded-xl bg-transparent hover:bg-black/5 text-slate-600 hover:text-slate-900 text-xs font-bold inline-flex items-center gap-1 transition cursor-pointer ml-auto"
              >
                <span>Dismiss</span>
              </button>
            )}
          </div>
        </div>

        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Dismiss error notice"
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-black/5 transition cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
