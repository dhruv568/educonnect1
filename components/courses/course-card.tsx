"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { Star, Clock, BookOpen, CheckCircle2, ShieldCheck, ArrowRight, User } from "lucide-react";
import { GlassCard } from "@/components/glass/glass-card";
import { formatCurrency } from "@/lib/currency";

export interface CourseCardProps {
  id: string;
  title: string;
  slug: string;
  subtitle?: string;
  description: string;
  subject: string;
  category?: string;
  level: string;
  price: number;
  rating: number;
  reviewCount: number;
  lessonCount: number;
  durationHours: number;
  thumbnailUrl?: string;
  teacher: {
    id: string;
    name: string;
    avatarUrl?: string | null;
    isVerified?: boolean;
  };
  isEnrolled?: boolean;
  userProgress?: number;
  badge?: "BESTSELLER" | "NEW" | "FEATURED";
}

export function CourseCard({
  id,
  title,
  slug,
  description,
  subject,
  level,
  price,
  rating,
  reviewCount,
  lessonCount,
  durationHours,
  thumbnailUrl,
  teacher,
  isEnrolled,
  userProgress,
  badge,
}: CourseCardProps) {
  return (
    <GlassCard className="group relative flex flex-col justify-between h-full rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1 border border-[#E2E8F0] bg-white">
      <div>
        {/* Course Thumbnail Container */}
        <div className="relative w-full aspect-video rounded-t-2xl overflow-hidden bg-[#F8FAFC]">
          <img
            src={thumbnailUrl || "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=600&auto=format&fit=crop&q=80"}
            alt={title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0F172A]/70 via-transparent to-transparent opacity-80" />

          {/* Badges Overlay */}
          <div className="absolute top-3 left-3 flex flex-wrap gap-1.5 z-10">
            {badge && (
              <span className="px-2.5 py-1 text-xs font-bold uppercase tracking-wider rounded-full bg-[#F2C14E] text-[#0F172A] shadow-md">
                {badge}
              </span>
            )}
            <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-[#2563EB] text-white backdrop-blur-md">
              {subject}
            </span>
          </div>

          <div className="absolute top-3 right-3 z-10">
            <span className="px-2 py-1 text-[11px] font-semibold rounded-md bg-[#0F172A]/80 text-white backdrop-blur-md border border-white/10 uppercase">
              {level}
            </span>
          </div>
        </div>

        {/* Course Card Body */}
        <div className="p-5 flex flex-col flex-grow">
          {/* Title & Description */}
          <Link href={`/courses/${slug}`}>
            <h3 className="text-lg font-bold text-[#0F172A] line-clamp-1 group-hover:text-[#2563EB] transition-colors">
              {title}
            </h3>
          </Link>
          <p className="mt-1 text-xs text-[#475569] line-clamp-2 min-h-[36px]">
            {description}
          </p>

          {/* Teacher Info */}
          <div className="mt-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="relative w-7 h-7 rounded-full overflow-hidden bg-[#F8FAFC] flex items-center justify-center text-[#475569]">
                {teacher.avatarUrl ? (
                  <img src={teacher.avatarUrl} alt={teacher.name} className="w-full h-full object-cover" />
                ) : (
                  <User className="w-4 h-4" />
                )}
              </div>
              <span className="text-xs font-medium text-[#0F172A] flex items-center gap-1">
                {teacher.name}
                {teacher.isVerified && (
                  <span title="Verified Instructor"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 fill-emerald-600/20" /></span>
                )}
              </span>
            </div>

            {/* Rating */}
            <div className="flex items-center gap-1 text-[#F2C14E] text-xs font-bold">
              <Star className="w-3.5 h-3.5 fill-[#F2C14E] stroke-[#F2C14E]" />
              <span className="text-[#0F172A]">{rating.toFixed(1)}</span>
              <span className="text-[#475569] font-normal">({reviewCount})</span>
            </div>
          </div>

          {/* Course Meta (Lessons & Duration) */}
          <div className="mt-4 pt-3 border-t border-[#E2E8F0] flex items-center justify-between text-xs text-[#475569] font-medium">
            <div className="flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-[#475569]" />
              <span>{lessonCount} Lessons</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-[#475569]" />
              <span>{durationHours}h</span>
            </div>
          </div>

          {/* Progress bar if enrolled */}
          {isEnrolled && userProgress !== undefined && (
            <div className="mt-3">
              <div className="flex items-center justify-between text-xs font-semibold text-[#2563EB] mb-1">
                <span>Progress</span>
                <span>{userProgress}%</span>
              </div>
              <div className="w-full h-1.5 bg-[#EFF6FF] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#2563EB] rounded-full transition-all duration-300"
                  style={{ width: `${userProgress}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer Price & Action */}
      <div className="p-5 pt-0 mt-auto flex items-center justify-between">
        <div>
          {price === 0 ? (
            <span className="text-base font-extrabold text-[#2563EB] uppercase tracking-wide">
              Free
            </span>
          ) : (
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-black text-[#0F172A]">
                {formatCurrency(price)}
              </span>
            </div>
          )}
        </div>

        <Link
          href={isEnrolled ? `/learn/${slug}` : `/courses/${slug}`}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white shadow-md shadow-blue-500/20 transition-all hover:scale-105"
        >
          {isEnrolled ? "Continue" : "View Course"}
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </GlassCard>
  );
}
