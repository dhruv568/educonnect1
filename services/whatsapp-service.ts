/**
 * EduConnects Central WhatsApp Notification Service
 *
 * Dispatches automated, event-driven WhatsApp notifications using Meta WhatsApp Cloud API.
 * Ensures zero-disruption to core platform transactions, strict idempotency,
 * comprehensive message logging, and admin retry capability.
 */

import { prisma } from "@/lib/prisma";
import { WhatsAppClient } from "@/lib/whatsapp/whatsapp-client";
import {
  WhatsAppEventType,
  DEFAULT_WHATSAPP_TEMPLATES,
} from "@/lib/whatsapp/whatsapp-templates";

export interface SendWhatsAppNotificationOptions {
  userId?: string;
  phone?: string | null;
  eventType: WhatsAppEventType;
  data: Record<string, any>;
  idempotencyKey?: string;
}

export interface WhatsAppNotificationResult {
  success: boolean;
  messageId?: string;
  metaMessageId?: string;
  status: "SENT" | "FAILED" | "SKIPPED";
  error?: string;
}

export class WhatsAppService {
  /**
   * Fetch current WhatsApp platform configuration & event toggles from database
   */
  static async getPlatformWhatsAppSettings() {
    try {
      const configs = await prisma.platformConfig.findMany({
        where: {
          key: {
            in: [
              "whatsapp_enabled",
              "whatsapp_notifications_enabled",
              "whatsapp_template_mapping",
              "whatsapp_phone_number_id",
              "whatsapp_business_account_id",
              "whatsapp_access_token",
            ],
          },
        },
      });

      const configMap: Record<string, string> = {};
      configs.forEach((c) => {
        configMap[c.key] = c.value;
      });

      const isGloballyEnabled = configMap.whatsapp_enabled !== "false";

      let notificationsEnabled: Record<string, boolean> = {};
      try {
        if (configMap.whatsapp_notifications_enabled) {
          notificationsEnabled = JSON.parse(configMap.whatsapp_notifications_enabled);
        }
      } catch {
        notificationsEnabled = {};
      }

      let templateMapping: Record<string, string> = {};
      try {
        if (configMap.whatsapp_template_mapping) {
          templateMapping = JSON.parse(configMap.whatsapp_template_mapping);
        }
      } catch {
        templateMapping = {};
      }

      return {
        isGloballyEnabled,
        notificationsEnabled,
        templateMapping,
        phoneNumberId: configMap.whatsapp_phone_number_id || process.env.WHATSAPP_PHONE_NUMBER_ID || "",
        businessAccountId: configMap.whatsapp_business_account_id || process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || "",
        accessToken: configMap.whatsapp_access_token || process.env.WHATSAPP_ACCESS_TOKEN || "",
      };
    } catch (err) {
      console.warn("Could not read platform WhatsApp settings from DB, using defaults:", err);
      return {
        isGloballyEnabled: true,
        notificationsEnabled: {},
        templateMapping: {},
        phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || "",
        businessAccountId: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || "",
        accessToken: process.env.WHATSAPP_ACCESS_TOKEN || "",
      };
    }
  }

  /**
   * Check whether a specific WhatsApp notification type is enabled by Admin
   */
  static async isNotificationEnabled(eventType: WhatsAppEventType): Promise<boolean> {
    const settings = await this.getPlatformWhatsAppSettings();
    if (!settings.isGloballyEnabled) return false;

    // If explicit toggle exists, respect it; default to true
    if (settings.notificationsEnabled[eventType] !== undefined) {
      return Boolean(settings.notificationsEnabled[eventType]);
    }

    return true;
  }

