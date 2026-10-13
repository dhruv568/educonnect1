"use client";

import React from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { X, ShieldCheck, Star, MapPin, ExternalLink, ArrowRight } from "lucide-react";
import { GlassBadge } from "@/components/glass/glass-badge";
import { GlassButton } from "@/components/glass/glass-button";
import { UserRole } from "@/types/auth";
import { formatCurrency } from "@/lib/currency";

export interface TeacherPreviewModalProps {
  teacher: any | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenAuth: (role: UserRole) => void;
}

export function TeacherPreviewModal({ teacher, isOpen, onClose, onOpenAuth }: TeacherPreviewModalProps) {
  if (!isOpen || !teacher) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative w-full max-w-xl bg-white rounded-3xl p-8 shadow-2xl border border-slate-100 overflow-hidden space-y-6 max-h-[90vh] overflow-y-auto"
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-100 cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>

          {/* Teacher Header */}
          <div className="flex items-start gap-4">
            <img
              src={teacher.avatarUrl}
              alt={teacher.name}
              className="w-20 h-20 rounded-full object-cover ring-2 ring-emerald-600/20 aspect-square shrink-0 shadow-sm"
              onError={(e) => {
                (e.target as HTMLImageElement).src = "/images/educators/educator_01.jpg";
              }}
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-slate-900 truncate">{teacher.name}</h2>
                <GlassBadge variant="emerald" size="sm" className="flex items-center gap-1 shrink-0">
                  <ShieldCheck className="h-3 w-3" /> Verified
                </GlassBadge>
              </div>
              <p className="text-xs font-bold text-emerald-700 mt-0.5">{teacher.headline}</p>
              {teacher.location && (
                <div className="flex items-center gap-1 text-xs text-slate-400 mt-0.5 font-medium">
                  <MapPin className="h-3 w-3 shrink-0" />
                  <span>{teacher.location}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-xs text-slate-500 mt-1.5 font-semibold">
                <span className="text-amber-500">★ {typeof teacher.rating === "number" ? teacher.rating.toFixed(2) : teacher.rating}</span>
                <span>• {teacher.experienceYears} Years Exp</span>
                <span>• {formatCurrency(teacher.hourlyRate)}/hr</span>
              </div>
            </div>
          </div>

          {/* Bio */}
          <div className="space-y-1.5">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">About Educator</h4>
            <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-4 rounded-2xl border border-slate-100">
              {teacher.bio}
            </p>
          </div>

          {/* Subjects */}
          <div className="space-y-1.5">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Teaching Subjects</h4>
            <div className="flex flex-wrap gap-2">
              {teacher.subjects && teacher.subjects.map((sub: string, idx: number) => (
                <GlassBadge key={idx} variant="indigo" size="sm">
                  {sub}
                </GlassBadge>
              ))}
            </div>
          </div>

          {/* Action CTAs */}
          <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
            <Link
              href={`/find-teachers/${teacher.id}`}
              onClick={onClose}
              className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              <span>Open Full Profile Page</span>
            </Link>

            <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
              <Link
                href={`/student/register?educatorId=${teacher.id}&trial=true`}
                onClick={onClose}
                className="w-full sm:w-auto"
              >
                <GlassButton
                  variant="primary"
                  className="w-full bg-[#16805B] hover:bg-[#0D5C41] text-white shadow-md shadow-emerald-700/20"
                  rightIcon={<ArrowRight className="h-4 w-4" />}
                >
                  Book Trial Lesson
                </GlassButton>
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
