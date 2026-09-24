import { AssistantRole } from "@/services/ai-service";
export type { AssistantRole };

/**
 * Check if the AI Assistant should be hidden on the specified pathname.
 * Must NOT interfere with:
 * - LiveKit classroom controls
 * - payment checkout
 * - critical authentication/OTP forms
 */
export function isAiAssistantExcluded(pathname: string): boolean {
  if (!pathname) return false;
  const clean = pathname.toLowerCase().trim();

  // Classroom, Live Class & LMS Video Player routes
  if (
    clean.startsWith("/classroom") ||
    clean.startsWith("/live") ||
    clean.startsWith("/learn")
  ) {
    return true;
  }

  // Payment checkout
  if (clean.includes("/checkout") || clean === "/payment/checkout" || clean.startsWith("/payment/checkout/")) {
    return true;
  }

  // Critical authentication & OTP forms
  const authRoutes = [
    "/login",
    "/register",
    "/student/login",
    "/student/register",
    "/teacher/login",
    "/teacher/register",
    "/admin/login",
    "/staff/login",
    "/staff/register",
    "/register/student",
    "/register/teacher",
    "/forgot-password",
    "/reset-password",
    "/verify-email",
    "/verify-otp",
  ];

  for (const route of authRoutes) {
    if (clean === route || clean.startsWith(`${route}/`)) {
      return true;
    }
  }

  return false;
}

/**
 * Determine default section theme based on current pathname and role
 */
export function getSectionTheme(pathname: string, role: AssistantRole): "home" | "learner" | "educator" | "admin" {
  const p = pathname.toLowerCase();
  if (p.startsWith("/admin") || role === "ADMIN") return "admin";
  if (p.startsWith("/teacher") || role === "EDUCATOR") return "educator";
  if (p.startsWith("/student") || role === "LEARNER") return "learner";
  return "home";
}

/**
 * Theme visual configurations conforming to EduConnects design system
 */
export interface ThemeConfig {
  name: string;
  headerBg: string;
  headerText: string;
  accentBg: string;
  accentHover: string;
  accentText: string;
  bubbleAiBg: string;
  bubbleAiBorder: string;
  bubbleUserBg: string;
  bubbleUserText: string;
  floatingButtonBg: string;
  badgeBg: string;
  borderColor: string;
  pillBg: string;
  pillBorder: string;
  pillText: string;
}

export const THEMES: Record<"home" | "learner" | "educator" | "admin", ThemeConfig> = {
  home: {
    name: "EduConnects Primary",
    headerBg: "bg-gradient-to-r from-[#0D5C41] to-[#16805B]",
    headerText: "text-white",
    accentBg: "bg-[#16805B]",
    accentHover: "hover:bg-[#0D5C41]",
    accentText: "text-white",
    bubbleAiBg: "bg-white text-slate-800",
    bubbleAiBorder: "border-[#A7F3D0]",
    bubbleUserBg: "bg-[#16805B]",
    bubbleUserText: "text-white",
    floatingButtonBg: "bg-[#16805B] hover:bg-[#0D5C41] text-white shadow-emerald-900/30",
    badgeBg: "bg-[#35A979] text-white",
    borderColor: "border-[#A7F3D0]",
    pillBg: "bg-[#F0FAF5] hover:bg-[#DCFCE7]",
    pillBorder: "border-[#A7F3D0]",
    pillText: "text-[#0D5C41]",
  },
  learner: {
    name: "EduConnects Learner",
    headerBg: "bg-gradient-to-r from-[#0D5C41] to-[#16805B]",
    headerText: "text-white",
    accentBg: "bg-[#16805B]",
    accentHover: "hover:bg-[#0D5C41]",
    accentText: "text-white",
    bubbleAiBg: "bg-white text-slate-800",
    bubbleAiBorder: "border-[#A7F3D0]",
    bubbleUserBg: "bg-[#16805B]",
    bubbleUserText: "text-white",
    floatingButtonBg: "bg-[#16805B] hover:bg-[#0D5C41] text-white shadow-emerald-900/30",
    badgeBg: "bg-[#35A979] text-white",
    borderColor: "border-[#A7F3D0]",
    pillBg: "bg-[#F0FAF5] hover:bg-[#DCFCE7]",
    pillBorder: "border-[#A7F3D0]",
    pillText: "text-[#0D5C41]",
  },
  educator: {
    name: "EduConnects Educator",
    headerBg: "bg-gradient-to-r from-[#0D5C41] to-[#16805B]",
    headerText: "text-white",
    accentBg: "bg-[#16805B]",
    accentHover: "hover:bg-[#0D5C41]",
    accentText: "text-white",
    bubbleAiBg: "bg-white text-slate-800",
    bubbleAiBorder: "border-[#A7F3D0]",
    bubbleUserBg: "bg-[#16805B]",
    bubbleUserText: "text-white",
    floatingButtonBg: "bg-[#16805B] hover:bg-[#0D5C41] text-white shadow-emerald-900/30",
    badgeBg: "bg-[#35A979] text-white",
    borderColor: "border-[#A7F3D0]",
    pillBg: "bg-[#F0FAF5] hover:bg-[#DCFCE7]",
    pillBorder: "border-[#A7F3D0]",
    pillText: "text-[#0D5C41]",
  },
  admin: {
    name: "EduConnects Admin",
    headerBg: "bg-gradient-to-r from-[#073F3C] to-[#0D5C41]",
    headerText: "text-white",
    accentBg: "bg-[#0D5C41]",
    accentHover: "hover:bg-[#073F3C]",
    accentText: "text-white",
    bubbleAiBg: "bg-white text-slate-800",
    bubbleAiBorder: "border-slate-200",
    bubbleUserBg: "bg-[#0D5C41]",
    bubbleUserText: "text-white",
    floatingButtonBg: "bg-[#0D5C41] hover:bg-[#073F3C] text-white shadow-slate-900/40",
    badgeBg: "bg-[#35A979] text-white",
    borderColor: "border-slate-200",
    pillBg: "bg-[#F0FAF5] hover:bg-slate-200",
    pillBorder: "border-slate-200",
    pillText: "text-[#0D5C41]",
  },
};

/**
 * Contextual Quick Questions by Role
 */
export const QUICK_QUESTIONS: Record<AssistantRole, string[]> = {
  LEARNER: [
    "Learner Portal",
    "Find an Educator",
    "Find a Course",
    "How do live classes work?",
    "How do I book a trial?",
    "How do I contact support?",
  ],
  EDUCATOR: [
    "Educator Portal",
    "How do I create a course?",
    "How do I become verified?",
    "How do I create a live class?",
    "How do payouts work?",
    "How do I contact support?",
  ],
  ADMIN: [
    "Explain Admin Dashboard",
    "Educator verification",
    "User management",
    "Live classes",
    "Platform overview",
  ],
  guest: [
    "Learner Portal",
    "Educator Portal",
    "Find an Educator",
    "Find Courses",
    "How does EduConnects work?",
    "Contact Support",
  ],
};
