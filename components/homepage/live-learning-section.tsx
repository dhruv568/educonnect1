"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowRight, Video, Users, Calendar, MessageSquare } from "lucide-react";
import { GlassButton } from "@/components/glass/glass-button";
import { getLiveDomain } from "@/lib/app-url";

export function LiveLearningSection() {
  const [hasLiveNow, setHasLiveNow] = useState(false);

  useEffect(() => {
    // Check if any active live session exists
    async function checkLive() {
      try {
        const res = await fetch("/api/events?status=LIVE");
        if (res.ok) {
          const json = await res.json();
          if (json.data?.events?.length > 0) {
            setHasLiveNow(true);
          }
        }
      } catch {
        setHasLiveNow(false);
      }
    }
    checkLive();
  }, []);

  return (
    <section className="py-20 lg:py-28 bg-[#0D5C41] text-white border-b border-[#16805B]/30 font-sans relative overflow-hidden">
      {/* Glow background */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-[#16805B]/30 blur-3xl rounded-full pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 space-y-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left Column Copy */}
          <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#16805B] border border-emerald-400/30 text-[#F2C14E] text-xs font-black uppercase tracking-wider">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
              </span>
              <span>🔴 LIVE LEARNING EXPERIENCE</span>
            </div>

            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white leading-tight">
              Learn together. Live.
            </h2>

            <p className="text-base sm:text-lg text-emerald-100/80 max-w-2xl mx-auto lg:mx-0 leading-relaxed font-normal">
              Join live sessions, interact with educators and be part of the learning experience in real time. Features HD video, screen sharing, interactive digital whiteboard, and live Q&A chat.
            </p>

            {hasLiveNow && (
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-red-500/20 border border-red-500/40 text-red-300 text-xs font-bold">
                <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                LIVE NOW — Interactive Sessions Available
              </div>
            )}

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
              <a href={getLiveDomain()}>
                <GlassButton
                  variant="secondary"
                  size="lg"
                  className="bg-[#F2C14E] hover:bg-[#E0B03C] text-[#0F172A] font-extrabold px-7 py-3 rounded-full shadow-lg"
                  rightIcon={<ArrowRight className="h-4 w-4" />}
                >
                  Explore Live Events →
                </GlassButton>
              </a>
            </div>
          </div>

          {/* Right Column Visual Card */}
          <div className="lg:col-span-5">
            <div className="p-6 rounded-3xl bg-[#16805B]/90 border border-emerald-400/30 shadow-2xl space-y-5">
              <div className="flex items-center justify-between border-b border-[#0D5C41] pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-red-500/20 text-red-400">
                    <Video className="h-5 w-5" />
                  </div>
                  <span className="text-xs font-bold text-white">Browser-Based WebRTC</span>
                </div>
                <span className="text-[10px] font-black uppercase tracking-wider text-[#F2C14E] bg-[#0D5C41] px-2.5 py-1 rounded-full border border-emerald-500/30">
                  Zero Downloads
                </span>
              </div>

              <div className="space-y-3 text-xs text-emerald-100/90">
                <div className="p-3.5 rounded-2xl bg-[#0D5C41]/80 border border-emerald-500/30 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Users className="h-4 w-4 text-[#F2C14E]" />
                    <span className="font-semibold">Interactive Group Batches</span>
                  </div>
                  <span className="text-[11px] text-emerald-200">1-on-1 or Groups</span>
                </div>

                <div className="p-3.5 rounded-2xl bg-[#0D5C41]/80 border border-emerald-500/30 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <MessageSquare className="h-4 w-4 text-[#F2C14E]" />
                    <span className="font-semibold">In-Class Live Q&A & Notes</span>
                  </div>
                  <span className="text-[11px] text-emerald-200">Real-Time</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
