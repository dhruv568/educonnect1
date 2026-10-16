import { prisma } from "@/lib/prisma";
import { Msg91Client } from "@/lib/auth/msg91";
import { UserRole, UserSession } from "@/types/auth";
import { isEducatorRole, isLearnerRole } from "@/lib/auth/roles";
import { isSafeRedirectPath, sanitizeRedirectUrl } from "@/lib/auth/redirect-validator";
import { logAuditEvent } from "@/lib/audit-logger";

export interface InitiatePhoneOtpOptions {
  phone: string;
  purpose: "LOGIN" | "SIGNUP" | "VERIFY";
  roleContext?: "STUDENT" | "TEACHER" | string;
  currentUserId?: string;
  captchaToken?: string;
}

export interface VerifyPhoneOtpLoginOptions {
  phone: string;
  otp?: string;
  reqId?: string;
  accessToken?: string;
  roleContext?: "STUDENT" | "TEACHER" | string;
  rawHost?: string;
  returnTo?: string;
  redirectTo?: string;
}

export interface VerifyPhoneOtpSignupOptions {
  phone: string;
  email?: string;
  otp?: string;
  reqId?: string;
  accessToken?: string;
  userId?: string;
}

// In-memory rate limiting and verification tracking
interface PhoneRateLimitEntry {
  requests: number[];
  lastRequestTime: number;
}

const phoneRateLimits = new Map<string, PhoneRateLimitEntry>();
const RESEND_COOLDOWN_MS = 60 * 1000; // 60 seconds
const MAX_REQUESTS_PER_WINDOW = 5; // Max 5 requests
const WINDOW_DURATION_MS = 10 * 60 * 1000; // 10 minutes

// In-memory phone verification status cache (persists during process lifetime)
interface PhoneVerificationRecord {
  phone: string;
  userId?: string;
  verified: boolean;
  verifiedAt: Date;
}
const verifiedPhonesStore = new Map<string, PhoneVerificationRecord>();

// In-memory fallback users store for test / offline mode
export const mockPhoneUsersStore = new Map<string, any>();

export class PhoneAuthService {
  /**
   * Helper to check rate limits for a phone number.
   */
  static checkPhoneRateLimit(phone: string): { allowed: boolean; resetSeconds?: number; error?: string } {
    const now = Date.now();
    const entry = phoneRateLimits.get(phone) || { requests: [], lastRequestTime: 0 };

    // Cooldown check (60s)
    if (entry.lastRequestTime && now - entry.lastRequestTime < RESEND_COOLDOWN_MS) {
      const waitSeconds = Math.ceil((RESEND_COOLDOWN_MS - (now - entry.lastRequestTime)) / 1000);
      return {
        allowed: false,
        resetSeconds: waitSeconds,
        error: `Please wait ${waitSeconds} seconds before requesting another code.`,
      };
    }

    // Window check (max 5 per 10 minutes)
    const validTimestamps = entry.requests.filter((t) => now - t < WINDOW_DURATION_MS);
    if (validTimestamps.length >= MAX_REQUESTS_PER_WINDOW) {
      const oldest = validTimestamps[0];
      const resetSeconds = Math.ceil((WINDOW_DURATION_MS - (now - oldest)) / 1000);
      return {
        allowed: false,
        resetSeconds,
        error: `Too many OTP requests for this phone number. Please try again in ${resetSeconds} seconds.`,
      };
    }

    return { allowed: true };
  }

  /**
   * Records an OTP dispatch for rate limiting.
   */
  private static recordPhoneRequest(phone: string): void {
    const now = Date.now();
    const entry = phoneRateLimits.get(phone) || { requests: [], lastRequestTime: 0 };
    entry.requests.push(now);
    entry.lastRequestTime = now;
    phoneRateLimits.set(phone, entry);
  }

