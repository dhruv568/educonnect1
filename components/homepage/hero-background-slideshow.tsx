"use client";

import React from "react";

export function HeroBackgroundSlideshow() {
  return (
    <div
      aria-hidden="true"
      className="absolute inset-0 -z-10 overflow-hidden pointer-events-none select-none bg-gradient-to-b from-[#F2FAF8] via-[#FBF7EE]/50 to-white"
    >
      {/* Brand Teal glow overlay */}
      <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[800px] h-[450px] bg-[#0F5C5A]/5 rounded-full blur-3xl" />
      <div className="absolute top-1/3 right-10 w-[500px] h-[350px] bg-[#2A8C84]/5 rounded-full blur-3xl" />
    </div>
  );
}

