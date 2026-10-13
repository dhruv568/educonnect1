import { prisma } from "@/lib/prisma";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { generateOTP, generateVerificationToken, hashToken, verifyTokenHash } from "@/lib/auth/tokens";
import { EmailService } from "@/lib/email/email-service";
import { RegisterInput, LoginInput } from "@/schemas/auth-schemas";
import { UserRole, UserSession, VerificationResult } from "@/types/auth";
import { logAuditEvent } from "@/lib/audit-logger";
import { getVerificationUrl, getPasswordResetUrl } from "@/lib/app-url";
import { getDashboardPathForRole, isEducatorRole } from "@/lib/auth/roles";
import { parseHourlyRate } from "@/lib/currency";

const getOtpExpiryMinutes = () => Number(process.env.OTP_EXPIRY_MINUTES) || 10;
const getMaxAttempts = () => Number(process.env.OTP_MAX_ATTEMPTS) || 5;
const getResendCooldownSeconds = () => Number(process.env.OTP_RESEND_COOLDOWN_SECONDS) || 60;
const RESET_TOKEN_EXPIRY_HOURS = 1;

export class AuthService {
  /**
   * Registers a new user by storing registration info in temporary pending_registrations storage
   * with an OTP and expiration time. The user account is NOT created in the main database until OTP is verified.
   */
  static async registerUser(
    input: RegisterInput & {
      headline?: string;
      subjects?: string;
      experienceYears?: number;
      hourlyRate?: number;
      qualifications?: string;
      languages?: string;
      teachingMode?: string;
      gradeLevel?: string;
      interests?: string;
      learningPreferences?: string;
      emergencyContact?: string;
      originHost?: string;
    },
    originHost?: string
  ) {
    const normalizedEmail = input.email.toLowerCase().trim();

    // 1. Check if user already exists in the main users database
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      if (existingUser.emailVerified && existingUser.status === "ACTIVE") {
        throw new Error("Email already registered. An account with this email already exists. Please log in to your account.");
      } else if (existingUser.emailVerified) {
        throw new Error("Email already registered. An account with this email already exists. Please log in to your account.");
      } else {
        // User exists in pending/unverified state: preserve existing record and data without deleting
        // Update passwordHash for the pending user record once password is encrypted below
      }
    }

    const role = input.role as UserRole;
    if (role === "ADMIN") {
      throw new Error("Public registration is disabled for administrative accounts.");
    }