  /**
   * Finds candidate phone representations to query the database.
   * e.g. for '919876543210' -> ['919876543210', '9876543210', '+919876543210', '+91 9876543210']
   */
  static getPhoneVariations(normalizedPhone: string): string[] {
    const variations = new Set<string>();
    variations.add(normalizedPhone);

    if (normalizedPhone.startsWith("91") && normalizedPhone.length === 12) {
      const local10 = normalizedPhone.slice(2);
      variations.add(local10);
      variations.add(`+${normalizedPhone}`);
      variations.add(`+91${local10}`);
      variations.add(`+91 ${local10}`);
      variations.add(`0${local10}`);
    }

    return Array.from(variations);
  }

  /**
   * Finds an existing user by their phone number across Profile and TeacherProfile.
   */
  static async findUserByPhone(normalizedPhone: string): Promise<any | null> {
    const variations = this.getPhoneVariations(normalizedPhone);

    // 1. Check in-memory store (used for tests or offline execution)
    for (const v of variations) {
      if (mockPhoneUsersStore.has(v)) {
        return mockPhoneUsersStore.get(v);
      }
    }

    if (process.env.NODE_ENV === "test") {
      return null;
    }


    // 2. Query Prisma database
    try {
      // Find via Profile
      const profileUser = await prisma.profile.findFirst({
        where: {
          phone: { in: variations },
        },
        include: {
          user: {
            include: {
              profile: true,
              teacherProfile: true,
              customRole: true,
            },
          },
        },
      });

      if (profileUser?.user) {
        return profileUser.user;
      }

      // Find via TeacherProfile
      const teacherProfileUser = await prisma.teacherProfile.findFirst({
        where: {
          contactPhone: { in: variations },
        },
        include: {
          user: {
            include: {
              profile: true,
              teacherProfile: true,
              customRole: true,
            },
          },
        },
      });

      if (teacherProfileUser?.user) {
        return teacherProfileUser.user;
      }
    } catch (err) {
      // Database unavailable / offline: check in-memory store
      console.warn("⚠️ [PhoneAuthService] Database lookup unavailable, falling back to in-memory store:", (err as any)?.message);
    }

    return null;
  }

  /**
   * Checks whether a phone number is already associated with an existing active user.
   */
  static async isPhoneAlreadyRegistered(normalizedPhone: string, currentUserId?: string): Promise<boolean> {
    const existing = await this.findUserByPhone(normalizedPhone);
    if (!existing) return false;
    if (currentUserId && existing.id === currentUserId) return false;
    return true;
  }

  /**
   * Pre-flight validation for a phone number before dispatching OTP.
   * Verifies number normalization, rate limits, account existence (for LOGIN),
   * and duplicate prevention (for SIGNUP) without triggering SMS delivery.
   */
  static async checkPhoneForOtp(options: InitiatePhoneOtpOptions): Promise<{
    allowed: boolean;
    phone: string;
    maskedPhone: string;
  }> {
    const { phone, purpose, roleContext, currentUserId } = options;

    const norm = Msg91Client.normalizePhoneNumber(phone);
    if (!norm.valid || !norm.normalized) {
      throw new Error(norm.error || "Please enter a valid mobile number.");
    }
    const normalizedPhone = norm.normalized;

    const rateLimit = this.checkPhoneRateLimit(normalizedPhone);
    if (!rateLimit.allowed) {
      throw new Error(rateLimit.error || "Rate limit exceeded.");
    }

    if (purpose === "LOGIN") {
      const existingUser = await this.findUserByPhone(normalizedPhone);
      if (!existingUser) {
        throw new Error("No account is registered with this phone number. Please create an account first.");
      }

      if (existingUser.status !== "ACTIVE") {
        throw new Error("Account is suspended or deactivated. Access denied.");
      }

      if (roleContext === "STUDENT" && isEducatorRole(existingUser.role)) {
        throw new Error("This phone number is registered with an Educator account. Please sign in via the Educator Portal.");
      }
      if (roleContext === "TEACHER" && isLearnerRole(existingUser.role)) {
        throw new Error("This phone number is registered with a Learner account. Please sign in via the Learner Portal.");
      }
    } else if (purpose === "SIGNUP" || purpose === "VERIFY") {
      const isDuplicate = await this.isPhoneAlreadyRegistered(normalizedPhone, currentUserId);
      if (isDuplicate) {
        throw new Error("This phone number is already registered with another account. Please use a different phone number or sign in.");
      }
    }

    return {
      allowed: true,
      phone: normalizedPhone,
      maskedPhone: Msg91Client.maskPhone(normalizedPhone),
    };
  }

