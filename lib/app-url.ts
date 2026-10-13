/**
 * Centralized Application URL Configuration & Helpers
 * 
 * Provides environment-aware, normalized URL resolution across frontend
 * and backend. Resolves production domain dynamically from NEXT_PUBLIC_APP_URL,
 * with fallbacks to APP_URL, NEXTAUTH_URL, and localhost.
 */

/**
 * Resolves the base public application URL.
 * Automatically strips any trailing slashes and trims whitespace.
 * 
 * Resolution Priority:
 * 1. NEXT_PUBLIC_APP_URL (standard for Next.js public client/server URL)
 * 2. APP_URL (legacy server-side env)
 * 3. NEXTAUTH_URL (legacy NextAuth env)
 * 4. Fallback: "http://localhost:3000"
 */
export function getPublicAppUrl(): string {
  const envUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    process.env.NEXTAUTH_URL ||
    "http://localhost:3000";

  const trimmed = (envUrl || "").trim();
  if (!trimmed) {
    return "http://localhost:3000";
  }

  // Remove any trailing slashes (e.g. "https://domain.com/" -> "https://domain.com")
  return trimmed.replace(/\/+$/, "");
}

/**
 * Alias for getPublicAppUrl()
 */
export function getAppUrl(): string {
  return getPublicAppUrl();
}

/**
 * Resolves the main website domain (e.g. https://educonnects.co.in).
 */
export function getMainDomain(): string {
  if (typeof window !== "undefined") {
    const host = window.location.hostname.toLowerCase();
    if (host === "localhost" || host === "127.0.0.1") {
      return window.location.origin;
    }
  }
  const envUrl = process.env.NEXT_PUBLIC_MAIN_DOMAIN || process.env.NEXT_PUBLIC_APP_URL || "https://educonnects.co.in";
  return envUrl.trim().replace(/\/+$/, "");
}

/**
 * Resolves the primary homepage URL (https://educonnects.co.in/).
 * Automatically guarantees a trailing slash.
 */
export function getHomeUrl(): string {
  const domain = getMainDomain();
  return domain.endsWith("/") ? domain : `${domain}/`;
}

/**
 * Resolves the Learner/Student subdomain URL (e.g. https://learners.educonnects.co.in).
 */
export function getStudentDomain(): string {
  if (typeof window !== "undefined") {
    const host = window.location.hostname.toLowerCase();
    if (host === "localhost" || host === "127.0.0.1") {
      return window.location.origin;
    }
  }
  const envUrl =
    process.env.NEXT_PUBLIC_LEARNER_DOMAIN ||
    process.env.NEXT_PUBLIC_STUDENT_DOMAIN ||
    "https://learners.educonnects.co.in";
  return envUrl.trim().replace(/\/+$/, "");
}

/**
 * Resolves the canonical Learner subdomain URL.
 */
export function getLearnerDomain(): string {
  return getStudentDomain();
}

/**
 * Resolves the Educator/Teacher subdomain URL (e.g. https://educators.educonnects.co.in).
 */
export function getEducatorDomain(): string {
  if (typeof window !== "undefined") {
    const host = window.location.hostname.toLowerCase();
    if (host === "localhost" || host === "127.0.0.1") {
      return window.location.origin;
    }
  }
  const envUrl = process.env.NEXT_PUBLIC_EDUCATOR_DOMAIN || "https://educators.educonnects.co.in";
  return envUrl.trim().replace(/\/+$/, "");
}

/**
 * Generates an environment and origin-aware URL for Learner routes.
 * If already on the Learner subdomain, returns a relative path to preserve origin.
 * If on the main domain or another subdomain, returns the canonical absolute URL on learners.educonnects.co.in.
 */
