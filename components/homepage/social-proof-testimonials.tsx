"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Star, ArrowRight, Quote } from "lucide-react";
import Link from "next/link";

export interface SocialProofTestimonialsProps {}

export function SocialProofTestimonials(_props: SocialProofTestimonialsProps = {}) {
  const [activeFilter, setActiveFilter] = useState<"ALL" | "DEMO" | "LIVE" | "LMS">("ALL");

  const testimonials = [
    {
      id: 1,
      name: "Arjun Mehta",
      role: "12th Grade CBSE STEM",
      avatar: "/images/educators/male-1.jpg",
      model: "LIVE",
      modelLabel: "Live Classes",
      rating: 5,
      tutor: "Mr. Rahul Sharma",
      quote:
        "The live interactive whiteboard made differential calculus finally make sense. In school I was always too shy to raise my hand, but here I asked 10+ questions every slot without feeling judged.",
    },
    {
      id: 2,
      name: "Priya Sharma",
      role: "NEET Medical Aspirant",
      avatar: "/images/educators/female-1.jpg",
      model: "DEMO",
      modelLabel: "1-on-1 Sessions",
      rating: 5,
      tutor: "Dr. Vikramaditya Sen",
      quote:
        "Booking a 1-on-1 trial session first was the best decision. Dr. Vikramaditya analyzed my weak areas in mechanics and created a custom roadmap. No other platform gave me this level of focused personal attention.",
    },
    {
      id: 3,
      name: "David Chen",
      role: "College Freshman & Coder",
      avatar: "/images/educators/male-2.jpg",
      model: "LMS",
      modelLabel: "Recorded Courses",
      rating: 5,
      tutor: "Meenakshi Sundaram",
      quote:
        "The pre-recorded Python & Data Structures curriculum is unmatched. Every module comes with practical downloadable workbooks and auto-graded code challenges that solidified my understanding.",
    },
    {
      id: 4,
      name: "Ananya Verma",
      role: "10th ICSE Board Topper",
      avatar: "/images/educators/female-2.jpg",
      model: "LIVE",
      modelLabel: "Live Classes",
      rating: 5,
      tutor: "Dr. Rahul Sharma",
      quote:
        "My grades jumped from 78% to 95% in just 4 months. EduConnects's pay-per-class model meant we didn't have to lock into huge annual contracts, yet the teaching was world-class.",
    },
  ];

  const filteredTestimonials =
    activeFilter === "ALL"
      ? testimonials
      : testimonials.filter((t) => t.model === activeFilter);

  const filterTabs = [
    { key: "ALL" as const, label: "All Experiences" },
    { key: "DEMO" as const, label: "1-on-1 Sessions" },
    { key: "LIVE" as const, label: "Live Classes" },
    { key: "LMS" as const, label: "Recorded Courses" },
  ];

  return (
    <section
      id="success-stories"
      aria-labelledby="testimonials-heading"
      className="py-16 sm:py-20 lg:py-24 bg-[#F8FAFC] border-b border-[#E2E8F0] relative overflow-hidden font-sans scroll-mt-20"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 space-y-10 sm:space-y-12">
        {/* Section Header — Focused Exclusively on Student Stories */}
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <span className="inline-block px-3.5 py-1.5 rounded-full bg-[#F0FAF5] border border-emerald-200 text-[#16805B] text-xs font-bold uppercase tracking-wider">
            Learner Experiences
          </span>
          <h2
            id="testimonials-heading"
            className="text-3xl sm:text-4xl lg:text-5xl font-black text-[#0F172A] tracking-tight"
          >
            Success Stories
          </h2>
          <p className="text-sm sm:text-base text-[#64748B] leading-relaxed">
            Discover how learners turn difficult concepts into academic strengths through verified educators and personalized learning on EduConnects.
          </p>
        </div>

        {/* Filter Tabs */}
        <div
          role="tablist"
          aria-label="Filter testimonials by learning model"
          className="flex items-center justify-start sm:justify-center gap-2 overflow-x-auto pb-2 scrollbar-none -mx-4 px-4 sm:mx-0 sm:px-0"
        >
          {filterTabs.map((tab) => {
            const isSelected = activeFilter === tab.key;
            return (
              <button
                key={tab.key}
                role="tab"
                aria-selected={isSelected}
                onClick={() => setActiveFilter(tab.key)}
                className={`shrink-0 px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#16805B] focus-visible:ring-offset-2 ${
                  isSelected
                    ? "bg-[#16805B] text-white shadow-sm"
                    : "bg-white text-[#0F172A] border border-[#E2E8F0] hover:bg-[#F0FAF5] hover:text-[#0D5C41]"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Testimonials Grid — Clean, Honest Review Cards Prioritizing Customer Feedback */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
          <AnimatePresence mode="wait">
            {filteredTestimonials.map((item) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.25 }}
                className="h-full"
              >
                <figure className="p-6 sm:p-8 rounded-2xl bg-white border border-[#E2E8F0] shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between h-full space-y-5">
                  {/* Card Top: Rating & Learning Model Context */}
                  <div className="flex items-center justify-between gap-3">
                    <div
                      className="flex items-center gap-1 text-amber-400"
                      aria-label={`Rated ${item.rating} out of 5 stars`}
                    >
                      {Array.from({ length: item.rating }).map((_, i) => (
                        <Star key={i} className="h-4 w-4 fill-amber-400 stroke-amber-400" />
                      ))}
                    </div>

                    <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 border border-slate-200/80 px-2.5 py-0.5 rounded-full">
                      {item.modelLabel}
                    </span>
                  </div>

                  {/* Primary Visual Element: Customer Quotation */}
                  <blockquote className="space-y-2 flex-1">
                    <p className="text-sm sm:text-base text-slate-800 leading-relaxed font-normal">
                      &ldquo;{item.quote}&rdquo;
                    </p>
                  </blockquote>

                  {/* Card Bottom: Reviewer Identity & Educator Context */}
                  <figcaption className="pt-4 border-t border-slate-100 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={item.avatar}
                        alt={`Photo of ${item.name}`}
                        className="w-11 h-11 rounded-full object-cover ring-2 ring-emerald-100 shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="text-sm font-bold text-slate-900 truncate">
                          {item.name}
                        </div>
                        <div className="text-xs text-slate-500 font-medium truncate">
                          {item.role}
                        </div>
                      </div>
                    </div>

                    {/* Relevant Educator Context from application data */}
                    {item.tutor && (
                      <div className="text-right shrink-0">
                        <span className="block text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                          Tutor
                        </span>
                        <span className="text-xs font-semibold text-[#16805B] block truncate max-w-[140px]">
                          {item.tutor}
                        </span>
                      </div>
                    )}
                  </figcaption>
                </figure>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Restrained, Non-Intrusive Navigation Prompt (Not an Ad Banner) */}
        <div className="pt-4 text-center">
          <Link
            href="/find-teachers"
            className="inline-flex items-center gap-2 text-sm font-bold text-[#16805B] hover:text-[#0D5C41] hover:underline transition-all group"
          >
            <span>Explore verified educators for your syllabus</span>
            <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </div>
    </section>
  );
}

export default SocialProofTestimonials;
