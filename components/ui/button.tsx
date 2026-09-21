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
  variant?: "primary" | "secondary" | "outline" | "ghost" | "teacher" | "student" | "gradient";
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
      "inline-flex items-center justify-center font-bold rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B4F4B] disabled:pointer-events-none disabled:opacity-50 select-none cursor-pointer";

    const variants = {
      primary: "bg-[#0B4F4B] text-white hover:bg-[#073F3C] active:bg-[#052C2A] shadow-md shadow-[#0B4F4B]/15",
      secondary: "bg-[#F2C14E] text-[#102A2A] hover:bg-[#E0B03C] active:bg-[#D4A22F] shadow-sm",
      outline: "border-2 border-[#DCE5E4] bg-white text-[#102A2A] hover:bg-[#FBF7EE] hover:border-[#B8CBC9]",
      ghost: "text-[#102A2A] hover:bg-[#F5F7F8] active:bg-[#EBF0F0]",
      teacher: "bg-[#16805B] text-white hover:bg-[#0D5C41] active:bg-[#094732] shadow-md shadow-[#16805B]/20",
      student: "bg-[#3157D5] text-white hover:bg-[#243B9B] active:bg-[#1A2C7B] shadow-md shadow-[#3157D5]/20",
      gradient: "bg-gradient-to-r from-[#0B4F4B] via-[#1B6863] to-[#073F3C] text-white hover:opacity-95 shadow-lg shadow-[#0B4F4B]/20",
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
