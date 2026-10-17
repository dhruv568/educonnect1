"use client";

import React from "react";
import { AlertCircle } from "lucide-react";

export interface InlineFieldErrorProps {
  id?: string;
  error?: string | null;
  className?: string;
}

export function InlineFieldError({ id, error, className = "" }: InlineFieldErrorProps) {
  if (!error) return null;

  return (
    <div
      id={id}
      role="alert"
      aria-live="polite"
      className={`flex items-center gap-1.5 text-xs font-semibold text-rose-600 mt-1 animate-fadeIn ${className}`}
    >
      <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-500" aria-hidden="true" />
      <span>{error}</span>
    </div>
  );
}
