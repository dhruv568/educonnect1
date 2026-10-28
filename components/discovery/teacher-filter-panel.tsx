"use client";

import React from "react";
import { Filter, RotateCcw, GraduationCap } from "lucide-react";
import { GlassButton } from "@/components/glass/glass-button";
import { formatCurrency } from "@/lib/currency";
import {
  SCHOOL_GRADES,
  SENIOR_SECONDARY_STREAMS,
  COMPETITIVE_EXAMS,
  DIPLOMA_BRANCHES,
  isSeniorSecondaryGrade,
} from "@/lib/constants/academic";

export interface TeacherFilterState {
  subject: string;
  priceMax: number;
  ratingMin: number;
  experienceMin: number;
  sortBy: string;
  academicLevel?: string;
  gradeLevel?: string;
  stream?: string;
  competitiveExam?: string;
  diplomaBranch?: string;
}

export interface TeacherFilterPanelProps {
  filters: TeacherFilterState;
  onChange: (newFilters: TeacherFilterState) => void;
  onReset: () => void;
}

export function TeacherFilterPanel({ filters, onChange, onReset }: TeacherFilterPanelProps) {
  const subjects = [
    { value: "all", label: "All Subjects" },
    { value: "mathematics", label: "Mathematics" },
    { value: "physics", label: "Physics" },
    { value: "chemistry", label: "Chemistry" },
    { value: "computer science", label: "Computer Science" },
    { value: "biology", label: "Biology" },
    { value: "english", label: "English" },
    { value: "economics", label: "Economics" },
    { value: "accountancy", label: "Accountancy" },
    { value: "statistics", label: "Statistics" },
  ];

  return (
    <div className="glass-surface p-6 rounded-3xl space-y-6 border border-white/80 shadow-sm">
      <div className="flex items-center justify-between pb-3 border-b border-slate-200/80">
        <div className="flex items-center gap-2 text-slate-900 font-extrabold text-sm uppercase tracking-wider">
          <Filter className="h-4 w-4 text-theme-primary" /> Filter Tutors
        </div>
        <button
          onClick={onReset}
          className="text-xs font-bold text-slate-500 hover:text-theme-primary flex items-center gap-1 transition-colors"
        >
          <RotateCcw className="h-3 w-3" /> Reset
        </button>
      </div>

      {/* Subject Filter */}
      <div className="space-y-2">
        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Subject</label>
        <select
          value={filters.subject}
          onChange={(e) => onChange({ ...filters, subject: e.target.value })}
          className="w-full h-10 px-3 text-xs bg-white border border-slate-200 rounded-xl text-slate-900 outline-none focus:ring-2 focus:ring-theme-primary focus:border-theme-primary font-medium"
        >
          {subjects.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      {/* Academic Level Filter */}
      <div className="space-y-2">
        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
          <GraduationCap className="h-3.5 w-3.5 text-theme-primary" /> Academic Level
        </label>
        <select
          value={filters.academicLevel || "all"}
          onChange={(e) => {
            const val = e.target.value;
            onChange({
              ...filters,
              academicLevel: val,
              gradeLevel: "",
              stream: "",
              competitiveExam: "",
              diplomaBranch: "",
            });
          }}
          className="w-full h-10 px-3 text-xs bg-white border border-slate-200 rounded-xl text-slate-900 outline-none focus:ring-2 focus:ring-theme-primary focus:border-theme-primary font-medium"
        >
          <option value="all">All Academic Levels</option>
          <option value="SCHOOL">School Education</option>
          <option value="DIPLOMA">Diploma Studies</option>
        </select>
      </div>

      {/* Conditional: School Grade */}
      {filters.academicLevel === "SCHOOL" && (
        <div className="space-y-2">
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Grade / Class</label>
          <select
            value={filters.gradeLevel || "all"}
            onChange={(e) => {
              const val = e.target.value;
              onChange({
                ...filters,
                gradeLevel: val,
                stream: isSeniorSecondaryGrade(val) ? filters.stream : "",
                competitiveExam: isSeniorSecondaryGrade(val) ? filters.competitiveExam : "",
              });
            }}
            className="w-full h-10 px-3 text-xs bg-white border border-slate-200 rounded-xl text-slate-900 outline-none focus:ring-2 focus:ring-theme-primary focus:border-theme-primary font-medium"
          >
            <option value="all">All School Grades</option>
            {SCHOOL_GRADES.map((g) => (
              <option key={g.value} value={g.value}>
                {g.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Conditional: Senior Secondary Stream (Grades 11–12 only) */}
      {filters.academicLevel === "SCHOOL" && isSeniorSecondaryGrade(filters.gradeLevel) && (
        <>
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Stream</label>
            <select
              value={filters.stream || "all"}
              onChange={(e) => onChange({ ...filters, stream: e.target.value === "all" ? "" : e.target.value })}
              className="w-full h-10 px-3 text-xs bg-white border border-slate-200 rounded-xl text-slate-900 outline-none focus:ring-2 focus:ring-theme-primary focus:border-theme-primary font-medium"
            >
              <option value="all">All Streams</option>
              {SENIOR_SECONDARY_STREAMS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Target Exam (Optional)</label>
            <select
              value={filters.competitiveExam || "all"}
              onChange={(e) => onChange({ ...filters, competitiveExam: e.target.value === "all" ? "" : e.target.value })}
              className="w-full h-10 px-3 text-xs bg-white border border-slate-200 rounded-xl text-slate-900 outline-none focus:ring-2 focus:ring-theme-primary focus:border-theme-primary font-medium"
            >
              <option value="all">Any / General Preparation</option>
              {COMPETITIVE_EXAMS.map((x) => (
                <option key={x} value={x}>
                  {x}
                </option>
              ))}
            </select>
          </div>
        </>
      )}

      {/* Conditional: Diploma Branch */}
      {filters.academicLevel === "DIPLOMA" && (
        <div className="space-y-2">
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Diploma Branch</label>
          <select
            value={filters.diplomaBranch || "all"}
            onChange={(e) => onChange({ ...filters, diplomaBranch: e.target.value === "all" ? "" : e.target.value })}
            className="w-full h-10 px-3 text-xs bg-white border border-slate-200 rounded-xl text-slate-900 outline-none focus:ring-2 focus:ring-theme-primary focus:border-theme-primary font-medium"
          >
            <option value="all">All Diploma Branches</option>
            {DIPLOMA_BRANCHES.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Hourly Rate Filter */}
      <div className="space-y-2">
        <div className="flex justify-between text-xs font-bold">
          <span className="text-slate-700 uppercase tracking-wider">Max Hourly Rate</span>
          <span className="text-theme-primary">{formatCurrency(filters.priceMax)}/hr</span>
        </div>
        <input
          type="range"
          min={100}
          max={5000}
          step={25}
          value={filters.priceMax}
          onChange={(e) => onChange({ ...filters, priceMax: Number(e.target.value) })}
          className="w-full accent-theme-primary cursor-pointer"
          style={{ accentColor: "var(--color-primary)" }}
        />
      </div>

      {/* Minimum Rating */}
      <div className="space-y-2">
        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Minimum Rating</label>
        <div className="flex gap-2">
          {[
            { value: 4.0, label: "4+" },
            { value: 4.5, label: "4.5+" },
            { value: 5.0, label: "5" },
          ].map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => onChange({ ...filters, ratingMin: filters.ratingMin === item.value ? 0 : item.value })}
              className={`flex-1 py-1.5 text-xs font-bold rounded-xl border transition-all ${
                filters.ratingMin === item.value
                  ? "bg-theme-primary text-white border-theme-primary shadow-sm"
                  : "bg-white text-slate-700 border-slate-200 hover:border-slate-300"
              }`}
            >
              ★ {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Sorting */}
      <div className="space-y-2">
        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Sort By</label>
        <select
          value={filters.sortBy}
          onChange={(e) => onChange({ ...filters, sortBy: e.target.value })}
          className="w-full h-10 px-3 text-xs bg-white border border-slate-200 rounded-xl text-slate-900 outline-none focus:ring-2 focus:ring-theme-primary focus:border-theme-primary font-medium"
        >
          <option value="recommended">Recommended Tutors</option>
          <option value="rating">Highest Rated ★</option>
          <option value="experience">Most Experienced</option>
          <option value="price_asc">Price: Low to High</option>
          <option value="price_desc">Price: High to Low</option>
        </select>
      </div>
    </div>
  );
}