  /**
   * Send an automated WhatsApp notification for a platform event
   */
  static async sendEventNotification(
    options: SendWhatsAppNotificationOptions
  ): Promise<WhatsAppNotificationResult> {
    const { userId, phone: explicitPhone, eventType, data, idempotencyKey } = options;

    try {
      // 1. Check if WhatsApp notifications are enabled for this event
      const isEnabled = await this.isNotificationEnabled(eventType);
      if (!isEnabled) {
        return {
          success: false,
          status: "SKIPPED",
          error: `WhatsApp notification for ${eventType} is disabled in Admin Settings`,
        };
      }

      // 2. Enforce Idempotency to prevent duplicate message dispatch
      if (idempotencyKey) {
        const existing = await prisma.whatsAppMessage.findFirst({
          where: { idempotencyKey },
        });

        if (existing) {
          if (existing.status !== "FAILED") {
            return {
              success: true,
              messageId: existing.id,
              metaMessageId: existing.metaMessageId || undefined,
              status: existing.status as any,
            };
          }
        }
      }

      // 3. Resolve recipient phone number & user details
      let recipientPhone = explicitPhone;
      let userName = data.name;
      let userRecord: any = null;

      if (userId) {
        userRecord = await prisma.user.findUnique({
          where: { id: userId },
          include: { profile: true, teacherProfile: true },
        });

        if (userRecord && !userName) {
          userName = userRecord.profile
            ? `${userRecord.profile.firstName} ${userRecord.profile.lastName}`.trim()
            : userRecord.email.split("@")[0];
        }
      }

      // Check if this is an educator/teacher payment failed or student payment failed
      const isTeacherPaymentFailed =
        eventType === "PAYMENT_FAILED" &&
        Boolean(
          data.isTeacher ||
          data.recipientRole === "TEACHER" ||
          data.role === "TEACHER" ||
          userRecord?.role === "TEACHER" ||
          (data.orderId && (data.orderId.startsWith("EDU_TCH_") || data.orderId.startsWith("TCH_")))
        );

      if (eventType === "PAYMENT_FAILED") {
        if (isTeacherPaymentFailed) {
          // EDUCATOR: Must use user.teacherProfile.contactPhone
          if (!recipientPhone) {
            recipientPhone = userRecord?.teacherProfile?.contactPhone || null;
          }
        } else {
          // STUDENT: Must use user.profile.phone
          if (!recipientPhone) {
            recipientPhone = userRecord?.profile?.phone || null;
          }
        }
      } else {
        // Fallback for other platform events
        if (!recipientPhone && userRecord) {
          recipientPhone = userRecord.profile?.phone || userRecord.teacherProfile?.contactPhone || null;
        }
      }

      const formattedPhone = WhatsAppClient.formatWhatsAppPhoneNumber(recipientPhone);
      const templateDef = DEFAULT_WHATSAPP_TEMPLATES[eventType];

      if (!templateDef) {
        return {
          success: false,
          status: "FAILED",
          error: `No template definition found for event type: ${eventType}`,
        };
      }

      // 4. Resolve template name (from Admin settings override or default)
      const settings = await this.getPlatformWhatsAppSettings();
      let templateName = settings.templateMapping[eventType] || templateDef.defaultName;

      if (eventType === "PAYMENT_FAILED") {
        if (isTeacherPaymentFailed) {
          templateName =
            settings.templateMapping["PAYMENT_FAILED_TEACHER"] ||
            "edu_teacher_payment_failed";
        } else {
          const mapped =
            settings.templateMapping["PAYMENT_FAILED_STUDENT"] ||
            settings.templateMapping["PAYMENT_FAILED"];
          templateName =
            mapped && mapped !== "edu_payment_failed"
              ? mapped
              : "edu_stu_payment_failed";
        }
      }

      const mergedData = {
        ...data,
        isTeacher: isTeacherPaymentFailed,
        recipientRole: isTeacherPaymentFailed ? "TEACHER" : "STUDENT",
        name:
          userName ||
          data.name ||
          (isTeacherPaymentFailed ? "Educator" : "Learner"),
      };

      // 5. Handle missing/invalid phone number safely
      if (!formattedPhone) {
        let reason = "";
        if (!recipientPhone) {
          if (eventType === "PAYMENT_FAILED") {
            reason = isTeacherPaymentFailed
              ? "No contact phone available on educator profile (user.teacherProfile.contactPhone)"
              : "No phone number available on user profile (user.profile.phone)";
          } else {
            reason = "No phone number available on user profile";
          }
        } else {
          reason = `Invalid phone number format: "${recipientPhone}"`;
        }

        const failedLog = await prisma.whatsAppMessage.create({
          data: {
            userId: userId || null,
            phoneNumber: recipientPhone || "UNKNOWN",
            eventType,
            templateName,
            parameters: JSON.stringify(mergedData),
            status: "FAILED",
            errorMessage: reason,
            idempotencyKey: idempotencyKey || null,
            metadata: JSON.stringify({ context: data }),
            failedAt: new Date(),
          },
        });

        return {
          success: false,
          messageId: failedLog.id,
          status: "FAILED",
          error: reason,
        };
      }

      // 6. Build components and parameters for Meta Template
      const components = templateDef.buildComponents(mergedData);

      // 7. Dispatch via Meta WhatsApp Cloud API
      const apiResult = await WhatsAppClient.sendTemplateMessage({
        to: formattedPhone,
        templateName,
        languageCode: "en",
        components,
        accessToken: settings.accessToken,
        phoneNumberId: settings.phoneNumberId,
      });

      // 8. Persist message record in database with accurate status
      const now = new Date();
      let savedRecord;

      if (idempotencyKey) {
        savedRecord = await prisma.whatsAppMessage.upsert({
          where: { idempotencyKey },
          create: {
            userId: userId || null,
            phoneNumber: formattedPhone,
            eventType,
            templateName,
            parameters: JSON.stringify(mergedData),
            metaMessageId: apiResult.metaMessageId || null,
            status: apiResult.success ? "SENT" : "FAILED",
            errorMessage: apiResult.error || null,
            idempotencyKey,
            metadata: JSON.stringify({ context: data }),
            sentAt: apiResult.success ? now : null,
            failedAt: apiResult.success ? null : now,
          },
          update: {
            metaMessageId: apiResult.metaMessageId || null,
            status: apiResult.success ? "SENT" : "FAILED",
            errorMessage: apiResult.error || null,
            sentAt: apiResult.success ? now : null,
            failedAt: apiResult.success ? null : now,
          },
        });
      } else {
        savedRecord = await prisma.whatsAppMessage.create({
          data: {
            userId: userId || null,
            phoneNumber: formattedPhone,
            eventType,
            templateName,
            parameters: JSON.stringify(mergedData),
            metaMessageId: apiResult.metaMessageId || null,
            status: apiResult.success ? "SENT" : "FAILED",
            errorMessage: apiResult.error || null,
            metadata: JSON.stringify({ context: data }),
            sentAt: apiResult.success ? now : null,
            failedAt: apiResult.success ? null : now,
          },
        });
      }

      return {
        success: apiResult.success,
        messageId: savedRecord.id,
        metaMessageId: apiResult.metaMessageId,
        status: apiResult.success ? "SENT" : "FAILED",
        error: apiResult.error,
      };
    } catch (error: any) {
      console.error("❌ [WhatsAppService Error]:", error);
      return {
        success: false,
        status: "FAILED",
        error: error.message || "Failed to process WhatsApp notification",
      };
    }
  }

