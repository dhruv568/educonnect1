/**
 * WhatsApp Approved Template Registry & Parameter Formatters
 *
 * Provides template definitions and parameter builders for all EduConnects
 * platform events. Each notification type has an approved default template name
 * and can be overridden via Admin Settings.
 */

import { WhatsAppTemplateComponent } from "./whatsapp-client";
import { getMainDomain } from "../app-url";

/**
 * Normalizes a URL into a Meta-compliant dynamic URL button parameter.
 * Meta templates require the URL button parameter to be the relative path/query
 * without domain or leading slashes.
 */
export function formatDynamicUrlParameter(url?: string | null): string {
  if (!url) return "courses";
  const trimmed = String(url).trim();
  try {
    if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
      const parsed = new URL(trimmed);
      const pathWithQuery = (parsed.pathname + parsed.search).replace(/^\/+/, "");
      return pathWithQuery || "courses";
    }
  } catch {
    // fallback to string manipulation
  }
  return trimmed.replace(/^\/+/, "") || "courses";
}

/**
 * Builds Meta-approved template components for payment-failed notifications:
 * - IMAGE Header (/images/whatsapp/payment-failed-header.jpg)
 * - Body: {{1}} = Name, {{2}} = Course or Service Title
 * - Dynamic URL Button: retryUrl parameter
 */
export function buildPaymentFailedComponents(data: Record<string, any>): WhatsAppTemplateComponent[] {
  const isTeacher = Boolean(data.isTeacher || data.recipientRole === "TEACHER" || data.role === "TEACHER");
  const fallbackName = isTeacher ? "Educator" : "Learner";
  const defaultHeaderImg = `${getMainDomain()}/images/whatsapp/payment-failed-header.jpg`;
  const headerImageUrl = data.headerImageUrl || defaultHeaderImg;

  return [
    {
      type: "header",
      parameters: [
        {
          type: "image",
          image: { link: String(headerImageUrl) },
        },
      ],
    },
    {
      type: "body",
      parameters: [
        { type: "text", text: String(data.name || fallbackName) },
        {
          type: "text",
          text: String(
            data.title ||
              data.courseName ||
              data.serviceTitle ||
              (isTeacher ? "EduConnects Service" : "EduConnects Course")
          ),
        },
      ],
    },
    {
      type: "button",
      sub_type: "url",
      index: "0",
      parameters: [
        {
          type: "text",
          text: formatDynamicUrlParameter(data.retryUrl),
        },
      ],
    },
  ];
}

export type WhatsAppEventType =
  | "LEARNER_REGISTRATION"
  | "EDUCATOR_REGISTRATION"
  | "EDUCATOR_VERIFIED"
  | "EDUCATOR_VERIFICATION_PENDING"
  | "EDUCATOR_REJECTED"
  | "PAYMENT_SUCCESS"
  | "PAYMENT_RECEIPT"
  | "PAYMENT_FAILED"
  | "REFUND_REQUESTED"
  | "REFUND_APPROVED"
  | "REFUND_COMPLETED"
  | "REFUND_REJECTED"
  | "COURSE_ENROLLED"
  | "BOOKING_CONFIRMED"
  | "CLASS_REMINDER"
  | "CLASS_CANCELLED";

export interface TemplateDefinition {
  defaultName: string;
  category: "AUTHENTICATION" | "MARKETING" | "UTILITY";
  description: string;
  defaultVariables: string[];
  buildComponents: (data: Record<string, any>) => WhatsAppTemplateComponent[];
}