  /**
   * Initiates Phone OTP dispatch via MSG91.
   *
   * Enforces:
   * - Phone normalization (E.164 without '+')
   * - Rate limiting (60s cooldown, max 5 per 10 min)
   * - For LOGIN: ensures account exists (No automatic account creation for unknown numbers)
   * - For SIGNUP: prevents duplicate phone number associations
   */
  static async initiatePhoneOtp(options: InitiatePhoneOtpOptions) {
    const { phone, purpose, roleContext, currentUserId, captchaToken } = options;

    // 1. Validate & normalize phone number
    const norm = Msg91Client.normalizePhoneNumber(phone);
    if (!norm.valid || !norm.normalized) {
      throw new Error(norm.error || "Please enter a valid mobile number.");
    }
    const normalizedPhone = norm.normalized;

    // 2. Rate limit check
    const rateLimit = this.checkPhoneRateLimit(normalizedPhone);
    if (!rateLimit.allowed) {
      throw new Error(rateLimit.error || "Rate limit exceeded.");
    }

    // 3. Purpose-specific validation
    if (purpose === "LOGIN") {
      // REQUIREMENT 7: Do not automatically create a new account when an unknown phone number is used for login
      const existingUser = await this.findUserByPhone(normalizedPhone);
      if (!existingUser) {
        throw new Error("No account is registered with this phone number. Please create an account first.");
      }

      if (existingUser.status !== "ACTIVE") {
        throw new Error("Account is suspended or deactivated. Access denied.");
      }

      // Check role compatibility if role context is specified
      if (roleContext === "STUDENT" && isEducatorRole(existingUser.role)) {
        throw new Error("This phone number is registered with an Educator account. Please sign in via the Educator Portal.");
      }
      if (roleContext === "TEACHER" && isLearnerRole(existingUser.role)) {
        throw new Error("This phone number is registered with a Learner account. Please sign in via the Learner Portal.");
      }
    } else if (purpose === "SIGNUP" || purpose === "VERIFY") {
      // REQUIREMENT 6: Prevent duplicate phone associations
      const isDuplicate = await this.isPhoneAlreadyRegistered(normalizedPhone, currentUserId);
      if (isDuplicate) {
        throw new Error("This phone number is already registered with another account. Please use a different phone number or sign in.");
      }
    }

    // 4. Dispatch OTP via MSG91
    const dispatchResult = await Msg91Client.sendOtp(normalizedPhone, captchaToken);
    if (!dispatchResult.success) {
      throw new Error(dispatchResult.error || "Failed to dispatch verification code via MSG91.");
    }

    // 5. Record request for rate limiting
    this.recordPhoneRequest(normalizedPhone);

    return {
      success: true,
      reqId: dispatchResult.reqId,
      phone: normalizedPhone,
      maskedPhone: Msg91Client.maskPhone(normalizedPhone),
      isSimulated: Boolean(dispatchResult.isSimulated),
      message: dispatchResult.message || "A verification code has been dispatched to your mobile number.",
    };
  }

