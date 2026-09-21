import { getPublicAppUrl } from "../../app-url";
import { OFFICIAL_COMPANY_INFO } from "../../company";
import { generateEmailFooterHtml } from "./email-footer";

export interface EmailTemplateParams {
  recipientEmail: string;
  firstName?: string;
  otp: string;
  verificationUrl?: string;
  expiresInMinutes?: number;
  appUrl?: string;
  isAdminLogin?: boolean;
}

/**
 * Generates a modern, professional, mobile-responsive & Gmail-friendly HTML template
 * for EduConnects Email OTP Verification (Learner, Educator & Admin verification).
 */
export function generateVerificationEmailHtml(params: EmailTemplateParams): string {
  const { firstName, otp, expiresInMinutes = 10, appUrl, isAdminLogin } = params;

  const recipientName = firstName && firstName.trim() ? firstName.trim() : "there";
  const baseUrl = appUrl || getPublicAppUrl();

  // Format OTP code with clear character spacing for email displays (e.g. 4  8  2  9  1  3)
  const formattedOtp = otp ? otp.split("").join("&nbsp;&nbsp;") : "0&nbsp;&nbsp;0&nbsp;&nbsp;0&nbsp;&nbsp;0&nbsp;&nbsp;0&nbsp;&nbsp;0";

  const emailSubjectTitle = isAdminLogin
    ? "EduConnects Admin Security Verification"
    : "Your EduConnects Verification Code 🎓";

  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="x-apple-disable-message-reformatting">
  <title>${emailSubjectTitle}</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style>
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none; }
    body { height: 100% !important; margin: 0 !important; padding: 0 !important; width: 100% !important; background-color: #f1f5f9; color: #0f172a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
    
    @media screen and (max-width: 600px) {
      .email-wrapper { padding: 12px !important; }
      .main-card { width: 100% !important; max-width: 100% !important; border-radius: 16px !important; }
      .header-padding { padding: 28px 20px !important; }
      .content-padding { padding: 24px 20px !important; }
      .footer-padding { padding: 20px 16px !important; }
      .otp-code { font-size: 32px !important; letter-spacing: 6px !important; }
      .cta-button { display: block !important; width: 100% !important; text-align: center !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; color: #0f172a;">

  <!-- Outer Table Wrapper -->
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" class="email-wrapper" style="background-color: #f1f5f9; padding: 32px 12px;">
    <tr>
      <td align="center">
        
        <!-- Main Card Container -->
        <table class="main-card" role="presentation" border="0" cellpadding="0" cellspacing="0" width="560" style="max-width: 560px; width: 100%; background-color: #ffffff; border-radius: 24px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 20px 40px -15px rgba(15, 23, 42, 0.08);">
          
          <!-- Header Banner -->
          <tr>
            <td class="header-padding" align="center" style="background: linear-gradient(135deg, #083F3D 0%, #0F5C5A 50%, #2A8C84 100%); padding: 36px 32px; text-align: center;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="center">
                    <!-- Brand Logo (Transparent) -->
                    <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin: 0 auto 12px auto;">
                      <tr>
                        <td align="center" style="background: transparent; background-color: transparent; padding: 0; border: 0;">
                          <img src="${baseUrl}/images/favicon.png" alt="EduConnects Logo" width="56" height="56" style="display: block; width: 56px; height: 56px; max-width: 56px; border: 0; outline: none; text-decoration: none; margin: 0 auto; background: transparent;" />
                        </td>
                      </tr>
                    </table>

                    <!-- Brand Name & Subtitle -->
                    <h1 style="margin: 0; font-size: 26px; font-weight: 900; color: #ffffff; letter-spacing: -0.2px; text-transform: none;">
                      EduConnects
                    </h1>
                    <p style="margin: 4px 0 0 0; font-size: 12px; font-weight: 600; color: #A7F3D0; letter-spacing: 0.5px;">
                      Learn • Grow • Belong
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Body Content -->
          <tr>
            <td class="content-padding" style="padding: 32px 36px; text-align: center;">
              
              <!-- Greeting & Headline -->
              ${
                isAdminLogin
                  ? `
                <h2 style="margin: 0 0 8px 0; font-size: 20px; font-weight: 800; color: #0f172a; tracking-tight: -0.4px;">
                  Admin Security Passcode
                </h2>
                <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 1.6; color: #475569;">
                  Your one-time security passcode for EduConnects Admin Portal verification is below:
                </p>
              `
                  : `
                <h2 style="margin: 0 0 8px 0; font-size: 20px; font-weight: 800; color: #0f172a; tracking-tight: -0.4px;">
                  Hello ${recipientName}! 👋
                </h2>
                <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 1.6; color: #475569;">
                  Thank you for using EduConnects. Your one-time verification code is below. Enter this code to verify your account and complete your login:
                </p>
              `
              }

              <!-- OTP Container Box -->
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 24px 0;">
                <tr>
                  <td align="center" style="background: linear-gradient(135deg, #f0fdf4 0%, #e6f0ef 100%); border: 2px solid #a7f3d0; border-radius: 20px; padding: 24px 16px; text-align: center;">
                    <div style="font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 2px; color: #0f5c5a; margin-bottom: 8px;">
                      ${isAdminLogin ? "ADMIN PASSCODE" : "ONE-TIME VERIFICATION CODE"}
                    </div>
                    <div class="otp-code" style="font-size: 36px; font-weight: 900; color: #083f3d; letter-spacing: 8px; font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, Courier, monospace; margin: 6px 0; user-select: all; -webkit-user-select: all;">
                      ${formattedOtp}
                    </div>
                    <div style="margin-top: 10px;">
                      <span style="display: inline-block; font-size: 11px; font-weight: 700; color: #0f5c5a; background-color: #ffffff; padding: 5px 14px; border-radius: 9999px; border: 1px solid #a7f3d0;">
                        ⏱️ Valid for ${expiresInMinutes} minutes
                      </span>
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Explicit Verification Note Callout (User Requirement) -->
              <div style="margin: 24px 0; background-color: #f0fdf4; border: 1px solid #bbf7d0; border-left: 4px solid #16a34a; border-radius: 12px; padding: 14px 18px; text-align: left;">
                <p style="margin: 0; font-size: 13px; line-height: 1.55; color: #166534; font-weight: 500;">
                  Someone visited our official website <a href="https://www.educonnects.co.in" style="color: #15803d; font-weight: 700; text-decoration: underline;" target="_blank">www.educonnects.co.in</a> and requested this verification email. If you did not request it, please ignore this email. Thank you!
                </p>
              </div>

              <!-- CTA Button -->
              <div style="margin: 28px 0 12px 0;">
                <a href="${baseUrl}/${isAdminLogin ? "verify-email?email=" + encodeURIComponent(params.recipientEmail) + "&redirectTo=/admin" : "verify-otp?email=" + encodeURIComponent(params.recipientEmail)}" class="cta-button" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #0f5c5a 0%, #083f3d 100%); color: #ffffff !important; font-size: 15px; font-weight: 700; text-decoration: none; padding: 14px 36px; border-radius: 14px; box-shadow: 0 10px 20px rgba(15, 92, 90, 0.25); text-align: center;">
                  ${isAdminLogin ? "Open Admin Portal" : "Verify Email Now"} &rarr;
                </a>
              </div>

            </td>
          </tr>

          <!-- Standardized EduConnects Redesigned Footer -->
          ${generateEmailFooterHtml({ baseUrl })}

        </table>

      </td>
    </tr>
  </table>

</body>
</html>`;
}
