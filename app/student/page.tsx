"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import photo2 from "@/photo2.jpeg";
import photo3 from "@/photo3.jpeg";
import { FloatingNavbar } from "@/components/homepage/floating-navbar";
import { PromotionalBannerCarousel } from "@/components/banners/promotional-banner-carousel";
import { PremiumFooter } from "@/components/homepage/premium-footer";
import { LearnerHeroSlideshow } from "@/components/homepage/learner-hero-slideshow";
import { GlassCard } from "@/components/glass/glass-card";
import { GlassBadge } from "@/components/glass/glass-badge";
import { GlassButton } from "@/components/glass/glass-button";
import { CourseCard } from "@/components/courses/course-card";
import { AuthModal } from "@/components/shared/auth-modal";
import {
  GraduationCap,
  BookOpen,
  Video,
  Sparkles,
  Search,
  CheckCircle2,
  Clock,
  Flame,
  ArrowRight,
  Star,
  Users,
  ShieldCheck,
  Play,
  Award,
  ChevronDown,
  Layers,
  Zap,
  Target,
  FileText,
  CreditCard,
  Laptop,
  Check,
  X,
  Calendar,
  MessageSquare,
  HelpCircle,
  LayoutDashboard,
  Info,
} from "lucide-react";
import { formatCurrency } from "@/lib/currency";
import { UserRole, UserSession } from "@/types/auth";

