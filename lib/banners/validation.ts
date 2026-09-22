/**
 * Promotional Banner Validation & Sanitization Helpers
 * 
 * Enforces security guidelines:
 * - Disallows unsafe protocols (javascript:, data:, vbscript:, etc.)
 * - Validates relative internal routes (/courses, /teacher, etc.)
 * - Validates full external URLs (https://example.com)
 * - Sanitizes text inputs against malicious scripts/HTML
 */

export const ALLOWED_BANNER_TYPES = [
  "OFFER",
  "PROMOTION",
  "ANNOUNCEMENT",
  "COURSE_PROMOTION",
  "EVENT",
  "GENERAL",
] as const;

export type BannerType = (typeof ALLOWED_BANNER_TYPES)[number];

export const ALLOWED_PLACEMENTS = [
  "ALL",
  "MAIN",
  "LEARNERS",
  "EDUCATORS",
] as const;

export type BannerPlacement = (typeof ALLOWED_PLACEMENTS)[number];

export const ALLOWED_TARGETS = ["_self", "_blank"] as const;
export type LinkTarget = (typeof ALLOWED_TARGETS)[number];

const UNSAFE_PROTOCOLS = [
  "javascript:",
  "data:",
  "vbscript:",
  "file:",
  "about:",
];

/**
 * Validates a navigation/click URL for safety and validity.
 * Supports:
 * 1. Internal EduConnects routes: e.g. /courses, /teacher/training
 * 2. Full external URLs: e.g. https://example.com
 */
export function validateClickUrl(
  urlInput: string | null | undefined,
  fieldName = "URL"
): { isValid: boolean; error?: string; cleanUrl?: string } {
  if (!urlInput || !urlInput.trim()) {
    return { isValid: true, cleanUrl: undefined };
  }

  const trimmed = urlInput.trim();
  const lower = trimmed.toLowerCase();

  // Block unsafe protocols
  for (const protocol of UNSAFE_PROTOCOLS) {
    if (lower.startsWith(protocol)) {
      return {
        isValid: false,
        error: `${fieldName} contains an unsafe protocol (${protocol}). Only http://, https:// or internal routes starting with / are allowed.`,
      };
    }
  }

  // Reject protocol-relative URLs (//example.com)
  if (trimmed.startsWith("//")) {
    return {
      isValid: false,
      error: `${fieldName} cannot start with '//'. Use 'https://' or a relative path starting with a single '/'.`,
    };
  }

  // Internal route starting with /
  if (trimmed.startsWith("/")) {
    // Ensure no control characters or script injection in path
    if (/[<>"'`\\^]/.test(trimmed)) {
      return {
        isValid: false,
        error: `${fieldName} contains invalid characters.`,
      };
    }
    return { isValid: true, cleanUrl: trimmed };
  }

  // Full external URL (must be http:// or https://)
  if (lower.startsWith("http://") || lower.startsWith("https://")) {
    try {
      const parsed = new URL(trimmed);
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        return {
          isValid: false,
          error: `${fieldName} must use http or https protocol.`,
        };
      }
      return { isValid: true, cleanUrl: trimmed };
    } catch {
      return {
        isValid: false,
        error: `${fieldName} is not a valid URL format.`,
      };
    }
  }

  return {
    isValid: false,
    error: `${fieldName} must be a valid internal path (e.g., /courses) or full external URL (e.g., https://example.com).`,
  };
}

/** Alias for backward compatibility with existing tests and modules */
export const validateBannerUrl = validateClickUrl;

/**
 * Validates a banner image storage/source URL.
 * Requires a relative internal route (e.g., /api/banners/image/..., /images/...)
 * or a valid external http(s) URL.
 * Rejects data: URLs, javascript:, and other unsafe protocols.
 */
