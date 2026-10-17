"use client";

import React, { useState } from "react";
import {
  X,
  Copy,
  Check,
  ShieldCheck,
  AlertTriangle,
  FileText,
  Clock,
  Layers,
  HelpCircle,
  ExternalLink,
} from "lucide-react";
import { StructuredErrorMetadata } from "@/lib/errors/types";

export interface ErrorDetailsPanelProps {
  error: StructuredErrorMetadata | null;
  isOpen: boolean;
  onClose: () => void;
  isAdmin?: boolean;
}

export function ErrorDetailsPanel({
  error,
  isOpen,
  onClose,
  isAdmin = false,
}: ErrorDetailsPanelProps) {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "resolution" | "diagnostics">("overview");

  if (!isOpen || !error) return null;

  const handleCopyId = () => {
    navigator.clipboard.writeText(error.errorId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="error-details-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fadeIn"
    >
      <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-scaleUp">
        {/* Header */}
        <div className="p-6 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-100 text-rose-800 border border-rose-200">
                {error.category.replace(/_/g, " ")}
              </span>
              <span className="text-xs font-mono font-bold text-slate-500">
                HTTP {error.statusCode}
              </span>
            </div>
            <h2 id="error-details-title" className="text-lg font-black text-slate-900">
              {error.title}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 px-6 bg-white gap-4 text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab("overview")}
            className={`py-3 border-b-2 transition-colors cursor-pointer ${
              activeTab === "overview"
                ? "border-[#0B4F4B] text-[#0B4F4B]"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            Overview
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("resolution")}
            className={`py-3 border-b-2 transition-colors cursor-pointer ${
              activeTab === "resolution"
                ? "border-[#0B4F4B] text-[#0B4F4B]"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            Resolution Guide
          </button>
          {isAdmin && (
            <button
              type="button"
              onClick={() => setActiveTab("diagnostics")}
              className={`py-3 border-b-2 transition-colors cursor-pointer ${
                activeTab === "diagnostics"
                  ? "border-[#0B4F4B] text-[#0B4F4B]"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              Admin Diagnostics
            </button>
          )}
        </div>

        {/* Tab Content */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1 text-xs">
          {activeTab === "overview" && (
            <div className="space-y-4">
              {/* Reference ID Banner */}
              <div className="p-4 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                    Error Reference ID
                  </span>
                  <span className="text-sm font-mono font-black text-slate-900">
                    {error.errorId}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleCopyId}
                  className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 font-bold border border-slate-200 inline-flex items-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                  <span>{copied ? "Copied" : "Copy ID"}</span>
                </button>
              </div>

              {/* What happened */}
              <div className="space-y-1">
                <span className="text-[11px] font-black uppercase text-slate-500">What Happened</span>
                <p className="p-3 bg-slate-50 rounded-xl text-slate-800 font-medium leading-relaxed">
                  {error.message}
                </p>
              </div>

              {/* Why did it happen */}
              {error.why && (
                <div className="space-y-1">
                  <span className="text-[11px] font-black uppercase text-slate-500">Why It Happened</span>
                  <p className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl text-amber-950 font-medium leading-relaxed">
                    {error.why}
                  </p>
                </div>
              )}

              {/* Metadata details */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Timestamp</span>
                  <span className="font-semibold text-slate-700">
                    {new Date(error.timestamp).toLocaleString()}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Retry Status</span>
                  <span className={`font-bold ${error.retryable ? "text-emerald-600" : "text-slate-600"}`}>
                    {error.retryable ? "Safe to retry" : "Corrective action required"}
                  </span>
                </div>

                {error.affectedResource && (
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 col-span-2">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Affected Resource</span>
                    <span className="font-semibold text-slate-800">
                      {error.affectedResource.type.toUpperCase()}: {error.affectedResource.name || error.affectedResource.id || "N/A"}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "resolution" && (
            <div className="space-y-4">
              <div className="space-y-2">
                <h4 className="font-bold text-slate-900 text-sm">User Corrective Steps</h4>
                {error.resolution && error.resolution.length > 0 ? (
                  <ul className="space-y-2">
                    {error.resolution.map((step, idx) => (
                      <li key={idx} className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-100">
                        <span className="w-5 h-5 rounded-full bg-[#0B4F4B] text-white flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                          {idx + 1}
                        </span>
                        <span className="text-slate-800 font-medium leading-relaxed">{step}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-slate-500">No specific user resolution steps provided for this event.</p>
                )}
              </div>

              {error.adminGuidance && error.adminGuidance.length > 0 && (
                <div className="space-y-2 pt-2">
                  <h4 className="font-bold text-purple-900 text-sm">Administrator Guidance</h4>
                  <ul className="space-y-2">
                    {error.adminGuidance.map((guide, idx) => (
                      <li key={idx} className="flex items-start gap-2.5 p-3 rounded-xl bg-purple-50/70 border border-purple-200">
                        <ShieldCheck className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
                        <span className="text-purple-950 font-medium leading-relaxed">{guide}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {activeTab === "diagnostics" && isAdmin && (
            <div className="space-y-4">
              <div className="p-3 rounded-xl bg-slate-900 text-emerald-400 font-mono text-[11px] overflow-x-auto space-y-1">
                <div>Route: {error.route || "N/A"}</div>
                <div>Application: {error.application || "api"}</div>
                <div>Code: {error.code}</div>
                <div>External Outcome: {error.externalOutcome || "N/A"}</div>
              </div>

              {error.details && (
                <div className="space-y-1">
                  <span className="text-[11px] font-black uppercase text-slate-500">Sanitized Context Details</span>
                  <pre className="p-3 bg-slate-50 border border-slate-200 rounded-xl overflow-x-auto text-[11px] font-mono text-slate-700">
                    {JSON.stringify(error.details, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs cursor-pointer transition"
          >
            Close Details
          </button>
        </div>
      </div>
    </div>
  );
}
