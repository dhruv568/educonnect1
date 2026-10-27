"use client";

import React from "react";
import {
  SCHOOL_GRADES,
  SENIOR_SECONDARY_STREAMS,
  COMPETITIVE_EXAMS,
  DIPLOMA_BRANCHES,
  isSeniorSecondaryGrade,
  EducationType,
} from "@/lib/constants/academic";
import { GraduationCap, Award, BookOpen, Layers, CheckCircle2 } from "lucide-react";

export interface AcademicFieldsState {
  educationType: EducationType;
  gradeLevel: string;
  stream: string;
  competitiveExam: string;
  diplomaBranch: string;
}

export interface LearnerAcademicFieldsProps {
  value: AcademicFieldsState;
  onChange: (updated: AcademicFieldsState) => void;
  disabled?: boolean;
  compact?: boolean;
}

export function LearnerAcademicFields({
  value,
  onChange,
  disabled = false,
  compact = false,
}: LearnerAcademicFieldsProps) {
  const isSchool = value.educationType === "SCHOOL";
  const isDiploma = value.educationType === "DIPLOMA";
  const isSeniorSec = isSchool && isSeniorSecondaryGrade(value.gradeLevel);

  const handleEducationTypeChange = (type: EducationType) => {
    onChange({
      ...value,
      educationType: type,
      // Reset irrelevant fields when switching types
      ...(type === "DIPLOMA"
        ? {
            gradeLevel: "",
            stream: "",
            competitiveExam: "",
            diplomaBranch: value.diplomaBranch || DIPLOMA_BRANCHES[0],
          }
        : {
            diplomaBranch: "",
            gradeLevel: value.gradeLevel || "Grade 10",
          }),
    });
  };

  const handleGradeChange = (grade: string) => {
    const isNowSenior = isSeniorSecondaryGrade(grade);
    onChange({
      ...value,
      gradeLevel: grade,
      // If moving away from Grades 11-12, clear stream & competitive exam
      stream: isNowSenior ? value.stream || SENIOR_SECONDARY_STREAMS[0] : "",
      competitiveExam: isNowSenior ? value.competitiveExam : "",
    });
  };

  return (
    <div className={`space-y-4 sm:space-y-5 ${compact ? "text-xs" : "text-sm"}`}>
      {/* 1. Education Type Selection */}
      <div className="space-y-2">
        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
          Education Type <span className="text-rose-500">*</span>
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <button
            type="button"
            disabled={disabled}
            onClick={() => handleEducationTypeChange("SCHOOL")}
            className={`p-3.5 sm:p-4 rounded-2xl border text-left flex items-center justify-between gap-3 transition-all cursor-pointer min-h-[58px] ${
              isSchool
                ? "bg-blue-50/95 border-2 border-blue-600 text-blue-900 shadow-xs ring-2 ring-blue-600/15"
                : "bg-white border border-slate-200 hover:border-slate-300 text-slate-700"
            }`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div
                className={`p-2.5 rounded-xl shrink-0 transition-colors ${
                  isSchool ? "bg-blue-600 text-white shadow-xs" : "bg-slate-100 text-slate-500"
                }`}
              >
                <GraduationCap className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="font-extrabold text-xs sm:text-sm text-slate-900 truncate">School Education</div>
                <div className="text-[11px] text-slate-500 font-medium">Grades 1 to 12</div>
              </div>
            </div>
            {isSchool && (
              <CheckCircle2 className="h-5 w-5 text-blue-600 shrink-0 ml-1.5" />
            )}
          </button>

          <button
            type="button"
            disabled={disabled}
            onClick={() => handleEducationTypeChange("DIPLOMA")}
            className={`p-3.5 sm:p-4 rounded-2xl border text-left flex items-center justify-between gap-3 transition-all cursor-pointer min-h-[58px] ${
              isDiploma
                ? "bg-blue-50/95 border-2 border-blue-600 text-blue-900 shadow-xs ring-2 ring-blue-600/15"
                : "bg-white border border-slate-200 hover:border-slate-300 text-slate-700"
            }`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div
                className={`p-2.5 rounded-xl shrink-0 transition-colors ${
                  isDiploma ? "bg-blue-600 text-white shadow-xs" : "bg-slate-100 text-slate-500"
                }`}
              >
                <Layers className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="font-extrabold text-xs sm:text-sm text-slate-900 truncate">Diploma / Polytechnic</div>
                <div className="text-[11px] text-slate-500 font-medium">Engineering & Tech Branches</div>
              </div>
            </div>
            {isDiploma && (
              <CheckCircle2 className="h-5 w-5 text-blue-600 shrink-0 ml-1.5" />
            )}
          </button>
        </div>
      </div>

      {/* 2. School: Grade Selection (Conditional on SCHOOL) */}
      {isSchool && (
        <div className="space-y-2 animate-fadeIn">
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
            Grade / Class <span className="text-rose-500">*</span>
          </label>
          <select
            disabled={disabled}
            value={value.gradeLevel}
            onChange={(e) => handleGradeChange(e.target.value)}
            className="w-full h-11 px-3.5 text-base sm:text-sm bg-white border border-slate-200 rounded-xl text-slate-900 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 font-medium shadow-2xs"
          >
            <option value="" disabled>
              Select your Grade
            </option>
            <optgroup label="Foundation & Secondary (Grades 1–10)">
              {SCHOOL_GRADES.filter((g) => !g.isSeniorSecondary).map((g) => (
                <option key={g.value} value={g.value}>
                  {g.label}
                </option>
              ))}
            </optgroup>
            <optgroup label="Senior Secondary (Grades 11–12)">
              {SCHOOL_GRADES.filter((g) => g.isSeniorSecondary).map((g) => (
                <option key={g.value} value={g.value}>
                  {g.label}
                </option>
              ))}
            </optgroup>
          </select>
        </div>
      )}

      {/* 3. School: Stream Selection (Conditional strictly on Grades 11–12) */}
      {isSeniorSec && (
        <div className="space-y-2.5 animate-fadeIn p-4 rounded-2xl bg-blue-50/60 border border-blue-100">
          <label className="block text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
            <BookOpen className="h-3.5 w-3.5 text-blue-600" />
            Academic Stream <span className="text-rose-500">*</span>
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {SENIOR_SECONDARY_STREAMS.map((streamOption) => {
              const isSelected = value.stream === streamOption;
              return (
                <button
                  key={streamOption}
                  type="button"
                  disabled={disabled}
                  onClick={() => onChange({ ...value, stream: streamOption })}
                  className={`min-h-[44px] py-2.5 px-3 rounded-xl border text-xs sm:text-sm font-bold text-center transition-all cursor-pointer ${
                    isSelected
                      ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                      : "bg-white text-slate-700 border-slate-200 hover:border-slate-300"
                  }`}
                >
                  {streamOption}
                </button>
              );
            })}
          </div>

          {/* 4. Competitive Exam Preference (Conditional on Grades 11–12, OPTIONAL) */}
          <div className="space-y-2 pt-3.5 mt-3.5 border-t border-blue-100">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <Award className="h-3.5 w-3.5 text-blue-600" />
                Target Competitive Exam
              </label>
              <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
                Optional
              </span>
            </div>
            <select
              disabled={disabled}
              value={value.competitiveExam || ""}
              onChange={(e) => onChange({ ...value, competitiveExam: e.target.value })}
              className="w-full h-11 px-3.5 text-base sm:text-sm bg-white border border-slate-200 rounded-xl text-slate-900 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 font-medium shadow-2xs"
            >
              <option value="">None / Not Preparing for Competitive Exams</option>
              {COMPETITIVE_EXAMS.map((exam) => (
                <option key={exam} value={exam}>
                  {exam}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-slate-500 font-medium">
              We tailor course suggestions and educator recommendations to your exam target.
            </p>
          </div>
        </div>
      )}

      {/* 5. Diploma: Branch / Field Selection (Conditional on DIPLOMA) */}
      {isDiploma && (
        <div className="space-y-2.5 animate-fadeIn p-4 rounded-2xl bg-indigo-50/60 border border-indigo-100">
          <label className="block text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
            <Layers className="h-3.5 w-3.5 text-indigo-600" />
            Diploma Branch / Engineering Field <span className="text-rose-500">*</span>
          </label>
          <select
            disabled={disabled}
            value={value.diplomaBranch || ""}
            onChange={(e) => onChange({ ...value, diplomaBranch: e.target.value })}
            className="w-full h-11 px-3.5 text-base sm:text-sm bg-white border border-slate-200 rounded-xl text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 font-medium shadow-2xs"
          >
            <option value="" disabled>
              Select your Diploma Branch
            </option>
            {DIPLOMA_BRANCHES.map((branch) => (
              <option key={branch} value={branch}>
                {branch}
              </option>
            ))}
          </select>
          <p className="text-[11px] text-slate-500 font-medium">
            Connects you directly with engineering educators and technical subject lessons.
          </p>
        </div>
      )}
    </div>
  );
}
