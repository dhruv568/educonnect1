"use client";

import React from "react";
import { motion, HTMLMotionProps } from "framer-motion";
import { Loader2 } from "lucide-react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: any[]) {
  return twMerge(clsx(inputs));
}

export interface ButtonProps extends HTMLMotionProps<"button"> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger" | "success" | "teacher" | "student" | "gradient";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  children: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
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
      "inline-flex items-center justify-center font-bold rounded-xl transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#16805B] disabled:pointer-events-none disabled:opacity-50 select-none cursor-pointer";

    const variants = {
      primary: "bg-[#16805B] text-white hover:bg-[#0D5C41] active:bg-[#094732] shadow-md shadow-[#16805B]/20",
      secondary: "bg-[#F0FAF5] text-[#0D5C41] border border-[#A7F3D0] hover:bg-[#DCFCE7] active:bg-[#A7F3D0] shadow-2xs",
      outline: "border-2 border-[#E2E8F0] bg-white text-[#0F172A] hover:bg-[#F0FAF5] hover:border-[#16805B]",
      ghost: "text-[#0F172A] hover:bg-[#F0FAF5] hover:text-[#16805B] active:bg-[#DCFCE7]",
      danger: "bg-[#EF4444] text-white hover:bg-[#DC2626] active:bg-[#B91C1C] shadow-md shadow-rose-500/20",
      success: "bg-[#10B981] text-white hover:bg-[#059669] active:bg-[#047857] shadow-md shadow-emerald-500/20",
      teacher: "bg-[#16805B] text-white hover:bg-[#0D5C41] active:bg-[#094732] shadow-md shadow-[#16805B]/20",
      student: "bg-[#16805B] text-white hover:bg-[#0D5C41] active:bg-[#094732] shadow-md shadow-[#16805B]/20",
      gradient: "bg-gradient-to-r from-[#16805B] to-[#0D5C41] text-white hover:opacity-95 shadow-lg shadow-[#16805B]/20",
    };

    const sizes = {
      sm: "h-9 px-3.5 text-xs rounded-xl gap-1.5",
      md: "h-11 px-5 text-sm rounded-xl gap-2",
      lg: "h-13 px-7 text-base rounded-2xl gap-2.5",
    };

    return (
      <motion.button
        ref={ref}
        whileHover={{ scale: disabled || isLoading ? 1 : 1.02 }}
        whileTap={{ scale: disabled || isLoading ? 1 : 0.98 }}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin text-current shrink-0" />
        ) : (
          leftIcon && <span className="shrink-0 inline-flex items-center">{leftIcon}</span>
        )}
        <span className="inline-flex items-center gap-1.5 whitespace-nowrap">{children}</span>
        {rightIcon && <span className="shrink-0 inline-flex items-center">{rightIcon}</span>}
      </motion.button>
    );
  }
);

Button.displayName = "Button";
