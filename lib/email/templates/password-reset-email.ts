import { getPublicAppUrl } from "../../app-url";
import { generateEmailFooterHtml } from "./email-footer";

export interface PasswordResetEmailParams {
  recipientEmail: string;
  firstName?: string;
  resetUrl: string;
}

/**
 * Generates a modern, professional, mobile-responsive & Gmail-friendly HTML template
 * for EduConnects Password Reset requests.
 */
export function generatePasswordResetEmailHtml(params: PasswordResetEmailParams): string {
  const { firstName, resetUrl } = params;
  const recipientName = firstName && firstName.trim() ? firstName.trim() : "there";
  const baseUrl = getPublicAppUrl();

  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="x-apple-disable-message-reformatting">
  <title>Reset Your EduConnects Password</title>
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
            <td class="header-padding" align="center" style="background: linear-gradient(135deg, #1e3a8a 0%, #3157d5 50%, #2563eb 100%); padding: 36px 32px; text-align: center;">
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
                    <p style="margin: 4px 0 0 0; font-size: 12px; font-weight: 600; color: #bfdbfe; letter-spacing: 0.5px;">
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
              <h2 style="margin: 0 0 8px 0; font-size: 20px; font-weight: 800; color: #0f172a;">
                Reset Your Password
              </h2>
              <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 1.6; color: #475569;">
                Hello ${recipientName},<br>
                We received a request to reset your EduConnects account password. Click the secure button below to choose a new password:
              </p>

              <!-- CTA Button -->
              <div style="margin: 28px 0 20px 0;">
                <a href="${resetUrl}" class="cta-button" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #3157d5 0%, #1e3a8a 100%); color: #ffffff !important; font-size: 15px; font-weight: 700; text-decoration: none; padding: 14px 36px; border-radius: 14px; box-shadow: 0 10px 20px rgba(49, 87, 213, 0.3); text-align: center;">
                  Reset Password Now &rarr;
                </a>
              </div>

              <!-- Expiry Note -->
              <div style="margin: 20px 0; background-color: #f8fafc; border-left: 4px solid #3b82f6; border-radius: 8px; padding: 12px 16px; font-size: 13px; color: #475569; text-align: left;">
                ⏱️ <strong>Note:</strong> This password reset link will expire in 30 minutes for security purposes.
              </div>

              <!-- Explicit Verification Note Callout (User Requirement) -->
              <div style="margin: 24px 0; background-color: #f0fdf4; border: 1px solid #bbf7d0; border-left: 4px solid #16a34a; border-radius: 12px; padding: 14px 18px; text-align: left;">
                <p style="margin: 0; font-size: 13px; line-height: 1.55; color: #166534; font-weight: 500;">
                  Someone visited our official website <a href="https://www.educonnects.co.in" style="color: #15803d; font-weight: 700; text-decoration: underline;" target="_blank">www.educonnects.co.in</a> and requested this verification email. If you did not request it, please ignore this email. Thank you!
                </p>
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
