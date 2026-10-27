"use client";

import React from "react";
import { FloatingNavbar } from "@/components/homepage/floating-navbar";
import { PromotionalBannerCarousel } from "@/components/banners/promotional-banner-carousel";
import { HeroSection } from "@/components/homepage/hero-section";
import { WhoIsItForSection } from "@/components/homepage/who-is-it-for-section";
import { BrandVisionSection } from "@/components/homepage/brand-vision-section";
import { WhatYouCanDoSection } from "@/components/homepage/what-you-can-do-section";
import { HowItWorksSection } from "@/components/homepage/how-it-works-section";
import { ExploreEducatorsSection } from "@/components/homepage/explore-educators-section";
import { ExploreCoursesSection } from "@/components/homepage/explore-courses-section";
import { LearnerMilestonesBanner } from "@/components/homepage/learner-milestones-banner";
import { SocialProofTestimonials } from "@/components/homepage/social-proof-testimonials";
import { WhyEduConnectsSection } from "@/components/homepage/why-educonnects-section";
import { BecomeEducatorSection } from "@/components/homepage/become-educator-section";
import { FinalCtaSection } from "@/components/homepage/final-cta-section";
import { PremiumFooter } from "@/components/homepage/premium-footer";

export default function EduConnectsHomePage() {
  return (
    <div data-theme="home" className="min-h-screen flex flex-col relative bg-[#F2FAF8]/30 overflow-x-hidden font-sans">
      {/* 1. Simplified Modern Glass Navbar */}
      <FloatingNavbar />

      <main className="flex-1">
        {/* Global Promotional Banner Carousel */}
        <PromotionalBannerCarousel placement="MAIN" />

        {/* 2. Clear Hero Section */}
        <HeroSection />

        {/* 3. Who Is EduConnects For? (Learners & Educators) */}
        <WhoIsItForSection />

        {/* 3.5 Brand Vision: Better Learning, Brighter Tomorrows */}
        <BrandVisionSection />

        {/* 4. What Can You Do On EduConnects? */}
        <WhatYouCanDoSection />

        {/* 5. How EduConnects Works */}
        <HowItWorksSection />

        {/* 6. Explore Educators */}
        <ExploreEducatorsSection />

        {/* 7. Explore Courses */}
        <ExploreCoursesSection />

        {/* 7.5 Dedicated Promotional Marketing Banner: Learner Milestones */}
        <LearnerMilestonesBanner />

        {/* 8. Success Stories — Authentic Customer Reviews */}
        <SocialProofTestimonials />

        {/* 9. Why EduConnects? */}
        <WhyEduConnectsSection />

        {/* 10. Become An Educator */}
        <BecomeEducatorSection />

        {/* 11. Final CTA */}
        <FinalCtaSection />
      </main>

      {/* 12. Premium Structured Footer */}
      <PremiumFooter />
    </div>
  );
}
