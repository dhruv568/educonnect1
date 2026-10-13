/**
 * Centralized Redirect URL Validator & Sanitizer
 * Protects against Open-Redirect vulnerabilities while preserving valid internal
 * application destinations across login and OTP authentication flows.
 */

const ALLOWED_HOSTS = [
  "educonnects.co.in",
  "www.educonnects.co.in",
  "learners.educonnects.co.in",
  "learner.educonnects.co.in",
  "students.educonnects.co.in",
  "student.educonnects.co.in",
  "educators.educonnects.co.in",
  "educator.educonnects.co.in",
  "live.educonnects.co.in",
  "localhost",
  "127.0.0.1",
];

/**
 * Checks if a destination URL/path is safe to redirect to.
 */
export function isSafeRedirectPath(target: unknown): boolean {
  if (typeof target !== "string" || !target.trim()) {
    return false;
  }

  const trimmed = target.trim();

  // Reject CR/LF/control characters to prevent HTTP response splitting
  if (/[\r\n\0]/.test(trimmed)) {
    return false;
  }

  // Reject javascript:, data:, vbscript: URIs
  if (/^(?:javascript|data|vbscript):/i.test(trimmed)) {
    return false;
  }

  // Reject protocol-relative URLs (e.g. "//evil.com")
  if (trimmed.startsWith("//")) {
    return false;
  }

  // Reject backslash tricks (e.g. "/\\evil.com" or "\\evil.com")
  if (trimmed.startsWith("/\\") || trimmed.startsWith("\\")) {
    return false;
  }

  // Relative path validation (must start with single /)
  if (trimmed.startsWith("/")) {
    // Disallow "/example.com" or similar if preceded by another slash
    return !trimmed.startsWith("//");
  }

  // Absolute URL validation
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return false;
    }

    const host = parsed.hostname.toLowerCase();
    const isAllowedHost = ALLOWED_HOSTS.some(
      (allowed) => host === allowed || host.endsWith(`.${allowed}`)
    );

    return isAllowedHost;
  } catch {
    return false;
  }
}

/**
 * Sanitizes a redirect destination. Returns the safe relative or canonical path,
 * or the provided fallback.
 */
export function sanitizeRedirectUrl(target: unknown, fallback: string = "/student/dashboard"): string {
  if (!isSafeRedirectPath(target)) {
    return fallback;
  }

  const trimmed = (target as string).trim();

  // If relative path, return directly
  if (trimmed.startsWith("/")) {
    return trimmed;
  }

  // If absolute allowed URL, extract pathname + search + hash
  try {
    const parsed = new URL(trimmed);
    const host = parsed.hostname.toLowerCase();
    const isLocal = host === "localhost" || host === "127.0.0.1";

    // For localhost or domain routes, returning pathname + search is safe and preserves host
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return fallback;
  }
}
