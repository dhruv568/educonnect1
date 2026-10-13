"use client";

import React, { Suspense } from "react";
import { FloatingNavbar } from "@/components/homepage/floating-navbar";
import { PremiumFooter } from "@/components/homepage/premium-footer";
import { BackButton } from "@/components/ui/back-button";
import { Logo } from "@/components/brand/logo";
import { LearnerRegistrationFlow } from "@/components/learner/learner-registration-flow";

export default function StudentRegisterPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#EFF6FF] relative overflow-hidden font-sans">
      {/* Role-Specific Learner Navbar */}
      <FloatingNavbar variant="student" />

      {/* Decorative Brand Accent Background Glows */}
      <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-[#2563EB]/10 blur-[140px] rounded-full pointer-events-none -z-10" />
      <div className="absolute bottom-40 right-10 w-[500px] h-[400px] bg-[#60A5FA]/10 blur-[130px] rounded-full pointer-events-none -z-10" />

      <main className="flex-1 pt-32 sm:pt-36 pb-24 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 w-full space-y-8">
        <div className="flex items-center justify-between">
          <BackButton
            fallbackUrl="/student/login"
            label="Back to Sign In"
            variant="default"
          />
          <div className="hidden sm:block">
            <Logo variant="compact" size="sm" roleContext="student" href="/student" priority />
          </div>
        </div>

        {/* 7-STEP UNIFIED LEARNER REGISTRATION FLOW */}
        <Suspense
          fallback={
            <div className="min-h-[400px] flex items-center justify-center">
              <div className="w-10 h-10 border-4 border-[#2563EB]/30 border-t-[#2563EB] rounded-full animate-spin" />
            </div>
          }
        >
          <LearnerRegistrationFlow />
        </Suspense>
      </main>

      {/* Standard Learner Dark Footer */}
      <PremiumFooter />
    </div>
  );
}