export function validateBannerImageUrl(
  urlInput: string | null | undefined,
  fieldName = "Banner Image URL"
): { isValid: boolean; error?: string; cleanUrl?: string } {
  if (!urlInput || !urlInput.trim()) {
    return { isValid: false, error: `${fieldName} is required.` };
  }

  const trimmed = urlInput.trim();
  const lower = trimmed.toLowerCase();

  // Block unsafe protocols including data:
  for (const protocol of UNSAFE_PROTOCOLS) {
    if (lower.startsWith(protocol)) {
      return {
        isValid: false,
        error: `${fieldName} contains an unsafe protocol (${protocol}). Only http://, https:// or internal routes starting with / are allowed.`,
      };
    }
  }

  // Reject protocol-relative URLs (//example.com)
  if (trimmed.startsWith("//")) {
    return {
      isValid: false,
      error: `${fieldName} cannot start with '//'. Use 'https://' or a relative path starting with a single '/'.`,
    };
  }

  // Internal storage route or static path starting with /
  if (trimmed.startsWith("/")) {
    if (/[<>"'`\\^]/.test(trimmed)) {
      return {
        isValid: false,
        error: `${fieldName} contains invalid characters.`,
      };
    }
    return { isValid: true, cleanUrl: trimmed };
  }

  // Full external URL (must be http:// or https://)
  if (lower.startsWith("http://") || lower.startsWith("https://")) {
    try {
      const parsed = new URL(trimmed);
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        return {
          isValid: false,
          error: `${fieldName} must use http or https protocol.`,
        };
      }
      return { isValid: true, cleanUrl: trimmed };
    } catch {
      return {
        isValid: false,
        error: `${fieldName} is not a valid URL format.`,
      };
    }
  }

  return {
    isValid: false,
    error: `${fieldName} must be a valid stored image path (e.g., /api/banners/image/...) or full image URL (e.g., https://example.com/image.jpg).`,
  };
}

/**
 * Strips HTML tags and excessive whitespace from text inputs.
 */
export function sanitizeText(text: string | null | undefined): string {
  if (!text) return "";
  return text
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
    .replace(/<[^>]*>?/gm, "") // remove any remaining HTML tags
    .trim();
}

export interface BannerInputData {
  title: string;
  subtitle?: string | null;
  description?: string | null;
  bannerType?: string;
  imageUrl: string;
  imageClickUrl?: string | null;
  imageClickTarget?: string;
  ctaText?: string | null;
  ctaUrl?: string | null;
  placement?: string;
  displayOrder?: number;
  startAt?: string | Date | null;
  endAt?: string | Date | null;
  isActive?: boolean;
}

export interface ValidatedBannerData {
  title: string;
  subtitle: string | null;
  description: string | null;
  bannerType: BannerType;
  imageUrl: string;
  imageClickUrl: string | null;
  imageClickTarget: LinkTarget;
  ctaText: string | null;
  ctaUrl: string | null;
  placement: BannerPlacement;
  displayOrder: number;
  startAt: Date | null;
  endAt: Date | null;
  isActive: boolean;
}

/**
 * Validates and sanitizes a complete banner payload.
 */
