import dns from "node:dns";
try {
  dns.setDefaultResultOrder("ipv4first");
} catch {
  // Ignored in environments that do not support this call
}

import nodemailer from "nodemailer";
import { generateVerificationEmailHtml, EmailTemplateParams } from "./templates/verification-email";
import { generateNotificationEmailHtml, NotificationEmailParams } from "./templates/verification-templates";
import { generatePasswordResetEmailHtml, PasswordResetEmailParams } from "./templates/password-reset-email";
import { generateCertificateEmailHtml, CertificateEmailParams } from "./templates/certificate-email";
import { getPublicAppUrl } from "../app-url";
import { EmailThemeType, resolveEmailTheme } from "./email-theme";

export interface SendEmailPayload {
  to: string;
  subject: string;
  templateParams: EmailTemplateParams;
  from?: string;
}

export interface SendPasswordResetPayload {
  to: string;
  subject: string;
  firstName?: string;
  resetUrl: string;
}

export interface SendCertificatePayload {
  to: string;
  subject: string;
  educatorName: string;
  certificateNumber: string;
  programTitle: string;
  completionDate: string;
  pdfBuffer: Buffer;
}

export interface IEmailProvider {
  name: string;
  sendVerificationEmail(payload: SendEmailPayload): Promise<boolean>;
  sendPasswordResetEmail(payload: SendPasswordResetPayload): Promise<boolean>;
  sendNotificationEmail(payload: NotificationEmailParams): Promise<boolean>;
  sendCertificateEmail(payload: SendCertificatePayload): Promise<boolean>;
}

/**
 * Development / Test Console Email Provider.
 * Safely outputs verification dispatches. In test/dev mode, displays details for test assertions.
 */
export class ConsoleEmailProvider implements IEmailProvider {
  name = "Console (Development Logger)";

  async sendVerificationEmail(payload: SendEmailPayload): Promise<boolean> {
    const { to, templateParams } = payload;
    const resolvedTheme = resolveEmailTheme({
      theme: templateParams.theme,
      role: templateParams.role,
      host: templateParams.originHost || templateParams.appUrl,
    });

    console.log("\n==================================================");
    console.log("✉️ [EMAIL SERVICE: VERIFICATION DISPATCH]");
    console.log(`To: ${to}`);
    console.log(`Subject: ${payload.subject || "Your EduConnects Verification Code 🎓"}`);
    console.log(`Recipient: ${templateParams.firstName || "User"}`);
    console.log(`🎨 Theme:      ${resolvedTheme.name.toUpperCase()} (${resolvedTheme.portalLabel})`);
    console.log(`🔑 6-Digit OTP: [REDACTED FOR SECURITY]`);
    console.log(`⏱️ Expiry:      ${templateParams.expiresInMinutes || 10} minutes`);
    console.log("==================================================\n");
    return true;
  }

  async sendPasswordResetEmail(payload: SendPasswordResetPayload): Promise<boolean> {
    const isProduction = process.env.NODE_ENV === "production";
    console.log("\n==================================================");
    console.log("🔑 [EMAIL SERVICE: PASSWORD RESET DISPATCH]");
    console.log(`To: ${payload.to}`);
    if (!isProduction) {
      console.log(`Reset URL: ${payload.resetUrl}`);
    } else {
      console.log(`Reset URL: [REDACTED IN PRODUCTION LOGS]`);
    }
    console.log("==================================================\n");
    return true;
  }

  async sendNotificationEmail(params: NotificationEmailParams): Promise<boolean> {
    const resolvedTheme = resolveEmailTheme({
      theme: params.theme,
      role: params.role || params.roleName,
      host: params.originHost || params.appUrl,
    });
    console.log("\n==================================================");
    console.log("✉️ [EMAIL NOTIFICATION: CONSOLE LOG]");
    console.log(`To: ${params.email}`);
    console.log(`Subject: ${params.subject}`);
    console.log(`Recipient: ${params.recipientName}`);
    console.log(`🎨 Theme:      ${resolvedTheme.name.toUpperCase()} (${resolvedTheme.portalLabel})`);
    console.log(`Status Badge: [${params.statusBadgeText}]`);
    console.log(`Headline: ${params.headline}`);
    if (params.reasonText) console.log(`Reason: ${params.reasonText}`);
    console.log("==================================================\n");
    return true;
  }

