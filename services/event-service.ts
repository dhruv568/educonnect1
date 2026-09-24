import { NotificationService } from "./notification-service";
import { EmailService } from "@/lib/email/email-service";
import { generateNotificationEmailHtml } from "@/lib/email/templates/verification-templates";
import { getEmailProvider } from "@/lib/email/email-service";
import { prisma } from "@/lib/prisma";
import { formatPaise } from "@/lib/currency";
import { getPublicAppUrl } from "@/lib/app-url";
import { WhatsAppService } from "./whatsapp-service";

export type EventType =
  | "auth.welcome"
  | "auth.email_verified"
  | "auth.password_changed"
  | "teacher.verified"
  | "teacher.rejected"
  | "class.booked"
  | "class.cancelled"
  | "class.starting_soon"
  | "class.started"
  | "class.completed"
  | "course.enrolled"
  | "course.published"
  | "course.completed"
  | "course.review_received"
  | "payment.captured"
  | "payment.failed"
  | "refund.requested"
  | "refund.approved"
  | "refund.processed"
  | "refund.rejected"
  | "payout.processed"
  | "system.announcement";

export interface EventPayload {
  userId: string;
  actorId?: string;
  actorRole?: string;
  data?: Record<string, any>;
  idempotencyKey?: string;
}

export class EventService {
  /**
   * Emit an event and trigger in-app notification, email, WhatsApp, and activity logging
   */
  static async emit(event: EventType, payload: EventPayload) {
    const { userId, actorId, actorRole, data = {}, idempotencyKey } = payload;

    try {
      // 1. Fetch target user and notification preferences
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { profile: true, notificationPreference: true, teacherProfile: true },
      });

      if (!user) return;

      const userName = user.profile ? `${user.profile.firstName} ${user.profile.lastName}`.trim() : user.email;
      const userPhone = user.profile?.phone || user.teacherProfile?.contactPhone || null;
      const prefs = user.notificationPreference || {
        emailCourseUpdates: true,
        emailClassReminders: true,
        emailPaymentUpdates: true,
        emailMarketing: false,
        inAppEnabled: true,
      };

