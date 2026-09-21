import { prisma } from "@/lib/prisma";
import { cashfreeClient } from "@/lib/cashfree";
import { LedgerService } from "@/services/ledger-service";
import { RouteService } from "@/services/route-service";
import { DEFAULT_CURRENCY, toPaise, fromPaise } from "@/lib/currency";
import { EDUCATOR_VERIFICATION_PENDING_MESSAGE } from "@/lib/auth/guards";
import crypto from "crypto";
import { OfferService } from "@/services/offer-service";

export interface CreateOrderParams {
  userId: string;
  type: "COURSE_ENROLLMENT" | "LIVE_CLASS_BOOKING";
  courseId?: string;
  liveClassSlotId?: string;
  teacherId?: string;
  selectedDate?: string;
  selectedSlotTime?: string;
  offerCode?: string;
}

export interface VerifyPaymentParams {
  userId: string;
  orderId: string; // The order ID (internalReference or providerOrderId)
  cfPaymentId?: string;
  signature?: string;
  paymentStatus?: string;
  // Legacy / fallback parameters
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  razorpaySignature?: string;
}

export interface RequestRefundParams {
  transactionId: string;
  requestedBy: string;
  reason: string;
  notes?: string;
  isAdmin?: boolean;
}

export interface ProcessRefundParams {
  transactionId: string;
  requestedBy: string;
  reason?: string;
  isAdmin?: boolean;
  existingRefundId?: string;
}

