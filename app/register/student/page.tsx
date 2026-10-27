"use client";

import React, { Suspense } from "react";
import { FloatingNavbar } from "@/components/homepage/floating-navbar";
import { PremiumFooter } from "@/components/homepage/premium-footer";
import { BackButton } from "@/components/ui/back-button";
import { LearnerRegistrationFlow } from "@/components/learner/learner-registration-flow";

export default function StudentRegistrationPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#EFF6FF]">
      <FloatingNavbar variant="student" />

      <main className="flex-1 pt-24 sm:pt-36 pb-48 sm:pb-24 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 w-full space-y-8">
        <BackButton
          fallbackUrl="/student/login"
          label="Back to Sign In"
          variant="default"
        />

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

      <PremiumFooter />
    </div>
  );
}