export function validateBannerPayload(
  payload: any
): { isValid: boolean; error?: string; data?: ValidatedBannerData } {
  if (!payload || typeof payload !== "object") {
    return { isValid: false, error: "Invalid request payload." };
  }

  // 1. Title
  const title = sanitizeText(payload.title);
  if (!title) {
    return { isValid: false, error: "Banner title is required." };
  }
  if (title.length > 150) {
    return { isValid: false, error: "Banner title cannot exceed 150 characters." };
  }

  // 2. Subtitle & Description
  const subtitle = sanitizeText(payload.subtitle) || null;
  if (subtitle && subtitle.length > 200) {
    return { isValid: false, error: "Subtitle cannot exceed 200 characters." };
  }

  const description = sanitizeText(payload.description) || null;
  if (description && description.length > 1000) {
    return { isValid: false, error: "Description cannot exceed 1000 characters." };
  }

  // 3. Banner Type
  const rawType = (payload.bannerType || "OFFER").toUpperCase();
  if (!ALLOWED_BANNER_TYPES.includes(rawType as BannerType)) {
    return {
      isValid: false,
      error: `Invalid banner type '${rawType}'. Allowed: ${ALLOWED_BANNER_TYPES.join(", ")}.`,
    };
  }
  const bannerType = rawType as BannerType;

  // 4. Image URL
  const rawImageUrl = typeof payload.imageUrl === "string" ? payload.imageUrl.trim() : "";
  if (!rawImageUrl) {
    return { isValid: false, error: "Banner image is required." };
  }
  const imageValidation = validateBannerImageUrl(rawImageUrl, "Banner Image URL");
  if (!imageValidation.isValid) {
    return { isValid: false, error: imageValidation.error };
  }
  const imageUrl = imageValidation.cleanUrl!;

  // 5. Image Click URL (Optional)
  let imageClickUrl: string | null = null;
  if (payload.imageClickUrl && typeof payload.imageClickUrl === "string" && payload.imageClickUrl.trim()) {
    const clickValidation = validateClickUrl(payload.imageClickUrl, "Image Click URL");
    if (!clickValidation.isValid) {
      return { isValid: false, error: clickValidation.error };
    }
    imageClickUrl = clickValidation.cleanUrl || null;
  }

  // 6. Image Click Target
  const rawTarget = (payload.imageClickTarget || "_self").toLowerCase();
  const imageClickTarget: LinkTarget = rawTarget === "_blank" ? "_blank" : "_self";

  // 7. CTA Text & CTA URL (Optional, independent from image click)
  let ctaText: string | null = sanitizeText(payload.ctaText) || null;
  let ctaUrl: string | null = null;

  if (payload.ctaUrl && typeof payload.ctaUrl === "string" && payload.ctaUrl.trim()) {
    const ctaValidation = validateClickUrl(payload.ctaUrl, "CTA URL");
    if (!ctaValidation.isValid) {
      return { isValid: false, error: ctaValidation.error };
    }
    ctaUrl = ctaValidation.cleanUrl || null;
  }

  if (ctaUrl && !ctaText) {
    ctaText = "Learn More";
  }

  // 8. Placement
  const rawPlacement = (payload.placement || "ALL").toUpperCase();
  if (!ALLOWED_PLACEMENTS.includes(rawPlacement as BannerPlacement)) {
    return {
      isValid: false,
      error: `Invalid placement '${rawPlacement}'. Allowed: ${ALLOWED_PLACEMENTS.join(", ")}.`,
    };
  }
  const placement = rawPlacement as BannerPlacement;

  // 9. Display Order
  const displayOrder =
    typeof payload.displayOrder === "number" && !isNaN(payload.displayOrder)
      ? Math.max(0, Math.floor(payload.displayOrder))
      : 0;

  // 10. Dates
  let startAt: Date | null = null;
  let endAt: Date | null = null;

  if (payload.startAt) {
    startAt = new Date(payload.startAt);
    if (isNaN(startAt.getTime())) {
      return { isValid: false, error: "Invalid start date format." };
    }
  }

  if (payload.endAt) {
    endAt = new Date(payload.endAt);
    if (isNaN(endAt.getTime())) {
      return { isValid: false, error: "Invalid end date format." };
    }
  }

  if (startAt && endAt && startAt > endAt) {
    return { isValid: false, error: "Start date/time cannot be after end date/time." };
  }

  // 11. Active
  const isActive = payload.isActive !== undefined ? Boolean(payload.isActive) : true;

  return {
    isValid: true,
    data: {
      title,
      subtitle,
      description,
      bannerType,
      imageUrl,
      imageClickUrl,
      imageClickTarget,
      ctaText,
      ctaUrl,
      placement,
      displayOrder,
      startAt,
      endAt,
      isActive,
    },
  };
}
