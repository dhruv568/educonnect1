"use client";

import React, { SelectHTMLAttributes } from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: any[]) {
  return twMerge(clsx(inputs));
}

export interface GlassSelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helperText?: string;
  icon?: React.ReactNode;
}

export const GlassSelect = React.forwardRef<HTMLSelectElement, GlassSelectProps>(
  ({ className, label, error, helperText, icon, children, ...props }, ref) => {
    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label className="block text-xs font-bold text-[#0F172A] uppercase tracking-wider">
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {icon && (
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#475569] pointer-events-none z-10">
              {icon}
            </div>
          )}
          <select
            ref={ref}
            className={cn(
              "w-full h-11 px-4 font-bold text-xs text-[#0F172A] rounded-2xl glass-select outline-none transition-all",
              icon && "pl-10",
              error && "border-rose-400 focus:ring-rose-500/20",
              className
            )}
            {...props}
          >
            {children}
          </select>
        </div>
        {error ? (
          <p className="text-[11px] font-semibold text-rose-500">{error}</p>
        ) : helperText ? (
          <p className="text-[11px] text-[#475569]">{helperText}</p>
        ) : null}
      </div>
    );
  }
);

GlassSelect.displayName = "GlassSelect";
