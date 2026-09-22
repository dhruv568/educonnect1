"use client";

import React from "react";
import { motion, HTMLMotionProps } from "framer-motion";
import { Loader2 } from "lucide-react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: any[]) {
  return twMerge(clsx(inputs));
}

export interface GlassButtonProps extends HTMLMotionProps<"button"> {
  variant?: "primary" | "secondary" | "ghost" | "glow" | "learner" | "educator";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  children: React.ReactNode;
}

export const GlassButton = React.forwardRef<HTMLButtonElement, GlassButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      isLoading = false,
      leftIcon,
      rightIcon,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      "inline-flex items-center justify-center font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current disabled:pointer-events-none disabled:opacity-50 select-none cursor-pointer relative overflow-hidden backdrop-blur-md";

    const variants = {
      primary:
        "bg-[#16805B] text-white shadow-md border border-white/20 hover:bg-[#0D5C41] hover:shadow-lg focus-visible:ring-[#16805B]",
      secondary:
        "bg-[#F0FAF5] text-[#0D5C41] border border-[#A7F3D0] shadow-sm hover:bg-[#DCFCE7] hover:shadow-md font-bold focus-visible:ring-[#16805B]",
      ghost:
        "bg-transparent text-[#0F172A] hover:bg-white/60 hover:text-[#16805B] border border-transparent",
      glow:
        "bg-[#16805B] text-white shadow-[0_0_20px_rgba(22,128,91,0.35)] border border-emerald-400/40 hover:bg-[#0D5C41] hover:shadow-[0_0_30px_rgba(22,128,91,0.5)] focus-visible:ring-[#16805B]",
      learner:
        "bg-[#16805B] text-white shadow-md shadow-emerald-700/25 border border-white/25 hover:bg-[#0D5C41] hover:shadow-lg hover:shadow-emerald-700/35 focus-visible:ring-[#16805B] font-bold",
      educator:
        "bg-[#16805B] text-white shadow-md shadow-emerald-700/25 border border-white/25 hover:bg-[#0D5C41] hover:shadow-lg hover:shadow-emerald-700/35 focus-visible:ring-[#16805B] font-bold",
    };

    const sizes = {
      sm: "h-9 px-3.5 sm:px-4 text-xs rounded-xl gap-1.5",
      md: "h-10 sm:h-11 px-4 sm:px-6 text-xs sm:text-sm rounded-2xl gap-2",
      lg: "h-11 sm:h-12 px-5 sm:px-8 text-sm sm:text-base rounded-2xl gap-2.5",
    };

    return (
      <motion.button
        ref={ref}
        whileHover={{ scale: disabled || isLoading ? 1 : 1.03 }}
        whileTap={{ scale: disabled || isLoading ? 1 : 0.97 }}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        disabled={disabled || isLoading}
        {...props}
      >
        {/* Subtle glass shine highlight */}
        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 to-transparent opacity-0 hover:opacity-100 transition-opacity pointer-events-none" />

        {isLoading ? <Loader2 className="h-4 w-4 animate-spin text-current" /> : leftIcon}
        <span className="relative z-10">{children}</span>
        {!isLoading && rightIcon}
      </motion.button>
    );
  }
);

GlassButton.displayName = "GlassButton";
