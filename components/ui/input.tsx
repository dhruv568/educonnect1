"use client";

import React, { useState } from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { Eye, EyeOff } from "lucide-react";

function cn(...inputs: any[]) {
  return twMerge(clsx(inputs));
}

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  showPasswordToggle?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, label, error, helperText, leftIcon, rightIcon, showPasswordToggle = true, id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);
    const [showPassword, setShowPassword] = useState(false);

    const isPasswordType = type === "password";
    const effectiveType = isPasswordType ? (showPassword ? "text" : "password") : type;
    const hasPasswordToggle = isPasswordType && showPasswordToggle;

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label htmlFor={inputId} className="block text-xs font-semibold text-[#0F172A] uppercase tracking-wider">
            {label}
          </label>
        )}

        <div className="relative flex items-center">
          {leftIcon && (
            <div className="absolute left-3.5 pointer-events-none text-[#475569]">
              {leftIcon}
            </div>
          )}

          <input
            id={inputId}
            type={effectiveType}
            className={cn(
              "w-full h-11 px-4 text-sm rounded-xl transition-all shadow-2xs focus:outline-none focus:ring-2 focus:ring-[#16805B]/20 focus:border-[#16805B]",
              className?.includes("bg-slate-") || className?.includes("text-white")
                ? "bg-[#0D5C41] border border-[#16805B]/60 text-white placeholder:text-emerald-100/60 dark-input-crisp"
                : "bg-white border border-[#E2E8F0] text-[#0F172A] placeholder:text-[#94A3B8]",
              leftIcon && "pl-10",
              (rightIcon || hasPasswordToggle) && "pr-10",
              error && "border-red-500 focus:ring-red-500",
              className
            )}
            ref={ref}
            {...props}
          />

          {hasPasswordToggle ? (
            <button
              type="button"
              tabIndex={-1}
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3.5 text-[#5D7373] hover:text-[#102A2A] focus:outline-none transition-colors p-1 rounded-md hover:bg-[#F5F7F8]"
              aria-label={showPassword ? "Hide password" : "Show password"}
              title={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          ) : rightIcon ? (
            <div className="absolute right-3.5 text-[#5D7373]">
              {rightIcon}
            </div>
          ) : null}
        </div>

        {error ? (
          <p className="text-xs text-red-500 font-medium">{error}</p>
        ) : helperText ? (
          <p className="text-xs text-[#5D7373]">{helperText}</p>
        ) : null}
      </div>
    );
  }
);

Input.displayName = "Input";