  async sendCertificateEmail(payload: SendCertificatePayload): Promise<boolean> {
    console.log("\n==================================================");
    console.log("🎓 [EMAIL SERVICE: CERTIFICATE ISSUANCE DISPATCH]");
    console.log(`To:             ${payload.to}`);
    console.log(`Subject:        ${payload.subject}`);
    console.log(`Recipient:      ${payload.educatorName}`);
    console.log(`Certificate ID: ${payload.certificateNumber}`);
    console.log(`Program:        ${payload.programTitle}`);
    console.log(`Attachment:     EduConnects-Certificate-${payload.certificateNumber}.pdf (${payload.pdfBuffer.length} bytes)`);
    console.log("==================================================\n");
    return true;
  }
}

/**
 * SMTP Email Provider powered by Nodemailer.
 * Robust SMTP delivery with dual-port failover (Port 465 SSL <-> Port 587 STARTTLS)
 * and IPv4 priority to ensure delivery on all environments.
 */
export class SMTPEmailProvider implements IEmailProvider {
  name = "SMTP (Nodemailer)";
  private transporter: nodemailer.Transporter;
  private fallbackTransporter?: nodemailer.Transporter;

  constructor() {
    const configuredPort = Number(process.env.SMTP_PORT) || 465;
    const isSecure = process.env.SMTP_SECURE === "true" || configuredPort === 465;
    const host = process.env.SMTP_HOST || "smtp.gmail.com";
    const user = process.env.SMTP_USER || "";
    const pass = process.env.SMTP_PASSWORD ? process.env.SMTP_PASSWORD.replace(/\s+/g, "") : "";

    this.transporter = nodemailer.createTransport({
      host,
      port: configuredPort,
      secure: isSecure,
      auth: { user, pass },
      connectionTimeout: 8000,
      greetingTimeout: 8000,
      socketTimeout: 10000,
      tls: { rejectUnauthorized: false },
    });

    // Automatic alternate port fallback (465 SSL <-> 587 STARTTLS)
    const altPort = configuredPort === 465 ? 587 : 465;
    this.fallbackTransporter = nodemailer.createTransport({
      host,
      port: altPort,
      secure: altPort === 465,
      requireTLS: altPort === 587,
      auth: { user, pass },
      connectionTimeout: 8000,
      greetingTimeout: 8000,
      socketTimeout: 10000,
      tls: { rejectUnauthorized: false },
    });
  }

  async sendVerificationEmail(payload: SendEmailPayload): Promise<boolean> {
    const html = generateVerificationEmailHtml(payload.templateParams);
    const from = process.env.EMAIL_FROM || (process.env.SMTP_USER ? `EduConnects <${process.env.SMTP_USER}>` : "EduConnects <no-reply@educonnects.com>");
    const mailOptions = {
      from,
      to: payload.to,
      subject: payload.subject || "Your EduConnects Verification Code 🎓",
      html,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log(`✅ [SMTP] Verification code email sent to ${payload.to}`);
      return true;
    } catch (primaryErr: any) {
      console.warn(`⚠️ [SMTP] Primary port failed (${primaryErr?.message || primaryErr}). Trying alternate port...`);
      if (this.fallbackTransporter) {
        try {
          await this.fallbackTransporter.sendMail(mailOptions);
          console.log(`✅ [SMTP] Verification code email sent to ${payload.to} via fallback port`);
          return true;
        } catch (altErr: any) {
          console.error(`❌ [SMTP Delivery Error]:`, altErr?.message || altErr);
          return false;
        }
      }
      return false;
    }
  }

  async sendPasswordResetEmail(payload: SendPasswordResetPayload): Promise<boolean> {
    const html = generatePasswordResetEmailHtml({
      recipientEmail: payload.to,
      firstName: payload.firstName,
      resetUrl: payload.resetUrl,
    });
    const from = process.env.EMAIL_FROM || (process.env.SMTP_USER ? `EduConnects <${process.env.SMTP_USER}>` : "EduConnects <no-reply@educonnects.com>");
    const mailOptions = {
      from,
      to: payload.to,
      subject: payload.subject || "Reset your EduConnects password",
      html,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log(`✅ [SMTP] Password reset email sent to ${payload.to}`);
      return true;
    } catch (primaryErr: any) {
      if (this.fallbackTransporter) {
        try {
          await this.fallbackTransporter.sendMail(mailOptions);
          return true;
        } catch (altErr: any) {
          console.error(`❌ [SMTP Password Reset Error]:`, altErr?.message || altErr);
          return false;
        }
      }
      return false;
    }
  }