      // 2. Dispatch specific event logic
      switch (event) {
        case "auth.welcome": {
          await NotificationService.create({
            userId,
            type: "WELCOME",
            title: "Welcome to EduConnects! 🎓",
            message: "Your account is set up. Explore courses or schedule live learning sessions.",
            actionUrl: user.role === "TEACHER" ? "/teacher/dashboard" : "/courses",
            idempotencyKey,
          });

          // WhatsApp Trigger
          try {
            if (user.role === "TEACHER") {
              await WhatsAppService.sendEventNotification({
                userId,
                phone: userPhone,
                eventType: "EDUCATOR_REGISTRATION",
                data: {
                  name: userName,
                  onboardingUrl: `${getPublicAppUrl()}/teacher/onboarding`,
                },
                idempotencyKey: `wa-reg-teacher-${userId}`,
              });
            } else {
              await WhatsAppService.sendEventNotification({
                userId,
                phone: userPhone,
                eventType: "LEARNER_REGISTRATION",
                data: {
                  name: userName,
                  portalUrl: `${getPublicAppUrl()}/courses`,
                },
                idempotencyKey: `wa-reg-learner-${userId}`,
              });
            }
          } catch (waErr) {
            console.error("WhatsApp welcome trigger warning:", waErr);
          }
          break;
        }

        case "teacher.verified": {
          await NotificationService.create({
            userId,
            type: "TEACHER_VERIFIED",
            title: "Verification Approved! 🎉",
            message: "Your teacher application has been verified. You can now host live classes and publish courses.",
            actionUrl: "/teacher/dashboard",
            idempotencyKey,
          });

          if (prefs.emailCourseUpdates) {
            const provider = getEmailProvider();
            await provider.sendNotificationEmail({
              email: user.email,
              recipientName: userName,
              subject: "Teacher Application Approved 🎉",
              headline: "Congratulations! You are now a Verified Educator",
              bodyText: "Your credentials have been audited and approved by EduConnects Administration. You are now live on our educator platform.",
              statusBadgeText: "APPROVED",
              statusBadgeVariant: "success",
              actionUrl: `${getPublicAppUrl()}/teacher/dashboard`,
              actionText: "Go to Teacher Dashboard",
            });
          }

          // WhatsApp Trigger
          try {
            await WhatsAppService.sendEventNotification({
              userId,
              phone: userPhone,
              eventType: "EDUCATOR_VERIFIED",
              data: {
                name: userName,
                dashboardUrl: `${getPublicAppUrl()}/teacher/dashboard`,
              },
              idempotencyKey: `wa-teach-verif-${userId}`,
            });
          } catch (waErr) {
            console.error("WhatsApp educator verified warning:", waErr);
          }
          break;
        }

        case "teacher.rejected": {
          const reason = data.reason || "Application did not meet verification guidelines.";
          await NotificationService.create({
            userId,
            type: "TEACHER_REJECTED",
            title: "Teacher Verification Action Needed",
            message: `Your application requires revisions: ${reason}`,
            actionUrl: "/teacher/onboarding",
            idempotencyKey,
          });

          if (prefs.emailCourseUpdates) {
            const provider = getEmailProvider();
            await provider.sendNotificationEmail({
              email: user.email,
              recipientName: userName,
              subject: "EduConnects Verification Update",
              headline: "Revisions Required for Educator Profile",
              bodyText: "Our administrative team reviewed your application and requested updating your documents or profile details.",
              statusBadgeText: "REVISIONS NEEDED",
              statusBadgeVariant: "warning",
              reasonText: reason,
              actionUrl: `${getPublicAppUrl()}/teacher/onboarding`,
              actionText: "Update Application",
            });
          }

          // WhatsApp Trigger
          try {
            await WhatsAppService.sendEventNotification({
              userId,
              phone: userPhone,
              eventType: "EDUCATOR_REJECTED",
              data: {
                name: userName,
                reason,
                onboardingUrl: `${getPublicAppUrl()}/teacher/onboarding`,
              },
              idempotencyKey: `wa-teach-rej-${userId}-${Date.now()}`,
            });
          } catch (waErr) {
            console.error("WhatsApp educator rejected warning:", waErr);
          }
          break;
        }

        case "class.booked": {
          const classTitle = data.classTitle || "Live Class";
          const startTime = data.startTime || "";
          await NotificationService.create({
            userId,
            type: "CLASS_BOOKED",
            title: "Live Class Booked 📅",
            message: `You are booked for "${classTitle}" starting ${startTime}.`,
            actionUrl: "/student/dashboard",
            data,
            idempotencyKey,
          });

          // Also notify teacher if teacherId provided
          if (data.teacherUserId && data.teacherUserId !== userId) {
            await NotificationService.create({
              userId: data.teacherUserId,
              type: "CLASS_BOOKED",
              title: "New Student Booking 🎓",
              message: `${userName} booked your class "${classTitle}".`,
              actionUrl: "/teacher/live-classes",
              data,
            });
          }

          if (prefs.emailClassReminders) {
            const provider = getEmailProvider();
            await provider.sendNotificationEmail({
              email: user.email,
              recipientName: userName,
              subject: `Booking Confirmed: ${classTitle}`,
              headline: "Your Live Session is Confirmed!",
              bodyText: `You have successfully reserved your seat for "${classTitle}". Make sure to join on time!`,
              statusBadgeText: "BOOKED",
              statusBadgeVariant: "success",
              actionUrl: `${getPublicAppUrl()}/student/dashboard`,
              actionText: "View My Schedule",
            });
          }

          // WhatsApp Trigger
          try {
            await WhatsAppService.sendEventNotification({
              userId,
              phone: userPhone,
              eventType: "BOOKING_CONFIRMED",
              data: {
                name: userName,
                classTitle,
                startTime: startTime || "Scheduled Session",
                joinUrl: `${getPublicAppUrl()}/student/dashboard`,
              },
              idempotencyKey: `wa-book-${data.slotId || "slot"}-${userId}`,
            });
          } catch (waErr) {
            console.error("WhatsApp booking confirmed warning:", waErr);
          }
          break;
        }

        case "class.cancelled": {
          const classTitle = data.classTitle || "Live Class";
          const reason = data.reason || "Slot cancelled by educator.";
          await NotificationService.create({
            userId,
            type: "CLASS_CANCELLED",
            title: "Class Cancelled ⚠️",
            message: `The session "${classTitle}" was cancelled. ${reason}`,
            actionUrl: "/student/dashboard",
            data,
            idempotencyKey,
          });

          if (prefs.emailClassReminders) {
            const provider = getEmailProvider();
            await provider.sendNotificationEmail({
              email: user.email,
              recipientName: userName,
              subject: `Class Cancelled: ${classTitle}`,
              headline: "Live Class Session Cancelled",
              bodyText: `The upcoming session "${classTitle}" has been cancelled by the educator. Any payment made will be refunded automatically.`,
              statusBadgeText: "CANCELLED",
              statusBadgeVariant: "danger",
              reasonText: reason,
            });
          }

          // WhatsApp Trigger
          try {
            await WhatsAppService.sendEventNotification({
              userId,
              phone: userPhone,
              eventType: "CLASS_CANCELLED",
              data: {
                name: userName,
                classTitle,
                reason,
              },
              idempotencyKey: `wa-cancel-${data.slotId || "slot"}-${userId}`,
            });
          } catch (waErr) {
            console.error("WhatsApp class cancelled warning:", waErr);
          }
          break;
        }

        case "class.starting_soon": {
          const classTitle = data.classTitle || "Live Class";
          const timeLabel = data.timeLabel || "soon";
          await NotificationService.create({
            userId,
            type: "CLASS_STARTING_SOON",
            title: `Class starts in ${timeLabel} 🔔`,
            message: `"${classTitle}" is starting shortly. Get ready to join!`,
            actionUrl: data.joinUrl || "/student/dashboard",
            data,
            idempotencyKey,
          });

          // WhatsApp Trigger
          try {
            await WhatsAppService.sendEventNotification({
              userId,
              phone: userPhone,
              eventType: "CLASS_REMINDER",
              data: {
                name: userName,
                classTitle,
                timeLabel,
                joinUrl: data.joinUrl || `${getPublicAppUrl()}/student/dashboard`,
              },
              idempotencyKey: `wa-remind-${data.slotId || "slot"}-${userId}-${timeLabel.replace(/\s+/g, "_")}`,
            });
          } catch (waErr) {
            console.error("WhatsApp class reminder warning:", waErr);
          }
          break;
        }

        case "course.enrolled": {
          const courseTitle = data.courseTitle || "Course";
          await NotificationService.create({
            userId,
            type: "COURSE_ENROLLED",
            title: "Course Enrolled! 🎓",
            message: `You enrolled in "${courseTitle}". Start learning now!`,
            actionUrl: `/learn/${data.courseSlug || ""}`,
            data,
            idempotencyKey,
          });

          // Notify teacher if teacherUserId provided
          if (data.teacherUserId && data.teacherUserId !== userId) {
            await NotificationService.create({
              userId: data.teacherUserId,
              type: "COURSE_ENROLLED",
              title: "New Student Enrolled 📈",
              message: `${userName} enrolled in your course "${courseTitle}".`,
              actionUrl: "/teacher/courses",
              data,
            });
          }

          if (prefs.emailCourseUpdates) {
            const provider = getEmailProvider();
            await provider.sendNotificationEmail({
              email: user.email,
              recipientName: userName,
              subject: `Successfully Enrolled: ${courseTitle}`,
              headline: "Welcome to Your New Course!",
              bodyText: `You successfully enrolled in "${courseTitle}". Access all lessons and resources inside your student dashboard.`,
              statusBadgeText: "ENROLLED",
              statusBadgeVariant: "success",
              actionUrl: `${getPublicAppUrl()}/learn/${data.courseSlug || ""}`,
              actionText: "Start Learning Now",
            });
          }

          // WhatsApp Trigger
          try {
            await WhatsAppService.sendEventNotification({
              userId,
              phone: userPhone,
              eventType: "COURSE_ENROLLED",
              data: {
                name: userName,
                courseTitle,
                courseUrl: `${getPublicAppUrl()}/learn/${data.courseSlug || ""}`,
              },
              idempotencyKey: `wa-enroll-${data.courseId || "course"}-${userId}`,
            });
          } catch (waErr) {
            console.error("WhatsApp course enrolled warning:", waErr);
          }
          break;
        }

        case "payment.captured": {
          const amountFormatted = formatPaise(data.amountPaise);
          const title = data.title || "EduConnects Order";
          await NotificationService.create({
            userId,
            type: "PAYMENT_SUCCESS",
            title: "Payment Successful 💳",
            message: `Payment of ${amountFormatted} for "${title}" completed successfully.`,
            actionUrl: "/student/payments",
            data,
            idempotencyKey,
          });

          // Notify teacher of earning if teacherUserId provided
          if (data.teacherUserId && data.teacherUserId !== userId) {
            await NotificationService.create({
              userId: data.teacherUserId,
              type: "PAYMENT_SUCCESS",
              title: "Payment Received 💰",
              message: `Earned payment for purchase of "${title}".`,
              actionUrl: "/teacher/earnings",
              data,
            });
          }

          if (prefs.emailPaymentUpdates) {
            const provider = getEmailProvider();
            await provider.sendNotificationEmail({
              email: user.email,
              recipientName: userName,
              subject: `Payment Receipt — ${amountFormatted}`,
              headline: "Payment Confirmation Receipt",
              bodyText: `Thank you for your purchase. We received your payment of ${amountFormatted} for "${title}". Order ID: ${data.orderId || "N/A"}.`,
              statusBadgeText: "SUCCESSFUL",
              statusBadgeVariant: "success",
              actionUrl: `${getPublicAppUrl()}/student/payments`,
              actionText: "View Payment Details",
            });
          }

          // 1. WhatsApp Trigger: Payment Success
          try {
            await WhatsAppService.sendEventNotification({
              userId,
              phone: userPhone,
              eventType: "PAYMENT_SUCCESS",
              data: {
                name: userName || "Learner",
                learnerName: userName || "Learner",
                title: title || "EduConnects Learning",
                courseOrEducator: title || "EduConnects Learning",
                amount: amountFormatted,
                date: new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }),
                time: new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),
                bookingId: data.orderId || data.transactionId || "N/A",
                orderId: data.orderId || data.transactionId || "N/A",
                transactionId: data.transactionId,
                supportInfo: "support@educonnects.co.in | +91 9109019090",
              },
              idempotencyKey: `wa-pay-${data.transactionId || userId}`,
            });
          } catch (waErr) {
            console.error("WhatsApp payment success warning:", waErr);
          }

          // 2. WhatsApp Trigger: Payment Receipt
          try {
            const receiptNumber = data.receipt || `RCPT-${data.transactionId || Date.now()}`;
            const receiptUrl = data.transactionId
              ? `${getPublicAppUrl()}/student/payments/${data.transactionId}`
              : `${getPublicAppUrl()}/student/payments`;

            await WhatsAppService.sendEventNotification({
              userId,
              phone: userPhone,
              eventType: "PAYMENT_RECEIPT",
              data: {
                name: userName,
                receiptNumber,
                title,
                amount: amountFormatted,
                receiptUrl,
              },
              idempotencyKey: `wa-rcpt-${data.transactionId || userId}`,
            });
          } catch (waErr) {
            console.error("WhatsApp payment receipt warning:", waErr);
          }
          break;
        }

        case "payment.failed": {
          const isEducator =
            actorRole === "TEACHER" ||
            user.role === "TEACHER" ||
            Boolean(data.isTeacher) ||
            Boolean(data.recipientRole === "TEACHER") ||
            Boolean(data.orderId?.startsWith("EDU_TCH_")) ||
            Boolean(data.orderId?.startsWith("TCH_"));

          const title =
            data.title ||
            (isEducator ? "EduConnects Educator Verification" : "EduConnects Purchase");

          const retryUrl =
            data.retryUrl ||
            (isEducator
              ? `${getPublicAppUrl()}/teacher/onboarding`
              : `${getPublicAppUrl()}/courses`);

          // Recipient phone must be user.teacherProfile.contactPhone for educator, user.profile.phone for learner
          const targetPhone = isEducator
            ? user.teacherProfile?.contactPhone || null
            : user.profile?.phone || null;

          await NotificationService.create({
            userId,
            type: "PAYMENT_FAILED",
            title: "Payment Incomplete ⚠️",
            message: `Your payment for "${title}" could not be completed.`,
            actionUrl: retryUrl,
            data: {
              ...data,
              isTeacher: isEducator,
              recipientRole: isEducator ? "TEACHER" : "STUDENT",
            },
            idempotencyKey,
          });

          // WhatsApp Trigger
          try {
            await WhatsAppService.sendEventNotification({
              userId,
              phone: targetPhone,
              eventType: "PAYMENT_FAILED",
              data: {
                name: userName,
                title,
                orderId: data.orderId || "N/A",
                reason: data.reason || "Payment was not completed by gateway",
                retryUrl,
                isTeacher: isEducator,
                recipientRole: isEducator ? "TEACHER" : "STUDENT",
              },
              idempotencyKey: idempotencyKey
                ? `wa-${idempotencyKey}`
                : `wa-pay-fail-${data.orderId || userId}`,
            });
          } catch (waErr) {
            console.error("WhatsApp payment failed warning:", waErr);
          }
          break;
        }

        case "refund.requested": {
          const amountFormatted = formatPaise(data.amountPaise || 0);
          const title = data.title || "EduConnects Purchase";

          await NotificationService.create({
            userId,
            type: "INFO",
            title: "Refund Request Under Review ⏳",
            message: `Your refund request of ${amountFormatted} for "${title}" is under review.`,
            actionUrl: "/student/payments",
            data,
            idempotencyKey,
          });

          // WhatsApp Trigger
          try {
            await WhatsAppService.sendEventNotification({
              userId,
              phone: userPhone,
              eventType: "REFUND_REQUESTED",
              data: {
                name: userName,
                title,
                amount: amountFormatted,
              },
              idempotencyKey: `wa-rfnd-req-${data.refundId || data.transactionId || userId}`,
            });
          } catch (waErr) {
            console.error("WhatsApp refund requested warning:", waErr);
          }
          break;
        }

        case "refund.approved": {
          const amountFormatted = formatPaise(data.amountPaise || 0);
          const title = data.title || "EduConnects Purchase";

          await NotificationService.create({
            userId,
            type: "SUCCESS",
            title: "Refund Approved ✅",
            message: `Your refund of ${amountFormatted} for "${title}" has been approved.`,
            actionUrl: "/student/payments",
            data,
            idempotencyKey,
          });

          // WhatsApp Trigger
          try {
            await WhatsAppService.sendEventNotification({
              userId,
              phone: userPhone,
              eventType: "REFUND_APPROVED",
              data: {
                name: userName,
                title,
                amount: amountFormatted,
              },
              idempotencyKey: `wa-rfnd-appr-${data.refundId || data.transactionId || userId}`,
            });
          } catch (waErr) {
            console.error("WhatsApp refund approved warning:", waErr);
          }
          break;
        }

        case "refund.processed": {
          const amountFormatted = formatPaise(data.amountPaise);
          await NotificationService.create({
            userId,
            type: "REFUND_PROCESSED",
            title: "Refund Processed 💸",
            message: `Refund of ${amountFormatted} has been issued to your original payment method.`,
            actionUrl: "/student/payments",
            data,
            idempotencyKey,
          });

          if (prefs.emailPaymentUpdates) {
            const provider = getEmailProvider();
            await provider.sendNotificationEmail({
              email: user.email,
              recipientName: userName,
              subject: `Refund Processed — ${amountFormatted}`,
              headline: "Refund Confirmation",
              bodyText: `Your refund of ${amountFormatted} was successfully processed. Funds will reflect in your account within 5-7 business days.`,
              statusBadgeText: "REFUNDED",
              statusBadgeVariant: "success",
            });
          }

          // WhatsApp Trigger
          try {
            await WhatsAppService.sendEventNotification({
              userId,
              phone: userPhone,
              eventType: "REFUND_COMPLETED",
              data: {
                name: userName,
                amount: amountFormatted,
                orderId: data.orderId || data.transactionId || "N/A",
                transactionId: data.transactionId,
              },
              idempotencyKey: `wa-rfnd-done-${data.refundId || data.transactionId || userId}`,
            });
          } catch (waErr) {
            console.error("WhatsApp refund completed warning:", waErr);
          }
          break;
        }

        case "refund.rejected": {
          const title = data.title || "EduConnects Purchase";
          const reason = data.reason || "Request did not meet refund policy terms.";

          await NotificationService.create({
            userId,
            type: "WARNING",
            title: "Refund Request Rejected ❌",
            message: `Your refund request for "${title}" was rejected: ${reason}`,
            actionUrl: "/student/payments",
            data,
            idempotencyKey,
          });

          // WhatsApp Trigger
          try {
            await WhatsAppService.sendEventNotification({
              userId,
              phone: userPhone,
              eventType: "REFUND_REJECTED",
              data: {
                name: userName,
                title,
                reason,
                supportInfo: "support@educonnects.com",
              },
              idempotencyKey: `wa-rfnd-rej-${data.refundId || data.transactionId || userId}`,
            });
          } catch (waErr) {
            console.error("WhatsApp refund rejected warning:", waErr);
          }
          break;
        }

        case "payout.processed": {
          await NotificationService.create({
            userId,
            type: "PAYOUT_PROCESSED",
            title: data.title || "Payout Notification 💸",
            message: data.message || "Your payout has been updated.",
            actionUrl: data.actionUrl || "/teacher/earnings",
            data,
            idempotencyKey,
          });
          break;
        }

        default: {
          await NotificationService.create({
            userId,
            type: "INFO",
            title: data.title || "EduConnects Update",
            message: data.message || "System event occurred.",
            actionUrl: data.actionUrl,
            data,
            idempotencyKey,
          });
          break;
        }
      }

      // 3. Record Activity Log entry for auditability if supported
      if ((prisma as any).activityLog?.create) {
        try {
          await (prisma as any).activityLog.create({
            data: {
              actor: { connect: { id: actorId || userId } },
              action: event.toUpperCase().replace(".", "_"),
              entityType: data.entityType || null,
              entityId: data.entityId || null,
              metadata: JSON.stringify(data),
            },
          });
        } catch {
          // Ignore if activityLog relation fails
        }
      }
    } catch (err) {
      console.error("❌ [EventService Error]:", err);
    }
  }
}