export const DEFAULT_WHATSAPP_TEMPLATES: Record<WhatsAppEventType, TemplateDefinition> = {
  LEARNER_REGISTRATION: {
    defaultName: "edu_learner_welcome",
    category: "UTILITY",
    description: "Sent to learner when registration and email verification succeeds",
    defaultVariables: ["learner_name", "platform_name", "portal_url"],
    buildComponents: (data) => [
      {
        type: "body",
        parameters: [
          { type: "text", text: String(data.name || "Learner") },
          { type: "text", text: "EduConnects" },
          { type: "text", text: String(data.portalUrl || "https://educonnects.in/courses") },
        ],
      },
    ],
  },

  EDUCATOR_REGISTRATION: {
    defaultName: "edu_teacher_welcome",
    category: "UTILITY",
    description: "Sent to educator when registration and email verification succeeds",
    defaultVariables: ["educator_name", "platform_name", "onboarding_url"],
    buildComponents: (data) => [
      {
        type: "body",
        parameters: [
          { type: "text", text: String(data.name || "Educator") },
          { type: "text", text: "EduConnects" },
          { type: "text", text: String(data.onboardingUrl || "https://educonnects.in/teacher/onboarding") },
        ],
      },
    ],
  },

  EDUCATOR_VERIFIED: {
    defaultName: "edu_teacher_verified",
    category: "UTILITY",
    description: "Sent when Admin approves/verifies an educator",
    defaultVariables: ["educator_name", "dashboard_url"],
    buildComponents: (data) => [
      {
        type: "body",
        parameters: [
          { type: "text", text: String(data.name || "Educator") },
          { type: "text", text: String(data.dashboardUrl || "https://educonnects.in/teacher/dashboard") },
        ],
      },
    ],
  },

  EDUCATOR_VERIFICATION_PENDING: {
    defaultName: "edu_teacher_pending",
    category: "UTILITY",
    description: "Sent when educator application/verification is submitted and under review",
    defaultVariables: ["educator_name", "status_message", "status_url"],
    buildComponents: (data) => [
      {
        type: "body",
        parameters: [
          { type: "text", text: String(data.name || "Educator") },
          {
            type: "text",
            text: String(
              data.statusMessage ||
                "Your verification application is currently under review by EduConnects Administration."
            ),
          },
          { type: "text", text: String(data.statusUrl || "https://educonnects.in/teacher/verification") },
        ],
      },
    ],
  },

  EDUCATOR_REJECTED: {
    defaultName: "edu_teacher_rejected",
    category: "UTILITY",
    description: "Sent when educator application requires revision or is rejected",
    defaultVariables: ["educator_name", "reason", "onboarding_url"],
    buildComponents: (data) => [
      {
        type: "body",
        parameters: [
          { type: "text", text: String(data.name || "Educator") },
          { type: "text", text: String(data.reason || "Please review and update your profile credentials.") },
          { type: "text", text: String(data.onboardingUrl || "https://educonnects.in/teacher/onboarding") },
        ],
      },
    ],
  },

  PAYMENT_SUCCESS: {
    defaultName: "edu_payment_success",
    category: "UTILITY",
    description: "Sent when a payment is successfully confirmed with branded structure",
    defaultVariables: ["learner_name", "course_or_educator", "date", "time", "booking_id"],
    buildComponents: (data) => [
      {
        type: "body",
        parameters: [
          { type: "text", text: String(data.learnerName || data.name || "Learner") },
          { type: "text", text: String(data.courseOrEducator || data.title || data.courseTitle || data.classTitle || "EduConnects Learning") },
          { type: "text", text: String(data.date || new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })) },
          { type: "text", text: String(data.time || new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })) },
          { type: "text", text: String(data.bookingId || data.enrollmentId || data.orderId || data.transactionId || "N/A") },
        ],
      },
      {
        type: "button",
        sub_type: "url",
        index: "0",
        parameters: [
          { type: "text", text: "student/dashboard" },
        ],
      },
      {
        type: "button",
        sub_type: "url",
        index: "1",
        parameters: [
          { type: "text", text: "contact" },
        ],
      },
    ],
  },

  PAYMENT_RECEIPT: {
    defaultName: "edu_payment_receipt",
    category: "UTILITY",
    description: "Sent when an official payment receipt is generated with secure link",
    defaultVariables: ["learner_name", "receipt_number", "item_title", "amount_formatted", "secure_receipt_url"],
    buildComponents: (data) => [
      {
        type: "body",
        parameters: [
          { type: "text", text: String(data.name || "Learner") },
          { type: "text", text: String(data.receiptNumber || "RCPT-OFFICIAL") },
          { type: "text", text: String(data.title || "EduConnects Order") },
          { type: "text", text: String(data.amount || "₹0") },
          { type: "text", text: String(data.receiptUrl || "https://educonnects.in/student/payments") },
        ],
      },
    ],
  },

  PAYMENT_FAILED: {
    defaultName: "edu_stu_payment_failed",
    category: "UTILITY",
    description: "Sent automatically when a payment attempt fails with branded image header, course/service title, and retry button",
    defaultVariables: ["name", "course_or_title", "retry_url"],
    buildComponents: (data) => buildPaymentFailedComponents(data),
  },

  REFUND_REQUESTED: {
    defaultName: "edu_refund_requested",
    category: "UTILITY",
    description: "Sent when learner submits a refund request (marked PENDING)",
    defaultVariables: ["learner_name", "item_title", "amount_formatted", "status_text"],
    buildComponents: (data) => [
      {
        type: "body",
        parameters: [
          { type: "text", text: String(data.name || "Learner") },
          { type: "text", text: String(data.title || "EduConnects Purchase") },
          { type: "text", text: String(data.amount || "₹0") },
          {
            type: "text",
            text: "Your refund request has been submitted and is currently under review.",
          },
        ],
      },
    ],
  },

  REFUND_APPROVED: {
    defaultName: "edu_refund_approved",
    category: "UTILITY",
    description: "Sent when Admin approves a refund request",
    defaultVariables: ["learner_name", "item_title", "amount_formatted", "gateway_notice"],
    buildComponents: (data) => [
      {
        type: "body",
        parameters: [
          { type: "text", text: String(data.name || "Learner") },
          { type: "text", text: String(data.title || "EduConnects Purchase") },
          { type: "text", text: String(data.amount || "₹0") },
          {
            type: "text",
            text: "Your refund has been approved by EduConnects Administration and is being processed by the payment gateway.",
          },
        ],
      },
    ],
  },

  REFUND_COMPLETED: {
    defaultName: "edu_refund_completed",
    category: "UTILITY",
    description: "Sent only after actual payment gateway confirms the refund",
    defaultVariables: ["learner_name", "refund_amount", "order_reference", "refund_status", "timeline_notice"],
    buildComponents: (data) => [
      {
        type: "body",
        parameters: [
          { type: "text", text: String(data.name || "Learner") },
          { type: "text", text: String(data.amount || "₹0") },
          { type: "text", text: String(data.orderId || data.transactionId || "N/A") },
          { type: "text", text: "REFUNDED" },
          { type: "text", text: "Funds will reflect in your original payment account within 5-7 business days." },
        ],
      },
    ],
  },

  REFUND_REJECTED: {
    defaultName: "edu_refund_rejected",
    category: "UTILITY",
    description: "Sent if Admin rejects a refund with explanation",
    defaultVariables: ["learner_name", "item_title", "rejection_reason", "support_info"],
    buildComponents: (data) => [
      {
        type: "body",
        parameters: [
          { type: "text", text: String(data.name || "Learner") },
          { type: "text", text: String(data.title || "EduConnects Purchase") },
          { type: "text", text: String(data.reason || "Request did not meet refund policy terms.") },
          { type: "text", text: String(data.supportInfo || "support@educonnects.com") },
        ],
      },
    ],
  },

  COURSE_ENROLLED: {
    defaultName: "edu_course_enrolled",
    category: "UTILITY",
    description: "Sent when course enrollment is activated",
    defaultVariables: ["learner_name", "course_title", "course_url"],
    buildComponents: (data) => [
      {
        type: "body",
        parameters: [
          { type: "text", text: String(data.name || "Learner") },
          { type: "text", text: String(data.courseTitle || "Course") },
          { type: "text", text: String(data.courseUrl || "https://educonnects.in/student/courses") },
        ],
      },
    ],
  },

  BOOKING_CONFIRMED: {
    defaultName: "edu_booking_confirmed",
    category: "UTILITY",
    description: "Sent when live class booking is confirmed",
    defaultVariables: ["learner_name", "class_title", "start_time", "join_url"],
    buildComponents: (data) => [
      {
        type: "body",
        parameters: [
          { type: "text", text: String(data.name || "Learner") },
          { type: "text", text: String(data.classTitle || "Live Class") },
          { type: "text", text: String(data.startTime || "Scheduled Session") },
          { type: "text", text: String(data.joinUrl || "https://educonnects.in/student/live-classes") },
        ],
      },
    ],
  },

  CLASS_REMINDER: {
    defaultName: "edu_class_reminder",
    category: "UTILITY",
    description: "Sent prior to live class (24h, 1h, 10m reminder)",
    defaultVariables: ["learner_name", "class_title", "time_window", "join_url"],
    buildComponents: (data) => [
      {
        type: "body",
        parameters: [
          { type: "text", text: String(data.name || "Learner") },
          { type: "text", text: String(data.classTitle || "Live Class") },
          { type: "text", text: String(data.timeLabel || "soon") },
          { type: "text", text: String(data.joinUrl || "https://educonnects.in/student/live-classes") },
        ],
      },
    ],
  },

  CLASS_CANCELLED: {
    defaultName: "edu_class_cancelled",
    category: "UTILITY",
    description: "Sent when a scheduled live class is cancelled",
    defaultVariables: ["learner_name", "class_title", "reason", "refund_notice"],
    buildComponents: (data) => [
      {
        type: "body",
        parameters: [
          { type: "text", text: String(data.name || "Learner") },
          { type: "text", text: String(data.classTitle || "Live Class") },
          { type: "text", text: String(data.reason || "Cancelled by educator.") },
          { type: "text", text: "Any payment made has been marked for automatic refund." },
        ],
      },
    ],
  },
};

export const STUDENT_PAYMENT_FAILED_TEMPLATE: TemplateDefinition = {
  defaultName: "edu_stu_payment_failed",
  category: "UTILITY",
  description: "Sent automatically when a student payment attempt fails with branded image header, course title, and retry button",
  defaultVariables: ["learner_name", "course_name", "retry_url"],
  buildComponents: (data) => buildPaymentFailedComponents({ ...data, isTeacher: false, recipientRole: "STUDENT" }),
};

export const EDUCATOR_PAYMENT_FAILED_TEMPLATE: TemplateDefinition = {
  defaultName: "edu_teacher_payment_failed",
  category: "UTILITY",
  description: "Sent automatically when an educator payment attempt fails with branded image header, service title, and retry button",
  defaultVariables: ["educator_name", "service_title", "retry_url"],
  buildComponents: (data) => buildPaymentFailedComponents({ ...data, isTeacher: true, recipientRole: "TEACHER" }),
};

