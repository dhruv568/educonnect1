"use client";

import React, { useState } from "react";

export interface DataPoint {
  label: string;
  value: number;
  secondaryValue?: number;
}

export interface AnalyticsChartProps {
  title?: string;
  data: DataPoint[];
  type?: "bar" | "line";
  height?: number;
  primaryColor?: string;
  secondaryColor?: string;
  primaryLabel?: string;
  secondaryLabel?: string;
}

export function AnalyticsChart({
  title,
  data = [],
  type = "bar",
  height = 220,
  primaryColor = "#16805B", // Brand Emerald Teal
  secondaryColor = "#35A979", // Brand Accent Emerald Light
  primaryLabel = "Primary",
  secondaryLabel = "Secondary",
}: AnalyticsChartProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  if (!data || data.length === 0) {
    return (
      <div
        style={{ height }}
        className="flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 p-6 text-center"
      >
        <p className="text-xs font-bold text-slate-400">No chart data available for this range</p>
      </div>
    );
  }

  const maxValue = Math.max(...data.map((d) => Math.max(d.value, d.secondaryValue || 0)), 1);

  return (
    <div className="space-y-3">
      {title && (
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">{title}</h4>
          <div className="flex items-center gap-3 text-[11px] font-bold text-slate-500">
            <span className="flex items-center gap-1">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: primaryColor }} />
              {primaryLabel}
            </span>
            {data.some((d) => d.secondaryValue !== undefined) && (
              <span className="flex items-center gap-1">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: secondaryColor }} />
                {secondaryLabel}
              </span>
            )}
          </div>
        </div>
      )}

      <div
        style={{ height }}
        className="relative flex items-end justify-between gap-2 pt-8 pb-6 px-2 bg-slate-50/50 dark:bg-slate-900/40 rounded-2xl border border-slate-100 dark:border-slate-800/80 overflow-hidden"
      >
        {/* Y Axis Grid Guidelines */}
        <div className="absolute inset-0 flex flex-col justify-between p-4 pointer-events-none opacity-20">
          <div className="border-b border-slate-400 border-dashed" />
          <div className="border-b border-slate-400 border-dashed" />
          <div className="border-b border-slate-400 border-dashed" />
        </div>

        {/* Bars / Data Points */}
        {data.map((item, idx) => {
          const heightPercent = Math.max(8, Math.round((item.value / maxValue) * 100));
          const secHeightPercent = item.secondaryValue !== undefined ? Math.max(8, Math.round((item.secondaryValue / maxValue) * 100)) : 0;
          const isHovered = hoveredIdx === idx;

          return (
            <div
              key={idx}
              className="relative flex-1 flex flex-col items-center justify-end h-full group cursor-pointer z-10"
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
            >
              {/* Floating Tooltip */}
              {isHovered && (
                <div className="absolute -top-10 bg-slate-900 text-white text-[10px] font-bold py-1 px-2.5 rounded-lg shadow-xl z-30 whitespace-nowrap animate-in fade-in zoom-in-95 duration-150">
                  <span>{item.label}: </span>
                  <span className="text-blue-300 font-extrabold">{item.value}</span>
                  {item.secondaryValue !== undefined && (
                    <span className="text-purple-300 ml-1.5 font-extrabold">({item.secondaryValue})</span>
                  )}
                </div>
              )}

              {/* Bar Elements */}
              <div className="w-full flex items-end justify-center gap-1 h-full px-1">
                <div
                  className="w-full max-w-[20px] rounded-t-lg transition-all duration-300 group-hover:brightness-110"
                  style={{
                    height: `${heightPercent}%`,
                    backgroundColor: primaryColor,
                    opacity: isHovered ? 1 : 0.85,
                  }}
                />
                {item.secondaryValue !== undefined && (
                  <div
                    className="w-full max-w-[20px] rounded-t-lg transition-all duration-300 group-hover:brightness-110"
                    style={{
                      height: `${secHeightPercent}%`,
                      backgroundColor: secondaryColor,
                      opacity: isHovered ? 1 : 0.85,
                    }}
                  />
                )}
              </div>

              {/* X Axis Label */}
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 mt-2 truncate max-w-full">
                {item.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