  /**
   * Verifies Phone OTP and authenticates the user for Phone-Based Login.
   *
   * Enforces:
   * - Server-side verification with MSG91
   * - Unknown number rejection (never creates accounts)
   * - Separate phone verification status from email verification
   * - Issues signed UserSession
   * - Preserves role-based redirects and permissions
   */
  static async verifyPhoneOtpForLogin(options: VerifyPhoneOtpLoginOptions) {

    const {
      phone,
      otp,
      reqId,
      accessToken,
      roleContext,
      rawHost,
      returnTo,
      redirectTo,
    } = options;

    // 1. Normalize phone
    const norm = Msg91Client.normalizePhoneNumber(phone);
    if (!norm.valid || !norm.normalized) {
      throw new Error(norm.error || "Please enter a valid mobile number.");
    }
    const normalizedPhone = norm.normalized;

    // 2. REQUIREMENT 4: Verify OTP / access-token securely on server before granting login
    let verifiedIdentifier: string | undefined;

    if (accessToken) {
      const tokenVerification = await Msg91Client.verifyAccessToken(accessToken);
      if (!tokenVerification.success) {
        throw new Error(tokenVerification.error || "Invalid or expired access token.");
      }
      verifiedIdentifier = tokenVerification.phone || normalizedPhone;
    } else if (reqId && otp) {
      const otpVerification = await Msg91Client.verifyOtp(reqId, otp);
      if (!otpVerification.success) {
        throw new Error(otpVerification.error || "Invalid verification code.");
      }
      if (otpVerification.accessToken) {
        const tokenVerification = await Msg91Client.verifyAccessToken(otpVerification.accessToken);
        verifiedIdentifier = tokenVerification.phone || normalizedPhone;
      } else {
        verifiedIdentifier = normalizedPhone;
      }
    } else {
      throw new Error("Verification code or access token is required.");
    }

    // Ensure verified phone matches normalized phone (unless token did not return phone)
    if (verifiedIdentifier && verifiedIdentifier !== normalizedPhone) {
      const check1 = Msg91Client.normalizePhoneNumber(verifiedIdentifier);
      if (check1.valid && check1.normalized !== normalizedPhone) {
        throw new Error("Phone number mismatch during verification.");
      }
    }

    // 3. REQUIREMENT 7: Ensure user exists (Do not automatically create new accounts)
    const user = await this.findUserByPhone(normalizedPhone);
    if (!user) {
      throw new Error("No account is registered with this phone number. Please sign up first.");
    }

    if (user.status !== "ACTIVE") {
      throw new Error("Account is suspended or deactivated. Access denied.");
    }

    // 4. REQUIREMENT 5: Store phone verification status separately from email verification
    await this.markPhoneVerified(user.id, normalizedPhone);

    // 5. REQUIREMENT 8: Construct UserSession preserving roles and permissions
    const session: UserSession = {
      id: user.id,
      userId: user.id,
      email: user.email,
      role: user.role as UserRole,
      emailVerified: Boolean(user.emailVerified),
      firstName: user.profile?.firstName || (isEducatorRole(user.role) ? "Educator" : "Learner"),
      lastName: user.profile?.lastName || "",
      name: `${user.profile?.firstName || ""} ${user.profile?.lastName || ""}`.trim() || undefined,
      avatarUrl: user.profile?.avatarUrl,
      status: user.status,
      roleId: user.roleId,
      permissions: user.customRole?.permissions ? JSON.parse(user.customRole.permissions) : undefined,
    };

    // 6. Determine canonical redirect destination
    const targetParam = returnTo || redirectTo;
    const safeCustomReturn = targetParam && isSafeRedirectPath(targetParam) ? sanitizeRedirectUrl(targetParam) : null;

    const cleanHost = rawHost ? rawHost.split(",")[0].split(":")[0].toLowerCase().trim() : "";
    const isEducatorSubdomain =
      cleanHost.startsWith("educators.") ||
      cleanHost.startsWith("educator.") ||
      cleanHost.startsWith("teacher.") ||
      cleanHost === "educators.educonnects.co.in";
    const isStudentSubdomain =
      cleanHost.startsWith("learners.") ||
      cleanHost.startsWith("learner.") ||
      cleanHost.startsWith("students.") ||
      cleanHost.startsWith("student.") ||
      cleanHost === "learners.educonnects.co.in";

    let destination = safeCustomReturn || "/";
    if (!safeCustomReturn) {
      if (user.role === "ADMIN") {
        destination = "/admin";
      } else if (isEducatorRole(user.role)) {
        destination = isEducatorSubdomain ? "/dashboard" : "/teacher/dashboard";
      } else if (isLearnerRole(user.role)) {
        destination = isStudentSubdomain ? "/dashboard" : "/student/dashboard";
      } else if (user.role === "STAFF") {
        destination = "/staff/dashboard";
      }
    }

    if (process.env.NODE_ENV !== "test") {
      await logAuditEvent(user.id, "LOGIN_PHONE_OTP_SUCCESS", {
        phone: Msg91Client.maskPhone(normalizedPhone),
        role: user.role,
      });
    }


    return {
      success: true,
      user: session,
      redirectPath: destination,
      message: "Phone verification successful. Welcome back!",
    };
  }

