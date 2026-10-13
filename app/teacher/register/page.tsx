"use client";

import React from "react";
import { FloatingNavbar } from "@/components/homepage/floating-navbar";
import { PremiumFooter } from "@/components/homepage/premium-footer";
import { BackButton } from "@/components/ui/back-button";
import { EducatorRegistrationFlow } from "@/components/educator/educator-registration-flow";

export default function TeacherRegisterPage() {
  return (
    <div data-theme="educator" className="min-h-screen flex flex-col bg-[#F0FDFA]/40 relative overflow-hidden font-sans">
      <FloatingNavbar variant="teacher" />

      <main className="flex-1 pt-28 sm:pt-32 pb-20 max-w-4xl mx-auto px-4 sm:px-6 w-full space-y-6">
        <div className="flex items-center justify-between">
          <BackButton
            fallbackUrl="/teacher/login"
            label="Back to Educator Sign In"
            variant="default"
          />
        </div>

        <EducatorRegistrationFlow />
      </main>

      <PremiumFooter />
    </div>
  );
}
