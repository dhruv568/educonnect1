/**
 * In-memory storage and state helpers for pre-registration email OTP verification.
 * Decoupled from route files to conform with Next.js App Router route module constraints.
 */

export interface MockPreRegistrationEntry {
  otp: string;
  expiresAt: number;
  attempts: number;
}

export const mockPreRegistrationStore = new Map<string, MockPreRegistrationEntry>();
export const verifiedEmailsStore = new Set<string>();
export const emailCooldownsStore = new Map<string, number>();
