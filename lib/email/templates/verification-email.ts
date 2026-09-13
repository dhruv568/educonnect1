import { getPublicAppUrl } from "../../app-url";
import { OFFICIAL_COMPANY_INFO } from "../../company";

export interface EmailTemplateParams {
  recipientEmail: string;
  firstName?: string;
  otp: string;
  verificationUrl?: string;
  expiresInMinutes?: number;
  appUrl?: string;
}

/**
 * Generates a premium, responsive HTML template for EduConnects Email OTP Verification.
 * Designed with liquid-glass aesthetic, soft gradients, high contrast, and robust mobile support.
 */
export function generateVerificationEmailHtml(params: EmailTemplateParams): string {
  const { firstName, otp, expiresInMinutes = 10, appUrl } = params;

  const recipientName = firstName && firstName.trim() ? firstName.trim() : "there";
  const baseUrl = appUrl || getPublicAppUrl();
  const currentYear = new Date().getFullYear();

  // Format OTP code with visual spacing for email display (e.g. 4 8 2 9 1 3)
  const formattedOtp = otp ? otp.split("").join(" ") : "0 0 0 0 0 0";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Your EduConnects Verification Code 🎓</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background-color: #f1f5f9;
      color: #0f172a;
      margin: 0;
      padding: 0;
      width: 100% !important;
      -webkit-font-smoothing: antialiased;
      -webkit-text-size-adjust: 100%;
    }
    table {
      border-collapse: collapse;
    }
    .wrapper {
      width: 100%;
      table-layout: fixed;
      background-color: #f1f5f9;
      padding: 40px 16px;
    }
    .main-card {
      max-width: 540px;
      margin: 0 auto;
      background: #ffffff;
      border-radius: 24px;
      overflow: hidden;
      box-shadow: 0 20px 40px rgba(15, 23, 42, 0.08);
      border: 1px solid #e2e8f0;
    }
    .header-banner {
      background: linear-gradient(135deg, #1e40af 0%, #2563eb 50%, #3b82f6 100%);
      padding: 36px 24px;
      text-align: center;
    }
    .brand-title {
      color: #ffffff;
      font-size: 26px;
      font-weight: 900;
      letter-spacing: 1.5px;
      margin: 0;
      text-transform: uppercase;
    }
    .brand-tagline {
      color: #93c5fd;
      font-size: 13px;
      font-weight: 600;
      letter-spacing: 0.5px;
      margin-top: 4px;
      margin-bottom: 0;
    }
    .badge-icon {
      width: 56px;
      height: 56px;
      background: #ffffff;
      border-radius: 18px;
      line-height: 56px;
      font-size: 28px;
      margin: -28px auto 0 auto;
      text-align: center;
      box-shadow: 0 8px 20px rgba(37, 99, 235, 0.2);
    }
    .content-body {
      padding: 32px 36px;
      text-align: center;
    }
    .greeting {
      font-size: 20px;
      font-weight: 700;
      color: #0f172a;
      margin-top: 12px;
      margin-bottom: 8px;
    }
    .welcome-text {
      font-size: 15px;
      line-height: 1.6;
      color: #475569;
      margin: 0 0 24px 0;
    }
    .otp-container {
      background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
      border: 2px solid #bfdbfe;
      border-radius: 20px;
      padding: 28px 20px;
      margin: 24px 0;
      text-align: center;
      box-shadow: inset 0 2px 4px rgba(255, 255, 255, 0.8);
    }
    .otp-header-label {
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 2px;
      color: #1e40af;
      margin-bottom: 12px;
    }
    .otp-digits {
      font-size: 34px;
      font-weight: 900;
      letter-spacing: 10px;
      color: #1e3a8a;
      font-family: 'Courier New', Courier, monospace;
      margin: 8px 0;
      user-select: all;
      -webkit-user-select: all;
    }
    .expiry-badge {
      display: inline-block;
      font-size: 12px;
      font-weight: 700;
      color: #2563eb;
      background: #ffffff;
      padding: 6px 14px;
      border-radius: 9999px;
      margin-top: 12px;
      border: 1px solid #bfdbfe;
    }
    .security-notice {
      background: #f8fafc;
      border-left: 4px solid #3b82f6;
      border-radius: 8px;
      padding: 14px 16px;
      font-size: 13px;
      color: #475569;
      text-align: left;
      margin: 24px 0;
      line-height: 1.5;
    }
    .cta-container {
      margin: 28px 0;
    }
    .cta-button {
      display: inline-block;
      background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
      color: #ffffff !important;
      font-size: 15px;
      font-weight: 700;
      text-decoration: none;
      padding: 14px 36px;
      border-radius: 14px;
      box-shadow: 0 10px 20px rgba(37, 99, 235, 0.3);
      transition: all 0.2s ease;
    }
    .disregard-text {
      font-size: 13px;
      color: #94a3b8;
      line-height: 1.5;
      margin-top: 20px;
      margin-bottom: 0;
    }
    .footer {
      background-color: #f8fafc;
      padding: 24px 36px;
      text-align: center;
      border-top: 1px solid #f1f5f9;
    }
    .footer-brand {
      font-weight: 700;
      font-size: 14px;
      color: #475569;
      margin: 0;
    }
    .footer-tagline {
      font-size: 12px;
      color: #94a3b8;
      margin: 2px 0 12px 0;
    }
    .footer-copyright {
      font-size: 11px;
      color: #cbd5e1;
      margin: 0;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="main-card">
      <!-- Header Banner -->
      <div class="header-banner">
        <div style="margin-bottom: 12px;">
          <img src="${baseUrl}/images/logo.jpeg" alt="EduConnect Logo" width="56" height="56" style="border-radius: 14px; border: 2px solid rgba(255,255,255,0.4); display: inline-block; object-fit: cover;" />
        </div>
        <h1 class="brand-title">EDUCONNECT</h1>
        <p class="brand-tagline">Learn • Grow • Belong</p>
      </div>

      <!-- Icon Avatar Badge -->
      <div class="badge-icon">🎓</div>

      <!-- Body Content -->
      <div class="content-body">
        <h2 class="greeting">Hello ${recipientName},</h2>
        <p class="welcome-text">
          Welcome to EduConnect! 🎓<br>
          We're excited to have you with us. To verify your email address, please enter the verification code below:
        </p>

        <!-- OTP Card -->
        <div class="otp-container">
          <div class="otp-header-label">VERIFICATION CODE</div>
          <div class="otp-digits">${formattedOtp}</div>
          <div class="expiry-badge">⏱️ Valid for ${expiresInMinutes} minutes</div>
        </div>

        <!-- Security Warning -->
        <div class="security-notice">
          <strong>🔐 For your security:</strong> EduConnect will never ask you to share your verification code with anyone.
        </div>

        <!-- Call to Action Button -->
        <div class="cta-container">
          <a href="${baseUrl}/verify-otp?email=${encodeURIComponent(params.recipientEmail)}" class="cta-button" target="_blank">Verify OTP</a>
        </div>

        <!-- Disregard Disclaimer -->
        <p class="disregard-text">
          If you didn't request this verification code, you can safely ignore this email.
        </p>
      </div>

      <!-- Footer -->
      <div class="footer">
        <p class="footer-brand" style="font-weight: 700; font-size: 13px; color: #334155; margin: 0;">&copy; ${currentYear} ${OFFICIAL_COMPANY_INFO.legalName}</p>
        <p class="footer-tagline" style="font-size: 12px; color: #64748b; margin: 4px 0 0 0;">Brand Name: ${OFFICIAL_COMPANY_INFO.brandName}</p>
        <p class="footer-copyright" style="font-size: 11px; color: #94a3b8; margin: 6px 0 0 0;">All rights reserved.</p>
      </div>
    </div>
  </div>
</body>
</html>`;
}