  /**
   * Verifies Phone OTP during registration or profile setup.
   *
   * Enforces:
   * - Server-side verification with MSG91
   * - Duplicate phone checks
   * - Separate phone verification status recording
   */
  static async verifyPhoneOtpForSignup(options: VerifyPhoneOtpSignupOptions) {
    const { phone, email, otp, reqId, accessToken, userId } = options;

    const norm = Msg91Client.normalizePhoneNumber(phone);
    if (!norm.valid || !norm.normalized) {
      throw new Error(norm.error || "Please enter a valid mobile number.");
    }
    const normalizedPhone = norm.normalized;

    // Check duplicate phone association
    const isDuplicate = await this.isPhoneAlreadyRegistered(normalizedPhone, userId);
    if (isDuplicate) {
      throw new Error("This phone number is already registered with another account.");
    }

    // Verify with MSG91 securely on server
    if (accessToken) {
      const tokenVerification = await Msg91Client.verifyAccessToken(accessToken);
      if (!tokenVerification.success) {
        throw new Error(tokenVerification.error || "Invalid access token.");
      }
    } else if (reqId && otp) {
      const otpVerification = await Msg91Client.verifyOtp(reqId, otp);
      if (!otpVerification.success) {
        throw new Error(otpVerification.error || "Invalid verification code.");
      }
    } else {
      throw new Error("Verification code or access token is required.");
    }

    // REQUIREMENT 5: Store phone verification status separately
    await this.markPhoneVerified(userId, normalizedPhone, email);

    return {
      success: true,
      phone: normalizedPhone,
      message: "Phone number verified successfully.",
    };
  }

  /**
   * Marks a phone number as verified separately from email verification.
   */
  static async markPhoneVerified(userId?: string, normalizedPhone?: string, email?: string): Promise<void> {
    if (!normalizedPhone) return;

    // 1. Record in-memory status
    verifiedPhonesStore.set(normalizedPhone, {
      phone: normalizedPhone,
      userId,
      verified: true,
      verifiedAt: new Date(),
    });

    if (process.env.NODE_ENV === "test") {
      return;
    }

    // 2. If email provided, record in pendingRegistration registrationData JSON

    if (email) {
      try {
        const pending = await prisma.pendingRegistration.findUnique({
          where: { email: email.toLowerCase().trim() },
        });
        if (pending) {
          let regData: Record<string, any> = {};
          try {
            if (pending.registrationData) regData = JSON.parse(pending.registrationData);
          } catch {}
          regData.phone = normalizedPhone;
          regData.phoneVerified = true;
          regData.phoneVerifiedAt = new Date().toISOString();
          await prisma.pendingRegistration.update({
            where: { email: email.toLowerCase().trim() },
            data: { registrationData: JSON.stringify(regData) },
          });
        }
      } catch (err) {
        // Ignored in offline / test mode
      }
    }

    // 3. If userId provided, update profile or teacherProfile
    if (userId) {
      try {
        await prisma.profile.updateMany({
          where: { userId },
          data: { phone: normalizedPhone },
        });
      } catch (err) {
        // Ignored if offline
      }
    }
  }

  /**
   * Checks whether a phone number is currently verified.
   */
  static isPhoneVerified(normalizedPhone: string): boolean {
    const record = verifiedPhonesStore.get(normalizedPhone);
    return Boolean(record?.verified);
  }

  static verifyPhoneOtpLogin = PhoneAuthService.verifyPhoneOtpForLogin;
  static verifyPhoneOtpSignup = PhoneAuthService.verifyPhoneOtpForSignup;
}