  /**
   * Retry sending a failed WhatsApp message from the Admin Dashboard
   */
  static async retryMessage(messageId: string): Promise<WhatsAppNotificationResult> {
    try {
      const message = await prisma.whatsAppMessage.findUnique({
        where: { id: messageId },
      });

      if (!message) {
        return {
          success: false,
          status: "FAILED",
          error: `WhatsApp message record ${messageId} not found`,
        };
      }

      const formattedPhone = WhatsAppClient.formatWhatsAppPhoneNumber(message.phoneNumber);
      if (!formattedPhone) {
        return {
          success: false,
          status: "FAILED",
          error: `Cannot retry: Invalid phone number "${message.phoneNumber}"`,
        };
      }

      const templateDef = DEFAULT_WHATSAPP_TEMPLATES[message.eventType as WhatsAppEventType];
      let data: Record<string, any> = {};
      try {
        data = message.parameters ? JSON.parse(message.parameters) : {};
      } catch {
        data = {};
      }

      const settings = await this.getPlatformWhatsAppSettings();
      const components = templateDef ? templateDef.buildComponents(data) : [];

      const apiResult = await WhatsAppClient.sendTemplateMessage({
        to: formattedPhone,
        templateName: message.templateName,
        languageCode: "en",
        components,
        accessToken: settings.accessToken,
        phoneNumberId: settings.phoneNumberId,
      });

      const now = new Date();
      const updated = await prisma.whatsAppMessage.update({
        where: { id: messageId },
        data: {
          metaMessageId: apiResult.metaMessageId || message.metaMessageId,
          status: apiResult.success ? "SENT" : "FAILED",
          errorMessage: apiResult.error || null,
          sentAt: apiResult.success ? now : message.sentAt,
          failedAt: apiResult.success ? null : now,
        },
      });

      return {
        success: apiResult.success,
        messageId: updated.id,
        metaMessageId: apiResult.metaMessageId,
        status: apiResult.success ? "SENT" : "FAILED",
        error: apiResult.error,
      };
    } catch (err: any) {
      console.error("❌ [WhatsAppService Retry Error]:", err);
      return {
        success: false,
        status: "FAILED",
        error: err.message || "Retry failed due to unexpected error",
      };
    }
  }
}