export function getLearnerSubdomainUrl(path: string): string {
  const norm = path.startsWith("/") ? path : `/${path}`;
  if (typeof window !== "undefined") {
    const host = window.location.hostname.toLowerCase();
    if (
      host.startsWith("learners.") ||
      host.startsWith("learner.") ||
      host.startsWith("students.") ||
      host.startsWith("student.") ||
      host === "localhost" ||
      host === "127.0.0.1"
    ) {
      return norm;
    }
  }
  return `${getStudentDomain()}${norm}`;
}

/**
 * Generates an environment and origin-aware URL for Educator routes.
 */
export function getEducatorSubdomainUrl(path: string): string {
  const norm = path.startsWith("/") ? path : `/${path}`;
  if (typeof window !== "undefined") {
    const host = window.location.hostname.toLowerCase();
    if (
      host.startsWith("educators.") ||
      host.startsWith("educator.") ||
      host.startsWith("teachers.") ||
      host.startsWith("teacher.") ||
      host === "localhost" ||
      host === "127.0.0.1"
    ) {
      return norm;
    }
  }
  return `${getEducatorDomain()}${norm}`;
}

/**
 * Resolves the Live Event subdomain URL (e.g. https://live.educonnects.co.in).
 */
export function getLiveDomain(): string {
  const envUrl =
    process.env.NEXT_PUBLIC_LIVE_DOMAIN ||
    process.env.NEXT_PUBLIC_LIVE_URL ||
    "https://live.educonnects.co.in";
  return envUrl.trim().replace(/\/+$/, "");
}

/**
 * Centralized Live Event URL constant/helper.
 */
export const LIVE_EVENT_URL = "https://live.educonnects.co.in";

/**
 * Generates the public staff registration URL.
 * Note: No tokens or unique URLs are generated for staff invitations; staff registers via email and OTP.
 */
export function getStaffRegisterUrl(): string {
  const baseUrl = getPublicAppUrl();
  return `${baseUrl}/staff/register`;
}

/**
 * Generates the email verification URL.
 */
export function getVerificationUrl(token: string, email: string): string {
  const baseUrl = getPublicAppUrl();
  return `${baseUrl}/verify-email?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`;
}

/**
 * Generates the password reset URL.
 */
export function getPasswordResetUrl(token: string, email: string): string {
  const baseUrl = getPublicAppUrl();
  return `${baseUrl}/reset-password?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`;
}

/**
 * Resolves the canonical permanent shareable live classroom URL for learners.
 * 
 * - Production: Always points to the real deployed domain (https://learners.educonnects.co.in/live-class/CLASS_ID).
 * - Local development: Points to local server (http://localhost:3000/live-class/CLASS_ID) ONLY when in dev.
 * - Guaranteed: Never emits localhost in production or when NEXT_PUBLIC_LEARNER_DOMAIN is configured.
 */
export function getLearnerClassroomUrl(classId: string): string {
  if (!classId) return "";

  const isDev = process.env.NODE_ENV !== "production";

  // Production learner domain
  const prodDomain = (
    process.env.NEXT_PUBLIC_LEARNER_DOMAIN ||
    process.env.NEXT_PUBLIC_STUDENT_DOMAIN ||
    "https://learners.educonnects.co.in"
  )
    .trim()
    .replace(/\/+$/, "");

  let base = prodDomain;

  // Local development override
  if (isDev) {
    if (typeof window !== "undefined") {
      const host = window.location.hostname.toLowerCase();
      if (host === "localhost" || host === "127.0.0.1") {
        base = window.location.origin;
      }
    } else {
      const appUrl = (
        process.env.NEXT_PUBLIC_APP_URL ||
        process.env.APP_URL ||
        "http://localhost:3000"
      )
        .trim()
        .replace(/\/+$/, "");
      if (appUrl) {
        base = appUrl;
      }
    }
  }

  // Double safety guard: Never allow localhost or 127.0.0.1 in production
  if (process.env.NODE_ENV === "production" && (base.includes("localhost") || base.includes("127.0.0.1"))) {
    base = "https://learners.educonnects.co.in";
  }

  return `${base}/live-class/${classId}`;
}

