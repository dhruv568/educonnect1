"use client";

import React, { useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { LogOut, ArrowRight, Home, Sparkles, Heart, Quote, CheckCircle2 } from "lucide-react";
import { OFFICIAL_COMPANY_INFO } from "@/lib/company";
import { getEducatorDomain } from "@/lib/app-url";

export default function EducatorLogoutPage() {
  // Ensure session is completely cleared when landing on this page
  useEffect(() => {
    fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
  }, []);

  const currentYear = new Date().getFullYear();
  const loginUrl = "/teacher/login";

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#083F3D] via-[#0B4F4B] to-[#042423] text-white flex flex-col justify-between selection:bg-[#F2C14E] selection:text-slate-900">
      {/* Top Header */}
      <header className="w-full border-b border-[#1B6863]/40 bg-[#073F3C]/60 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl overflow-hidden shadow-md border border-[#F2C14E]/30 bg-white flex items-center justify-center">
              <Image
                src="/images/logo.jpeg"
                alt="EduConnects Logo"
                width={40}
                height={40}
                className="object-cover w-full h-full group-hover:scale-105 transition-transform"
                priority
              />
            </div>
            <div>
              <span className="text-lg sm:text-xl font-black text-white tracking-tight">
                EDUCONNECTS
              </span>
              <span className="hidden sm:inline-block ml-2 text-[11px] font-bold uppercase tracking-widest text-[#F2C14E] bg-[#F2C14E]/10 px-2 py-0.5 rounded-full border border-[#F2C14E]/20">
                Educator Portal
              </span>
            </div>
          </Link>

          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-teal-200 hover:text-white transition-colors"
          >
            <Home className="h-4 w-4" />
            <span>Return to Homepage</span>
          </Link>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-10 sm:py-16 flex flex-col justify-center items-center">
        {/* Sign-out Status Confirmation */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs sm:text-sm font-bold mb-6 animate-fade-in shadow-sm">
          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          <span>You have been safely signed out</span>
        </div>

        {/* Hero Title */}
        <div className="text-center space-y-3 max-w-2xl mx-auto mb-10">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight leading-tight">
            Thank You for Shaping the Future of Learning
          </h1>
          <p className="text-sm sm:text-base text-teal-100/80 leading-relaxed">
            Every lecture you deliver, doubt you resolve, and course you publish empowers learners to reach their highest potential. We look forward to your next teaching session.
          </p>
        </div>

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 w-full mb-10">
          {/* Card 1: Director's Note */}
          <div className="bg-[#073F3C]/80 border border-[#1B6863]/50 rounded-3xl p-6 sm:p-8 backdrop-blur-md shadow-2xl flex flex-col justify-between hover:border-[#F2C14E]/40 transition-all duration-300 group">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F2C14E]/15 border border-[#F2C14E]/30 text-[#F2C14E] text-xs font-bold uppercase tracking-wider">
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Leadership Message</span>
                </div>
                <Quote className="h-6 w-6 text-teal-300/30" />
              </div>

              <blockquote className="text-sm sm:text-base text-teal-50 italic font-medium leading-relaxed">
                &ldquo;True education transcends classrooms—it ignites curiosity and transforms lives. To our educators: your commitment to excellence is the beating heart of EduConnect.&rdquo;
              </blockquote>
            </div>

            <div className="flex items-center gap-4 pt-6 mt-6 border-t border-[#1B6863]/40">
              <div className="relative w-14 h-14 rounded-2xl overflow-hidden ring-2 ring-[#F2C14E]/40 shadow-lg shrink-0 bg-slate-800">
                <Image
                  src="/images/director.jpeg"
                  alt="Sameer Shrivastava - Director"
                  fill
                  className="object-cover group-hover:scale-105 transition-transform"
                />
              </div>
              <div>
                <h4 className="text-sm font-black text-white tracking-tight">Sameer Shrivastava</h4>
                <p className="text-xs text-[#F2C14E] font-semibold">Director</p>
                <p className="text-[11px] text-teal-200/60 font-medium">Shrivastava ProFunnels Ventures Pvt Ltd</p>
              </div>
            </div>
          </div>

          {/* Card 2: Learner Community & Inspiration */}
          <div className="bg-[#073F3C]/80 border border-[#1B6863]/50 rounded-3xl p-6 sm:p-8 backdrop-blur-md shadow-2xl flex flex-col justify-between hover:border-emerald-400/40 transition-all duration-300 group">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-bold uppercase tracking-wider">
                  <Heart className="h-3.5 w-3.5 fill-emerald-400 text-emerald-400" />
                  <span>Our Learners</span>
                </div>
                <Quote className="h-6 w-6 text-teal-300/30" />
              </div>

              <blockquote className="text-sm sm:text-base text-teal-50 italic font-medium leading-relaxed">
                &ldquo;Teaching is the greatest act of optimism. You are investing in learners who will build tomorrow&apos;s innovations, businesses, and communities.&rdquo;
              </blockquote>
            </div>

            <div className="flex items-center gap-4 pt-6 mt-6 border-t border-[#1B6863]/40">
              <div className="relative w-14 h-14 rounded-2xl overflow-hidden ring-2 ring-emerald-400/40 shadow-lg shrink-0 bg-slate-800">
                <Image
                  src="/images/learner-hero.jpeg"
                  alt="Inspiring Learners Everywhere"
                  fill
                  className="object-cover group-hover:scale-105 transition-transform"
                />
              </div>
              <div>
                <h4 className="text-sm font-black text-white tracking-tight">Inspiring Nationwide Learners</h4>
                <p className="text-xs text-emerald-300 font-semibold">EduConnect Learning Community</p>
                <p className="text-[11px] text-teal-200/60 font-medium">Live 1-on-1, Group Classes & LMS</p>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
          <Link
            href={loginUrl}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-3.5 rounded-2xl bg-[#F2C14E] text-[#083F3D] hover:bg-[#ffcf66] font-black text-sm tracking-wide shadow-xl hover:shadow-[#F2C14E]/20 transition-all active:scale-95"
          >
            <span>Log In Again</span>
            <ArrowRight className="h-4 w-4" />
          </Link>

          <Link
            href="/"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-2xl bg-[#0F5C5A]/80 hover:bg-[#157976] text-white border border-[#1B6863] font-bold text-sm tracking-wide transition-all active:scale-95"
          >
            <Home className="h-4 w-4 text-teal-300" />
            <span>Return to Homepage</span>
          </Link>
        </div>
      </main>

      {/* Official Legal Footer */}
      <footer className="w-full border-t border-[#1B6863]/40 bg-[#042423]/90 py-8 px-4 sm:px-6 lg:px-8 text-center text-xs text-teal-100/70 space-y-1.5 font-medium">
        <p className="text-teal-100 font-bold">
          © {currentYear} {OFFICIAL_COMPANY_INFO.legalName}
        </p>
        <p className="text-[11px] text-teal-200/50">
          Brand Name: {OFFICIAL_COMPANY_INFO.brandName}
        </p>
        <p className="text-[10px] text-teal-300/40 pt-1">
          CIN: {OFFICIAL_COMPANY_INFO.cin} • Registered in Lalitpur, Uttar Pradesh, India
        </p>
      </footer>
    </div>
  );
}
