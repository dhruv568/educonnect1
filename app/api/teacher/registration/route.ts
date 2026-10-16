export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { cashfreeClient } from "@/lib/cashfree";
import { verifyCaptchaSolution } from "@/lib/auth/captcha";
import { hashPassword } from "@/lib/auth/password";
import { generateOTP, generateVerificationToken, hashToken, verifyTokenHash } from "@/lib/auth/tokens";
import { EmailService } from "@/lib/email/email-service";
import { apiSuccess, apiBadRequest, apiError } from "@/lib/api-response";
import { encodeSession, getCookieDomain } from "@/lib/auth/session";
import { parseHourlyRate } from "@/lib/currency";
import { UserSession } from "@/types/auth";
import { verifiedEmailsStore } from "@/lib/auth/email-pre-registration";
import crypto from "crypto";

// GET ?email=...
// Returns current status of educator registration
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get("email")?.toLowerCase().trim();
  if (!email) {
    return apiBadRequest("Email is required.");
  }

  // Check if already registered
  const existingUser = await prisma.user.findUnique({
    where: { email },
    include: { teacherProfile: true, profile: true },
  });
  if (existingUser) {
    const isFullyRegistered =
      existingUser.status === "ACTIVE" &&
      existingUser.emailVerified &&
      existingUser.teacherProfile !== null;
    if (isFullyRegistered) {
      return apiSuccess({
        status: "COMPLETED",
        registered: true,
        message: "Email already registered. Please log in to your account.",
      });
    }
  }

  const pending = await prisma.pendingRegistration.findUnique({
    where: { email },
  });

  if (!pending) {
    if (existingUser) {
      return apiSuccess({
        status: "PENDING",
        exists: true,
        registered: false,
        firstName: existingUser.profile?.firstName || "",
        lastName: existingUser.profile?.lastName || "",
        phone: existingUser.profile?.phone || "",
        step: existingUser.emailVerified ? 3 : 2,
        otpVerified: existingUser.emailVerified,
        profile: null,
        orderData: null,
      });
    }
    return apiSuccess({
      status: "NOT_FOUND",
      exists: false,
    });
  }

  let data: any = {};
  try {
    if (pending.registrationData) data = JSON.parse(pending.registrationData);
  } catch {}

  return apiSuccess({
    status: "PENDING",
    exists: true,
    firstName: pending.firstName,
    lastName: pending.lastName,
    phone: data.phone || "",
    step: data.step || 1,
    otpVerified: Boolean(data.otpVerified),
    profile: data.profile || null,
    orderData: data.orderData || null,
  });
}

