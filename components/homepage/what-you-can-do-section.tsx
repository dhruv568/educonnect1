"use client";

import React from "react";
import {
  Users,
  BookOpen,
  Video,
  Clock,
  LineChart,
  MessageCircle,
} from "lucide-react";

export function WhatYouCanDoSection() {
  const features = [
    {
      icon: Users,
      title: "Find Educators",
      desc: "Discover educators based on your learning needs, subject requirements, level, and schedule.",
    },
    {
      icon: BookOpen,
      title: "Explore Courses",
      desc: "Browse structured courses and lessons designed by experienced subject experts.",
    },
    {
      icon: Video,
      title: "Learn Live",
      desc: "Join interactive live learning sessions with real-time video, chat, and whiteboard.",
    },
    {
      icon: Clock,
      title: "Learn at Your Pace",
      desc: "Access recorded lessons and course content anytime, anywhere, on your own schedule.",
    },
    {
      icon: LineChart,
      title: "Track Your Learning",
      desc: "Follow your course progress, lesson completion, and learning activity effortlessly.",
    },
    {
      icon: MessageCircle,
      title: "Connect With Educators",
      desc: "Build meaningful learning connections and receive direct guidance from tutors.",
    },
  ];

  return (
    <section className="py-20 lg:py-28 bg-[#F8FAFC] border-b border-[#E2E8F0] font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <span className="text-xs font-black text-[#16805B] uppercase tracking-widest px-3 py-1 rounded-full bg-[#F0FAF5]">
            PLATFORM CAPABILITIES
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-[#0F172A] tracking-tight">
            Everything you need to keep learning
          </h2>
          <p className="text-sm sm:text-base text-[#64748B]">
            EduConnects provides all the tools, guidance, and course content required for your educational journey.
          </p>
        </div>

        {/* 6 Feature Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {features.map((f, idx) => {
            const IconComp = f.icon;
            return (
              <div
                key={idx}
                className="p-7 rounded-3xl bg-white border border-[#E2E8F0] hover:border-[#16805B]/40 hover:shadow-xl transition-all space-y-4 flex flex-col justify-between group"
              >
                <div className="space-y-3">
                  <div className="p-3 rounded-2xl bg-[#F0FAF5] text-[#16805B] w-fit group-hover:bg-[#16805B] group-hover:text-white transition-colors">
                    <IconComp className="h-6 w-6" />
                  </div>
                  <h3 className="text-lg sm:text-xl font-black text-[#0F172A]">
                    {f.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-[#64748B] leading-relaxed">
                    {f.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
