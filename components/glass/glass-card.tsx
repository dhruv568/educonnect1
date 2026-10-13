"use client";

import React, { useRef } from "react";
import { motion, useMotionValue, useTransform, useSpring, HTMLMotionProps } from "framer-motion";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: any[]) {
  return twMerge(clsx(inputs));
}

export interface GlassCardProps extends HTMLMotionProps<"div"> {
  enableTilt?: boolean;
  dark?: boolean;
  glowColor?: string;
  children: React.ReactNode;
}

export const GlassCard = React.forwardRef<HTMLDivElement, GlassCardProps>(
  ({ className, enableTilt = true, dark = false, glowColor = "rgba(22, 128, 91, 0.08)", children, ...props }, ref) => {
    const cardRef = useRef<HTMLDivElement>(null);

    // 3D Parallax Tilt Values
    const x = useMotionValue(0);
    const y = useMotionValue(0);

    const mouseXSpring = useSpring(x, { stiffness: 150, damping: 15 });
    const mouseYSpring = useSpring(y, { stiffness: 150, damping: 15 });

    const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ["7deg", "-7deg"]);
    const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ["-7deg", "7deg"]);

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
      if (!enableTilt || !cardRef.current) return;
      const rect = cardRef.current.getBoundingClientRect();
      const width = rect.width;
      const height = rect.height;
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      const xPct = mouseX / width - 0.5;
      const yPct = mouseY / height - 0.5;
      x.set(xPct);
      y.set(yPct);
    };

    const handleMouseLeave = () => {
      if (!enableTilt) return;
      x.set(0);
      y.set(0);
    };

    return (
      <motion.div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{
          rotateX: enableTilt ? rotateX : 0,
          rotateY: enableTilt ? rotateY : 0,
          transformStyle: "preserve-3d",
        }}
        whileHover={{ y: enableTilt ? -6 : 0, transition: { duration: 0.2 } }}
        className={cn(
          "relative rounded-3xl p-6 transition-all duration-300 overflow-hidden",
          dark ? "glass-surface-dark text-white" : "glass-surface text-slate-900",
          className
        )}
        {...props}
      >
        {/* Soft Ambient Refraction Glow */}
        <div
          className="absolute -top-24 -right-24 w-48 h-48 rounded-full blur-3xl pointer-events-none transition-all duration-500 group-hover:scale-125"
          style={{ background: glowColor }}
        />

        <div className="relative z-10">{children}</div>
      </motion.div>
    );
  }
);

GlassCard.displayName = "GlassCard";