export class PaymentService {
  /**
   * Create Cashfree Payment Order (Server-Side Price Calculation)
   */
  static async createPaymentOrder(params: CreateOrderParams) {
    const { userId, type, courseId, liveClassSlotId, teacherId, selectedDate, selectedSlotTime } = params;

    // Validate User exists & is STUDENT
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    });

    if (!user || user.role !== "STUDENT") {
      throw new Error("UNAUTHORIZED: Only students can initiate purchases.");
    }

    let amountPaise = 0;
    let title = "";
    let targetTeacherId = "";
    let refCourseId: string | null = null;
    let refSlotId: string | null = null;

    if (type === "COURSE_ENROLLMENT") {
      if (!courseId) throw new Error("BAD_REQUEST: courseId is required for course enrollment.");

      const course = await prisma.course.findUnique({
        where: { id: courseId },
        include: { teacher: true },
      });

      if (!course) {
        throw new Error("NOT_FOUND: Course not found.");
      }

      const isTeacherVerified =
        course.teacher.verificationStatus === "VERIFIED" ||
        course.teacher.verificationStatus === "APPROVED";

      if (!isTeacherVerified) {
        throw new Error(`FORBIDDEN: ${EDUCATOR_VERIFICATION_PENDING_MESSAGE}`);
      }

      if (course.status !== "PUBLISHED") {
        throw new Error("NOT_FOUND: Course is unavailable for purchase.");
      }

      // Check duplicate active enrollment
      const existingEnrollment = await prisma.enrollment.findUnique({
        where: { studentId_courseId: { studentId: userId, courseId } },
      });

      if (
        existingEnrollment &&
        (existingEnrollment.status === "ACTIVE" || existingEnrollment.status === "COMPLETED")
      ) {
        throw new Error("DUPLICATE_PURCHASE: You are already enrolled in this course.");
      }


      // Price calculation directly from DB (Integer paise)
      amountPaise = toPaise(course.price);
      title = course.title;
      targetTeacherId = course.teacherId;
      refCourseId = course.id;
    } else if (type === "LIVE_CLASS_BOOKING") {
      let slot = null;

      if (liveClassSlotId) {
        slot = await prisma.liveClassSlot.findUnique({
          where: { id: liveClassSlotId },
          include: { bookings: true, teacher: true },
        });
      }

      const reqTeacherId = teacherId || (params as any).educatorId;

      if (!slot && reqTeacherId) {
        slot = await prisma.liveClassSlot.findFirst({
          where: {
            teacherId: reqTeacherId,
            status: { in: ["SCHEDULED", "OPEN"] },
          },
          include: { bookings: true, teacher: true },
          orderBy: { startTime: "asc" },
        });

        if (!slot) {
          const teacher = await prisma.teacherProfile.findFirst({
            where: { OR: [{ id: reqTeacherId }, { userId: reqTeacherId }] },
            include: { user: { include: { profile: true } } },
          });

          if (teacher) {
            const isTeacherVerified =
              teacher.verificationStatus === "VERIFIED" ||
              teacher.verificationStatus === "APPROVED";

            if (!isTeacherVerified) {
              throw new Error(`FORBIDDEN: ${EDUCATOR_VERIFICATION_PENDING_MESSAGE}`);
            }

            const rawName = `${teacher.user.profile?.firstName || ''} ${teacher.user.profile?.lastName || ''}`.trim() || "Educator";
            let startTime = new Date(Date.now() + 24 * 60 * 60 * 1000);
            if (selectedDate && selectedSlotTime) {
              const cleanTime = selectedSlotTime.split("-")[0].trim();
              const parsed = new Date(`${selectedDate} ${cleanTime}`);
              if (!isNaN(parsed.getTime())) startTime = parsed;
            }
            const endTime = new Date(startTime.getTime() + 60 * 60 * 1000);

            slot = await prisma.liveClassSlot.create({
              data: {
                title: `1-on-1 Trial Session with ${rawName}`,
                description: `Personalized 1-on-1 live classroom session with ${rawName}`,
                subject: teacher.subjects?.split(",")[0]?.trim() || "General",
                teacherId: teacher.id,
                startTime,
                endTime,
                price: teacher.hourlyRate || 300,
                classType: "ONE_TO_ONE",
                maxCapacity: 1,
                status: "OPEN",
              },
              include: { bookings: true, teacher: true },
            });
          }
        }
      }

      if (!slot) {
        slot = await prisma.liveClassSlot.findFirst({
          where: { status: { in: ["SCHEDULED", "OPEN"] } },
          include: { bookings: true, teacher: true },
          orderBy: { startTime: "asc" },
        });
      }

      if (!slot) {
        throw new Error("BAD_REQUEST: liveClassSlotId or educatorId is required for live class booking.");
      }

      const isSlotTeacherVerified =
        slot.teacher?.verificationStatus === "VERIFIED" ||
        slot.teacher?.verificationStatus === "APPROVED";

      if (!isSlotTeacherVerified) {
        throw new Error(`FORBIDDEN: ${EDUCATOR_VERIFICATION_PENDING_MESSAGE}`);
      }

      if (slot.status === "CANCELLED" || slot.status === "COMPLETED") {
        throw new Error("NOT_FOUND: Live class slot is no longer available.");
      }

      if (slot.status === "BLOCKED") {
        throw new Error("SLOT_BLOCKED: This slot has been blocked by the Educator.");
      }

      if (slot.status === "PENDING" && slot.lockedUntil && new Date(slot.lockedUntil) > new Date()) {
        // Check if there is an active checkout order by a DIFFERENT user within the 15-minute lock window
        const activeOtherOrder = await prisma.paymentOrder.findFirst({
          where: {
            liveClassSlotId: slot.id,
            userId: { not: userId },
            status: "CREATED",
            createdAt: { gte: new Date(Date.now() - 15 * 60 * 1000) },
          },
        });
        if (activeOtherOrder) {
          throw new Error("SLOT_LOCKED: This slot is currently locked in checkout by another learner. Please choose another slot or try again shortly.");
        }
      }

      // Capacity protection check
      const activeBookings = slot.bookings.filter((b) => b.status !== "CANCELLED").length;
      if (activeBookings >= slot.maxCapacity) {
        throw new Error("CLASS_FULL: Live class slot has reached maximum student capacity.");
      }

      // Check duplicate active booking
      const existingBooking = slot.bookings.find(
        (b) => b.studentId === userId && b.status !== "CANCELLED"
      );

      if (existingBooking) {
        throw new Error("DUPLICATE_PURCHASE: You have already booked this live class.");
      }

      // Apply 15-minute slot lock
      const lockExpiration = new Date(Date.now() + 15 * 60 * 1000);
      await prisma.liveClassSlot.update({
        where: { id: slot.id },
        data: {
          status: "PENDING",
          lockedUntil: lockExpiration,
        },
      });

      // Price calculation directly from DB
      amountPaise = toPaise(slot.price);
      title = slot.title;
      targetTeacherId = slot.teacherId;
      refSlotId = slot.id;
    } else {
      throw new Error("BAD_REQUEST: Invalid payment type specified.");
    }

    const originalAmountPaise = amountPaise;
    let discountAmountPaise = 0;
    let appliedOffer: any = null;

    if (params.offerCode && params.offerCode.trim() && amountPaise > 0) {
      appliedOffer = await OfferService.validateOfferCode(
        params.offerCode,
        amountPaise,
        {
          userId,
          courseId: refCourseId || undefined,
          liveClassSlotId: refSlotId || undefined,
          targetAudience: "LEARNERS",
        }
      );

      discountAmountPaise = appliedOffer.discountAmountPaise;
      amountPaise = appliedOffer.finalAmountPaise;
    }

    const internalReference = `EDU_${type}_${Date.now()}_${crypto.randomBytes(4).toString("hex").toUpperCase()}`;

    // Handle FREE Products (price === 0 or 100% discount)
    if (amountPaise === 0) {
      if (appliedOffer?.offerId) {
        await OfferService.incrementOfferUsage(appliedOffer.offerId);
      }
      if (type === "COURSE_ENROLLMENT" && refCourseId) {
        const enrollment = await prisma.enrollment.upsert({
          where: { studentId_courseId: { studentId: userId, courseId: refCourseId } },
          update: { status: "ACTIVE", enrolledAt: new Date() },
          create: { studentId: userId, courseId: refCourseId, status: "ACTIVE" },
        });

        await prisma.course.update({
          where: { id: refCourseId },
          data: { enrollmentCount: { increment: 1 } },
        });

        const transaction = await prisma.paymentTransaction.create({
          data: {
            userId,
            type,
            status: "CAPTURED",
            amountPaise: 0,
            currency: DEFAULT_CURRENCY,
            provider: "INTERNAL_FREE",
            providerOrderId: `FREE_ORD_${Date.now()}`,
            providerPaymentId: `FREE_PAY_${Date.now()}`,
            internalReference,
            courseId: refCourseId,
            enrollmentId: enrollment.id,
            capturedAt: new Date(),
          },
        });

        const courseItem = await prisma.course.findUnique({ where: { id: refCourseId } });
        try {
          if (courseItem) {
            const { EventService } = require("@/services/event-service");
            await EventService.emit("payment.captured", {
              userId,
              actorId: userId,
              actorRole: "STUDENT",
              data: {
                transactionId: transaction.id,
                amountPaise: 0,
                title: courseItem.title,
                orderId: transaction.providerOrderId,
                receipt: `rcpt_${internalReference}`,
                teacherUserId: (
                  await prisma.teacherProfile.findUnique({ where: { id: courseItem.teacherId } })
                )?.userId,
                entityType: "Course",
                entityId: courseItem.id,
              },
              idempotencyKey: `pay-${transaction.id}`,
            });

            await EventService.emit("course.enrolled", {
              userId,
              actorId: userId,
              actorRole: "STUDENT",
              data: {
                courseId: courseItem.id,
                courseTitle: courseItem.title,
                courseSlug: courseItem.slug,
                teacherUserId: (
                  await prisma.teacherProfile.findUnique({ where: { id: courseItem.teacherId } })
                )?.userId,
                entityType: "Course",
                entityId: courseItem.id,
              },
              idempotencyKey: `enroll-${courseItem.id}-${userId}`,
            });
          }
        } catch (evtErr) {
          console.error("Failed to emit free course payment events:", evtErr);
        }

        return {
          isFree: true,
          amountPaise: 0,
          amount: 0,
          transactionId: transaction.id,
          enrollmentId: enrollment.id,
          message: "Free course enrolled successfully!",
        };
      } else if (type === "LIVE_CLASS_BOOKING" && refSlotId) {
        const booking = await prisma.booking.create({
          data: {
            liveClassSlotId: refSlotId,
            studentId: userId,
            status: "CONFIRMED",
          },
        });

        const transaction = await prisma.paymentTransaction.create({
          data: {
            userId,
            type,
            status: "CAPTURED",
            amountPaise: 0,
            currency: DEFAULT_CURRENCY,
            provider: "INTERNAL_FREE",
            providerOrderId: `FREE_ORD_${Date.now()}`,
            providerPaymentId: `FREE_PAY_${Date.now()}`,
            internalReference,
            liveClassSlotId: refSlotId,
            bookingId: booking.id,
            capturedAt: new Date(),
          },
        });

        const slotItem = await prisma.liveClassSlot.findUnique({ where: { id: refSlotId } });
        try {
          if (slotItem) {
            const { EventService } = require("@/services/event-service");
            await EventService.emit("payment.captured", {
              userId,
              actorId: userId,
              actorRole: "STUDENT",
              data: {
                transactionId: transaction.id,
                amountPaise: 0,
                title: slotItem.title,
                orderId: transaction.providerOrderId,
                receipt: `rcpt_${internalReference}`,
                teacherUserId: (
                  await prisma.teacherProfile.findUnique({ where: { id: slotItem.teacherId } })
                )?.userId,
                entityType: "LiveClassSlot",
                entityId: slotItem.id,
              },
              idempotencyKey: `pay-${transaction.id}`,
            });

            await EventService.emit("class.booked", {
              userId,
              actorId: userId,
              actorRole: "STUDENT",
              data: {
                slotId: slotItem.id,
                classTitle: slotItem.title,
                startTime: slotItem.startTime.toISOString(),
                teacherUserId: (
                  await prisma.teacherProfile.findUnique({ where: { id: slotItem.teacherId } })
                )?.userId,
                entityType: "LiveClassSlot",
                entityId: slotItem.id,
              },
              idempotencyKey: `book-${slotItem.id}-${userId}`,
            });
          }
        } catch (evtErr) {
          console.error("Failed to emit free class booking payment events:", evtErr);
        }

        return {
          isFree: true,
          amountPaise: 0,
          amount: 0,
          transactionId: transaction.id,
          bookingId: booking.id,
          message: "Free live class booked successfully!",
        };
      }
    }

    // Generate Cashfree Order ID (alphanumeric, max 45 chars)
    const cfOrderId = `CF_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
    const amountRupees = fromPaise(amountPaise);
    const receipt = `rcpt_${internalReference}`;

    const studentName = user.profile
      ? `${user.profile.firstName} ${user.profile.lastName}`.trim()
      : "EduConnects Learner";
    const rawPhone = (user.profile?.phone || "").replace(/\D/g, "");
    const studentPhone = rawPhone.length >= 10 ? rawPhone.slice(-10) : "9999999999";

    const cfOrder = await cashfreeClient.createOrder({
      orderId: cfOrderId,
      orderAmount: amountRupees,
      orderCurrency: DEFAULT_CURRENCY,
      customerDetails: {
        customer_id: user.id,
        customer_email: user.email,
        customer_name: studentName,
        customer_phone: studentPhone,
      },
      orderNote: `${title.slice(0, 30)} - ${internalReference}`,
      orderTags: {
        userId,
        type,
        internalReference,
      },
    });

    const orderNotes = JSON.stringify({
      offerId: appliedOffer?.offerId || null,
      offerCode: appliedOffer?.code || null,
      originalAmountPaise,
      discountAmountPaise,
      discountType: appliedOffer?.discountType || null,
      discountValue: appliedOffer?.discountValue || null,
    });

    // Create DB records with provider: "CASHFREE"
    const orderRecord = await prisma.paymentOrder.create({
      data: {
        userId,
        type,
        referenceId: refCourseId || refSlotId || "",
        courseId: refCourseId,
        liveClassSlotId: refSlotId,
        provider: "CASHFREE",
        providerOrderId: cfOrder.order_id,
        amountPaise,
        currency: DEFAULT_CURRENCY,
        status: "CREATED",
        receipt,
        notes: orderNotes,
      },
    });

    const transactionRecord = await prisma.paymentTransaction.create({
      data: {
        userId,
        orderId: orderRecord.id,
        type,
        status: "PENDING",
        amountPaise,
        currency: DEFAULT_CURRENCY,
        provider: "CASHFREE",
        providerOrderId: cfOrder.order_id,
        internalReference,
        courseId: refCourseId,
        liveClassSlotId: refSlotId,
      },
    });

    return {
      isFree: false,
      appId: cashfreeClient.getAppId(),
      env: cashfreeClient.getEnv(),
      orderId: orderRecord.id,
      cfOrderId: cfOrder.order_id,
      paymentSessionId: cfOrder.payment_session_id,
      amountPaise,
      amount: amountRupees,
      currency: DEFAULT_CURRENCY,
      internalReference,
      transactionId: transactionRecord.id,
      appliedOffer: appliedOffer
        ? {
            offerId: appliedOffer.offerId,
            code: appliedOffer.code,
            discountAmountPaise,
            discountAmountRupees: fromPaise(discountAmountPaise),
            originalAmountPaise,
            originalAmountRupees: fromPaise(originalAmountPaise),
            summaryText: appliedOffer.summaryText,
          }
        : null,
    };
  }

  /**
   * Verify Cashfree Order & Complete Payment
   */
  static async verifyAndCompletePayment(params: VerifyPaymentParams) {
    const {
      userId,
      orderId,
      cfPaymentId,
      paymentStatus,
      razorpayOrderId,
      razorpayPaymentId,
    } = params;

    const queryOrderId = orderId || razorpayOrderId;

    if (!queryOrderId) {
      throw new Error("BAD_REQUEST: orderId is required for payment verification.");
    }

    // 1. Find transaction by Cashfree Order ID, Internal Reference, Transaction ID or PaymentOrder ID
    let transaction = await prisma.paymentTransaction.findFirst({
      where: {
        OR: [
          { providerOrderId: queryOrderId },
          { internalReference: queryOrderId },
          { id: queryOrderId },
          { orderId: queryOrderId },
        ],
        userId,
      },
      include: {
        course: true,
        liveClassSlot: true,
        user: { include: { profile: true } },
        order: true,
      },
    });

    if (!transaction) {
      throw new Error("NOT_FOUND: Payment transaction record not found.");
    }

    // Return if already captured
    if (transaction.status === "CAPTURED") {
      return {
        alreadyProcessed: true,
        transactionId: transaction.id,
        status: "CAPTURED",
        courseId: transaction.courseId,
        liveClassSlotId: transaction.liveClassSlotId,
      };
    }

    // 2. Verify with Cashfree PG
    let verifiedPaymentId = cfPaymentId || razorpayPaymentId || `cf_pay_${Date.now()}`;
    let isSuccess = paymentStatus === "SUCCESS" || Boolean(cfPaymentId) || Boolean(razorpayPaymentId);

    // If in live / sandbox mode, query Cashfree for order status if not explicitly flagged
    if (!cashfreeClient.isTestMode() || (transaction.providerOrderId && !cfPaymentId)) {
      try {
        const orderData = await cashfreeClient.fetchOrder(transaction.providerOrderId || queryOrderId);
        if (orderData.order_status === "PAID") {
          isSuccess = true;
          const payments = await cashfreeClient.fetchOrderPayments(transaction.providerOrderId || queryOrderId);
          const successfulPayment = payments.find((p) => p.payment_status === "SUCCESS");
          if (successfulPayment) {
            verifiedPaymentId = String(successfulPayment.cf_payment_id);
          }
        }
      } catch (err: any) {
        // Fallback for test mode
        if (!cashfreeClient.isTestMode()) {
          console.error("Failed to verify Cashfree order with gateway:", err);
        }
      }
    }

    if (!isSuccess) {
      await prisma.paymentTransaction.update({
        where: { id: transaction.id },
        data: {
          status: "FAILED",
          failedAt: new Date(),
          failureReason: "Payment not successful with Cashfree",
        },
      });

      if (transaction.liveClassSlotId) {
        await prisma.liveClassSlot.update({
          where: { id: transaction.liveClassSlotId },
          data: {
            status: "OPEN",
            lockedUntil: null,
          },
        });
      }

      throw new Error("SECURITY_ERROR: Payment status verification failed.");
    }

    // 3. Atomically update transaction to CAPTURED
    const updatedTransaction = await prisma.paymentTransaction.update({
      where: { id: transaction.id },
      data: {
        status: "CAPTURED",
        providerPaymentId: verifiedPaymentId,
        capturedAt: new Date(),
      },
    });

    // Update PaymentOrder status
    if (transaction.orderId) {
      await prisma.paymentOrder.update({
        where: { id: transaction.orderId },
        data: { status: "CAPTURED" },
      });
    }

    // Increment offer usage if an offer was applied
    if (transaction.order?.notes) {
      try {
        const parsedNotes = JSON.parse(transaction.order.notes);
        if (parsedNotes?.offerId) {
          await OfferService.incrementOfferUsage(parsedNotes.offerId);
        }
      } catch {}
    }

    let enrollmentId: string | undefined;
    let bookingId: string | undefined;
    let teacherId = "";

    // 4. Activate target product (Course or Live Class)
    if (transaction.type === "COURSE_ENROLLMENT" && transaction.courseId) {
      teacherId = transaction.course?.teacherId || "";
      const enrollment = await prisma.enrollment.upsert({
        where: {
          studentId_courseId: { studentId: userId, courseId: transaction.courseId },
        },
        update: { status: "ACTIVE", enrolledAt: new Date() },
        create: { studentId: userId, courseId: transaction.courseId, status: "ACTIVE" },
      });

      enrollmentId = enrollment.id;

      await prisma.course.update({
        where: { id: transaction.courseId },
        data: { enrollmentCount: { increment: 1 } },
      });

      await prisma.paymentTransaction.update({
        where: { id: transaction.id },
        data: { enrollmentId: enrollment.id },
      });
    } else if (transaction.type === "LIVE_CLASS_BOOKING" && transaction.liveClassSlotId) {
      teacherId = transaction.liveClassSlot?.teacherId || "";

      // Transactional capacity re-check
      const slot = await prisma.liveClassSlot.findUnique({
        where: { id: transaction.liveClassSlotId },
        include: { bookings: true },
      });

      if (slot) {
        const activeBookings = slot.bookings.filter((b) => b.status !== "CANCELLED").length;
        if (activeBookings >= slot.maxCapacity) {
          console.warn(`Class capacity full during payment capture for slot ${slot.id}`);
        }

        const existingBooking = slot.bookings.find(
          (b) => b.studentId === userId && b.status !== "CANCELLED"
        );

        const booking = existingBooking
          ? existingBooking
          : await prisma.booking.create({
              data: {
                liveClassSlotId: transaction.liveClassSlotId,
                studentId: userId,
                status: "CONFIRMED",
              },
            });

        bookingId = booking.id;

        const newCount = activeBookings + (existingBooking ? 0 : 1);
        const updatedSlotStatus = newCount >= slot.maxCapacity ? "FULL" : "SCHEDULED";

        await prisma.liveClassSlot.update({
          where: { id: slot.id },
          data: {
            status: updatedSlotStatus,
            lockedUntil: null,
          },
        });

        await prisma.paymentTransaction.update({
          where: { id: transaction.id },
          data: { bookingId: booking.id },
        });
      }
    }

    // 5. Execute Double-Entry Financial Ledger
    let ledgerResult = null;
    if (teacherId) {
      ledgerResult = await LedgerService.recordCapturedPaymentLedger({
        transactionId: transaction.id,
        teacherId,
        grossAmountPaise: transaction.amountPaise,
        description: `Payment for ${transaction.course?.title || transaction.liveClassSlot?.title || "EduConnects Product"}`,
      });

      // 6. Execute Teacher Split Payout if configured
      await RouteService.executeTransferIfEligible({
        transactionId: transaction.id,
        teacherId,
        providerPaymentId: verifiedPaymentId,
        teacherSharePaise: ledgerResult.teacherSharePaise,
        ledgerEntryId: ledgerResult.teacherEntry.id,
      });
    }

    // 7. Dispatch user notifications & transactional events via EventService
    const productTitle = transaction.course?.title || transaction.liveClassSlot?.title || "Product";
    try {
      const { EventService } = require("@/services/event-service");
      await EventService.emit("payment.captured", {
        userId,
        actorId: userId,
        actorRole: "STUDENT",
        data: {
          transactionId: transaction.id,
          amountPaise: transaction.amountPaise,
          title: productTitle,
          orderId: transaction.providerOrderId,
          receipt: transaction.order?.receipt || `rcpt_${transaction.internalReference || transaction.id}`,
          teacherUserId: teacherId
            ? (await prisma.teacherProfile.findUnique({ where: { id: teacherId } }))?.userId
            : undefined,
          entityType: "PaymentTransaction",
          entityId: transaction.id,
        },
        idempotencyKey: `pay-${transaction.id}`,
      });

      if (transaction.type === "COURSE_ENROLLMENT" && transaction.course) {
        await EventService.emit("course.enrolled", {
          userId,
          actorId: userId,
          actorRole: "STUDENT",
          data: {
            courseId: transaction.course.id,
            courseTitle: transaction.course.title,
            courseSlug: transaction.course.slug,
            teacherUserId: (
              await prisma.teacherProfile.findUnique({ where: { id: transaction.course.teacherId } })
            )?.userId,
            entityType: "Course",
            entityId: transaction.course.id,
          },
          idempotencyKey: `enroll-${transaction.course.id}-${userId}`,
        });
      } else if (transaction.type === "LIVE_CLASS_BOOKING" && transaction.liveClassSlot) {
        await EventService.emit("class.booked", {
          userId,
          actorId: userId,
          actorRole: "STUDENT",
          data: {
            slotId: transaction.liveClassSlot.id,
            classTitle: transaction.liveClassSlot.title,
            startTime: transaction.liveClassSlot.startTime.toISOString(),
            teacherUserId: (
              await prisma.teacherProfile.findUnique({
                where: { id: transaction.liveClassSlot.teacherId },
              })
            )?.userId,
            entityType: "LiveClassSlot",
            entityId: transaction.liveClassSlot.id,
          },
          idempotencyKey: `book-${transaction.liveClassSlot.id}-${userId}`,
        });
      }
    } catch (evtErr) {
      console.error("Failed to emit payment events:", evtErr);
    }

    return {
      success: true,
      transactionId: transaction.id,
      internalReference: transaction.internalReference,
      status: "CAPTURED",
      amountPaise: transaction.amountPaise,
      amount: fromPaise(transaction.amountPaise),
      courseId: transaction.courseId,
      liveClassSlotId: transaction.liveClassSlotId,
      enrollmentId,
      bookingId,
    };
  }

  /**
   * Request Refund (Moderated learner flow - creates PENDING refund record)
   */
  static async requestRefund(params: RequestRefundParams) {
    const { transactionId, requestedBy, reason, notes, isAdmin } = params;

    const transaction = await prisma.paymentTransaction.findUnique({
      where: { id: transactionId },
      include: {
        course: true,
        liveClassSlot: true,
      },
    });

    if (!transaction) {
      throw new Error("NOT_FOUND: Transaction record not found.");
    }

    if (!isAdmin && transaction.userId !== requestedBy) {
      throw new Error("FORBIDDEN: You can only request refunds for your own transactions.");
    }

    if (transaction.status !== "CAPTURED") {
      throw new Error(
        `INVALID_STATE: Only captured payments can be refunded (current: ${transaction.status}).`
      );
    }

    // Check if there is an existing pending, requested, or approved refund request
    const pendingRefund = await prisma.refund.findFirst({
      where: {
        transactionId,
        status: { in: ["PENDING", "REFUND_REQUESTED", "APPROVED"] },
      },
    });

    if (pendingRefund) {
      throw new Error("CONFLICT: A refund request is already pending review for this purchase.");
    }

    const completedRefund = await prisma.refund.findFirst({
      where: {
        transactionId,
        status: "REFUNDED",
      },
    });

    if (completedRefund) {
      throw new Error("CONFLICT: This transaction has already been refunded.");
    }

    const fullReason = notes && notes.trim()
      ? `${reason.trim()} - Details: ${notes.trim()}`
      : reason.trim();

    // Create the refund request with status PENDING
    const refundRecord = await prisma.refund.create({
      data: {
        transactionId: transaction.id,
        amountPaise: transaction.amountPaise,
        currency: transaction.currency,
        reason: fullReason,
        status: "PENDING",
        requestedBy,
      },
    });

    // Emit refund.requested event for in-app notification & WhatsApp
    try {
      const { EventService } = require("@/services/event-service");
      await EventService.emit("refund.requested", {
        userId: transaction.userId,
        actorId: requestedBy,
        actorRole: "STUDENT",
        data: {
          refundId: refundRecord.id,
          transactionId: transaction.id,
          amountPaise: transaction.amountPaise,
          title: transaction.course?.title || transaction.liveClassSlot?.title || "EduConnects Purchase",
          entityType: "Refund",
          entityId: refundRecord.id,
        },
        idempotencyKey: `refund-req-${refundRecord.id}`,
      });
    } catch (evtErr) {
      console.error("Failed to emit refund.requested event:", evtErr);
    }

    return refundRecord;
  }

  /**
   * Process Refund Request via Cashfree
   */
  static async processRefund(params: ProcessRefundParams) {
    const { transactionId, requestedBy, reason, isAdmin, existingRefundId } = params;

    const transaction = await prisma.paymentTransaction.findUnique({
      where: { id: transactionId },
      include: {
        course: true,
        liveClassSlot: true,
        enrollment: true,
        booking: true,
      },
    });

    if (!transaction) {
      throw new Error("NOT_FOUND: Transaction record not found.");
    }

    if (!isAdmin && transaction.userId !== requestedBy) {
      throw new Error("FORBIDDEN: You can only request refunds for your own transactions.");
    }

    if (transaction.status !== "CAPTURED") {
      throw new Error(
        `INVALID_STATE: Only captured payments can be refunded (current: ${transaction.status}).`
      );
    }

    // Call Cashfree Refund API
    let providerRefundId = `cf_rfnd_${Date.now()}`;
    const refundId = `rfnd_${Date.now()}_${crypto.randomBytes(3).toString("hex")}`;
    const amountRupees = fromPaise(transaction.amountPaise);

    if (transaction.providerOrderId) {
      try {
        const cfRefund = await cashfreeClient.createRefund({
          orderId: transaction.providerOrderId,
          refundId,
          refundAmount: amountRupees,
          refundNote: reason || "User requested refund",
        });
        providerRefundId = String(cfRefund.cf_refund_id || cfRefund.refund_id);
      } catch (err: any) {
        if (!cashfreeClient.isTestMode()) {
          throw new Error(`Cashfree refund processing failed: ${err.message}`);
        }
      }
    }

    // Find existing pending or matching refund if exists
    let refundRecord;
    const targetRefundId = existingRefundId || (
      await prisma.refund.findFirst({
        where: {
          transactionId: transaction.id,
          status: { in: ["PENDING", "REFUND_REQUESTED", "APPROVED"] },
        },
      })
    )?.id;

    if (targetRefundId) {
      refundRecord = await prisma.refund.update({
        where: { id: targetRefundId },
        data: {
          providerRefundId,
          status: "REFUNDED",
          approvedBy: requestedBy,
          reason: reason || undefined,
        },
      });
    } else {
      // Create Refund log
      refundRecord = await prisma.refund.create({
        data: {
          transactionId: transaction.id,
          providerRefundId,
          amountPaise: transaction.amountPaise,
          currency: transaction.currency,
          reason: reason || "Refund approved",
          status: "REFUNDED",
          requestedBy,
          approvedBy: isAdmin ? requestedBy : null,
        },
      });
    }

    // Update Transaction status
    await prisma.paymentTransaction.update({
      where: { id: transaction.id },
      data: { status: "REFUNDED" },
    });

    // Revoke course access or cancel booking
    if (transaction.enrollmentId) {
      await prisma.enrollment.update({
        where: { id: transaction.enrollmentId },
        data: { status: "CANCELLED" },
      });
    }

    if (transaction.bookingId) {
      await prisma.booking.update({
        where: { id: transaction.bookingId },
        data: { status: "CANCELLED" },
      });
    }

    // Record Ledger Reversal
    const teacherId = transaction.course?.teacherId || transaction.liveClassSlot?.teacherId;
    if (teacherId) {
      await LedgerService.recordRefundLedger({
        transactionId: transaction.id,
        teacherId,
        refundAmountPaise: transaction.amountPaise,
      });
    }

    // Emit refund.processed event for in-app notification, email & WhatsApp
    try {
      const { EventService } = require("@/services/event-service");
      await EventService.emit("refund.processed", {
        userId: transaction.userId,
        actorId: requestedBy,
        actorRole: isAdmin ? "ADMIN" : "STUDENT",
        data: {
          refundId: refundRecord.id,
          transactionId: transaction.id,
          amountPaise: transaction.amountPaise,
          title: transaction.course?.title || transaction.liveClassSlot?.title || "EduConnects Purchase",
          orderId: transaction.providerOrderId,
          entityType: "Refund",
          entityId: refundRecord.id,
        },
        idempotencyKey: `refund-proc-${refundRecord.id}`,
      });
    } catch (evtErr) {
      console.error("Failed to emit refund.processed event:", evtErr);
    }

    return refundRecord;
  }
}
