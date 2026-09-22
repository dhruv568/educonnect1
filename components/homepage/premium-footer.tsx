"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Users,
  BookOpen,
  Compass,
  Sparkles,
  GraduationCap,
  Layers,
  Info,
  Mail,
  Award,
  FileText,
  ShieldCheck,
  RefreshCw,
  Truck,
  CreditCard,
  Youtube,
  Facebook,
  Instagram,
  Linkedin,
} from "lucide-react";
import { OFFICIAL_COMPANY_INFO } from "@/lib/company";
import { Logo } from "@/components/brand/logo";

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M17.472 14.382c-.301-.15-1.78-.878-2.056-.978-.276-.101-.477-.15-.678.15-.2.301-.777.978-.952 1.178-.175.201-.35.226-.651.076-.301-.15-1.272-.469-2.424-1.496-.896-.799-1.501-1.786-1.677-2.087-.175-.301-.019-.464.132-.614.135-.135.301-.35.451-.526.15-.175.201-.301.301-.501.101-.201.05-.376-.025-.526-.075-.15-.678-1.634-.928-2.238-.244-.588-.492-.508-.678-.517-.175-.01-.376-.01-.577-.01-.201 0-.526.075-.802.376-.276.301-1.053 1.028-1.053 2.507 0 1.479 1.078 2.908 1.229 3.109.15.201 2.12 3.238 5.137 4.542.718.31 1.279.496 1.716.635.721.23 1.377.198 1.896.12.578-.088 1.78-.727 2.03-1.43.25-.702.25-1.303.175-1.43-.075-.126-.276-.201-.577-.351z" />
      <path d="M12.004 2C6.48 2 2 6.48 2 12.004c0 1.954.56 3.784 1.528 5.334L2.25 21.75l4.546-1.246a9.96 9.96 0 0 0 5.208 1.496c5.524 0 10.004-4.48 10.004-10.004C22.008 6.48 17.528 2 12.004 2zm0 18.275a8.23 8.23 0 0 1-4.22-1.164l-.303-.18-3.136.86.842-3.056-.197-.314a8.243 8.243 0 1 1 15.258-4.425 8.28 8.28 0 0 1-8.244 8.279z" />
    </svg>
  );
}

const normalizeSocialUrl = (url?: string, platform?: string) => {
  if (!url || typeof url !== "string" || !url.trim()) return "";
  const trimmed = url.trim();
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed;
  if (platform === "whatsapp") {
    const cleanDigits = trimmed.replace(/[^0-9]/g, "");
    if (cleanDigits) return `https://wa.me/${cleanDigits}`;
    return `https://${trimmed}`;
  }
  if (platform === "youtube") return `https://youtube.com/@${trimmed.replace(/^@/, "")}`;
  if (platform === "facebook") return `https://facebook.com/${trimmed}`;
  if (platform === "instagram") return `https://instagram.com/${trimmed.replace(/^@/, "")}`;
  if (platform === "linkedin") return `https://linkedin.com/in/${trimmed}`;
  return `https://${trimmed}`;
};

export interface PremiumFooterProps {
  showCta?: boolean;
  variant?: "default" | "student" | "teacher";
}