  async sendNotificationEmail(params: NotificationEmailParams): Promise<boolean> {
    const html = generateNotificationEmailHtml(params);
    const from = process.env.EMAIL_FROM || (process.env.SMTP_USER ? `EduConnects <${process.env.SMTP_USER}>` : "EduConnects <no-reply@educonnects.com>");
    const mailOptions = {
      from,
      to: params.email,
      subject: params.subject,
      html,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      return true;
    } catch (primaryErr: any) {
      if (this.fallbackTransporter) {
        try {
          await this.fallbackTransporter.sendMail(mailOptions);
          return true;
        } catch (altErr: any) {
          console.error(`❌ [SMTP Notification Error]:`, altErr?.message || altErr);
          return false;
        }
      }
      return false;
    }
  }

  async sendCertificateEmail(payload: SendCertificatePayload): Promise<boolean> {
    const appUrl = getPublicAppUrl();
    const verificationUrl = `${appUrl}/certificate/verify/${payload.certificateNumber}`;
    const html = generateCertificateEmailHtml({
      recipientEmail: payload.to,
      educatorName: payload.educatorName,
      certificateNumber: payload.certificateNumber,
      programTitle: payload.programTitle,
      completionDate: payload.completionDate,
      verificationUrl,
      appUrl,
    });
    const from = process.env.EMAIL_FROM || (process.env.SMTP_USER ? `EduConnects <${process.env.SMTP_USER}>` : "EduConnects <noreply@educonnects.co.in>");
    const mailOptions = {
      from,
      to: payload.to,
      subject: payload.subject,
      html,
      attachments: [
        {
          filename: `EduConnects-Certificate-${payload.certificateNumber}.pdf`,
          content: payload.pdfBuffer,
        },
      ],
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log(`✅ [SMTP] Certificate email with PDF attachment sent to ${payload.to}`);
      return true;
    } catch (primaryErr: any) {
      if (this.fallbackTransporter) {
        try {
          await this.fallbackTransporter.sendMail(mailOptions);
          return true;
        } catch (altErr: any) {
          console.error(`❌ [SMTP Certificate Delivery Error]:`, altErr?.message || altErr);
          return false;
        }
      }
      return false;
    }
  }
}

/**
 * Factory function returning configured Email Provider based on environment variables.
 * Defaults to SMTPEmailProvider for full inbox delivery.
 */
export function getEmailProvider(): IEmailProvider {
  const providerType = process.env.EMAIL_PROVIDER?.toLowerCase() || "";
  const hasResendKey = !!(process.env.RESEND_API_KEY && process.env.RESEND_API_KEY.trim() !== "");

  if (providerType === "console" || process.env.NODE_ENV === "test") {
    return new ConsoleEmailProvider();
  }

  if (providerType === "smtp") {
    return new SMTPEmailProvider();
  }

  if (providerType === "resend" || hasResendKey) {
    const { ResendEmailProvider } = require("./resend-provider");
    return new ResendEmailProvider();
  }

  if (process.env.SMTP_USER && process.env.SMTP_PASSWORD) {
    return new SMTPEmailProvider();
  }

  return new ConsoleEmailProvider();
}

/**
 * Higher-level EduConnects Email Service API wrappers.
 */
export class EmailService {
  static async sendVerificationOTP(params: {
    email: string;
    userName?: string;
    otp: string;
    verificationUrl?: string;
    expiresInMinutes?: number;
    isAdminLogin?: boolean;
    subject?: string;
    from?: string;
    theme?: EmailThemeType;
    role?: string;
    originHost?: string;
  }): Promise<boolean> {
    const provider = getEmailProvider();
    const isLogin = !!params.isAdminLogin;
    const defaultSubject = isLogin ? "EduConnects Admin Login - Verification Code" : "Your EduConnects Verification Code 🎓";
    const subject = params.subject || defaultSubject;
    const from = params.from || "EduConnects <noreply@educonnects.co.in>";

    try {
      let timer: NodeJS.Timeout | undefined;
      const timeoutPromise = new Promise<boolean>((resolve) => {
        timer = setTimeout(() => {
          console.warn("⏱️ Email dispatch safety timeout reached (15000ms). Responding to UI.");
          resolve(false);
        }, 15000);
      });

      const result = await Promise.race([
        provider.sendVerificationEmail({
          to: params.email,
          subject,
          from,
          templateParams: {
            recipientEmail: params.email,
            firstName: params.userName,
            otp: params.otp,
            verificationUrl: params.verificationUrl,
            expiresInMinutes: params.expiresInMinutes || Number(process.env.OTP_EXPIRY_MINUTES) || 10,
            appUrl: getPublicAppUrl(),
            isAdminLogin: isLogin,
            theme: params.theme,
            role: params.role,
            originHost: params.originHost,
          },
        }),
        timeoutPromise,
      ]);

      if (timer) clearTimeout(timer);
      return result;
    } catch (err) {
      console.error("❌ EmailService.sendVerificationOTP error:", err);
      return false;
    }
  }