    const passwordHash = await hashPassword(input.password);
    if (existingUser) {
      await prisma.user.update({
        where: { id: existingUser.id },
        data: { passwordHash },
      });
    }
    const expiryMinutes = getOtpExpiryMinutes();
    const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);

    const otp = generateOTP();
    const rawToken = generateVerificationToken();
    const codeHash = hashToken(otp);
    const tokenHash = hashToken(rawToken);

    // Package role-specific registration fields
    const extraData = {
      headline: input.headline,
      subjects: input.subjects,
      experienceYears: input.experienceYears,
      hourlyRate: input.hourlyRate,
      qualifications: input.qualifications,
      languages: input.languages,
      teachingMode: (input as any).teachingMode,
      educationType: (input as any).educationType,
      gradeLevel: (input as any).gradeLevel,
      stream: (input as any).stream,
      competitiveExam: (input as any).competitiveExam,
      diplomaBranch: (input as any).diplomaBranch,
      interests: (input as any).interests,
      learningPreferences: (input as any).learningPreferences,
      emergencyContact: (input as any).emergencyContact,
      phone: input.phone,
    };

    // Store strictly in pending_registrations temporary storage.
    // If a pending registration already exists for this email, update it with fresh OTP & credentials.
    const pending = await prisma.pendingRegistration.upsert({
      where: { email: normalizedEmail },
      create: {
        email: normalizedEmail,
        passwordHash,
        role,
        firstName: input.firstName,
        lastName: input.lastName,
        registrationData: JSON.stringify(extraData),
        codeHash,
        tokenHash,
        expiresAt,
        attempts: 0,
      },
      update: {
        passwordHash,
        role,
        firstName: input.firstName,
        lastName: input.lastName,
        registrationData: JSON.stringify(extraData),
        codeHash,
        tokenHash,
        expiresAt,
        attempts: 0,
      },
    });

    // Send verification email with OTP and direct verification link
    const verificationUrl = getVerificationUrl(rawToken, normalizedEmail);

    const sent = await EmailService.sendVerificationOTP({
      email: normalizedEmail,
      userName: input.firstName,
      otp,
      verificationUrl,
      expiresInMinutes: expiryMinutes,
      role: pending.role,
      originHost: originHost || (input as any).originHost,
    });



    return {
      id: pending.id,
      email: pending.email,
      role: pending.role as UserRole,
      emailVerified: false,
      firstName: pending.firstName,
      lastName: pending.lastName,
    };
  }

  /**
   * Generates OTP/Token, invalidates prior active OTPs so ONLY the newest OTP is valid,
   * stores hashes in DB, and dispatches email via Resend / EmailService.
   */
  static async createAndSendVerification(
    userId: string,
    email: string,
    firstName: string,
    isAdminLogin: boolean = false,
    role?: string,
    originHost?: string
  ) {
    const expiryMinutes = getOtpExpiryMinutes();

    // Invalidate all previous unverified OTP records for this user (Single Active OTP requirement)
    await prisma.emailVerification.updateMany({
      where: {
        userId,
        verifiedAt: null,
      },
      data: {
        expiresAt: new Date(),
      },
    });

    const otp = generateOTP();
    const rawToken = generateVerificationToken();
    const codeHash = hashToken(otp);
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);

    // Save hashed tokens to database
    const record = await prisma.emailVerification.create({
      data: {
        userId,
        codeHash,
        tokenHash,
        expiresAt,
      },
    });

    const verificationUrl = getVerificationUrl(rawToken, email);

    const sent = await EmailService.sendVerificationOTP({
      email,
      userName: firstName,
      otp,
      verificationUrl,
      expiresInMinutes: expiryMinutes,
      isAdminLogin,
      role,
      originHost,
    });

    if (!sent) {
      // Invalidate the un-delivered OTP record immediately
      await prisma.emailVerification.delete({
        where: { id: record.id },
      }).catch(() => {});
      throw new Error("Unable to deliver verification code to your email at this time. Please try again.");
    }
  }

  /**
   * Sends or resends verification email enforcing rate-limiting cooldown and account checks.
   */
  static async sendVerification(email: string, originHost?: string) {
    return this.resendVerification(email, originHost);
  }

  /**
   * Resends verification email enforcing rate-limiting cooldown.
   * Handles both pending registrations and existing users (e.g. login OTP).
   */
  static async resendVerification(email: string, originHost?: string) {
    const normalizedEmail = email.toLowerCase().trim();
    const cooldownSeconds = getResendCooldownSeconds();
    const expiryMinutes = getOtpExpiryMinutes();

    // 1. Check if there is an active pending registration
    const pending = await prisma.pendingRegistration.findUnique({
      where: { email: normalizedEmail },
    });

    if (pending) {
      const secondsSinceLast = Math.floor((Date.now() - pending.updatedAt.getTime()) / 1000);
      if (secondsSinceLast < cooldownSeconds) {
        const waitTime = cooldownSeconds - secondsSinceLast;
        throw new Error(`Please wait ${waitTime} seconds before requesting another code.`);
      }

      const otp = generateOTP();
      const rawToken = generateVerificationToken();
      const codeHash = hashToken(otp);
      const tokenHash = hashToken(rawToken);
      const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);

      await prisma.pendingRegistration.update({
        where: { email: normalizedEmail },
        data: {
          codeHash,
          tokenHash,
          expiresAt,
          attempts: 0,
        },
      });

      const verificationUrl = getVerificationUrl(rawToken, normalizedEmail);

      const sent = await EmailService.sendVerificationOTP({
        email: normalizedEmail,
        userName: pending.firstName,
        otp,
        verificationUrl,
        expiresInMinutes: expiryMinutes,
        role: pending.role,
        originHost,
      });

      return {
        success: true,
        message: "Verification email sent successfully.",
      };
    }

    // 2. Check main users database (e.g. login OTP flow)
    let user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: { profile: true, emailVerifications: { orderBy: { createdAt: "desc" }, take: 1 } },
    });

    const adminEmailAliases = [
      "educonnects.com@gmail.com",
      "educonnets.com@gmail.com",
      "admin@educonnects.com",
      "admin@educonnect.com",
    ];

    if (!user && adminEmailAliases.includes(normalizedEmail)) {
      const adminCandidate = await prisma.user.findFirst({
        where: {
          OR: [
            { email: { in: adminEmailAliases } },
            { role: "ADMIN" },
          ],
          status: "ACTIVE",
        },
        include: { profile: true, emailVerifications: { orderBy: { createdAt: "desc" }, take: 1 } },
      });
      if (adminCandidate) {
        user = adminCandidate;
      }
    }

    if (!user) {
      throw new Error("No pending registration or account found with this email address.");
    }

    const latestVerification = user.emailVerifications[0];
    if (latestVerification) {
      const secondsSinceLast = Math.floor((Date.now() - latestVerification.createdAt.getTime()) / 1000);
      if (secondsSinceLast < cooldownSeconds) {
        const waitTime = cooldownSeconds - secondsSinceLast;
        throw new Error(`Please wait ${waitTime} seconds before requesting another code.`);
      }
    }

    const isAdmin = user.role === "ADMIN";
    await this.createAndSendVerification(
      user.id,
      user.email,
      user.profile?.firstName || (isAdmin ? "System Administrator" : isEducatorRole(user.role) ? "Educator" : "Learner"),
      isAdmin,
      user.role,
      originHost
    );

    return {
      success: true,
      message: "Verification email sent successfully.",
    };
  }

  /**
   * Validates a 6-digit OTP entered by user. Enforces single active OTP, attempt limits, and expiration.
   * If OTP is for pending registration, creates the user and profile in the main database transactionally.
   * If OTP is for login of existing user, validates and issues session.
   */
  static async verifyOTP(email: string, otp: string): Promise<VerificationResult> {
    const normalizedEmail = email.toLowerCase().trim();
    const maxAttempts = getMaxAttempts();
    const now = new Date();

    // 1. Check if there is a pending registration
    const pending = await prisma.pendingRegistration.findUnique({
      where: { email: normalizedEmail },
    });

    if (pending) {
      // Check attempt count limit
      if (pending.attempts >= maxAttempts) {
        await prisma.pendingRegistration.update({
          where: { id: pending.id },
          data: { expiresAt: now },
        });
        throw new Error("Too many incorrect attempts. Please request a new verification code.");
      }

      // Check expiration
      if (now > pending.expiresAt) {
        throw new Error("This verification code has expired. Please request a new code.");
      }

      const isValid = verifyTokenHash(otp, pending.codeHash);
      if (!isValid) {
        const newAttempts = pending.attempts + 1;
        await prisma.pendingRegistration.update({
          where: { id: pending.id },
          data: {
            attempts: newAttempts,
            ...(newAttempts >= maxAttempts ? { expiresAt: now } : {}),
          },
        });

        if (newAttempts >= maxAttempts) {
          throw new Error("Too many incorrect attempts. Please request a new verification code.");
        }

        throw new Error("Incorrect verification code. Please check your email and try again.");
      }

      // OTP is valid! Parse extra fields
      let extra: any = {};
      if (pending.registrationData) {
        try {
          extra = JSON.parse(pending.registrationData);
        } catch {
          extra = {};
        }
      }

      const role = pending.role as UserRole;

      // Transactionally create or update User and Profile in main database, and clean up pending registration
      const createdUser = await prisma.$transaction(async (tx) => {
        const existingUser = await tx.user.findUnique({
          where: { email: normalizedEmail },
          include: {
            profile: true,
            teacherProfile: true,
            studentProfile: true,
          },
        });

        let targetUser;

        if (existingUser) {
          // Continue existing registration idempotently instead of creating duplicate user
          targetUser = await tx.user.update({
            where: { id: existingUser.id },
            data: {
              passwordHash: pending.passwordHash || existingUser.passwordHash,
              role: existingUser.role || role,
              emailVerified: true,
              emailVerifiedAt: existingUser.emailVerifiedAt || now,
            },
            include: {
              profile: true,
              teacherProfile: true,
              studentProfile: true,
            },
          });

          if (targetUser.profile) {
            await tx.profile.update({
              where: { userId: targetUser.id },
              data: {
                firstName: pending.firstName || targetUser.profile.firstName,
                lastName: pending.lastName || targetUser.profile.lastName,
                phone: extra.phone || targetUser.profile.phone,
              },
            });
          } else {
            await tx.profile.create({
              data: {
                userId: targetUser.id,
                firstName: pending.firstName,
                lastName: pending.lastName,
                phone: extra.phone || null,
              },
            });
          }

          if (role === "TEACHER" || targetUser.role === "TEACHER") {
            if (targetUser.teacherProfile) {
              await tx.teacherProfile.update({
                where: { userId: targetUser.id },
                data: {
                  headline: extra.headline || targetUser.teacherProfile.headline,
                  subjects: extra.subjects || targetUser.teacherProfile.subjects,
                  experienceYears: extra.experienceYears !== undefined ? extra.experienceYears : targetUser.teacherProfile.experienceYears,
                  hourlyRate: parseHourlyRate(extra.hourlyRate) ?? targetUser.teacherProfile.hourlyRate,
                  qualifications: extra.qualifications || targetUser.teacherProfile.qualifications,
                  languages: extra.languages || targetUser.teacherProfile.languages,
                  teachingMode: extra.teachingMode || targetUser.teacherProfile.teachingMode,
                },
              });
            } else {
              await tx.teacherProfile.create({
                data: {
                  userId: targetUser.id,
                  headline: extra.headline || "Educator",
                  subjects: extra.subjects || "Mathematics",
                  experienceYears: extra.experienceYears || 0,
                  hourlyRate: parseHourlyRate(extra.hourlyRate) ?? 300.0,
                  qualifications: extra.qualifications,
                  languages: extra.languages || "English",
                  teachingMode: extra.teachingMode || "ONLINE",
                  verificationStatus: "PENDING",
                },
              });
            }
          } else if (role === "STUDENT" || targetUser.role === "STUDENT") {
            const isDiploma = extra.educationType === "DIPLOMA";
            const cleanGrade = isDiploma ? null : extra.gradeLevel || "Grade 10";
            const cleanStream = isDiploma ? null : extra.stream || null;
            const cleanExam = isDiploma ? null : extra.competitiveExam || null;
            const cleanBranch = isDiploma ? extra.diplomaBranch || null : null;

            if (targetUser.studentProfile) {
              await tx.studentProfile.update({
                where: { userId: targetUser.id },
                data: {
                  educationType: extra.educationType || targetUser.studentProfile.educationType || "SCHOOL",
                  gradeLevel: cleanGrade ?? targetUser.studentProfile.gradeLevel,
                  stream: cleanStream ?? targetUser.studentProfile.stream,
                  competitiveExam: cleanExam ?? targetUser.studentProfile.competitiveExam,
                  diplomaBranch: cleanBranch ?? targetUser.studentProfile.diplomaBranch,
                  interests: extra.interests || targetUser.studentProfile.interests,
                  learningPreferences: extra.learningPreferences || targetUser.studentProfile.learningPreferences,
                },
              });
            } else {
              await tx.studentProfile.create({
                data: {
                  userId: targetUser.id,
                  educationType: extra.educationType || "SCHOOL",
                  gradeLevel: cleanGrade,
                  stream: cleanStream,
                  competitiveExam: cleanExam,
                  diplomaBranch: cleanBranch,
                  interests: extra.interests,
                  learningPreferences: extra.learningPreferences,
                },
              });
            }
          }
        } else {
          targetUser = await tx.user.create({
            data: {
              email: normalizedEmail,
              passwordHash: pending.passwordHash,
              role,
              emailVerified: true,
              emailVerifiedAt: now,
              profile: {
                create: {
                  firstName: pending.firstName,
                  lastName: pending.lastName,
                  phone: extra.phone || null,
                },
              },
              ...(role === "TEACHER" && {
                teacherProfile: {
                  create: {
                    headline: extra.headline || "Educator",
                    subjects: extra.subjects || "Mathematics",
                    experienceYears: extra.experienceYears || 0,
                    hourlyRate: parseHourlyRate(extra.hourlyRate) ?? 300.0,
                    qualifications: extra.qualifications,
                    languages: extra.languages || "English",
                    teachingMode: extra.teachingMode || "ONLINE",
                    verificationStatus: "PENDING",
                  },
                },
              }),
              ...(role === "STUDENT" && {
                studentProfile: {
                  create: {
                    educationType: extra.educationType || "SCHOOL",
                    gradeLevel: extra.educationType === "DIPLOMA" ? null : extra.gradeLevel || "Grade 10",
                    stream: extra.educationType === "DIPLOMA" ? null : extra.stream || null,
                    competitiveExam: extra.educationType === "DIPLOMA" ? null : extra.competitiveExam || null,
                    diplomaBranch: extra.educationType === "DIPLOMA" ? extra.diplomaBranch || null : null,
                    interests: extra.interests,
                    learningPreferences: extra.learningPreferences,
                  },
                },
              }),
            },
            include: {
              profile: true,
              teacherProfile: true,
              studentProfile: true,
            },
          });
        }

        await tx.pendingRegistration.deleteMany({
          where: { email: normalizedEmail },
        });

        return targetUser;
      }, {
        maxWait: 10000,
        timeout: 20000,
      });

      await logAuditEvent(createdUser.id, "USER_REGISTERED", { role, email: createdUser.email });
      await logAuditEvent(createdUser.id, "EMAIL_VERIFIED", { email: createdUser.email });
      await logAuditEvent(createdUser.id, "LOGIN_SUCCESS", { role: createdUser.role });

      await EmailService.sendWelcomeEmail({
        email: createdUser.email,
        userName: createdUser.profile?.firstName,
      });

      // Dispatch auth.welcome event to trigger in-app notification & WhatsApp registration confirmation
      try {
        const { EventService } = require("@/services/event-service");
        await EventService.emit("auth.welcome", {
          userId: createdUser.id,
          actorId: createdUser.id,
          actorRole: createdUser.role,
          data: {
            name: `${createdUser.profile?.firstName || ""} ${createdUser.profile?.lastName || ""}`.trim(),
            role: createdUser.role,
          },
          idempotencyKey: `auth-welcome-${createdUser.id}`,
        });
      } catch (evtErr) {
        console.error("Failed to emit auth.welcome event:", evtErr);
      }

      const userSession: UserSession = {
        id: createdUser.id,
        userId: createdUser.id,
        email: createdUser.email,
        role: createdUser.role as UserRole,
        emailVerified: true,
        firstName: createdUser.profile?.firstName || "User",
        lastName: createdUser.profile?.lastName || "",
      };

      const redirectPath = createdUser.role === "ADMIN" ? "/admin" : getDashboardPathForRole(createdUser.role);

      return {
        success: true,
        message: "OTP successfully verified!",
        user: userSession,
        redirectPath,
      };
    }

    // 2. Check main users database (e.g. login OTP verification for registered users)
    let user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: {
        profile: true,
        emailVerifications: {
          where: { verifiedAt: null },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });

    const adminEmailAliases = [
      "educonnects.com@gmail.com",
      "educonnets.com@gmail.com",
      "admin@educonnects.com",
      "admin@educonnect.com",
    ];

    if ((!user || !user.emailVerifications[0]) && adminEmailAliases.includes(normalizedEmail)) {
      const adminCandidates = await prisma.user.findMany({
        where: {
          OR: [
            { email: { in: adminEmailAliases } },
            { role: "ADMIN" },
          ],
          status: "ACTIVE",
        },
        include: {
          profile: true,
          emailVerifications: {
            where: { verifiedAt: null },
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
      });

      for (const candidate of adminCandidates) {
        if (candidate.emailVerifications[0]) {
          user = candidate;
          break;
        }
      }
    }

    if (!user) {
      throw new Error("No pending registration or account found for this email address.");
    }

    const record = user.emailVerifications[0];

    if (!record) {
      throw new Error("No active verification code found. Please request a new code.");
    }

    // Check attempt count limit
    if (record.attempts >= maxAttempts) {
      // Invalidate expired/exhausted OTP
      await prisma.emailVerification.update({
        where: { id: record.id },
        data: { expiresAt: now },
      });
      throw new Error("Too many incorrect attempts. Please request a new verification code.");
    }

    // Check expiration
    if (now > record.expiresAt) {
      throw new Error("This verification code has expired. Please request a new code.");
    }

    const isValid = verifyTokenHash(otp, record.codeHash);

    if (!isValid) {
      const newAttempts = record.attempts + 1;
      // Increment attempt counter
      await prisma.emailVerification.update({
        where: { id: record.id },
        data: {
          attempts: newAttempts,
          ...(newAttempts >= maxAttempts ? { expiresAt: now } : {}),
        },
      });

      if (newAttempts >= maxAttempts) {
        throw new Error("Too many incorrect attempts. Please request a new verification code.");
      }

      throw new Error("Incorrect verification code. Please check your email and try again.");
    }

    // Transactionally verify user and mark verification record (if present)
    const updateOps: any[] = [
      prisma.user.update({
        where: { id: user.id },
        data: { emailVerified: true, emailVerifiedAt: now },
      }),
    ];

    if (record) {
      updateOps.push(
        prisma.emailVerification.update({
          where: { id: record.id },
          data: { verifiedAt: now },
        })
      );
    }

    await prisma.$transaction(updateOps);

    await logAuditEvent(user.id, "EMAIL_VERIFIED", { email: user.email });
    await logAuditEvent(user.id, "LOGIN_SUCCESS", { role: user.role });

    const userSession: UserSession = {
      id: user.id,
      userId: user.id,
      email: user.email,
      role: user.role as UserRole,
      emailVerified: true,
      firstName: user.profile?.firstName || "User",
      lastName: user.profile?.lastName || "",
    };

    const redirectPath = user.role === "ADMIN" ? "/admin" : getDashboardPathForRole(user.role);

    return {
      success: true,
      message: "OTP successfully verified!",
      user: userSession,
      redirectPath,
    };
  }

  /**
   * Validates a link verification token from email.
   * Handles both pending registrations and existing email verifications.
   */
  static async verifyToken(token: string, email: string): Promise<VerificationResult> {
    const normalizedEmail = email.toLowerCase().trim();
    const hashed = hashToken(token);
    const now = new Date();

    // 1. Check pending registration
    const pending = await prisma.pendingRegistration.findFirst({
      where: {
        email: normalizedEmail,
        tokenHash: hashed,
      },
    });

    if (pending) {
      if (now > pending.expiresAt) {
        throw new Error("This verification code has expired. Please request a new code.");
      }

      let extra: any = {};
      if (pending.registrationData) {
        try {
          extra = JSON.parse(pending.registrationData);
        } catch {
          extra = {};
        }
      }

      const role = pending.role as UserRole;

      const createdUser = await prisma.$transaction(async (tx) => {
        const existingUser = await tx.user.findUnique({
          where: { email: normalizedEmail },
          include: {
            profile: true,
            teacherProfile: true,
            studentProfile: true,
          },
        });

        let targetUser;

        if (existingUser) {
          targetUser = await tx.user.update({
            where: { id: existingUser.id },
            data: {
              passwordHash: pending.passwordHash || existingUser.passwordHash,
              role: existingUser.role || role,
              emailVerified: true,
              emailVerifiedAt: existingUser.emailVerifiedAt || now,
            },
            include: {
              profile: true,
              teacherProfile: true,
              studentProfile: true,
            },
          });

          if (targetUser.profile) {
            await tx.profile.update({
              where: { userId: targetUser.id },
              data: {
                firstName: pending.firstName || targetUser.profile.firstName,
                lastName: pending.lastName || targetUser.profile.lastName,
              },
            });
          } else {
            await tx.profile.create({
              data: {
                userId: targetUser.id,
                firstName: pending.firstName,
                lastName: pending.lastName,
              },
            });
          }

          if (role === "TEACHER" || targetUser.role === "TEACHER") {
            if (targetUser.teacherProfile) {
              await tx.teacherProfile.update({
                where: { userId: targetUser.id },
                data: {
                  headline: extra.headline || targetUser.teacherProfile.headline,
                  subjects: extra.subjects || targetUser.teacherProfile.subjects,
                  experienceYears: extra.experienceYears !== undefined ? extra.experienceYears : targetUser.teacherProfile.experienceYears,
                  hourlyRate: parseHourlyRate(extra.hourlyRate) ?? targetUser.teacherProfile.hourlyRate,
                  qualifications: extra.qualifications || targetUser.teacherProfile.qualifications,
                  languages: extra.languages || targetUser.teacherProfile.languages,
                  teachingMode: extra.teachingMode || targetUser.teacherProfile.teachingMode,
                },
              });
            } else {
              await tx.teacherProfile.create({
                data: {
                  userId: targetUser.id,
                  headline: extra.headline || "Educator",
                  subjects: extra.subjects || "Mathematics",
                  experienceYears: extra.experienceYears || 0,
                  hourlyRate: parseHourlyRate(extra.hourlyRate) ?? 300.0,
                  qualifications: extra.qualifications,
                  languages: extra.languages || "English",
                  teachingMode: extra.teachingMode || "ONLINE",
                  verificationStatus: "PENDING",
                },
              });
            }
          } else if (role === "STUDENT" || targetUser.role === "STUDENT") {
            const isDiploma = extra.educationType === "DIPLOMA";
            const cleanGrade = isDiploma ? null : extra.gradeLevel || "Grade 10";
            const cleanStream = isDiploma ? null : extra.stream || null;
            const cleanExam = isDiploma ? null : extra.competitiveExam || null;
            const cleanBranch = isDiploma ? extra.diplomaBranch || null : null;

            if (targetUser.studentProfile) {
              await tx.studentProfile.update({
                where: { userId: targetUser.id },
                data: {
                  educationType: extra.educationType || targetUser.studentProfile.educationType || "SCHOOL",
                  gradeLevel: cleanGrade ?? targetUser.studentProfile.gradeLevel,
                  stream: cleanStream ?? targetUser.studentProfile.stream,
                  competitiveExam: cleanExam ?? targetUser.studentProfile.competitiveExam,
                  diplomaBranch: cleanBranch ?? targetUser.studentProfile.diplomaBranch,
                  interests: extra.interests || targetUser.studentProfile.interests,
                  learningPreferences: extra.learningPreferences || targetUser.studentProfile.learningPreferences,
                },
              });
            } else {
              await tx.studentProfile.create({
                data: {
                  userId: targetUser.id,
                  educationType: extra.educationType || "SCHOOL",
                  gradeLevel: cleanGrade,
                  stream: cleanStream,
                  competitiveExam: cleanExam,
                  diplomaBranch: cleanBranch,
                  interests: extra.interests,
                  learningPreferences: extra.learningPreferences,
                },
              });
            }
          }
        } else {
          targetUser = await tx.user.create({
            data: {
              email: normalizedEmail,
              passwordHash: pending.passwordHash,
              role,
              emailVerified: true,
              emailVerifiedAt: now,
              profile: {
                create: {
                  firstName: pending.firstName,
                  lastName: pending.lastName,
                },
              },
              ...(role === "TEACHER" && {
                teacherProfile: {
                  create: {
                    headline: extra.headline || "Educator",
                    subjects: extra.subjects || "Mathematics",
                    experienceYears: extra.experienceYears || 0,
                    hourlyRate: parseHourlyRate(extra.hourlyRate) ?? 300.0,
                    qualifications: extra.qualifications,
                    languages: extra.languages || "English",
                    teachingMode: extra.teachingMode || "ONLINE",
                    verificationStatus: "PENDING",
                  },
                },
              }),
              ...(role === "STUDENT" && {
                studentProfile: {
                  create: {
                    educationType: extra.educationType || "SCHOOL",
                    gradeLevel: extra.educationType === "DIPLOMA" ? null : extra.gradeLevel || "Grade 10",
                    stream: extra.educationType === "DIPLOMA" ? null : extra.stream || null,
                    competitiveExam: extra.educationType === "DIPLOMA" ? null : extra.competitiveExam || null,
                    diplomaBranch: extra.educationType === "DIPLOMA" ? extra.diplomaBranch || null : null,
                    interests: extra.interests,
                    learningPreferences: extra.learningPreferences,
                  },
                },
              }),
            },
            include: {
              profile: true,
              teacherProfile: true,
              studentProfile: true,
            },
          });
        }

        await tx.pendingRegistration.deleteMany({
          where: { email: normalizedEmail },
        });

        return targetUser;
      }, {
        maxWait: 10000,
        timeout: 20000,
      });

      await logAuditEvent(createdUser.id, "USER_REGISTERED", { role, email: createdUser.email });
      await logAuditEvent(createdUser.id, "EMAIL_VERIFIED", { email: createdUser.email });
      await logAuditEvent(createdUser.id, "LOGIN_SUCCESS", { role: createdUser.role });

      await EmailService.sendWelcomeEmail({
        email: createdUser.email,
        userName: createdUser.profile?.firstName,
      });

      const userSession: UserSession = {
        id: createdUser.id,
        userId: createdUser.id,
        email: createdUser.email,
        role: createdUser.role as UserRole,
        emailVerified: true,
        firstName: createdUser.profile?.firstName || "User",
        lastName: createdUser.profile?.lastName || "",
      };

      const redirectPath = createdUser.role === "ADMIN" ? "/admin" : `/${createdUser.role.toLowerCase()}/dashboard`;

      return {
        success: true,
        message: "Email successfully verified via verification link!",
        user: userSession,
        redirectPath,
      };
    }

    // 2. Check main database email verifications
    const record = await prisma.emailVerification.findFirst({
      where: {
        tokenHash: hashed,
        verifiedAt: null,
      },
      include: { user: { include: { profile: true } } },
    });

    if (!record) {
      throw new Error("Invalid or expired verification link.");
    }

    if (now > record.expiresAt) {
      throw new Error("This verification code has expired. Please request a new code.");
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { id: record.userId },
        data: { emailVerified: true, emailVerifiedAt: now },
      }),
      prisma.emailVerification.update({
        where: { id: record.id },
        data: { verifiedAt: now },
      }),
    ]);

    await logAuditEvent(record.userId, "EMAIL_VERIFIED", { email });
    await logAuditEvent(record.userId, "LOGIN_SUCCESS", { role: record.user.role });

    const userSession: UserSession = {
      id: record.userId,
      userId: record.userId,
      email: record.user.email,
      role: record.user.role as UserRole,
      emailVerified: true,
      firstName: record.user.profile?.firstName || "User",
      lastName: record.user.profile?.lastName || "",
    };

    const redirectPath = record.user.role === "ADMIN" ? "/admin" : `/${record.user.role.toLowerCase()}/dashboard`;

    return {
      success: true,
      message: "Email successfully verified via verification link!",
      user: userSession,
      redirectPath,
    };
  }


  /**
   * Initiates forgot password reset token generation and Resend email dispatch.
   */
  static async forgotPassword(email: string) {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: { profile: true },
    });

    // Enumeration protection: return generic success even if user not found
    if (!user) {
      return { success: true, message: "If an account exists for this email, password reset instructions have been sent." };
    }

    const rawToken = generateVerificationToken();
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + RESET_TOKEN_EXPIRY_HOURS * 60 * 60 * 1000);

    await prisma.passwordReset.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
      },
    });

    await logAuditEvent(user.id, "PASSWORD_RESET_REQUESTED", { email: user.email });

    const resetUrl = getPasswordResetUrl(rawToken, user.email);

    await EmailService.sendPasswordResetEmail({
      email: user.email,
      userName: user.profile?.firstName,
      resetUrl,
    });

    return {
      success: true,
      message: "If an account exists for this email, password reset instructions have been sent.",
    };
  }

  /**
   * Resets password using validated reset token.
   */
  static async resetPassword(token: string, email: string, newPassword: string) {
    const tokenHash = hashToken(token);

    const record = await prisma.passwordReset.findFirst({
      where: {
        tokenHash,
        usedAt: null,
      },
      include: { user: true },
    });

    if (!record) {
      throw new Error("Invalid or expired password reset token link.");
    }

    if (new Date() > record.expiresAt) {
      throw new Error("Password reset link has expired. Please request a new reset link.");
    }

    const newPasswordHash = await hashPassword(newPassword);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: record.userId },
        data: { passwordHash: newPasswordHash },
      }),
      prisma.passwordReset.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
    ]);

    await logAuditEvent(record.userId, "PASSWORD_RESET_COMPLETED", { email });

    return {
      success: true,
      message: "Password reset successful! You can now log in with your new password.",
    };
  }

  /**
   * Validates user credentials (email and password).
   * Supports email normalization and admin alias resolution against authorized database records.
   */
  static async validateCredentials(email: string, password: string) {
    const normalizedEmail = email.toLowerCase().trim();

    // 1. Primary lookup by exact normalized email
    let user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: { profile: true },
    });

    let isMatch = false;
    if (user && user.passwordHash) {
      isMatch = await verifyPassword(password, user.passwordHash);
    }

    // 2. Admin alias / legacy account resolution:
    // If user was not found OR password didn't match, and the requested email is an admin email alias
    const adminEmailAliases = [
      "educonnects.com@gmail.com",
      "educonnets.com@gmail.com",
      "admin@educonnects.com",
      "admin@educonnect.com",
    ];

    if ((!user || !isMatch) && adminEmailAliases.includes(normalizedEmail)) {
      const adminCandidates = await prisma.user.findMany({
        where: {
          OR: [
            { email: { in: adminEmailAliases } },
            { role: "ADMIN" },
          ],
          status: "ACTIVE",
        },
        include: { profile: true },
      });

      for (const candidate of adminCandidates) {
        if (candidate.id === user?.id) continue;
        if (candidate.passwordHash && (await verifyPassword(password, candidate.passwordHash))) {
          user = candidate;
          isMatch = true;
          break;
        }
      }
    }

    if (!user) {
      await logAuditEvent(null, "LOGIN_FAILED", { email: normalizedEmail });
      throw new Error("Invalid email or password.");
    }

    if (!isMatch) {
      await logAuditEvent(user.id, "LOGIN_FAILED", { email: user.email });
      throw new Error("Invalid email or password.");
    }

    return user;
  }

  /**
   * Authenticates user credentials and dispatches mandatory OTP verification code.
   * For ADMIN account (educonnects.com@gmail.com): verifies admin role and dispatches dynamic OTP via Resend.
   * Session cookie is NOT created until OTP is verified.
   */
  static async loginUser(input: LoginInput, originHost?: string) {
    const normalizedEmail = input.email.toLowerCase().trim();

    if (!input.password) {
      throw new Error("Password is required.");
    }

    const user = await this.validateCredentials(normalizedEmail, input.password);

    if (user.status !== "ACTIVE") {
      await logAuditEvent(user.id, "LOGIN_BLOCKED_INACTIVE", { email: normalizedEmail, status: user.status });
      throw new Error("Your account is currently inactive or suspended. Please contact system support.");
    }

    const isAdmin = user.role === "ADMIN";

    // Check resend cooldown for login requests to prevent spamming OTP generation
    const cooldownSeconds = getResendCooldownSeconds();
    const latestVerification = await prisma.emailVerification.findFirst({
      where: { userId: user.id, verifiedAt: null },
      orderBy: { createdAt: "desc" },
    });
    if (latestVerification) {
      const secondsSinceLast = Math.floor((Date.now() - latestVerification.createdAt.getTime()) / 1000);
      if (secondsSinceLast < cooldownSeconds) {
        const waitTime = cooldownSeconds - secondsSinceLast;
        throw new Error(`Please wait ${waitTime} seconds before requesting another code.`);
      }
    }

    const displayName = user.profile?.firstName || (isAdmin ? "System Administrator" : isEducatorRole(user.role) ? "Educator" : "Learner");

    // Generate and dispatch fresh 6-digit OTP to user's registered email
    await this.createAndSendVerification(
      user.id,
      user.email,
      displayName,
      isAdmin,
      user.role,
      originHost
    );

    await logAuditEvent(user.id, "LOGIN_OTP_DISPATCHED", { role: user.role });

    return {
      id: user.id,
      userId: user.id,
      email: user.email,
      role: user.role as UserRole,
      emailVerified: false,
      firstName: user.profile?.firstName || (isAdmin ? "System" : "User"),
      lastName: user.profile?.lastName || (isAdmin ? "Administrator" : ""),
      requiresOtp: true,
      requiresVerification: true,
    };
  }
}