export function PremiumFooter({ showCta = false, variant }: PremiumFooterProps = {}) {
  const pathname = usePathname();
  const [socials, setSocials] = useState(OFFICIAL_COMPANY_INFO.socials);

  const isEducator =
    variant === "teacher" ||
    (variant !== "default" &&
      variant !== "student" &&
      (pathname === "/teacher" ||
        pathname?.startsWith("/teacher/") ||
        pathname === "/register/teacher" ||
        (typeof window !== "undefined" &&
          (window.location.hostname.startsWith("educators.") ||
            window.location.hostname.startsWith("educator.") ||
            window.location.hostname.startsWith("teachers.") ||
            window.location.hostname.startsWith("teacher.")))));

  const isLearner =
    !isEducator &&
    (pathname === "/student" ||
      pathname?.startsWith("/student/") ||
      pathname === "/exam" ||
      pathname?.startsWith("/exam/") ||
      (typeof window !== "undefined" &&
        (window.location.hostname.startsWith("learners.") ||
          window.location.hostname.startsWith("learner.") ||
          window.location.hostname.startsWith("students.") ||
          window.location.hostname.startsWith("student."))));

  useEffect(() => {
    let isMounted = true;
    fetch("/api/company")
      .then((res) => res.json())
      .then((json) => {
        if (isMounted && json?.data?.company?.socials) {
          setSocials(json.data.company.socials);
        }
      })
      .catch(() => {
        // Fallback to initial state
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const socialLinks = [
    {
      name: "YouTube",
      url: normalizeSocialUrl(socials.youtube, "youtube"),
      icon: Youtube,
      hoverClass: "hover:text-red-400 hover:border-red-400/40",
    },
    {
      name: "Facebook",
      url: normalizeSocialUrl(socials.facebook, "facebook"),
      icon: Facebook,
      hoverClass: "hover:text-blue-400 hover:border-blue-400/40",
    },
    {
      name: "Instagram",
      url: normalizeSocialUrl(socials.instagram, "instagram"),
      icon: Instagram,
      hoverClass: "hover:text-pink-400 hover:border-pink-400/40",
    },
    {
      name: "WhatsApp",
      url: normalizeSocialUrl(socials.whatsapp, "whatsapp"),
      icon: WhatsAppIcon,
      hoverClass: "hover:text-emerald-400 hover:border-emerald-400/40",
    },
    {
      name: "LinkedIn",
      url: normalizeSocialUrl(socials.linkedin, "linkedin"),
      icon: Linkedin,
      hoverClass: "hover:text-sky-400 hover:border-sky-400/40",
    },
  ].filter((item) => item.url && item.url.trim() !== "");

  return (
    <footer
      className="bg-[#0D5C41] border-t border-[#16805B]/40 text-white pt-16 pb-12 relative overflow-hidden font-sans"
    >
      {/* Background Subtle Accent Glow */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-32 bg-[#16805B]/25 blur-3xl rounded-full pointer-events-none"
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 space-y-12">
        {/* Main Grid: Brand + 3 Organized Columns */}
        <div
          className="grid grid-cols-1 md:grid-cols-12 gap-8 sm:gap-10 pb-12 border-b border-[#16805B]/40"
        >
          {/* Brand & Legal Info (md:col-span-4) */}
          <div className="space-y-4 md:col-span-4">
            <Logo
              variant="compact"
              size="lg"
              roleContext={isEducator ? "teacher" : isLearner ? "student" : "default"}
              theme="dark"
              href={isEducator ? "/teacher" : isLearner ? "/student" : "/"}
              showTagline
              tagline="Learn • Grow • Belong"
            />
            <p
              className={`text-xs sm:text-[13px] ${
                isEducator
                  ? "text-emerald-100"
                  : isLearner
                  ? "text-blue-100"
                  : "text-teal-100"
              } leading-relaxed font-normal`}
            >
              {isEducator
                ? "EduConnects empowers educators across India to teach, earn, and mentor the next generation with verified credentials, modern virtual tools, and dedicated student reach."
                : "EduConnects is India's premier educational platform connecting learners with verified educators for personalized 1-on-1 sessions, interactive group workshops, and accredited courses."}
            </p>

            {/* Official Legal Details Card */}
            <div
              className={`p-4 rounded-2xl ${
                isEducator
                  ? "bg-[#08422F] border border-[#16805B]/60"
                  : isLearner
                  ? "bg-[#1A2C76] border border-[#3157D5]/50"
                  : "bg-[#052C2A]/90 border border-[#1B6863]"
              } text-xs space-y-1.5 shadow-sm`}
            >
              <div className="space-y-0.5">
                <p
                  className={`text-[11px] font-medium tracking-wide ${
                    isEducator
                      ? "text-emerald-300/85"
                      : isLearner
                      ? "text-blue-300/85"
                      : "text-teal-300/85"
                  }`}
                >
                  Parent Company
                </p>
                <p className="font-bold text-white text-xs sm:text-sm">
                  Shrivastava ProFunnels Ventures Pvt Ltd
                </p>
              </div>
              <p
                className={`font-mono ${
                  isEducator
                    ? "text-emerald-200"
                    : isLearner
                    ? "text-blue-200"
                    : "text-teal-200"
                } text-xs font-semibold`}
              >
                CIN: U85499UP2024PTC212061
              </p>
              <p
                className={`${
                  isEducator
                    ? "text-emerald-100"
                    : isLearner
                    ? "text-blue-100"
                    : "text-teal-100"
                } text-xs leading-relaxed font-normal`}
              >
                Registered Office: Bard No. 8, Basundhara Colony, Chandmari, Lalitpur (UP), 284403
              </p>
            </div>

            {/* Social Media Links */}
            {socialLinks.length > 0 && (
              <div className="pt-2">
                <p
                  className={`text-[11px] uppercase tracking-wider font-extrabold ${
                    isEducator
                      ? "text-emerald-200"
                      : isLearner
                      ? "text-blue-200"
                      : "text-teal-200"
                  } mb-2.5`}
                >
                  Connect With Us
                </p>
                <div className="flex items-center gap-2.5">
                  {socialLinks.map((item) => {
                    const Icon = item.icon;
                    return (
                      <a
                        key={item.name}
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`EduConnects on ${item.name}`}
                        className={`h-9 w-9 rounded-xl ${
                          isEducator
                            ? "bg-[#16805B]/60 border border-[#35A979]/40 hover:bg-[#16805B]"
                            : isLearner
                            ? "bg-[#1E3185] border border-[#3157D5]/50 hover:bg-[#152366]"
                            : "bg-[#0F5C5A] border border-[#2A8C84]/50 hover:bg-[#052C2A]"
                        } flex items-center justify-center text-white transition-all duration-200 ${item.hoverClass} hover:border-white shadow-xs`}
                      >
                        <Icon className="h-4 w-4" />
                      </a>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Column 1: Explore (md:col-span-2) */}
          <div className="md:col-span-2">
            <h4
              className={`text-xs font-extrabold text-white uppercase tracking-wider mb-4 border-b ${
                isEducator
                  ? "border-[#16805B]/50"
                  : isLearner
                  ? "border-[#3157D5]/50"
                  : "border-[#2A8C84]/40"
              } pb-2.5`}
            >
              Explore
            </h4>
            <ul className="space-y-3.5 text-xs sm:text-[13px] font-medium">
              {isEducator ? (
                <>
                  <li>
                    <Link
                      href="/teacher#benefits"
                      className="text-emerald-100 hover:text-white hover:translate-x-0.5 transition-all flex items-center gap-2.5"
                    >
                      <Sparkles className="h-3.5 w-3.5 text-[#35A979] shrink-0" />
                      <span>Educator Benefits</span>
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/teacher#how-it-works"
                      className="text-emerald-100 hover:text-white hover:translate-x-0.5 transition-all flex items-center gap-2.5"
                    >
                      <Compass className="h-3.5 w-3.5 text-[#35A979] shrink-0" />
                      <span>How It Works?</span>
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/teacher#success-stories"
                      className="text-emerald-100 hover:text-white hover:translate-x-0.5 transition-all flex items-center gap-2.5"
                    >
                      <Award className="h-3.5 w-3.5 text-[#35A979] shrink-0" />
                      <span>Success Stories</span>
                    </Link>
                  </li>
                </>
              ) : (
                <>
                  <li>
                    <Link
                      href="/find-teachers"
                      className={`${
                        isLearner ? "text-blue-100 hover:text-white" : "text-teal-100 hover:text-white"
                      } hover:translate-x-0.5 transition-all flex items-center gap-2.5`}
                    >
                      <Users className={`h-3.5 w-3.5 ${isLearner ? "text-blue-300" : "text-[#2A8C84]"} shrink-0`} />
                      <span>Find an Educator</span>
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/courses"
                      className={`${
                        isLearner ? "text-blue-100 hover:text-white" : "text-teal-100 hover:text-white"
                      } hover:translate-x-0.5 transition-all flex items-center gap-2.5`}
                    >
                      <BookOpen className={`h-3.5 w-3.5 ${isLearner ? "text-blue-300" : "text-[#2A8C84]"} shrink-0`} />
                      <span>Explore Courses</span>
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/courses"
                      className={`${
                        isLearner ? "text-blue-100 hover:text-white" : "text-teal-100 hover:text-white"
                      } hover:translate-x-0.5 transition-all flex items-center gap-2.5`}
                    >
                      <Compass className={`h-3.5 w-3.5 ${isLearner ? "text-blue-300" : "text-[#2A8C84]"} shrink-0`} />
                      <span>Browse Subjects</span>
                    </Link>
                  </li>
                </>
              )}
            </ul>
          </div>

          {/* Column 2: For Educators / Learning Resources / Portals */}
          <div className="md:col-span-3">
            <h4
              className={`text-xs font-extrabold text-white uppercase tracking-wider mb-4 border-b ${
                isEducator
                  ? "border-[#16805B]/50"
                  : isLearner
                  ? "border-[#3157D5]/50"
                  : "border-[#2A8C84]/40"
              } pb-2.5`}
            >
              {isEducator
                ? "For Educators"
                : isLearner
                ? "Learning Resources"
                : "Portals & Programs"}
            </h4>
            <ul className="space-y-3.5 text-xs sm:text-[13px] font-medium">
              {isEducator ? (
                <>
                  <li>
                    <Link
                      href="/teacher/register"
                      className="text-emerald-100 hover:text-white hover:translate-x-0.5 transition-all flex items-center gap-2.5"
                    >
                      <GraduationCap className="h-3.5 w-3.5 text-[#35A979] shrink-0" />
                      <span>Become an Educator</span>
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/teacher/login"
                      className="text-emerald-100 hover:text-white hover:translate-x-0.5 transition-all flex items-center gap-2.5"
                    >
                      <Users className="h-3.5 w-3.5 text-[#35A979] shrink-0" />
                      <span>Educator Login</span>
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/teacher/register"
                      className="text-emerald-100 hover:text-white hover:translate-x-0.5 transition-all flex items-center gap-2.5"
                    >
                      <CreditCard className="h-3.5 w-3.5 text-[#35A979] shrink-0" />
                      <span>Educator Registration</span>
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/teacher/training"
                      className="text-emerald-100 hover:text-white hover:translate-x-0.5 transition-all flex items-center gap-2.5"
                    >
                      <Award className="h-3.5 w-3.5 text-[#35A979] shrink-0" />
                      <span>15-Day Training Program</span>
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/teacher"
                      className="text-emerald-100 hover:text-white hover:translate-x-0.5 transition-all flex items-center gap-2.5"
                    >
                      <Sparkles className="h-3.5 w-3.5 text-[#35A979] shrink-0" />
                      <span>Educator Portal</span>
                    </Link>
                  </li>
                </>
              ) : isLearner ? (
                <>
                  <li>
                    <Link href="/find-teachers" className="text-blue-100 hover:text-white hover:translate-x-0.5 transition-all flex items-center gap-2.5">
                      <Users className="h-3.5 w-3.5 text-blue-300 shrink-0" />
                      <span>Find Verified Educators</span>
                    </Link>
                  </li>
                  <li>
                    <Link href="/courses" className="text-blue-100 hover:text-white hover:translate-x-0.5 transition-all flex items-center gap-2.5">
                      <BookOpen className="h-3.5 w-3.5 text-blue-300 shrink-0" />
                      <span>Explore Courses</span>
                    </Link>
                  </li>
                  <li>
                    <Link href="/exam" className="text-blue-100 hover:text-white hover:translate-x-0.5 transition-all flex items-center gap-2.5">
                      <Award className="h-3.5 w-3.5 text-blue-300 shrink-0" />
                      <span>Take Test</span>
                    </Link>
                  </li>
                  <li>
                    <Link href="/how-it-works" className="text-blue-100 hover:text-white hover:translate-x-0.5 transition-all flex items-center gap-2.5">
                      <Compass className="h-3.5 w-3.5 text-blue-300 shrink-0" />
                      <span>How Learning Works</span>
                    </Link>
                  </li>
                </>
              ) : (
                <>
                  <li>
                    <a
                      href="https://learners.educonnects.co.in"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-teal-100 hover:text-white hover:translate-x-0.5 transition-all flex items-center gap-2.5"
                    >
                      <GraduationCap className="h-3.5 w-3.5 text-[#2A8C84] shrink-0" />
                      <span>Learner Portal</span>
                    </a>
                  </li>
                  <li>
                    <a
                      href="https://educators.educonnects.co.in"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-teal-100 hover:text-white hover:translate-x-0.5 transition-all flex items-center gap-2.5"
                    >
                      <Sparkles className="h-3.5 w-3.5 text-[#2A8C84] shrink-0" />
                      <span>Educator Portal</span>
                    </a>
                  </li>
                  <li>
                    <Link href="/how-it-works" className="text-teal-100 hover:text-white hover:translate-x-0.5 transition-all flex items-center gap-2.5">
                      <Compass className="h-3.5 w-3.5 text-[#2A8C84] shrink-0" />
                      <span>How It Works</span>
                    </Link>
                  </li>
                </>
              )}
            </ul>
          </div>

          {/* Column 3: Company & Policies (md:col-span-3) */}
          <div className="md:col-span-3 space-y-6">
            <div>
              <h4
                className={`text-xs font-extrabold text-white uppercase tracking-wider mb-4 border-b ${
                  isEducator
                    ? "border-[#16805B]/50"
                    : isLearner
                    ? "border-[#3157D5]/50"
                    : "border-[#2A8C84]/40"
                } pb-2.5`}
              >
                Company
              </h4>
              <ul className="space-y-3 text-xs sm:text-[13px] font-medium">
                <li>
                  <Link
                    href="/about"
                    className={`${
                      isEducator
                        ? "text-emerald-100 hover:text-white"
                        : isLearner
                        ? "text-blue-100 hover:text-white"
                        : "text-teal-100 hover:text-white"
                    } hover:translate-x-0.5 transition-all flex items-center gap-2.5`}
                  >
                    <Info
                      className={`h-3.5 w-3.5 ${
                        isEducator
                          ? "text-[#35A979]"
                          : isLearner
                          ? "text-blue-300"
                          : "text-[#2A8C84]"
                      } shrink-0`}
                    />
                    <span>About Us</span>
                  </Link>
                </li>
                <li>
                  <Link
                    href="/contact"
                    className={`${
                      isEducator
                        ? "text-emerald-100 hover:text-white"
                        : isLearner
                        ? "text-blue-100 hover:text-white"
                        : "text-teal-100 hover:text-white"
                    } hover:translate-x-0.5 transition-all flex items-center gap-2.5`}
                  >
                    <Mail
                      className={`h-3.5 w-3.5 ${
                        isEducator
                          ? "text-[#35A979]"
                          : isLearner
                          ? "text-blue-300"
                          : "text-[#2A8C84]"
                      } shrink-0`}
                    />
                    <span>Contact Us</span>
                  </Link>
                </li>
                <li>
                  <Link
                    href={isEducator ? "/teacher#success-stories" : "/#success-stories"}
                    className={`${
                      isEducator
                        ? "text-emerald-100 hover:text-white"
                        : isLearner
                        ? "text-blue-100 hover:text-white"
                        : "text-teal-100 hover:text-white"
                    } hover:translate-x-0.5 transition-all flex items-center gap-2.5`}
                  >
                    <Award
                      className={`h-3.5 w-3.5 ${
                        isEducator
                          ? "text-[#35A979]"
                          : isLearner
                          ? "text-blue-300"
                          : "text-[#2A8C84]"
                      } shrink-0`}
                    />
                    <span>Success Stories</span>
                  </Link>
                </li>
                <li>
                  <Link
                    href="/terms-and-conditions"
                    className={`${
                      isEducator
                        ? "text-emerald-100 hover:text-white"
                        : isLearner
                        ? "text-blue-100 hover:text-white"
                        : "text-teal-100 hover:text-white"
                    } hover:translate-x-0.5 transition-all flex items-center gap-2.5`}
                  >
                    <FileText
                      className={`h-3.5 w-3.5 ${
                        isEducator
                          ? "text-[#35A979]"
                          : isLearner
                          ? "text-blue-300"
                          : "text-[#2A8C84]"
                      } shrink-0`}
                    />
                    <span>Terms & Conditions</span>
                  </Link>
                </li>
                <li>
                  <Link
                    href="/privacy-policy"
                    className={`${
                      isEducator
                        ? "text-emerald-100 hover:text-white"
                        : isLearner
                        ? "text-blue-100 hover:text-white"
                        : "text-teal-100 hover:text-white"
                    } hover:translate-x-0.5 transition-all flex items-center gap-2.5`}
                  >
                    <ShieldCheck
                      className={`h-3.5 w-3.5 ${
                        isEducator
                          ? "text-[#35A979]"
                          : isLearner
                          ? "text-blue-300"
                          : "text-[#2A8C84]"
                      } shrink-0`}
                    />
                    <span>Privacy Policy</span>
                  </Link>
                </li>
                <li>
                  <Link
                    href="/refund-policy"
                    className={`${
                      isEducator
                        ? "text-emerald-100 hover:text-white"
                        : isLearner
                        ? "text-blue-100 hover:text-white"
                        : "text-teal-100 hover:text-white"
                    } hover:translate-x-0.5 transition-all flex items-center gap-2.5`}
                  >
                    <RefreshCw
                      className={`h-3.5 w-3.5 ${
                        isEducator
                          ? "text-[#35A979]"
                          : isLearner
                          ? "text-blue-300"
                          : "text-[#2A8C84]"
                      } shrink-0`}
                    />
                    <span>Cancellation & Refund</span>
                  </Link>
                </li>
                <li>
                  <Link
                    href="/shipping-policy"
                    className={`${
                      isEducator
                        ? "text-emerald-100 hover:text-white"
                        : isLearner
                        ? "text-blue-100 hover:text-white"
                        : "text-teal-100 hover:text-white"
                    } hover:translate-x-0.5 transition-all flex items-center gap-2.5`}
                  >
                    <Truck
                      className={`h-3.5 w-3.5 ${
                        isEducator
                          ? "text-[#35A979]"
                          : isLearner
                          ? "text-blue-300"
                          : "text-[#2A8C84]"
                      } shrink-0`}
                    />
                    <span>Shipping Policy</span>
                  </Link>
                </li>
              </ul>
            </div>

            {/* Cashfree Payment Gateway Card */}
            <div
              className={`p-4 ${
                isEducator
                  ? "bg-[#08422F] border border-[#16805B]/60"
                  : isLearner
                  ? "bg-[#1A2C76] border border-[#3157D5]/50"
                  : "bg-[#052C2A]/90 border border-[#1B6863]"
              } rounded-2xl text-xs space-y-2.5 shadow-sm`}
            >
              <div className="flex items-center gap-2 font-bold text-white text-xs">
                <CreditCard
                  className={`h-4 w-4 ${
                    isEducator
                      ? "text-[#35A979]"
                      : isLearner
                      ? "text-blue-300"
                      : "text-[#2A8C84]"
                  } shrink-0`}
                />
                <span>Cashfree Payment Gateway</span>
              </div>
              <p
                className={`text-[12px] ${
                  isEducator
                    ? "text-emerald-100"
                    : isLearner
                    ? "text-blue-100"
                    : "text-teal-100"
                } leading-relaxed font-normal`}
              >
                Secure online payments.
              </p>

              {/* Payment Methods */}
              <div className="pt-2.5 border-t border-white/10 space-y-1.5">
                <span
                  className={`block text-[10px] font-bold uppercase tracking-wider ${
                    isEducator
                      ? "text-emerald-200/70"
                      : isLearner
                      ? "text-blue-200/70"
                      : "text-teal-200/70"
                  }`}
                >
                  Payment Methods
                </span>
                <div
                  className="flex items-center gap-1.5 flex-wrap"
                  aria-label="Accepted Payment Methods: UPI, Visa, Mastercard, RuPay"
                >
                  {/* UPI */}
                  <div
                    className="h-6 px-1.5 bg-white rounded flex items-center justify-center shadow-2xs border border-white/20 shrink-0"
                    title="UPI"
                  >
                    <svg
                      viewBox="0 0 54 18"
                      className="h-3.5 w-auto"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      aria-label="UPI"
                    >
                      <path d="M6.5 15.5L12 2.5H8L2.5 15.5H6.5Z" fill="#F47B20" />
                      <path d="M11 15.5L16.5 2.5H12.5L7 15.5H11Z" fill="#097F52" />
                      <text
                        x="18"
                        y="13.5"
                        fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
                        fontWeight="900"
                        fontStyle="italic"
                        fontSize="12.5"
                        fill="#1A2746"
                        letterSpacing="0.5"
                      >
                        UPI
                      </text>
                    </svg>
                  </div>

                  {/* Visa */}
                  <div
                    className="h-6 px-1.5 bg-white rounded flex items-center justify-center shadow-2xs border border-white/20 shrink-0"
                    title="Visa"
                  >
                    <svg
                      viewBox="0 0 50 16"
                      className="h-3 w-auto"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      aria-label="Visa"
                    >
                      <path
                        d="M19.1 1.2L12.5 14.8H8.2L5 3.8C4.8 3.1 4.6 2.8 4 2.5C3.1 2 1.4 1.5 0 1.2L0.1 0.8H6.9C7.8 0.8 8.5 1.4 8.7 2.3L10.4 10.6L14.7 0.8H19.1ZM35.7 10.1C35.8 6.3 30.1 6.1 30.2 4.4C30.2 3.8 30.7 3.2 31.9 3.1C32.5 3 34.1 3 35.8 3.7L36.5 0.8C35.5 0.4 34.2 0 32.7 0C28.7 0 25.9 2 25.9 4.9C25.9 7 27.9 8.2 29.4 8.9C31 9.6 31.5 10.1 31.5 10.8C31.5 11.8 30.2 12.3 29.1 12.3C27 12.3 25.8 11.7 24.8 11.3L24.1 14.3C25.2 14.8 27.2 15.2 29.2 15.2C33.5 15.2 36.3 13.2 35.7 10.1ZM46.3 14.8H50L46.8 0.8H43.4C42.6 0.8 42 1.3 41.7 2L35.6 14.8H39.9L40.7 12.5H45.9L46.3 14.8ZM41.9 9.6L44 3.8L45.2 9.6H41.9ZM25 0.8L21.6 14.8H17.5L20.9 0.8H25Z"
                        fill="#1434CB"
                      />
                    </svg>
                  </div>

                  {/* Mastercard */}
                  <div
                    className="h-6 px-1.5 bg-white rounded flex items-center justify-center shadow-2xs border border-white/20 shrink-0"
                    title="Mastercard"
                  >
                    <svg
                      viewBox="0 0 36 22"
                      className="h-3.5 w-auto"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      aria-label="Mastercard"
                    >
                      <circle cx="12" cy="11" r="9" fill="#EB001B" />
                      <circle cx="24" cy="11" r="9" fill="#F79E1B" />
                      <path
                        d="M18 4.35A8.96 8.96 0 0 1 21.46 11 8.96 8.96 0 0 1 18 17.65 8.96 8.96 0 0 1 14.54 11 8.96 8.96 0 0 1 18 4.35Z"
                        fill="#FF5F00"
                      />
                    </svg>
                  </div>

                  {/* RuPay */}
                  <div
                    className="h-6 px-1.5 bg-white rounded flex items-center justify-center shadow-2xs border border-white/20 shrink-0"
                    title="RuPay"
                  >
                    <svg
                      viewBox="0 0 52 16"
                      className="h-3 w-auto"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      aria-label="RuPay"
                    >
                      <text
                        x="0"
                        y="13"
                        fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
                        fontWeight="900"
                        fontStyle="italic"
                        fontSize="12.5"
                        fill="#00396B"
                      >
                        Ru
                      </text>
                      <text
                        x="17"
                        y="13"
                        fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
                        fontWeight="900"
                        fontStyle="italic"
                        fontSize="12.5"
                        fill="#F47B20"
                      >
                        Pay
                      </text>
                      <path d="M42 3L46 8L42 13H39L43 8L39 3H42Z" fill="#00A651" />
                      <path d="M46 3L50 8L46 13H43L47 8L43 3H46Z" fill="#F47B20" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Copyright & Powered by */}
        <div
          className={`flex flex-col sm:flex-row items-center justify-between gap-4 text-xs ${
            isEducator
              ? "text-emerald-200"
              : isLearner
              ? "text-blue-100"
              : "text-teal-100"
          } pt-4`}
        >
          <p className="text-center sm:text-left font-medium">
            &copy; 2026 EduConnects. All rights reserved.
          </p>
          <div className="flex items-center gap-1.5 font-medium">
            <span>Powered by</span>
            <a
              href="https://automation.myprofunnels.com/"
              target="_blank"
              rel="noopener noreferrer"
              className={`font-bold ${
                isEducator
                  ? "text-[#35A979]"
                  : isLearner
                  ? "text-blue-300"
                  : "text-[#2A8C84]"
              } hover:text-white hover:underline transition-colors inline-flex items-center gap-1`}
            >
              MyProFunnels
              <span className="text-red-500" role="img" aria-label="love">
                ❤️
              </span>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
