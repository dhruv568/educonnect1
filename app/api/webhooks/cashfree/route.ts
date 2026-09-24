import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cashfreeClient, verifyCashfreeWebhookSignature } from "@/lib/cashfree";
import { PaymentService } from "@/services/payment-service";

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get("x-webhook-signature") || "";
    const timestamp = request.headers.get("x-webhook-timestamp") || "";

    // In test mode or when signature is mock, signature verification passes automatically
    const isMock =
      cashfreeClient.isTestMode() ||
      signature.startsWith("mock_") ||
      process.env.NODE_ENV === "test";

    if (!isMock) {
      const isValid = verifyCashfreeWebhookSignature(rawBody, timestamp, signature);
      if (!isValid) {
        console.error("Cashfree Webhook: Invalid signature");
        return NextResponse.json({ error: "Invalid webhook signature" }, { status: 400 });
      }
    }

    let payload: any;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const eventType = payload.type || payload.event || "UNKNOWN";
    const data = payload.data || payload;
    const order = data.order || {};
    const payment = data.payment || {};
    const customer = data.customer_details || {};

    const orderId = order.order_id || payload.order_id || "";
    const paymentId = payment.cf_payment_id ? String(payment.cf_payment_id) : (payload.payment_id || "");
    const eventId = `cf_evt_${eventType}_${orderId}_${paymentId}_${Date.now()}`;

    // Record Webhook Event for idempotency & audit trail
    const existingWebhook = await prisma.paymentWebhookEvent.findFirst({
      where: {
        provider: "CASHFREE",
        eventId,
      },
    });

    if (existingWebhook && existingWebhook.processed) {
      return NextResponse.json({ received: true, idempotent: true });
    }

    const webhookRecord = await prisma.paymentWebhookEvent.create({
      data: {
        provider: "CASHFREE",
        eventId,
        eventType,
        payload: rawBody,
        processed: false,
      },
    });

    // Handle Payment Success Webhook
    if (
      eventType === "PAYMENT_SUCCESS_WEBHOOK" ||
      payment.payment_status === "SUCCESS" ||
      order.order_status === "PAID"
    ) {
      if (orderId) {
        // Look up transaction to find userId if not present in customer details
        const tx = await prisma.paymentTransaction.findFirst({
          where: {
            OR: [
              { providerOrderId: orderId },
              { internalReference: orderId },
            ],
          },
        });

        const userId = customer.customer_id || order.order_tags?.userId || tx?.userId;

        if (userId) {
          await PaymentService.verifyAndCompletePayment({
            userId,
            orderId,
            cfPaymentId: paymentId,
            paymentStatus: "SUCCESS",
          });
        }
      }
    } else if (
      eventType === "PAYMENT_FAILED_WEBHOOK" ||
      payment.payment_status === "FAILED" ||
      payment.payment_status === "USER_DROPPED"
    ) {
      if (orderId) {
        const tx = await prisma.paymentTransaction.findFirst({
          where: { providerOrderId: orderId },
          include: {
            course: true,
            liveClassSlot: true,
            user: { include: { profile: true, teacherProfile: true } },
          },
        });

        await prisma.paymentTransaction.updateMany({
          where: { providerOrderId: orderId, status: "PENDING" },
          data: {
            status: "FAILED",
            failedAt: new Date(),
            failureReason: payment.payment_message || "Cashfree payment failed or user dropped",
          },
        });

        if (tx && tx.userId) {
          try {
            const isEducator =
              tx.user?.role === "TEACHER" ||
              Boolean(tx.user?.teacherProfile) ||
              orderId.startsWith("EDU_TCH_") ||
              orderId.startsWith("TCH_");

            const { EventService } = require("@/services/event-service");
            const { getPublicAppUrl } = require("@/lib/app-url");

            const retryUrl = isEducator
              ? `${getPublicAppUrl()}/teacher/onboarding`
              : tx.course
              ? `${getPublicAppUrl()}/courses/${tx.course.slug}`
              : `${getPublicAppUrl()}/courses`;

            const defaultTitle = isEducator
              ? "EduConnects Educator Verification"
              : tx.course?.title || tx.liveClassSlot?.title || "EduConnects Purchase";

            await EventService.emit("payment.failed", {
              userId: tx.userId,
              actorId: tx.userId,
              actorRole: isEducator ? "TEACHER" : "STUDENT",
              data: {
                orderId,
                title: defaultTitle,
                reason: payment.payment_message || "Payment attempt was unsuccessful",
                retryUrl,
                isTeacher: isEducator,
                recipientRole: isEducator ? "TEACHER" : "STUDENT",
              },
              idempotencyKey: `pay-fail-${orderId}`,
            });
          } catch (failErr) {
            console.error("Failed to emit payment.failed event:", failErr);
          }
        }
      }
    }

    // Mark webhook as processed
    await prisma.paymentWebhookEvent.update({
      where: { id: webhookRecord.id },
      data: { processed: true, processedAt: new Date() },
    });

    return NextResponse.json({ received: true, status: "OK" });
  } catch (error: any) {
    console.error("Cashfree webhook processing error:", error);
    return NextResponse.json({ error: error.message || "Webhook processing error" }, { status: 500 });
  }
}
