"use client";

import React from "react";
import { Card } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

export interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: {
    value: number;
    label?: string;
    isPositive?: boolean;
  };
  icon?: React.ReactNode;
  variant?: "default" | "emerald" | "teal" | "blue" | "purple" | "amber";
}

export function MetricCard({
  title,
  value,
  subtitle,
  trend,
  icon,
  variant = "default",
}: MetricCardProps) {
  const variantStyles = {
    default: "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900",
    emerald: "border-emerald-200 bg-emerald-50/40 dark:bg-emerald-950/20 dark:border-emerald-900/50",
    teal: "border-teal-200 bg-teal-50/40 dark:bg-teal-950/20 dark:border-teal-900/50",
    blue: "border-blue-200 bg-blue-50/40 dark:bg-blue-950/20 dark:border-blue-900/50",
    purple: "border-purple-200 bg-purple-50/40 dark:bg-purple-950/20 dark:border-purple-900/50",
    amber: "border-amber-200 bg-amber-50/40 dark:bg-amber-950/20 dark:border-amber-900/50",
  };

  return (
    <Card className={`space-y-3 p-5 shadow-xs transition-all hover:shadow-md ${variantStyles[variant]}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          {title}
        </span>
        {icon && <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 shrink-0">{icon}</div>}
      </div>

      <div className="flex items-baseline justify-between gap-2">
        <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
          {value}
        </div>

        {trend && (
          <div
            className={`flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full ${
              trend.isPositive
                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                : "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300"
            }`}
          >
            {trend.isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            <span>{trend.value}%</span>
          </div>
        )}
      </div>

      {subtitle && (
        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate">{subtitle}</p>
      )}
    </Card>
  );
}