// POST
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;
    const rawHost =
      request.headers.get("x-forwarded-host") ||
      request.headers.get("x-original-host") ||
      request.headers.get("host") ||
      undefined;

    // STEP 1: INITIATE BASIC INFO
    if (action === "STEP1_INITIATE") {
      const {
        firstName,
        lastName,
        email,
        phone,
        password,
        confirmPassword,
        captchaToken,
        captchaAnswer,
      } = body;

      if (!firstName?.trim() || !lastName?.trim() || !email?.trim() || !password) {
        return apiBadRequest("Please provide your full name, email, and password.");
      }

      if (password !== confirmPassword) {
        return apiBadRequest("Passwords do not match.");
      }

      if (password.length < 8) {
        return apiBadRequest("Password must be at least 8 characters.");
      }

      if (captchaToken && captchaAnswer) {
        const captchaRes = verifyCaptchaSolution(captchaToken, captchaAnswer);
        if (!captchaRes.valid) {
          return apiBadRequest(captchaRes.error || "Security verification failed. Please complete the CAPTCHA.");
        }
      }

      const normalizedEmail = email.toLowerCase().trim();
      const passwordHash = await hashPassword(password);

      // Ensure user doesn't already exist as an active account
      const existingUser = await prisma.user.findUnique({
        where: { email: normalizedEmail },
        include: { teacherProfile: true },
      });
      if (existingUser) {
        const isAlreadyActive =
          existingUser.status === "ACTIVE" &&
          existingUser.emailVerified &&
          existingUser.teacherProfile !== null;
        if (isAlreadyActive) {
          return apiBadRequest("Email already registered. Please log in to your account.");
        }
        // User exists in pending/unverified registration state:
        // Continue existing registration without deleting records or creating duplicate user
        await prisma.user.update({
          where: { id: existingUser.id },
          data: {
            passwordHash,
          },
        });
      }
      const otp = generateOTP();
      const rawToken = generateVerificationToken();
      const codeHash = hashToken(otp);
      const tokenHash = hashToken(rawToken);
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
      const isAlreadyVerified = Boolean(body.emailVerified || verifiedEmailsStore.has(normalizedEmail));

      const regData = {
        phone: phone?.trim() || "",
        step: isAlreadyVerified ? 3 : 2,
        otpVerified: isAlreadyVerified,
        paid: false,
      };

      await prisma.pendingRegistration.upsert({
        where: { email: normalizedEmail },
        create: {
          email: normalizedEmail,
          passwordHash,
          role: "TEACHER",
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          registrationData: JSON.stringify(regData),
          codeHash,
          tokenHash,
          expiresAt,
          attempts: 0,
        },
        update: {
          passwordHash,
          role: "TEACHER",
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          registrationData: JSON.stringify(regData),
          codeHash,
          tokenHash,
          expiresAt,
          attempts: 0,
        },
      });

      if (isAlreadyVerified) {
        return apiSuccess({
          email: normalizedEmail,
          step: 3,
          otpVerified: true,
          message: "Email verified. Please complete your professional profile.",
        });
      }

      // Send OTP email
      await EmailService.sendVerificationOTP({
        email: normalizedEmail,
        userName: firstName.trim(),
        otp,
        verificationUrl: `https://educators.educonnects.co.in/register?email=${encodeURIComponent(normalizedEmail)}`,
        expiresInMinutes: 15,
        role: "TEACHER",
        theme: "educator",
      });

      return apiSuccess({
        email: normalizedEmail,
        step: 2,
        message: "A 6-digit verification code has been dispatched to your email.",
      });
    }

    // RESEND OTP
    if (action === "RESEND_OTP") {
      const email = body.email?.toLowerCase().trim();
      if (!email) return apiBadRequest("Email is required.");

      const pending = await prisma.pendingRegistration.findUnique({
        where: { email },
      });
      if (!pending) return apiBadRequest("Registration record not found.");

      const otp = generateOTP();
      const codeHash = hashToken(otp);
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

      await prisma.pendingRegistration.update({
        where: { email },
        data: {
          codeHash,
          expiresAt,
          attempts: 0,
        },
      });

      await EmailService.sendVerificationOTP({
        email,
        userName: pending.firstName,
        otp,
        verificationUrl: `https://educators.educonnects.co.in/register?email=${encodeURIComponent(email)}`,
        expiresInMinutes: 15,
        role: "TEACHER",
        theme: "educator",
      });

      return apiSuccess({ message: "Verification code resent." });
    }

    // STEP 2: VERIFY OTP
    if (action === "STEP2_VERIFY_OTP") {
      const { email, otp } = body;
      const normalizedEmail = email?.toLowerCase().trim();
      if (!normalizedEmail || !otp?.trim()) {
        return apiBadRequest("Please provide both email and 6-digit verification code.");
      }

      const pending = await prisma.pendingRegistration.findUnique({
        where: { email: normalizedEmail },
      });
      if (!pending) {
        const existing = await prisma.user.findUnique({
          where: { email: normalizedEmail },
          include: { teacherProfile: true },
        });
        if (existing) {
          const isAlreadyActive =
            existing.status === "ACTIVE" &&
            existing.emailVerified &&
            existing.teacherProfile !== null;
          if (isAlreadyActive) {
            return apiBadRequest("Email already registered. Please log in to your account.");
          }
          if (existing.emailVerified) {
            return apiSuccess({
              verified: true,
              step: 3,
              message: "Email verified successfully.",
            });
          }
        }
        return apiBadRequest("Pending registration record not found. Please restart registration.");
      }

      if (pending.attempts >= 5) {
        return apiBadRequest("Too many failed verification attempts. Please request a new code.");
      }

      if (new Date() > pending.expiresAt) {
        return apiBadRequest("Verification code has expired. Please request a new code.");
      }

      const isValid = verifyTokenHash(otp.trim(), pending.codeHash);
      if (!isValid) {
        await prisma.pendingRegistration.update({
          where: { id: pending.id },
          data: { attempts: pending.attempts + 1 },
        });
        return apiBadRequest("Incorrect verification code. Please check your inbox.");
      }

      // If user already exists in main database, verify their record idempotently
      const existingUser = await prisma.user.findUnique({
        where: { email: normalizedEmail },
        include: { teacherProfile: true },
      });
      if (existingUser) {
        const isAlreadyActive =
          existingUser.status === "ACTIVE" &&
          existingUser.emailVerified &&
          existingUser.teacherProfile !== null;
        if (isAlreadyActive) {
          return apiBadRequest("Email already registered. Please log in to your account.");
        }
        await prisma.user.update({
          where: { id: existingUser.id },
          data: {
            emailVerified: true,
            emailVerifiedAt: existingUser.emailVerifiedAt || new Date(),
          },
        });
      }

      // Mark OTP verified in registrationData
      let data: any = {};
      try {
        if (pending.registrationData) data = JSON.parse(pending.registrationData);
      } catch {}

      data.otpVerified = true;
      data.step = 3;

      await prisma.pendingRegistration.update({
        where: { id: pending.id },
        data: {
          registrationData: JSON.stringify(data),
          attempts: 0,
        },
      });

      return apiSuccess({
        verified: true,
        step: 3,
        message: "Email verified successfully.",
      });
    }

    // STEP 3: SAVE PROFESSIONAL PROFILE
    if (action === "STEP3_SAVE_PROFILE") {
      const {
        email,
        headline,
        subjects,
        qualifications,
        experienceYears,
        specialization,
        hourlyRate,
        teachingMode,
        languages,
        bio,
      } = body;

      const normalizedEmail = email?.toLowerCase().trim();
      if (!normalizedEmail) return apiBadRequest("Email is required.");

      const pending = await prisma.pendingRegistration.findUnique({
        where: { email: normalizedEmail },
      });
      if (!pending) return apiBadRequest("Registration record not found.");

      let data: any = {};
      try {
        if (pending.registrationData) data = JSON.parse(pending.registrationData);
      } catch {}

      if (!data.otpVerified) {
        return apiBadRequest("Please verify your email OTP before proceeding.");
      }

      const parsedHourlyRate = parseHourlyRate(hourlyRate);
      if (!parsedHourlyRate || parsedHourlyRate <= 0) {
        return apiBadRequest("Hourly rate must be a valid positive amount.");
      }

      data.profile = {
        headline: headline?.trim() || "Independent Educator",
        subjects: subjects?.trim() || "General",
        qualifications: qualifications?.trim() || "",
        experienceYears: Number(experienceYears) || 1,
        specialization: specialization?.trim() || "",
        hourlyRate: parsedHourlyRate,
        teachingMode: teachingMode || "ONLINE",
        languages: languages?.trim() || "English",
        bio: bio?.trim() || "",
      };
      data.step = 4;

      await prisma.pendingRegistration.update({
        where: { id: pending.id },
        data: { registrationData: JSON.stringify(data) },
      });

      return apiSuccess({
        step: 4,
        message: "Professional profile recorded.",
      });
    }

    // STEP 5: CREATE CASHFREE PAYMENT ORDER (₹99)
    if (action === "STEP5_CREATE_ORDER") {
      const email = body.email?.toLowerCase().trim();
      if (!email) return apiBadRequest("Email is required.");

      const pending = await prisma.pendingRegistration.findUnique({
        where: { email },
      });
      if (!pending) return apiBadRequest("Registration record not found.");

      let data: any = {};
      try {
        if (pending.registrationData) data = JSON.parse(pending.registrationData);
      } catch {}

      if (!data.otpVerified) {
        return apiBadRequest("Email must be verified first.");
      }

      const orderId = `EDU_TCH_REG_${Date.now()}_${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
      const amountRupees = 99.00;
      const origin =
        request.nextUrl?.origin ||
        (rawHost ? `https://${rawHost}` : "https://educators.educonnects.co.in");

      const cfOrder = await cashfreeClient.createOrder({
        orderId,
        orderAmount: amountRupees,
        orderCurrency: "INR",
        customerDetails: {
          customer_id: pending.id.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 50),
          customer_email: email,
          customer_phone: data.phone?.replace(/[^0-9]/g, "") || "9999999999",
          customer_name: `${pending.firstName} ${pending.lastName}`.trim() || "Educator Applicant",
        },
        orderMeta: {
          return_url: `${origin}/teacher/register?order_id={order_id}&step=6&email=${encodeURIComponent(email)}`,
        },
        orderNote: "EduConnects Educator Registration Fee — ₹99",
        orderTags: {
          type: "EDUCATOR_REGISTRATION",
          email,
        },
      });

      data.orderData = {
        orderId,
        cfOrderId: cfOrder.cf_order_id,
        paymentSessionId: cfOrder.payment_session_id,
        amount: amountRupees,
        env: cashfreeClient.getEnv(),
      };

      await prisma.pendingRegistration.update({
        where: { id: pending.id },
        data: { registrationData: JSON.stringify(data) },
      });

      return apiSuccess({
        orderId,
        cfOrderId: cfOrder.cf_order_id,
        paymentSessionId: cfOrder.payment_session_id,
        orderAmount: amountRupees,
        env: cashfreeClient.getEnv(),
      });
    }

    // STEP 6: VERIFY CASHFREE PAYMENT & COMPLETE REGISTRATION
    if (action === "STEP6_VERIFY_PAYMENT") {
      const { email, orderId, cfPaymentId } = body;
      const normalizedEmail = email?.toLowerCase().trim();
      if (!normalizedEmail && !orderId) {
        return apiBadRequest("Missing email or order identifier.");
      }

      // Lookup pending registration by email, with fallback by orderId
      let pending = normalizedEmail
        ? await prisma.pendingRegistration.findUnique({
            where: { email: normalizedEmail },
          })
        : null;

      if (!pending && orderId) {
        pending = await prisma.pendingRegistration.findFirst({
          where: { registrationData: { contains: orderId } },
        });
      }

      const activeEmail = normalizedEmail || pending?.email;

      if (!pending) {
        // If pending record was already deleted, check if user is already completed and active (idempotency)
        const existing = await prisma.user.findFirst({
          where: {
            OR: [
              ...(activeEmail ? [{ email: activeEmail }] : []),
              ...(orderId
                ? [
                    {
                      paymentTransactions: {
                        some: {
                          OR: [
                            { providerOrderId: orderId },
                            { internalReference: orderId },
                          ],
                        },
                      },
                    },
                  ]
                : []),
            ],
          },
          include: { profile: true, teacherProfile: true },
        });
        if (existing && existing.status === "ACTIVE") {
          const userSession: UserSession = {
            id: existing.id,
            userId: existing.id,
            email: existing.email,
            role: "TEACHER",
            emailVerified: true,
            firstName: existing.profile?.firstName || "Educator",
            lastName: existing.profile?.lastName || "",
          };
          const response = apiSuccess(
            {
              user: userSession,
              redirectUrl: "/teacher/dashboard",
            },
            "Educator registration already confirmed! Welcome to EduConnects."
          );
          const isProd = process.env.NODE_ENV === "production";
          const isEduconnects = Boolean(rawHost && rawHost.includes("educonnects.co.in"));
          const domain = getCookieDomain(rawHost);
          const cookieOptions: any = {
            httpOnly: true,
            secure: isProd || isEduconnects,
            sameSite: "lax",
            path: "/",
            maxAge: 7 * 24 * 60 * 60,
          };
          if (domain) cookieOptions.domain = domain;
          response.cookies.set("educonnects_session", encodeSession(userSession), cookieOptions);
          return response;
        }
        return apiBadRequest("Registration record not found.");
      }

      let data: any = {};
      try {
        if (pending.registrationData) data = JSON.parse(pending.registrationData);
      } catch {}

      // Resolve the EXACT merchant order ID created by backend:
      // data.orderData?.orderId is the exact order_id sent during Cashfree order creation.
      // If frontend passed cfOrderId, {order_id} placeholder, or orderId, we always use the canonical orderId so Cashfree fetch succeeds!
      const targetOrderId = data.orderData?.orderId || orderId;

      if (!targetOrderId || targetOrderId === "{order_id}") {
        return apiBadRequest("Valid order identifier is required for payment verification.");
      }

      // Verify payment with Cashfree (Do NOT bypass verification)
      let isPaymentSuccess = false;
      let verifiedPaymentId = cfPaymentId || "";
      let paymentMessage = "";

      try {
        const orderStatus = await cashfreeClient.fetchOrder(targetOrderId);

        if (orderStatus && orderStatus.order_status === "PAID") {
          isPaymentSuccess = true;
          try {
            const payments = await cashfreeClient.fetchOrderPayments(targetOrderId);
            const successfulPayment = payments.find((p) => p.payment_status === "SUCCESS");
            if (successfulPayment) {
              verifiedPaymentId = String(successfulPayment.cf_payment_id);
            }
          } catch {
            // Order is already confirmed PAID; non-fatal if payment listing fails
          }
        } else if (orderStatus && orderStatus.order_status === "ACTIVE") {
          // If order is active, check payments array in case payment succeeded but order status is syncing
          try {
            const payments = await cashfreeClient.fetchOrderPayments(targetOrderId);
            const successfulPayment = payments.find((p) => p.payment_status === "SUCCESS");
            if (successfulPayment) {
              isPaymentSuccess = true;
              verifiedPaymentId = String(successfulPayment.cf_payment_id);
            } else {
              paymentMessage = "Cashfree order status is ACTIVE, but no successful payment was found.";
            }
          } catch (pErr: any) {
            paymentMessage = pErr.message || "Payment is still active and awaiting completion.";
          }
        } else {
          paymentMessage = `Cashfree order status is ${orderStatus?.order_status || "UNKNOWN"}. Payment was not completed.`;
        }
      } catch (err: any) {
        paymentMessage = err.message || "Failed to fetch order status from Cashfree.";
      }

      if (!isPaymentSuccess) {
        return apiBadRequest(paymentMessage || "Payment not completed or failed. Your educator account has not been activated.");
      }

      // Mark payment as paid in registrationData
      data.paid = true;
      data.step = 6;
      await prisma.pendingRegistration.update({
        where: { id: pending.id },
        data: { registrationData: JSON.stringify(data) },
      });

      // Complete registration: Create or update User, Profile, TeacherProfile, and PaymentTransaction transactionally!
      const prof = data.profile || {};
      const now = new Date();

      const createdUser = await prisma.$transaction(async (tx) => {
        const existingUser = await tx.user.findUnique({
          where: { email: normalizedEmail },
          include: {
            profile: true,
            teacherProfile: true,
          },
        });

        let finalUser;

        if (existingUser) {
          finalUser = await tx.user.update({
            where: { id: existingUser.id },
            data: {
              passwordHash: pending.passwordHash || existingUser.passwordHash,
              role: "TEACHER",
              status: "ACTIVE",
              emailVerified: true,
              emailVerifiedAt: existingUser.emailVerifiedAt || now,
            },
            include: {
              profile: true,
              teacherProfile: true,
            },
          });

          if (finalUser.profile) {
            await tx.profile.update({
              where: { userId: finalUser.id },
              data: {
                firstName: pending.firstName || finalUser.profile.firstName,
                lastName: pending.lastName || finalUser.profile.lastName,
                phone: data.phone || finalUser.profile.phone,
              },
            });
          } else {
            await tx.profile.create({
              data: {
                userId: finalUser.id,
                firstName: pending.firstName,
                lastName: pending.lastName,
                phone: data.phone || null,
              },
            });
          }

          if (finalUser.teacherProfile) {
            await tx.teacherProfile.update({
              where: { userId: finalUser.id },
              data: {
                headline: prof.headline || finalUser.teacherProfile.headline,
                subjects: prof.subjects || finalUser.teacherProfile.subjects,
                experienceYears: Number(prof.experienceYears) || finalUser.teacherProfile.experienceYears,
                hourlyRate: parseHourlyRate(prof.hourlyRate) ?? finalUser.teacherProfile.hourlyRate,
                qualifications: prof.qualifications || finalUser.teacherProfile.qualifications,
                languages: prof.languages || finalUser.teacherProfile.languages,
                teachingMode: prof.teachingMode || finalUser.teacherProfile.teachingMode,
                bio: prof.bio || prof.specialization || finalUser.teacherProfile.bio,
              },
            });
          } else {
            await tx.teacherProfile.create({
              data: {
                userId: finalUser.id,
                headline: prof.headline || "Educator",
                subjects: prof.subjects || "Mathematics",
                experienceYears: Number(prof.experienceYears) || 1,
                hourlyRate: parseHourlyRate(prof.hourlyRate) ?? 300,
                qualifications: prof.qualifications || null,
                languages: prof.languages || "English",
                teachingMode: prof.teachingMode || "ONLINE",
                bio: prof.bio || prof.specialization || null,
                verificationStatus: "PENDING",
              },
            });
          }
        } else {
          finalUser = await tx.user.create({
            data: {
              email: activeEmail,
              passwordHash: pending.passwordHash,
              role: "TEACHER",
              status: "ACTIVE",
              emailVerified: true,
              emailVerifiedAt: now,
              profile: {
                create: {
                  firstName: pending.firstName,
                  lastName: pending.lastName,
                  phone: data.phone || null,
                },
              },
              teacherProfile: {
                create: {
                  headline: prof.headline || "Educator",
                  subjects: prof.subjects || "Mathematics",
                  experienceYears: Number(prof.experienceYears) || 1,
                  hourlyRate: parseHourlyRate(prof.hourlyRate) ?? 300,
                  qualifications: prof.qualifications || null,
                  languages: prof.languages || "English",
                  teachingMode: prof.teachingMode || "ONLINE",
                  bio: prof.bio || prof.specialization || null,
                  verificationStatus: "PENDING",
                },
              },
            },
            include: {
              profile: true,
              teacherProfile: true,
            },
          });
        }

        // Record Payment Transaction for ₹99 idempotently
        const existingTx = await tx.paymentTransaction.findFirst({
          where: {
            OR: [
              { providerOrderId: targetOrderId },
              { internalReference: targetOrderId },
            ],
          },
        });

        if (!existingTx) {
          await tx.paymentTransaction.create({
            data: {
              userId: finalUser.id,
              type: "EDUCATOR_REGISTRATION",
              status: "CAPTURED",
              amountPaise: 9900,
              currency: "INR",
              provider: "CASHFREE",
              providerOrderId: targetOrderId,
              providerPaymentId: verifiedPaymentId || cfPaymentId || `cf_reg_${Date.now()}`,
              internalReference: targetOrderId,
              capturedAt: now,
            },
          });
        }

        // Remove from pending registrations
        await tx.pendingRegistration.deleteMany({
          where: { email: activeEmail },
        });

        return finalUser;
      }, {
        maxWait: 10000,
        timeout: 20000,
      });

      // Send welcome email
      await EmailService.sendWelcomeEmail({
        email: createdUser.email,
        userName: createdUser.profile?.firstName || "Educator",
      });

      // Build session payload
      const userSession: UserSession = {
        id: createdUser.id,
        userId: createdUser.id,
        email: createdUser.email,
        role: "TEACHER",
        emailVerified: true,
        firstName: createdUser.profile?.firstName || "Educator",
        lastName: createdUser.profile?.lastName || "",
      };

      const response = apiSuccess(
        {
          user: userSession,
          redirectUrl: "/teacher/dashboard",
        },
        "Educator registration and ₹99 payment confirmed successfully! Welcome to EduConnects."
      );

      // Set session cookie
      const isProd = process.env.NODE_ENV === "production";
      const isEduconnects = Boolean(rawHost && rawHost.includes("educonnects.co.in"));
      const domain = getCookieDomain(rawHost);

      const cookieOptions: any = {
        httpOnly: true,
        secure: isProd || isEduconnects,
        sameSite: "lax",
        path: "/",
        maxAge: 7 * 24 * 60 * 60,
      };
      if (domain) {
        cookieOptions.domain = domain;
      }
      response.cookies.set("educonnects_session", encodeSession(userSession), cookieOptions);

      return response;
    }

    return apiBadRequest("Invalid action specified.");
  } catch (error: any) {
    return apiError(error.message || "An unexpected error occurred during registration.", 500);
  }
}