export default function StudentLandingPage() {
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [courses, setCourses] = useState<any[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [featuredTeachers, setFeaturedTeachers] = useState<any[]>([]);
  const [loadingTeachers, setLoadingTeachers] = useState(true);
  const [activeCategory, setActiveCategory] = useState("ALL");
  const [courseSearch, setCourseSearch] = useState("");
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);
  const [userSession, setUserSession] = useState<UserSession | null>(null);

  // Check auth status
  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (json?.data?.user) {
          setUserSession(json.data.user);
        }
      })
      .catch(() => {});
  }, []);

  // Fetch real courses from API
  useEffect(() => {
    const fetchCourses = async () => {
      setLoadingCourses(true);
      try {
        const queryParams = new URLSearchParams({ limit: "6" });
        if (activeCategory !== "ALL") {
          queryParams.set("subject", activeCategory);
        }
        if (courseSearch.trim()) {
          queryParams.set("search", courseSearch.trim());
        }
        const res = await fetch(`/api/courses?${queryParams.toString()}`);
        const json = await res.json();
        if (json.success && json.data?.courses) {
          const filteredCourses = json.data.courses.filter((course: any) => {
            const title = (course.title || "").trim().toLowerCase();
            return (
              title !== "testing" &&
              !title.startsWith("testing") &&
              !title.startsWith("advanced calculus & analytical")
            );
          });
          setCourses(filteredCourses);
        }
      } catch (err) {
        console.error("Failed to load courses for student landing page:", err);
      } finally {
        setLoadingCourses(false);
      }
    };

    fetchCourses();
  }, [activeCategory, courseSearch]);

  // Fetch verified top teachers from API
  useEffect(() => {
    const fetchTeachers = async () => {
      setLoadingTeachers(true);
      try {
        const res = await fetch("/api/teachers?sortBy=rating&ratingMin=4");
        const json = await res.json();
        if (json.success && json.data?.teachers && json.data.teachers.length > 0) {
          setFeaturedTeachers(json.data.teachers.slice(0, 4));
        }
      } catch (err) {
        console.error("Failed to load featured teachers:", err);
      } finally {
        setLoadingTeachers(false);
      }
    };

    fetchTeachers();
  }, []);

  const categories = [
    { label: "All Subjects", value: "ALL" },
    { label: "Mathematics", value: "Mathematics" },
    { label: "Physics", value: "Physics" },
    { label: "Chemistry", value: "Chemistry" },
    { label: "Computer Science", value: "Computer Science" },
    { label: "English", value: "English" },
  ];

  const studentBenefits = [
    {
      icon: ShieldCheck,
      title: "100% Verified Educators",
      desc: "Every educator undergoes strict identity, degree, and background verification before teaching.",
      badge: "Quality Guaranteed",
      color: "blue",
    },
    {
      icon: Video,
      title: "Interactive Live Classes",
      desc: "Join real-time video classrooms with digital whiteboard, live chat, and instant educator feedback.",
      badge: "Real-Time WebRTC",
      color: "emerald",
    },
    {
      icon: Play,
      title: "Recorded On-Demand LMS",
      desc: "Watch crystal-clear video lessons at your own pace with downloadable notes and milestone quizzes.",
      badge: "24/7 Access",
      color: "purple",
    },
    {
      icon: Target,
      title: "1-on-1 Trial Sessions",
      desc: "Book zero-commitment demo lessons with top educators to find your ideal learning mentor.",
      badge: "Risk-Free Trial",
      color: "indigo",
    },
    {
      icon: Flame,
      title: "Progress & Streak Tracking",
      desc: "Visualize your learning hours, lesson completions, and study streaks in your personalized hub.",
      badge: "Stay Motivated",
      color: "amber",
    },
    {
      icon: Award,
      title: "Course Certificates",
      desc: "Earn verified course completion certificates upon completing lessons to showcase your achievements.",
      badge: "Accredited",
      color: "rose",
    },
  ];

  const testimonials = [
    {
      name: "Aarav Mehta",
      role: "Class 12 CBSE Learner",
      avatar: "/images/educators/educator_01.jpg",
      rating: 5,
      subject: "Calculus & Linear Algebra",
      quote:
        "The live whiteboard feature made complex calculus integrations click instantly. Having recorded video backup meant I could revise right before my exams!",
      achievement: "Scored 98% in Board Math",
    },
    {
      name: "Sneha Patel",
      role: "NEET Physics Learner",
      avatar: "/images/educators/educator_02.jpg",
      rating: 5,
      subject: "Electrostatics & Optics",
      quote:
        "Booking a 1-on-1 demo gave me the confidence to choose my educator without committing upfront. My physics problem-solving speed improved tremendously.",
      achievement: "NEET Physics: 168/180",
    },
    {
      name: "Rohan Verma",
      role: "Python & Data Science Learner",
      avatar: "/images/educators/educator_03.jpg",
      rating: 5,
      subject: "Python Programming & AI",
      quote:
        "The self-paced video modules accompanied by live weekend doubt-clearing sessions are the perfect hybrid format. Everything just works in the browser.",
      achievement: "Built 4 Portfolio Projects",
    },
  ];

  const faqs = [
    {
      question: "1. How do I find the best verified educator for my subject or exam?",
      answer:
        "Browse our Find Educators directory where you can filter by subject (Mathematics, Physics, Chemistry, Biology, Computer Science, English), hourly rate, teaching experience, and verified ratings (4+, 4.5+, 5). Each educator profile shows qualifications, bio, and verified credentials.",
    },
    {
      question: "2. How do I explore and enroll in courses on EduConnects?",
      answer:
        "Visit the Explore Courses catalog to discover structured curriculums with detailed chapter syllabi, lesson previews, and instructor overviews. Select the course that matches your learning goals to initiate enrollment.",
    },
    {
      question: "3. What is the Free AI Exam system and how do I take a test?",
      answer:
        "Click 'Take Test' in the top navigation to access our interactive diagnostic exam tool. Select any subject, difficulty level, and number of questions (5, 10, or 15). Powered by OpenAI gpt-4o-mini, you receive instant server-side grading, step-by-step explanations, and personalized course and educator recommendations.",
    },
    {
      question: "4. Are there any limits on how many courses I can enroll in at one time?",
      answer:
        "No! EduConnects allows learners to purchase and enroll in multiple courses simultaneously. Each course has its own enrollment, payment receipt, progress tracking, and completion status.",
    },
    {
      question: "5. What payment methods are supported for course enrollments and bookings?",
      answer:
        "All transactions are securely processed in Indian Rupees (INR) through Cashfree Payments. You can pay via UPI (Google Pay, PhonePe, Paytm, BHIM), Netbanking across all major Indian banks, and Debit/Credit Cards (Visa, Mastercard, RuPay).",
    },
    {
      question: "6. What happens after I complete my payment on EduConnects?",
      answer:
        "After payment, you will see a confirmation screen. If you do not yet have an account, you will be prompted to complete a quick registration with cryptographic CAPTCHA. Once registered and signed in, your course is immediately unlocked in your Learner Dashboard.",
    },
    {
      question: "7. How do live interactive classes work?",
      answer:
        "Live classes run directly inside your web browser via EduConnects Classroom powered by WebRTC. You get high-definition audio/video, collaborative digital whiteboards, screen sharing, and real-time chat without downloading external applications like Zoom.",
    },
    {
      question: "8. Can I book a 1-on-1 trial class with an educator before committing?",
      answer:
        "Yes! Many educators offer 1-on-1 trial slots or demo sessions so you can discuss your syllabus, evaluate teaching style, and set learning targets before booking extended sessions.",
    },
    {
      question: "9. How are educator ratings and reviews calculated?",
      answer:
        "Only learners who have attended verified live classes or enrolled in an educator's course can leave ratings and feedback. Ratings range from 1 to 5 stars, and filters allow you to easily discover top-rated mentors with 4+, 4.5+, or 5-star ratings.",
    },
    {
      question: "10. How does EduConnects verify educators on the platform?",
      answer:
        "Every educator undergoes a rigorous multi-step vetting process including government identity verification, academic degree authentication, subject knowledge assessment, and teaching methodology review before being approved to teach.",
    },
    {
      question: "11. Can I track my learning progress, attendance, and certificates?",
      answer:
        "Yes! Your personal Learner Dashboard tracks your video lesson completion, study streaks, upcoming live classroom sessions, and downloadable completion certificates for completed courses.",
    },
    {
      question: "12. How do I contact EduConnects Learner Support if I need help?",
      answer:
        "Our dedicated learner support team is available via email at support@educonnects.co.in and live support tickets. In the rare event a scheduled class is cancelled by an educator, our automated escrow protection ensures hassle-free refund processing.",
    },
  ];

  const fallbackTeachers = [
    {
      id: "t-1",
      name: "Dr. Rajesh Sharma",
      headline: "Senior Mathematics Faculty & IIT JEE Coach",
      avatarUrl: "/images/educators/educator_05.jpg",
      subjects: ["Calculus", "Algebra", "JEE Advanced"],
      experienceYears: 12,
      hourlyRate: 350,
      rating: 4.98,
    },
    {
      id: "t-2",
      name: "Priya Sundaram",
      headline: "NEET & Board Exam Physics Specialist",
      avatarUrl: "/images/educators/anuradha-sengupta.jpg",
      subjects: ["Physics", "Mechanics", "Electrostatics"],
      experienceYears: 9,
      hourlyRate: 300,
      rating: 4.95,
    },
    {
      id: "t-3",
      name: "Amit Joshi",
      headline: "Computer Science & Full-Stack Mentor",
      avatarUrl: "/images/educators/educator_07.jpg",
      subjects: ["Python", "Algorithms", "Web Dev"],
      experienceYears: 8,
      hourlyRate: 350,
      rating: 4.96,
    },
    {
      id: "t-4",
      name: "Ananya Roy",
      headline: "Organic & Physical Chemistry Faculty",
      avatarUrl: "/images/educators/educator_08.jpg",
      subjects: ["Chemistry", "Organic Synthesis", "CBSE 12th"],
      experienceYears: 7,
      hourlyRate: 250,
      rating: 4.92,
    },
  ];

  const studentJourneySteps = [
    {
      step: "01",
      title: "Find Your Educator or Course",
      desc: "Search our directory of verified educators by subject, exam syllabus (CBSE, ICSE, JEE, NEET), or explore structured courses.",
      icon: Search,
    },
    {
      step: "02",
      title: "Book a Class",
      desc: "Schedule a risk-free 1-on-1 demo with your preferred educator, or enroll in a comprehensive curriculum with instant access.",
      icon: Calendar,
    },
    {
      step: "03",
      title: "Learn Live in the Browser",
      desc: "Join high-definition interactive classes featuring a collaborative digital whiteboard, live chat, and instant doubt resolution.",
      icon: Video,
    },
    {
      step: "04",
      title: "Track Progress & Excel",
      desc: "Access recorded lesson replays, complete homework assignments, maintain study streaks, and earn verified certificates.",
      icon: Award,
    },
  ];

  const comparisonPoints = [
    {
      feature: "Class Size & Personalized Attention",
      traditional: "Overcrowded batches of 40-60+ students. Hesitant to ask doubts.",
      educonnects: "1-on-1 personalized tutorials or small interactive focus cohorts.",
    },
    {
      feature: "Tutor Quality & Verification",
      traditional: "Assigned arbitrarily by coaching center. Uncertain teacher qualifications.",
      educonnects: "100% verified degrees, identity checks, and transparent student reviews.",
    },
    {
      feature: "Missed Lectures & Exam Revision",
      traditional: "Miss a class and the concept is gone. Rely on photocopied friend notes.",
      educonnects: "Lifetime on-demand access to HD video replays and downloadable PDF notes.",
    },
    {
      feature: "Commute & Flexibility",
      traditional: "2+ hours wasted daily stuck in traffic commuting to physical coaching centers.",
      educonnects: "100% browser-based. Zero commute, learn safely and comfortably from home.",
    },
    {
      feature: "Pricing & Payment Terms",
      traditional: "Expensive non-refundable upfront annual fees of ₹50,000 to ₹1,50,000+.",
      educonnects: "Pay per lesson or course. Escrow protection and instant refund guarantees.",
    },
  ];

  const handleOpenAuth = () => {
    setAuthModalOpen(true);
  };

  return (
    <div data-theme="learner" className="min-h-screen flex flex-col bg-[#F3F6FF]/30 relative overflow-hidden font-sans text-slate-900">
      {/* 1. Learner-Oriented Role Navbar */}
      <FloatingNavbar variant="student" />

      <main className="flex-1">
        {/* Global Promotional Banner Carousel */}
        <PromotionalBannerCarousel placement="LEARNERS" />

        {/* ========================================================================= */}
        <section className="relative pt-6 sm:pt-10 lg:pt-12 pb-16 lg:pb-24 overflow-hidden bg-[#F3F6FF]">
          <LearnerHeroSlideshow />

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
              {/* Hero Left Column: Copy & CTAs */}
              <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
                <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3">
                  <div className="inline-flex items-center gap-2.5 px-3 py-1.5 rounded-2xl bg-white border border-blue-200 text-blue-700 shadow-2xs">
                    <Image
                      src={photo3}
                      alt="EduConnects - Find an Educator"
                      className="h-8 w-auto object-contain"
                      priority
                    />
                    <div className="border-l border-blue-100 pl-2.5 text-left">
                      <span className="block text-[10px] font-black text-blue-700 uppercase tracking-wider">
                        EduConnects
                      </span>
                      <span className="block text-[11px] font-semibold text-slate-700">
                        Learn • Grow • Belong
                      </span>
                    </div>
                  </div>

                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-extrabold uppercase tracking-wider shadow-2xs">
                    <Sparkles className="h-3.5 w-3.5 text-blue-600" />
                    <span>Ambitious Learners</span>
                  </div>
                </div>

                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight leading-[1.15]">
                  Learn from the <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 bg-clip-text text-transparent">right teacher.</span> <br />
                  Build the skills for your future.
                </h1>

                <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto lg:mx-0 leading-relaxed font-normal">
                  Connect with verified top-tier educators, join interactive live video classrooms with real-time digital whiteboards, and master structured self-paced courses.
                </p>

                {/* About EduConnects Company Info Block */}
                <div className="p-4 sm:p-5 rounded-2xl bg-white/95 border border-blue-100 shadow-sm space-y-2 text-left max-w-2xl mx-auto lg:mx-0 backdrop-blur-xs">
                  <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-blue-700">
                    <Info className="h-4 w-4 text-blue-600 shrink-0" />
                    <span>About EduConnects</span>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-normal">
                    EduConnects is an education platform that connects learners with verified educators, personalized learning, live classes, and structured courses — helping learners Learn, Grow & Belong.
                  </p>
                  <div className="pt-1">
                    <Link
                      href="/about"
                      className="inline-flex items-center gap-1.5 text-xs font-extrabold text-blue-700 hover:text-blue-900 hover:underline transition-all group"
                    >
                      <span>See More</span>
                      <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
                    </Link>
                  </div>
                </div>

                {/* CTAs */}
                <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-2">
                  {userSession?.role === "STUDENT" ? (
                    <Link href="/student/dashboard" className="w-full sm:w-auto">
                      <GlassButton
                        variant="learner"
                        size="lg"
                        className="w-full sm:w-auto shadow-xl shadow-blue-500/25 text-sm"
                        leftIcon={<LayoutDashboard className="h-4 w-4" />}
                      >
                        Go to Learner Dashboard
                      </GlassButton>
                    </Link>
                  ) : (
                    <Link href="/student/register" className="w-full sm:w-auto">
                      <GlassButton
                        variant="learner"
                        size="lg"
                        className="w-full sm:w-auto shadow-xl shadow-blue-500/25 text-sm"
                        rightIcon={<ArrowRight className="h-4 w-4" />}
                      >
                        Start Learning
                      </GlassButton>
                    </Link>
                  )}

                  <Link href="/courses" className="w-full sm:w-auto">
                    <GlassButton variant="secondary" size="lg" className="w-full sm:w-auto text-sm" leftIcon={<BookOpen className="h-4 w-4 text-slate-600" />}>
                      Browse Courses
                    </GlassButton>
                  </Link>
                </div>

                {/* Trust Statistics Strip */}
                <div className="pt-6 border-t border-slate-200/80 grid grid-cols-3 gap-4 text-left max-w-lg mx-auto lg:mx-0">
                  <div>
                    <div className="text-2xl lg:text-3xl font-black text-slate-900">15,000+</div>
                    <div className="text-xs text-slate-500 font-medium">Active Learners</div>
                  </div>
                  <div>
                    <div className="text-2xl lg:text-3xl font-black text-blue-600">850+</div>
                    <div className="text-xs text-slate-500 font-medium">Verified Educators</div>
                  </div>
                  <div>
                    <div className="text-2xl lg:text-3xl font-black text-emerald-600">4.95 ★</div>
                    <div className="text-xs text-slate-500 font-medium">Learner Rating</div>
                  </div>
                </div>
              </div>

              {/* Hero Right Column: Photo 2 Learner Experience Showcase Card */}
              <div className="lg:col-span-5 relative">
                <div className="relative mx-auto max-w-sm sm:max-w-md lg:max-w-[400px]">
                  {/* Subtle Indigo/Blue Glow Backdrop */}
                  <div className="absolute -inset-2 bg-gradient-to-tr from-blue-600/20 via-indigo-500/20 to-sky-400/20 rounded-[2.2rem] blur-xl -z-10" />

                  {/* Main Card Graphic Preserving 1:1 Aspect Ratio */}
                  <div className="p-3 sm:p-4 rounded-3xl bg-white border-2 border-white/80 shadow-2xl space-y-3 relative overflow-hidden backdrop-blur-md">
                    <div className="relative aspect-square w-full max-h-[320px] sm:max-h-[340px] max-w-[340px] mx-auto rounded-2xl overflow-hidden bg-slate-50 border border-slate-200/80">
                      <Image
                        src={photo2}
                        alt="Find the Right Educator for a Brighter Future - EduConnects Learner Experience"
                        priority
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 45vw, 400px"
                        className="w-full h-full object-contain"
                      />
                    </div>

                    {/* Bottom Feature Badges Strip */}
                    <div className="grid grid-cols-2 gap-2 pt-0.5 text-xs">
                      <div className="p-2.5 rounded-xl bg-blue-50/80 border border-blue-100 flex items-center gap-2 text-slate-900">
                        <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
                        <span className="font-bold text-[11px] leading-tight">Verified Educators</span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-emerald-50/80 border border-emerald-100 flex items-center gap-2 text-slate-900">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span className="font-bold text-[11px] leading-tight">Safe & Trusted</span>
                      </div>
                    </div>
                  </div>

                  {/* Floating Trust Chip Badge */}
                  <div className="absolute -bottom-5 -left-5 bg-white p-3.5 rounded-2xl shadow-xl border border-slate-200/90 flex items-center gap-3 hidden sm:flex">
                    <div className="p-2 bg-blue-100 text-blue-600 rounded-xl">
                      <CheckCircle2 className="h-5 w-5" />
                    </div>
                    <div className="text-left">
                      <div className="text-xs font-extrabold text-slate-900">Zero Hidden Fees</div>
                      <div className="text-[10px] text-slate-500 font-medium">Pay only for what you learn</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 2. WHY EDUCONNECTS FOR LEARNERS */}
        {/* ========================================================================= */}
        <section id="benefits" className="py-24 lg:py-32 bg-white border-y border-slate-200/80">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
            <div className="text-center max-w-3xl mx-auto space-y-3">
              <GlassBadge variant="learner">WHY EDUCONNECTS?</GlassBadge>
              <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
                Why Learn on EduConnects?
              </h2>
              <p className="text-sm sm:text-base text-slate-600 leading-relaxed max-w-2xl mx-auto">
                Whether you need 1-on-1 personalized guidance, group exam prep, or self-paced video lessons, EduConnects gives you the complete learning stack.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {studentBenefits.map((b, idx) => {
                const IconComp = b.icon;
                return (
                  <GlassCard
                    key={idx}
                    className="p-7 rounded-3xl border border-slate-200/80 bg-slate-50/50 hover:bg-white hover:border-blue-300 hover:shadow-xl transition-all duration-300 flex flex-col justify-between"
                  >
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="p-3.5 rounded-2xl bg-blue-100 text-blue-600 w-fit">
                          <IconComp className="h-6 w-6" />
                        </div>
                        <span className="text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full bg-slate-200/80 text-slate-700">
                          {b.badge}
                        </span>
                      </div>
                      <h3 className="text-lg font-black text-slate-900">{b.title}</h3>
                      <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">{b.desc}</p>
                    </div>
                  </GlassCard>
                );
              })}
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 3. COURSE DISCOVERY (REAL BACKEND DATA) */}
        {/* ========================================================================= */}
        <section id="courses" className="py-20 lg:py-28 bg-slate-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
            {/* Header & Filter Controls */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div className="space-y-2 max-w-xl">
                <GlassBadge variant="learner">REAL-TIME COURSE CATALOG</GlassBadge>
                <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
                  Explore Verified Courses
                </h2>
                <p className="text-xs sm:text-sm text-slate-600">
                  Discover structured curriculums created and taught by certified educators.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <Link href="/courses">
                  <GlassButton variant="learner" size="sm" rightIcon={<ArrowRight className="h-4 w-4" />}>
                    View All Courses ({courses.length}+)
                  </GlassButton>
                </Link>
              </div>
            </div>

            {/* Subject Tabs Filter */}
            <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-4">
              {categories.map((cat) => (
                <button
                  key={cat.value}
                  onClick={() => setActiveCategory(cat.value)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                    activeCategory === cat.value
                      ? "bg-[#2563EB] text-white shadow-md shadow-blue-500/25"
                      : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Courses Grid */}
            {loadingCourses ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="h-80 rounded-3xl bg-slate-200 animate-pulse" />
                ))}
              </div>
            ) : courses.length === 0 ? (
              <GlassCard className="p-12 text-center rounded-3xl space-y-4 border border-dashed border-slate-300">
                <BookOpen className="h-12 w-12 text-slate-400 mx-auto" />
                <h3 className="text-lg font-black text-slate-800">No Courses Found in this Category</h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Try switching subject categories or explore our tutor roster to book a customized live learning session.
                </p>
                <div className="pt-2 flex justify-center gap-3">
                  <button
                    onClick={() => setActiveCategory("ALL")}
                    className="px-4 py-2 bg-[#2563EB] text-white text-xs font-bold rounded-xl shadow-md shadow-blue-500/25"
                  >
                    Reset Filter
                  </button>
                  <Link href="/find-teachers">
                    <button className="px-4 py-2 bg-white text-slate-800 border border-slate-200 text-xs font-bold rounded-xl">
                      Find Live Tutors
                    </button>
                  </Link>
                </div>
              </GlassCard>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {courses.map((course) => (
                  <CourseCard
                    key={course.id}
                    id={course.id}
                    title={course.title}
                    slug={course.slug}
                    description={course.description}
                    subject={course.subject}
                    level={course.level}
                    price={course.price}
                    rating={course.rating || 5.0}
                    reviewCount={course.reviewCount || 12}
                    lessonCount={course.lessonCount || 8}
                    durationHours={course.durationHours || 4.5}
                    thumbnailUrl={course.thumbnailUrl}
                    teacher={{
                      id: course.teacher?.id || "t1",
                      name: course.teacher?.name || "Verified Educator",
                      avatarUrl: course.teacher?.avatarUrl,
                      isVerified: true,
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 4. TOP VERIFIED EDUCATORS */}
        {/* ========================================================================= */}
        <section id="educators" className="py-20 lg:py-28 bg-white border-t border-slate-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div className="space-y-3 max-w-2xl">
                <div className="flex items-center gap-3">
                  <GlassBadge variant="learner">TOP VERIFIED FACULTY</GlassBadge>
                  <div className="hidden sm:inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-blue-50 border border-blue-200 text-[11px] font-bold text-blue-700">
                    <Image
                      src={photo3}
                      alt="EduConnects - Find an Educator"
                      className="h-5 w-auto object-contain"
                    />
                    <span>Verified Educator Roster</span>
                  </div>
                </div>
                <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
                  Learn from Top Verified Educators
                </h2>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Book 1-on-1 trial lessons or join cohort batches with experienced professors, Olympiad mentors, and senior subject specialists.
                </p>
              </div>

              <Link href="/find-teachers">
                <GlassButton variant="learner" size="sm" rightIcon={<ArrowRight className="h-4 w-4" />}>
                  Explore All 850+ Educators
                </GlassButton>
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {(featuredTeachers.length > 0 ? featuredTeachers : fallbackTeachers).map((teacher) => (
                <GlassCard
                  key={teacher.id}
                  className="p-6 rounded-3xl border border-slate-200/90 bg-slate-50/50 hover:bg-white hover:border-blue-300 hover:shadow-xl transition-all duration-300 flex flex-col justify-between group"
                >
                  <div className="space-y-4">
                    {/* Educator Avatar & Verification */}
                    <div className="relative w-fit">
                      <img
                        src={teacher.avatarUrl}
                        alt={teacher.name}
                        className="w-16 h-16 rounded-2xl object-cover ring-2 ring-blue-500/20 group-hover:ring-blue-500 transition-all shadow-sm"
                      />
                      <div className="absolute -bottom-1.5 -right-1.5 p-1 bg-emerald-600 text-white rounded-full shadow-xs" title="Identity & Degree Verified">
                        <ShieldCheck className="h-3.5 w-3.5" />
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between">
                        <h3 className="text-base font-black text-slate-900 group-hover:text-blue-600 transition-colors">
                          {teacher.name}
                        </h3>
                      </div>
                      <p className="text-xs text-slate-500 font-medium line-clamp-2 mt-0.5">
                        {teacher.headline}
                      </p>
                    </div>

                    {/* Subject Badges */}
                    <div className="flex flex-wrap gap-1">
                      {(teacher.subjects || []).slice(0, 3).map((sub: string, sIdx: number) => (
                        <span
                          key={sIdx}
                          className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-100"
                        >
                          {sub}
                        </span>
                      ))}
                    </div>

                    {/* Stats & Hourly Rate */}
                    <div className="pt-3 border-t border-slate-200/80 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1 font-extrabold text-amber-600">
                        <Star className="h-3.5 w-3.5 fill-amber-400 stroke-amber-500" />
                        <span>{teacher.rating ? Number(teacher.rating).toFixed(1) : "4.9"}</span>
                        <span className="text-[10px] text-slate-400 font-normal">
                          ({teacher.experienceYears ? `${teacher.experienceYears}y exp` : "Expert"})
                        </span>
                      </div>
                      <div className="font-black text-slate-900">
                        {formatCurrency(teacher.hourlyRate || 300)}
                        <span className="text-[10px] text-slate-500 font-normal">/hr</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-5 mt-4 border-t border-slate-100">
                    <Link href={`/student/register?educatorId=${teacher.id}&trial=true`} className="w-full block">
                      <button className="w-full py-2.5 px-3 rounded-xl bg-[#3157D5] hover:bg-[#243B9B] text-white text-xs font-bold transition-colors flex items-center justify-center gap-1 shadow-sm cursor-pointer">
                        <span>Book Trial Lesson</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                    </Link>
                  </div>
                </GlassCard>
              ))}
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 5. LIVE LEARNING DEEP DIVE */}
        {/* ========================================================================= */}
        <section id="live-classes" className="py-20 lg:py-28 bg-slate-50 border-t border-slate-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
              {/* Left Column: Visual Mock of WebRTC Classroom */}
              <div className="lg:col-span-6 space-y-4">
                <div className="relative rounded-3xl overflow-hidden shadow-2xl border-4 border-slate-900 bg-slate-950">
                  <div className="bg-slate-900 px-4 py-2.5 flex items-center justify-between border-b border-slate-800">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-rose-500" />
                      <div className="w-3 h-3 rounded-full bg-amber-500" />
                      <div className="w-3 h-3 rounded-full bg-emerald-500" />
                      <span className="text-[11px] font-mono font-bold text-slate-400 ml-2">
                        EduConnects Classroom
                      </span>
                    </div>
                    <span className="text-[10px] font-bold bg-emerald-600 text-white px-2.5 py-0.5 rounded uppercase tracking-wider flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                      Live
                    </span>
                  </div>

                  <div className="p-5 space-y-4 text-white">
                    {/* Simulated Whiteboard Drawing Canvas */}
                    <div className="bg-slate-900 rounded-2xl p-4 border border-slate-800 space-y-3">
                      <div className="h-36 flex flex-col justify-center items-center text-center space-y-2 font-mono text-emerald-400 text-sm">
                        <div>f'(x) = lim(h→0) [f(x+h) - f(x)] / h</div>
                        <div className="text-xs text-blue-300">d/dx [sin(x)] = cos(x)</div>
                        <div className="text-[11px] text-amber-300">Educator has granted drawing permissions</div>
                      </div>
                    </div>

                    {/* Chat Bubble simulation */}
                    <div className="p-3 bg-slate-900/90 rounded-xl border border-slate-800 flex items-start gap-3 text-xs">
                      <div className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-[10px] shrink-0">
                        M
                      </div>
                      <div>
                        <span className="font-bold text-slate-300">Manoj Gupta (Learner):</span>
                        <span className="text-slate-400 ml-2">"Understood! Can we solve question 4 from the problem set next?"</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Features Explanation */}
              <div className="lg:col-span-6 space-y-6">
                <GlassBadge variant="learner">BUILT-IN VIRTUAL CLASSROOM</GlassBadge>
                <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight leading-tight">
                  High-Definition Live Learning Without External Apps
                </h2>
                <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                  Forget switching between Zoom links, chat apps, and email chains. EduConnects gives you a complete, secure browser classroom built right in.
                </p>

                <div className="space-y-4 pt-2">
                  <div className="flex items-start gap-3.5">
                    <div className="p-2 rounded-xl bg-blue-100 text-blue-600 mt-1 shrink-0">
                      <Check className="h-4 w-4 stroke-[3]" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">Zero Software Downloads</h4>
                      <p className="text-xs text-slate-600 mt-0.5">Runs seamlessly in Chrome, Safari, Firefox, and Edge on laptop or mobile.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3.5">
                    <div className="p-2 rounded-xl bg-emerald-100 text-emerald-600 mt-1 shrink-0">
                      <Check className="h-4 w-4 stroke-[3]" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">Digital Whiteboard & Annotation</h4>
                      <p className="text-xs text-slate-600 mt-0.5">Collaborate directly on formulas, diagrams, and equations in real time.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3.5">
                    <div className="p-2 rounded-xl bg-purple-100 text-purple-600 mt-1 shrink-0">
                      <Check className="h-4 w-4 stroke-[3]" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">In-Class Instant File Sharing</h4>
                      <p className="text-xs text-slate-600 mt-0.5">Receive assignment sheets, PDF solution keys, and notes instantly during class.</p>
                    </div>
                  </div>
                </div>

                <div className="pt-4">
                  <Link href="/find-teachers">
                    <GlassButton variant="learner" size="md" rightIcon={<ArrowRight className="h-4 w-4" />}>
                      Find an Educator Now
                    </GlassButton>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 6. HOW IT WORKS (FOR LEARNERS) */}
        {/* ========================================================================= */}
        <section id="how-it-works" className="py-24 lg:py-32 bg-white border-t border-slate-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
            <div className="text-center max-w-2xl mx-auto space-y-3">
              <GlassBadge variant="learner">SIMPLE 4-STEP LEARNER JOURNEY</GlassBadge>
              <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
                How Learning on EduConnects Works
              </h2>
              <p className="text-sm sm:text-base text-slate-600 leading-relaxed max-w-xl mx-auto">
                From finding your ideal subject mentor to mastering complex topics, start learning in four straightforward steps.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {studentJourneySteps.map((s, idx) => {
                const IconComp = s.icon;
                return (
                  <div
                    key={idx}
                    className="p-7 rounded-3xl bg-slate-50 border border-slate-200 hover:border-blue-400 hover:shadow-lg transition-all space-y-4 relative flex flex-col justify-between group"
                  >
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-2xl font-black text-blue-600/30 group-hover:text-blue-600/60 transition-colors">
                          {s.step}
                        </span>
                        <div className="p-3 rounded-2xl bg-blue-100 text-blue-700">
                          <IconComp className="h-5 w-5" />
                        </div>
                      </div>
                      <h3 className="text-lg font-black text-slate-900">{s.title}</h3>
                      <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">{s.desc}</p>
                    </div>

                    <div className="pt-4 border-t border-slate-200/60 flex items-center text-xs font-bold text-blue-600">
                      <span>Step {s.step}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 7. LEARNER TESTIMONIALS */}
        {/* ========================================================================= */}
        <section className="py-20 bg-slate-50 border-t border-slate-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
            <div className="text-center max-w-2xl mx-auto space-y-3">
              <GlassBadge variant="learner">VERIFIED LEARNING OUTCOMES</GlassBadge>
              <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
                Trusted by Top Performing Learners
              </h2>
              <p className="text-sm text-slate-600">
                Read how EduConnects learners achieved their target grades and examination scores.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {testimonials.map((t, idx) => (
                <GlassCard
                  key={idx}
                  className="p-7 rounded-3xl border border-slate-200 bg-white shadow-md hover:shadow-xl transition-all duration-300 flex flex-col justify-between"
                >
                  <div className="space-y-4">
                    {/* Star Rating */}
                    <div className="flex items-center gap-1 text-amber-500">
                      {[...Array(t.rating)].map((_, i) => (
                        <Star key={i} className="w-4 h-4 fill-amber-400 stroke-amber-400" />
                      ))}
                    </div>

                    <p className="text-xs sm:text-sm text-slate-700 italic leading-relaxed">
                      &ldquo;{t.quote}&rdquo;
                    </p>

                    <div className="px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold w-fit">
                      🎯 {t.achievement}
                    </div>
                  </div>

                  <div className="pt-6 border-t border-slate-100 flex items-center gap-3 mt-4">
                    <img
                      src={t.avatar}
                      alt={t.name}
                      className="w-11 h-11 rounded-full object-cover ring-2 ring-blue-500/20"
                    />
                    <div>
                      <div className="text-xs font-extrabold text-slate-900">{t.name}</div>
                      <div className="text-[10px] text-slate-500">{t.role}</div>
                      <div className="text-[10px] text-blue-600 font-semibold">{t.subject}</div>
                    </div>
                  </div>
                </GlassCard>
              ))}
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 8. COMPARISON & TRUST SECTION */}
        {/* ========================================================================= */}
        <section className="py-20 lg:py-28 bg-white border-t border-slate-200">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
            <div className="text-center max-w-3xl mx-auto space-y-3">
              <GlassBadge variant="learner">THE MODERN WAY TO LEARN</GlassBadge>
              <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
                Why Learners Choose EduConnects?
              </h2>
              <p className="text-sm sm:text-base text-slate-600 leading-relaxed max-w-2xl mx-auto">
                Compare the flexibility, verified mentor quality, and learner-first economics of EduConnects against rigid offline coaching centers.
              </p>
            </div>

            {/* Comparison Table */}
            <div className="overflow-x-auto rounded-3xl border border-slate-200 shadow-xl bg-white">
              <div className="min-w-[720px]">
                <div className="grid grid-cols-12 bg-slate-100/90 border-b border-slate-200 text-xs font-black uppercase tracking-wider text-slate-700 py-5 px-6 sm:px-10">
                  <div className="col-span-4">Category</div>
                  <div className="col-span-4 text-slate-700 font-medium">Traditional Coaching</div>
                  <div className="col-span-4 text-[#3157D5] font-extrabold flex items-center gap-1">
                    <span>EduConnects</span>
                  </div>
                </div>

                <div className="divide-y divide-slate-100">
                  {comparisonPoints.map((item, idx) => (
                    <div
                      key={idx}
                      className={`grid grid-cols-12 py-6 px-6 sm:px-10 items-center text-xs sm:text-sm ${
                        idx % 2 === 0 ? "bg-white" : "bg-slate-50/40"
                      }`}
                    >
                      <div className="col-span-4 font-bold text-slate-900 pr-4">
                        {item.feature}
                      </div>
                      <div className="col-span-4 text-slate-700 font-medium pr-4 flex items-start gap-2.5">
                        <X className="h-4 w-4 text-rose-500 shrink-0 mt-0.5" />
                        <span className="text-xs sm:text-sm leading-relaxed text-slate-700 font-medium">{item.traditional}</span>
                      </div>
                      <div className="col-span-4 font-semibold text-slate-900 flex items-start gap-2.5 bg-blue-50/50 -my-6 py-6 px-5 rounded-xl border-l border-blue-200/60">
                        <Check className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5 stroke-[3]" />
                        <span className="text-xs sm:text-sm leading-relaxed text-blue-950 font-bold">
                          {item.educonnects}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 9. LEARNER FAQ ACCORDION */}
        {/* ========================================================================= */}
        <section id="faq" className="py-24 lg:py-32 bg-slate-50 border-t border-slate-200">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
            <div className="text-center space-y-3">
              <GlassBadge variant="learner">LEARNER FAQ</GlassBadge>
              <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
                Have Questions? Frequently Asked Questions for Learners
              </h2>
              <p className="text-sm sm:text-base text-slate-600 max-w-2xl mx-auto">
                Got questions about how learning on EduConnects works? We have answers.
              </p>
            </div>

            <div className="space-y-4">
              {faqs.map((faq, idx) => {
                const isOpen = openFaqIndex === idx;
                return (
                  <div
                    key={idx}
                    className="border border-slate-200 rounded-2xl overflow-hidden bg-slate-50/50 transition-colors"
                  >
                    <button
                      onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                      className="w-full p-5 text-left flex items-center justify-between gap-4 font-bold text-sm sm:text-base text-slate-900 hover:text-blue-600 transition-colors"
                    >
                      <span>{faq.question}</span>
                      <ChevronDown
                        className={`w-5 h-5 text-slate-500 shrink-0 transition-transform duration-300 ${
                          isOpen ? "rotate-180 text-blue-600" : ""
                        }`}
                      />
                    </button>
                    {isOpen && (
                      <div className="p-5 pt-0 text-xs sm:text-sm text-slate-600 leading-relaxed border-t border-slate-100 bg-white">
                        {faq.answer}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 7. FINAL CALL TO ACTION */}
        {/* ========================================================================= */}
        <section className="py-24 lg:py-32 bg-gradient-to-r from-blue-700 via-blue-800 to-indigo-900 text-white relative overflow-hidden">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
              <div className="lg:col-span-7 text-center lg:text-left space-y-6">
                <span className="px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur-md text-blue-200 text-xs font-bold uppercase tracking-wider border border-white/20 inline-block">
                  Start Today with Zero Risk
                </span>

                <h2 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight">
                  Start Your Learning Journey
                </h2>

                <p className="text-sm sm:text-base text-blue-100 max-w-xl mx-auto lg:mx-0 font-medium leading-relaxed">
                  Join 15,000+ learners mastering difficult subjects, passing competitive entrance exams, and building practical skills with verified educators.
                </p>

                <div className="pt-2 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
                  <Link href="/courses" className="w-full sm:w-auto">
                    <GlassButton
                      variant="secondary"
                      size="lg"
                      className="w-full sm:w-auto bg-white text-slate-900 hover:bg-slate-100 font-black shadow-xl"
                      rightIcon={<ArrowRight className="h-4 w-4" />}
                    >
                      Explore Courses
                    </GlassButton>
                  </Link>

                  <Link href="/find-teachers" className="w-full sm:w-auto">
                    <GlassButton
                      variant="ghost"
                      size="lg"
                      className="w-full sm:w-auto text-white border border-white/30 hover:bg-white/10"
                    >
                      Explore Verified Educators
                    </GlassButton>
                  </Link>
                </div>

                <div className="pt-4 flex flex-wrap items-center justify-center lg:justify-start gap-4 sm:gap-6 text-xs text-blue-200">
                  <span>✓ Verified Educators</span>
                  <span>•</span>
                  <span>✓ Instant demo sessions</span>
                  <span>•</span>
                  <span>✓ Interactive classrooms</span>
                </div>
              </div>

              <div className="lg:col-span-5 flex justify-center">
                <div className="relative rounded-3xl overflow-hidden shadow-2xl border-4 border-white/20 max-w-md w-full bg-white/10 p-2 sm:p-3 flex items-center justify-center">
                  <img
                    src="/images/learner-hero.jpeg"
                    alt="Learner thriving on EduConnects"
                    className="w-full h-auto max-h-[380px] object-contain rounded-2xl"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <PremiumFooter />

      {/* Auth Modal Trigger */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        initialRole="STUDENT"
      />
    </div>
  );
}

