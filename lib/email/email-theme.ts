/**
 * Role-Based Email Theme Configuration for EduConnects
 * 
 * 1. Main Website: Emerald Green (#16805B, #0D5C41, #35A979, #F0FAF5)
 *    Website: https://educonnects.co.in
 * 2. Learner Portal: Blue (#2563EB, #1E40AF, #60A5FA, #EFF6FF)
 *    Website: https://learners.educonnects.co.in
 * 3. Educator Portal: Teal (#0F766E, #115E59, #2DD4BF, #F0FDFA)
 *    Website: https://educators.educonnects.co.in
 */

export type EmailThemeType = "main" | "learner" | "educator";

export interface EmailThemePalette {
  name: EmailThemeType;
  portalLabel: string;
  portalSubtitle: string;
  domainUrl: string;
  displayDomain: string;

  // Primary brand shades
  primary: string;
  dark: string;
  light: string;
  softBg: string;

  // Header & Button Gradients
  headerGradient: string;
  ctaGradient: string;
  ctaShadow: string;

  // OTP Box Container
  otpBoxBg: string;
  otpBoxBorder: string;
  otpHeaderColor: string;
  otpCodeColor: string;
  badgeBg: string;
  badgeBorder: string;
  badgeText: string;

  // Security Note Callout
  noticeBg: string;
  noticeBorder: string;
  noticeAccentBar: string;
  noticeText: string;
  noticeLink: string;

  // Footer Accents
  footerBrandColor: string;
  footerSubtitleColor: string;
}

export const EMAIL_THEMES: Record<EmailThemeType, EmailThemePalette> = {
  main: {
    name: "main",
    portalLabel: "EduConnects",
    portalSubtitle: "Learn • Grow • Belong",
    domainUrl: "https://educonnects.co.in",
    displayDomain: "educonnects.co.in",

    primary: "#16805B",
    dark: "#0D5C41",
    light: "#35A979",
    softBg: "#F0FAF5",

    headerGradient: "linear-gradient(135deg, #0D5C41 0%, #16805B 50%, #35A979 100%)",
    ctaGradient: "linear-gradient(135deg, #16805B 0%, #0D5C41 100%)",
    ctaShadow: "rgba(22, 128, 91, 0.28)",

    otpBoxBg: "linear-gradient(135deg, #F0FAF5 0%, #E6F7F0 100%)",
    otpBoxBorder: "#A7F3D0",
    otpHeaderColor: "#0D5C41",
    otpCodeColor: "#0D5C41",
    badgeBg: "#FFFFFF",
    badgeBorder: "#A7F3D0",
    badgeText: "#16805B",

    noticeBg: "#F0FAF5",
    noticeBorder: "#BBF7D0",
    noticeAccentBar: "#16805B",
    noticeText: "#0D5C41",
    noticeLink: "#16805B",

    footerBrandColor: "#0D5C41",
    footerSubtitleColor: "#16805B",
  },

  learner: {
    name: "learner",
    portalLabel: "EduConnects Learner Portal",
    portalSubtitle: "Learn • Practice • Achieve",
    domainUrl: "https://learners.educonnects.co.in",
    displayDomain: "learners.educonnects.co.in",

    primary: "#2563EB",
    dark: "#1E40AF",
    light: "#60A5FA",
    softBg: "#EFF6FF",

    headerGradient: "linear-gradient(135deg, #1E40AF 0%, #2563EB 50%, #60A5FA 100%)",
    ctaGradient: "linear-gradient(135deg, #2563EB 0%, #1E40AF 100%)",
    ctaShadow: "rgba(37, 99, 235, 0.28)",

    otpBoxBg: "linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%)",
    otpBoxBorder: "#BFDBFE",
    otpHeaderColor: "#1E40AF",
    otpCodeColor: "#1E40AF",
    badgeBg: "#FFFFFF",
    badgeBorder: "#BFDBFE",
    badgeText: "#2563EB",

    noticeBg: "#EFF6FF",
    noticeBorder: "#BFDBFE",
    noticeAccentBar: "#2563EB",
    noticeText: "#1E40AF",
    noticeLink: "#2563EB",

    footerBrandColor: "#1E40AF",
    footerSubtitleColor: "#2563EB",
  },

  educator: {
    name: "educator",
    portalLabel: "EduConnects Educator Portal",
    portalSubtitle: "Teach • Inspire • Grow",
    domainUrl: "https://educators.educonnects.co.in",
    displayDomain: "educators.educonnects.co.in",

    primary: "#0F766E",
    dark: "#115E59",
    light: "#2DD4BF",
    softBg: "#F0FDFA",

    headerGradient: "linear-gradient(135deg, #115E59 0%, #0F766E 50%, #2DD4BF 100%)",
    ctaGradient: "linear-gradient(135deg, #0F766E 0%, #115E59 100%)",
    ctaShadow: "rgba(15, 118, 110, 0.28)",

    otpBoxBg: "linear-gradient(135deg, #F0FDFA 0%, #CCFBF1 100%)",
    otpBoxBorder: "#99F6E4",
    otpHeaderColor: "#115E59",
    otpCodeColor: "#115E59",
    badgeBg: "#FFFFFF",
    badgeBorder: "#99F6E4",
    badgeText: "#0F766E",

    noticeBg: "#F0FDFA",
    noticeBorder: "#99F6E4",
    noticeAccentBar: "#0F766E",
    noticeText: "#115E59",
    noticeLink: "#0F766E",

    footerBrandColor: "#115E59",
    footerSubtitleColor: "#0F766E",
  },
};

/**
 * Resolves the appropriate email theme palette based on explicit theme,
 * user role, originating host, or configured defaults.
 */
export function resolveEmailTheme(options?: {
  theme?: EmailThemeType;
  role?: string | null;
  host?: string | null;
  originUrl?: string | null;
}): EmailThemePalette {
  // 1. Explicit theme takes precedence if valid
  if (options?.theme && EMAIL_THEMES[options.theme]) {
    return EMAIL_THEMES[options.theme];
  }

  // 2. Role-based resolution
  const role = options?.role ? options.role.toUpperCase().trim() : null;
  if (role) {
    if (role === "TEACHER" || role === "EDUCATOR") {
      return EMAIL_THEMES.educator;
    }
    if (role === "STUDENT" || role === "LEARNER" || role === "PARENT") {
      return EMAIL_THEMES.learner;
    }
    if (role === "ADMIN" || role === "STAFF") {
      return EMAIL_THEMES.main;
    }
  }

  // 3. Host / Origin-based resolution
  const rawHost = (options?.host || options?.originUrl || "").toLowerCase().trim();
  if (rawHost) {
    if (
      rawHost.includes("educators.educonnects.co.in") ||
      rawHost.includes("educator.") ||
      rawHost.includes("teachers.") ||
      rawHost.includes("teacher.")
    ) {
      return EMAIL_THEMES.educator;
    }
    if (
      rawHost.includes("learners.educonnects.co.in") ||
      rawHost.includes("learner.") ||
      rawHost.includes("students.") ||
      rawHost.includes("student.")
    ) {
      return EMAIL_THEMES.learner;
    }
    if (rawHost.includes("educonnects.co.in")) {
      return EMAIL_THEMES.main;
    }
  }

  // 4. Default to Main Website Theme (Emerald Green)
  return EMAIL_THEMES.main;
}
