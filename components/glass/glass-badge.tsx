import React from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: any[]) {
  return twMerge(clsx(inputs));
}

export interface GlassBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "primary" | "emerald" | "blue" | "indigo" | "amber" | "rose" | "dark" | "outline" | "learner" | "educator";
  size?: "sm" | "md";
}

export function GlassBadge({ className, variant = "primary", size = "md", children, ...props }: GlassBadgeProps) {
  const base =
    "inline-flex items-center font-semibold rounded-full backdrop-blur-md border shadow-xs transition-all";

  const variants = {
    primary: "bg-[#F0FAF5] text-[#0D5C41] border-[#A7F3D0] font-bold",
    emerald: "bg-[#F0FAF5] text-[#0D5C41] border-[#A7F3D0] font-bold",
    blue: "bg-blue-500/10 text-blue-700 border-blue-400/30",
    indigo: "bg-indigo-500/10 text-indigo-700 border-indigo-400/30",
    amber: "bg-amber-500/10 text-amber-800 border-amber-400/30",
    rose: "bg-rose-500/10 text-rose-700 border-rose-400/30",
    dark: "bg-slate-900/80 text-white border-white/20",
    outline: "bg-white/40 text-slate-700 border-slate-300/80",
    learner: "bg-[#EFF6FF] text-[#1E40AF] border-[#BFDBFE] font-bold",
    educator: "bg-[#F0FDFA] text-[#115E59] border-[#99F6E4] font-bold",
  };

  const sizes = {
    sm: "px-2.5 py-0.5 text-xs",
    md: "px-3 py-1 text-xs tracking-wide",
  };

  return (
    <span className={cn(base, variants[variant], sizes[size], className)} {...props}>
      {children}
    </span>
  );
}
