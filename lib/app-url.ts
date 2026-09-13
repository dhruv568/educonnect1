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
  const envUrl = process.env.NEXT_PUBLIC_MAIN_DOMAIN || process.env.NEXT_PUBLIC_APP_URL || "https://educonnects.co.in";
  return envUrl.trim().replace(/\/+$/, "");
}

/**
 * Resolves the Learner/Student subdomain URL (e.g. https://learners.educonnects.co.in).
 */
export function getStudentDomain(): string {
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
  const envUrl = process.env.NEXT_PUBLIC_EDUCATOR_DOMAIN || "https://educators.educonnects.co.in";
  return envUrl.trim().replace(/\/+$/, "");
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
