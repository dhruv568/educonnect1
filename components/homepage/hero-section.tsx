"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Search,
  CheckCircle2,
  Sparkles,
  GraduationCap,
  BookOpen,
  Video,
  ShieldCheck,
  Info,
} from "lucide-react";
import { GlassButton } from "@/components/glass/glass-button";
import { HeroBackgroundSlideshow } from "@/components/homepage/hero-background-slideshow";

export function HeroSection() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLevel, setSelectedLevel] = useState("All levels");
  const [selectedMode, setSelectedMode] = useState("Online or Offline");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (searchQuery.trim()) params.set("search", searchQuery.trim());
    if (selectedLevel !== "All levels") params.set("level", selectedLevel);
    if (selectedMode !== "Online or Offline") params.set("mode", selectedMode);
    router.push(`/find-teachers?${params.toString()}`);
  };

  return (
    <section className="relative pt-6 sm:pt-10 lg:pt-12 pb-16 lg:pb-24 border-b border-[#DCE5E4] overflow-hidden font-sans">
      {/* Background Slideshow & Overlays */}
      <HeroBackgroundSlideshow />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          {/* Left Column: Copy & Search */}
          <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
            {/* Small Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#E6F0EF] border border-[#DCE5E4] text-[#0F5C5A] text-xs font-black uppercase tracking-wider shadow-2xs">
              <Sparkles className="h-3.5 w-3.5 text-[#0F5C5A]" />
              <span>PERSONALIZED EDUCATION, BEAUTIFULLY SIMPLE</span>
            </div>

            {/* Main Heading */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-[#102A2A] tracking-tight leading-[1.15]">
              Find the right educators. <br />
              <span className="text-[#0F5C5A]">Unlock your potential.</span>
            </h1>

            {/* Supporting Text */}
            <p className="text-base sm:text-lg text-[#5D7373] max-w-2xl mx-auto lg:mx-0 leading-relaxed font-normal">
              Discover experienced educators for school academics, competitive exams, technology, languages, creative skills and professional growth — matched to your goals, schedule and learning style.
            </p>

            {/* About EduConnects Company Info Block */}
            <div className="p-4 sm:p-5 rounded-2xl bg-white/90 border border-[#DCE5E4] shadow-sm space-y-2 text-left max-w-2xl mx-auto lg:mx-0 backdrop-blur-xs">
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-[#0F5C5A]">
                <Info className="h-4 w-4 text-[#0F5C5A] shrink-0" />
                <span>About EduConnects</span>
              </div>
              <p className="text-xs sm:text-sm text-[#3D5252] leading-relaxed font-normal">
                EduConnects is an education platform that connects learners with verified educators, personalized learning, live classes, and structured courses — helping learners Learn, Grow & Belong.
              </p>
              <div className="pt-1">
                <Link
                  href="/about"
                  className="inline-flex items-center gap-1.5 text-xs font-extrabold text-[#0F5C5A] hover:text-[#083F3D] hover:underline transition-all group"
                >
                  <span>See More</span>
                  <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
                </Link>
              </div>
            </div>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3.5 pt-2">
              <Link href="/find-teachers" className="w-full sm:w-auto">
                <GlassButton
                  variant="primary"
                  size="lg"
                  className="w-full sm:w-auto bg-[#0F5C5A] hover:bg-[#083F3D] active:bg-[#052C2A] text-white shadow-lg text-sm font-extrabold px-7 py-3 rounded-full transition-colors"
                  rightIcon={<ArrowRight className="h-4 w-4" />}
                >
                  Find an Educator
                </GlassButton>
              </Link>

              <Link href="/teacher" className="w-full sm:w-auto">
                <GlassButton
                  variant="secondary"
                  size="lg"
                  className="w-full sm:w-auto bg-white hover:bg-[#F2FAF8] text-[#102A2A] hover:text-[#083F3D] border border-[#DCE5E4] hover:border-[#0F5C5A] text-sm font-bold px-6 py-3 rounded-full transition-colors"
                >
                  Become an Educator
                </GlassButton>
              </Link>
            </div>

            {/* Trust Points */}
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-6 pt-3 text-xs sm:text-sm font-bold text-[#102A2A]">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4.5 w-4.5 text-[#0F5C5A]" />
                <span>Verified profiles</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4.5 w-4.5 text-[#0F5C5A]" />
                <span>Flexible schedules</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4.5 w-4.5 text-[#0F5C5A]" />
                <span>Trusted learning</span>
              </div>
            </div>

            {/* Interactive Hero Search Card */}
            <div className="pt-6">
              <div className="p-5 sm:p-6 rounded-3xl bg-white border border-[#DCE5E4] shadow-xl text-left space-y-4 max-w-2xl mx-auto lg:mx-0">
                <div className="text-xs font-black text-[#102A2A] uppercase tracking-wider flex items-center gap-2">
                  <Search className="h-4 w-4 text-[#0F5C5A]" />
                  <span>What do you want to learn?</span>
                </div>

                <form onSubmit={handleSearch} className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                  {/* Subject Input */}
                  <div className="sm:col-span-5">
                    <label className="block text-[11px] font-bold text-[#5D7373] mb-1">Subject / Skill</label>
                    <input
                      type="text"
                      placeholder="e.g. Mathematics, Physics, Python..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#DCE5E4] bg-[#F5F7F8] text-xs font-semibold text-[#102A2A] placeholder:text-[#5D7373] focus:outline-none focus:border-[#0F5C5A] focus:bg-white transition-colors"
                    />
                  </div>

                  {/* Level Dropdown */}
                  <div className="sm:col-span-3">
                    <label className="block text-[11px] font-bold text-[#5D7373] mb-1">Level</label>
                    <select
                      value={selectedLevel}
                      onChange={(e) => setSelectedLevel(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-[#DCE5E4] bg-[#F5F7F8] text-xs font-semibold text-[#102A2A] focus:outline-none focus:border-[#0F5C5A] focus:bg-white transition-colors cursor-pointer"
                    >
                      <option value="All levels">All levels</option>
                      <option value="School Academics">School Academics</option>
                      <option value="Competitive Exams">Competitive Exams</option>
                      <option value="Technology">Technology & Coding</option>
                      <option value="Languages">Languages</option>
                      <option value="Creative Skills">Creative Skills</option>
                      <option value="Professional Growth">Professional Growth</option>
                    </select>
                  </div>

                  {/* Mode Dropdown */}
                  <div className="sm:col-span-3">
                    <label className="block text-[11px] font-bold text-[#5D7373] mb-1">Mode</label>
                    <select
                      value={selectedMode}
                      onChange={(e) => setSelectedMode(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-[#DCE5E4] bg-[#F5F7F8] text-xs font-semibold text-[#102A2A] focus:outline-none focus:border-[#0F5C5A] focus:bg-white transition-colors cursor-pointer"
                    >
                      <option value="Online or Offline">Online or Offline</option>
                      <option value="Online Live">Online Live</option>
                      <option value="Offline / In-Person">Offline / In-Person</option>
                    </select>
                  </div>

                  {/* Submit Button */}
                  <div className="sm:col-span-1 flex items-end">
                    <button
                      type="submit"
                      aria-label="Search"
                      className="w-full h-[42px] rounded-xl bg-[#0F5C5A] hover:bg-[#083F3D] active:bg-[#052C2A] text-white flex items-center justify-center font-bold transition-colors shadow-sm"
                    >
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>

          {/* Right Column: Premium Learning Illustration Showcase */}
          <div className="lg:col-span-5 relative">
            <div className="relative mx-auto max-w-md lg:max-w-none">
              {/* Main Card Graphic */}
              <div className="p-6 rounded-3xl bg-white border border-[#DCE5E4] shadow-2xl space-y-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-[#F2C14E]/15 rounded-bl-full pointer-events-none" />

                {/* Card Top: Educator + Student Connection Header */}
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <img
                      src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=120&auto=format&fit=crop&q=80"
                      alt="Verified educator"
                      className="w-14 h-14 rounded-2xl object-cover ring-2 ring-[#0F5C5A]/20 shadow-md"
                    />
                    <div className="absolute -bottom-1 -right-1 bg-[#0F5C5A] text-white p-1 rounded-full">
                      <ShieldCheck className="h-3.5 w-3.5" />
                    </div>
                  </div>
                  <div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-[#E6F0EF] text-[#0F5C5A] uppercase tracking-wider">
                      Verified Educator
                    </span>
                    <h2 className="text-base font-extrabold text-[#102A2A] mt-0.5">
                      Personalized 1-on-1 & Live Batches
                    </h2>
                    <p className="text-xs text-[#5D7373]">
                      Mathematics, Coding, Science & Beyond
                    </p>
                  </div>
                </div>

                {/* Content Pillars Badges */}
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div className="p-3.5 rounded-2xl bg-[#FBF7EE] border border-[#F2C14E]/30 space-y-1">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-[#102A2A]">
                      <Video className="h-4 w-4 text-[#0F5C5A]" />
                      <span>Live Classroom</span>
                    </div>
                    <p className="text-[11px] text-[#5D7373] leading-snug">
                      Interactive HD video & shared digital whiteboard
                    </p>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-[#F5F7F8] border border-[#DCE5E4] space-y-1">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-[#102A2A]">
                      <BookOpen className="h-4 w-4 text-[#1B6863]" />
                      <span>Self-Paced Courses</span>
                    </div>
                    <p className="text-[11px] text-[#5D7373] leading-snug">
                      Structured video lessons & downloadable materials
                    </p>
                  </div>
                </div>

                {/* Bottom Trust Snippet */}
                <div className="p-3.5 rounded-2xl bg-[#E6F0EF]/60 border border-[#0F5C5A]/15 flex items-center justify-between text-xs font-bold text-[#0F5C5A]">
                  <div className="flex items-center gap-2">
                    <GraduationCap className="h-4 w-4" />
                    <span>Direct Connection. Zero Middlemen.</span>
                  </div>
                  <span className="text-[#F2C14E] font-black text-sm">★ 4.9</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
