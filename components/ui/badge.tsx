import React from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: any[]) {
  return twMerge(clsx(inputs));
}

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "primary" | "secondary" | "success" | "warning" | "error" | "teacher" | "student" | "admin" | "outline";
  size?: "sm" | "md";
}

export function Badge({ className, variant = "primary", size = "md", children, ...props }: BadgeProps) {
  const base = "inline-flex items-center font-medium rounded-full border";

  const variants = {
    primary: "bg-[#F0FAF5] text-[#0D5C41] border-[#A7F3D0]",
    secondary: "bg-slate-100 text-slate-700 border-slate-200",
    success: "bg-[#F0FAF5] text-[#0D5C41] border-[#A7F3D0]",
    warning: "bg-amber-50 text-amber-800 border-amber-200",
    error: "bg-rose-50 text-rose-700 border-rose-200",
    teacher: "bg-[#F0FDFA] text-[#115E59] border-[#99F6E4]",
    student: "bg-[#EFF6FF] text-[#1E40AF] border-[#BFDBFE]",
    admin: "bg-[#073F3C] text-[#F2C14E] border-[#F2C14E]/30",
    outline: "bg-transparent text-slate-600 border-slate-300",
  };

  const sizes = {
    sm: "px-2 py-0.5 text-xs",
    md: "px-2.5 py-1 text-xs font-semibold",
  };

  return (
    <span className={cn(base, variants[variant], sizes[size], className)} {...props}>
      {children}
    </span>
  );
}