  static async sendPasswordResetEmail(params: {
    email: string;
    userName?: string;
    resetUrl: string;
  }): Promise<boolean> {
    const provider = getEmailProvider();
    return provider.sendPasswordResetEmail({
      to: params.email,
      subject: "Reset your EduConnects password",
      firstName: params.userName,
      resetUrl: params.resetUrl,
    });
  }

  static async sendWelcomeEmail(params: {
    email: string;
    userName?: string;
    role?: string;
    theme?: EmailThemeType;
    originHost?: string;
    actionUrl?: string;
    actionText?: string;
    subject?: string;
    headline?: string;
    bodyText?: string;
  }): Promise<boolean> {
    const provider = getEmailProvider();
    const resolvedTheme = resolveEmailTheme({
      theme: params.theme,
      role: params.role,
      host: params.originHost,
    });

    const isEducator = resolvedTheme.name === "educator";
    const defaultRecipient = isEducator ? "Educator" : "Learner";
    const recipientName = params.userName && params.userName.trim()
      ? params.userName.trim()
      : defaultRecipient;

    const defaultSubject = isEducator
      ? `Welcome to ${resolvedTheme.portalLabel}! 🎓`
      : `Welcome to ${resolvedTheme.portalLabel}! 🎓`;

    const defaultHeadline = isEducator
      ? "Welcome to the EduConnects Educator Community!"
      : "Your EduConnects journey starts here!";

    const defaultBodyText = isEducator
      ? "Welcome to EduConnects! We are thrilled to have you join our educator community. Host interactive live classes, publish courses, manage your earnings, and inspire learners across the nation."
      : "Explore top teachers, host live classes, and master new skills on EduConnects.";

    const defaultActionUrl = isEducator
      ? `${resolvedTheme.domainUrl}/dashboard`
      : `${resolvedTheme.domainUrl}/courses`;

    const defaultActionText = isEducator
      ? "Go to Educator Dashboard"
      : "Explore Courses Now";

    return provider.sendNotificationEmail({
      email: params.email,
      recipientName,
      subject: params.subject || defaultSubject,
      statusBadgeText: "WELCOME",
      statusBadgeVariant: "theme",
      headline: params.headline || defaultHeadline,
      bodyText: params.bodyText || defaultBodyText,
      actionUrl: params.actionUrl || defaultActionUrl,
      actionText: params.actionText || defaultActionText,
      role: params.role,
      theme: resolvedTheme.name,
      originHost: params.originHost,
    });
  }

  static async sendStaffInvitationEmail(params: {
    email: string;
    recipientName?: string;
    roleName: string;
  }): Promise<boolean> {
    const provider = getEmailProvider();
    const name = params.recipientName || "Colleague";
    return provider.sendNotificationEmail({
      email: params.email,
      recipientName: name,
      subject: "You've been invited to join EduConnects",
      headline: "You've been invited to join EduConnects",
      statusBadgeText: `ASSIGNED ROLE: ${params.roleName.toUpperCase()}`,
      statusBadgeVariant: "success",
      bodyText: `Hello ${name},\n\nYou have been invited to join the EduConnects administration team.\n\nYou have been assigned the following role:\n${params.roleName}\n\nTo complete your staff account setup:\n1. Open EduConnects.\n2. Go to Staff Registration.\n3. Enter the email address where you received this invitation (${params.email}).\n4. Verify the OTP sent to your email.\n5. Complete your account setup.\n\nYour staff access and permissions will be automatically configured after verification.\n\nIf you were not expecting this invitation, please contact the EduConnects administrator.\n\nRegards,\nEduConnects Team`,
      actionUrl: `${getPublicAppUrl()}/staff/register`,
      actionText: "Go to Staff Registration",
    });
  }

  static async sendCertificateEmail(params: {
    email: string;
    educatorName: string;
    certificateNumber: string;
    programTitle?: string;
    completionDate?: string;
    pdfBuffer: Buffer;
  }): Promise<boolean> {
    const provider = getEmailProvider();
    const programTitle = params.programTitle || "15-Day Educator Training Program";
    const completionDate = params.completionDate || new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
    const subject = `Your EduConnects Completion Certificate - ${programTitle} 🎓`;

    try {
      return await provider.sendCertificateEmail({
        to: params.email,
        subject,
        educatorName: params.educatorName,
        certificateNumber: params.certificateNumber,
        programTitle,
        completionDate,
        pdfBuffer: params.pdfBuffer,
      });
    } catch (err) {
      console.error("❌ EmailService.sendCertificateEmail error:", err);
      return false;
    }
  }
}
