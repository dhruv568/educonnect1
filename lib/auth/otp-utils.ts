/**
 * Utility functions for parsing, cleaning, and normalizing OTP codes.
 * Supports 4-digit phone OTPs and 6-digit email OTPs.
 * Supports desktop paste, mobile paste, SMS autofill, and various text formats.
 */

/**
 * Normalizes and extracts digits from an OTP input or pasted string.
 * Supports 4-digit phone OTPs and 6-digit email OTPs.
 */
export function extractOtpDigits(text: string, length: number = 6): string {
  if (!text) return "";

  const trimmed = text.trim();

  // 4-Digit OTP Handling (Phone / MSG91 Widget)
  if (length === 4) {
    // 1. Check for 2-2 grouped patterns like "12-34", "12 34", "12.34"
    const grouped4Match = trimmed.match(/\b(\d{2})[-\s.]+(\d{2})\b/);
    if (grouped4Match) {
      return `${grouped4Match[1]}${grouped4Match[2]}`;
    }

    // 2. Check for standalone 4-digit sequence like "1234" (surrounded by word boundaries or punctuation)
    const fourDigitMatch = trimmed.match(/(?:^|[^\d])(\d{4})(?:[^\d]|$)/);
    if (fourDigitMatch) {
      return fourDigitMatch[1];
    }

    // 3. Fallback: Strip non-digits and slice 4 digits
    const allDigits = trimmed.replace(/\D/g, "");
    return allDigits.slice(0, 4);
  }

  // 6-Digit OTP Handling (Email OTPs & Default)
  // 1. Check for 3-3 grouped patterns like "123-456", "123 456", "123.456"
  const groupedMatch = trimmed.match(/\b(\d{3})[-\s.]+(\d{3})\b/);
  if (groupedMatch) {
    return `${groupedMatch[1]}${groupedMatch[2]}`;
  }

  // 2. Check for standalone 6-digit sequence like "123456" (surrounded by word boundaries or punctuation)
  const sixDigitMatch = trimmed.match(/(?:^|[^\d])(\d{6})(?:[^\d]|$)/);
  if (sixDigitMatch) {
    return sixDigitMatch[1];
  }

  // 3. Fallback: Strip all non-digit characters and take up to 6 digits
  const allDigits = trimmed.replace(/\D/g, "");
  return allDigits.slice(0, 6);
}

/**
 * Convenience helper to extract exactly 4 digits for phone OTP inputs.
 */
export function extractPhoneOtpDigits(text: string): string {
  return extractOtpDigits(text, 4);
}
