"use client";

import React, { useEffect, useState } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string; errorId?: string };
  reset: () => void;
}) {
  const [refId, setRefId] = useState("");

  useEffect(() => {
    const id = error.errorId || error.digest || `ERR-${Date.now().toString(36).toUpperCase()}`;
    setRefId(id);
    console.error(`[Root Global Error]: Reference ID ${id}:`, error);
  }, [error]);

  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans text-slate-900">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 shadow-2xl border border-red-100 space-y-6 text-center">
          <div className="w-16 h-16 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mx-auto shadow-xs">
            <AlertCircle className="h-8 w-8" />
          </div>

          <div className="space-y-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-red-600 bg-red-50 px-2.5 py-1 rounded-full border border-red-100">
              Platform Error
            </span>
            <h1 className="text-2xl font-black text-slate-900">Application Encountered a Problem</h1>
            <p className="text-xs text-slate-500 leading-relaxed">
              An unexpected failure occurred at the platform root. Security controls prevented data exposure.
            </p>
          </div>

          {refId && (
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-left">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Error Reference ID
              </span>
              <span className="text-xs font-mono font-bold text-slate-800">{refId}</span>
            </div>
          )}

          <div className="pt-2 flex flex-col gap-3">
            <button
              onClick={() => reset()}
              className="w-full py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs inline-flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Reload Application</span>
            </button>

            <a
              href="/"
              className="w-full py-3 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs inline-flex items-center justify-center transition cursor-pointer"
            >
              Return to Homepage
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
