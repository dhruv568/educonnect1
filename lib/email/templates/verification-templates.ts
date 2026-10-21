import { getPublicAppUrl } from "../../app-url";
import { generateEmailFooterHtml } from "./email-footer";
import { resolveEmailTheme, EmailThemeType } from "../email-theme";

export type NotificationBadgeVariant = "pending" | "success" | "danger" | "warning" | "info" | "theme";

export interface NotificationEmailParams {
  email: string;
  recipientName: string;
  subject: string;
  headline: string;
  bodyText: string;
  statusBadgeText: string;
  statusBadgeVariant?: NotificationBadgeVariant;
  reasonText?: string;
  actionUrl?: string;
  actionText?: string;
  roleName?: string;
  role?: string;
  theme?: EmailThemeType;
  appUrl?: string;
  originHost?: string;
}

/**
 * Generates a modern, professional, mobile-responsive & Gmail-friendly HTML template
 * for EduConnects System Notifications, Staff Invitations, Welcome Emails, and Educator Status Updates.
 */
export function generateNotificationEmailHtml(params: NotificationEmailParams): string {
  const theme = resolveEmailTheme({
    theme: params.theme,
    role: params.role || params.roleName,
    host: params.originHost || params.appUrl,
    originUrl: params.appUrl,
  });

  const badgeColors: Record<NotificationBadgeVariant, { bg: string; text: string; border: string; dot: string }> = {
    pending: { bg: "#fef3c7", text: "#92400e", border: "#fde68a", dot: "#d97706" },
    success: { bg: "#ecfdf5", text: "#065f46", border: "#a7f3d0", dot: "#10b981" },
    danger: { bg: "#fef2f2", text: "#991b1b", border: "#fecaca", dot: "#ef4444" },
    warning: { bg: "#fff7ed", text: "#9a3412", border: "#fed7aa", dot: "#f97316" },
    info: { bg: "#eff6ff", text: "#1e40af", border: "#bfdbfe", dot: "#3b82f6" },
    theme: { bg: theme.softBg, text: theme.dark, border: theme.noticeBorder, dot: theme.primary },
  };

  const effectiveVariant = params.statusBadgeVariant === "theme" ||
    (!params.statusBadgeVariant && params.statusBadgeText === "WELCOME") ||
    (params.statusBadgeText === "WELCOME" && params.statusBadgeVariant === "success")
      ? "theme"
      : (params.statusBadgeVariant || "info");

  const badgeStyle = badgeColors[effectiveVariant] || badgeColors.theme;
  const recipient = params.recipientName && params.recipientName.trim() ? params.recipientName.trim() : "Colleague";
  const baseUrl = params.appUrl || getPublicAppUrl();

  // Clean and parse body text into formatted HTML blocks
  let rawBody = params.bodyText || "";
  rawBody = rawBody.replace(/^Hello\s+[^,\n]+,\s*/i, "").trim();

  const paragraphs = rawBody.split(/\n\s*\n/).filter(Boolean);
  let formattedContentHtml = "";

  for (const para of paragraphs) {
    const trimmed = para.trim();

    // Check if paragraph is a numbered step list
    if (/^\d+\.\s+/m.test(trimmed)) {
      const stepLines = trimmed.split("\n").filter((l) => l.trim().length > 0);
      let stepsHtml = `<div style="margin: 20px 0; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; padding: 18px 20px;">`;
      stepsHtml += `<div style="font-size: 12px; font-weight: 800; color: #475569; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 12px;">Onboarding Steps:</div>`;
      stepsHtml += `<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">`;

      stepLines.forEach((line) => {
        const match = line.match(/^(\d+)\.\s+(.*)$/);
        if (match) {
          const num = match[1];
          const text = match[2];
          stepsHtml += `
            <tr>
              <td valign="top" style="width: 28px; padding-bottom: 10px;">
                <span style="display: inline-block; width: 22px; height: 22px; background-color: ${theme.primary}; color: #ffffff; font-size: 11px; font-weight: 800; line-height: 22px; text-align: center; border-radius: 50%;">
                  ${num}
                </span>
              </td>
              <td valign="top" style="padding-bottom: 10px; padding-left: 6px; font-size: 14px; line-height: 1.5; color: #334155; font-weight: 500;">
                ${text}
              </td>
            </tr>
          `;
        } else {
          stepsHtml += `
            <tr>
              <td colspan="2" style="padding-bottom: 6px; font-size: 13px; color: #64748b;">${line}</td>
            </tr>
          `;
        }
      });

      stepsHtml += `</table></div>`;
      formattedContentHtml += stepsHtml;
    }
    // Check if paragraph is assigned role statement
    else if (/assigned\s+(the\s+following\s+)?role/i.test(trimmed)) {
      const lines = trimmed.split("\n").map((l) => l.trim()).filter(Boolean);
      const roleName = lines.length > 1 ? lines[lines.length - 1] : trimmed.replace(/.*role:\s*/i, "");

      formattedContentHtml += `
        <div style="margin: 18px 0; background: linear-gradient(135deg, ${theme.softBg} 0%, #ffffff 100%); border: 1px solid ${theme.noticeBorder}; border-radius: 14px; padding: 16px 20px;">
          <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
            <tr>
              <td style="font-size: 12px; font-weight: 700; color: ${theme.primary}; text-transform: uppercase; letter-spacing: 0.5px; padding-bottom: 4px;">
                Assigned Custom Role
              </td>
            </tr>
            <tr>
              <td style="font-size: 18px; font-weight: 800; color: #0f172a;">
                ${roleName}
              </td>
            </tr>
          </table>
        </div>
      `;
    }
    // Check if paragraph is a closing note or disclaimer
    else if (/if\s+you\s+were\s+not\s+expecting/i.test(trimmed) || /security|administrator/i.test(trimmed)) {
      formattedContentHtml += `
        <div style="margin: 16px 0; background-color: #f1f5f9; border-left: 4px solid ${theme.primary}; border-radius: 6px; padding: 12px 16px; font-size: 13px; line-height: 1.5; color: #475569;">
          ${trimmed.replace(/\n/g, "<br>")}
        </div>
      `;
    }
    // Check if paragraph is sign-off
    else if (/^regards/i.test(trimmed)) {
      formattedContentHtml += `
        <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #f1f5f9; font-size: 14px; line-height: 1.6; color: #475569;">
          ${trimmed.replace(/\n/g, "<br>")}
        </div>
      `;
    }
    // Normal paragraph
    else {
      formattedContentHtml += `
        <p style="margin: 0 0 14px 0; font-size: 15px; line-height: 1.6; color: #334155;">
          ${trimmed.replace(/\n/g, "<br>")}
        </p>
      `;
    }
  }

  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="x-apple-disable-message-reformatting">
  <title>${params.subject}</title>
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
        <table class="main-card" role="presentation" border="0" cellpadding="0" cellspacing="0" width="580" style="max-width: 580px; width: 100%; background-color: #ffffff; border-radius: 24px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 20px 40px -15px rgba(15, 23, 42, 0.08);">
          
          <!-- Header Banner -->
          <tr>
            <td class="header-padding" align="center" style="background: ${theme.headerGradient}; padding: 36px 32px; text-align: center;">
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

                    <!-- Brand Name & Tagline -->
                    <h1 style="margin: 0; font-size: 26px; font-weight: 900; color: #ffffff; letter-spacing: -0.2px; text-transform: none;">
                      ${theme.portalLabel}
                    </h1>
                    <p style="margin: 4px 0 0 0; font-size: 12px; font-weight: 600; color: ${theme.light}; letter-spacing: 0.5px;">
                      ${theme.portalSubtitle}
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Content Body -->
          <tr>
            <td class="content-padding" style="padding: 36px 36px 28px 36px;">
              
              <!-- Status Badge -->
              <div style="margin-bottom: 16px;">
                <span style="display: inline-block; padding: 6px 14px; border-radius: 9999px; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.6px; background-color: ${badgeStyle.bg}; color: ${badgeStyle.text}; border: 1px solid ${badgeStyle.border};">
                  <span style="display: inline-block; width: 6px; height: 6px; border-radius: 50%; background-color: ${badgeStyle.dot}; margin-right: 6px; vertical-align: middle;"></span>
                  ${params.statusBadgeText}
                </span>
              </div>

              <!-- Main Headline -->
              <h1 style="margin: 0 0 16px 0; font-size: 22px; font-weight: 800; color: #0f172a; line-height: 1.3; letter-spacing: -0.4px;">
                ${params.headline}
              </h1>

              <!-- Greeting -->
              <p style="margin: 0 0 14px 0; font-size: 16px; font-weight: 700; color: #1e293b;">
                Hello ${recipient},
              </p>

              <!-- Formatted Content -->
              <div style="font-size: 15px; line-height: 1.6; color: #334155;">
                ${formattedContentHtml}
              </div>

              <!-- Optional Reason Box -->
              ${
                params.reasonText
                  ? `
                <div style="margin: 20px 0; background-color: #fef2f2; border-left: 4px solid #ef4444; border-radius: 8px; padding: 14px 18px; font-size: 14px; color: #991b1b;">
                  <strong>Note:</strong> ${params.reasonText}
                </div>
              `
                  : ""
              }

              <!-- Verification Note Callout (Theme Consistent) -->
              <div style="margin: 24px 0; background-color: ${theme.noticeBg}; border: 1px solid ${theme.noticeBorder}; border-left: 4px solid ${theme.noticeAccentBar}; border-radius: 12px; padding: 14px 18px; text-align: left;">
                <p style="margin: 0; font-size: 13px; line-height: 1.55; color: ${theme.noticeText}; font-weight: 500;">
                  Someone visited our official portal <a href="${theme.domainUrl}" style="color: ${theme.noticeLink}; font-weight: 700; text-decoration: underline;" target="_blank">${theme.displayDomain}</a> and requested this email. If you did not request it, please ignore this email. Thank you!
                </p>
              </div>

              <!-- Action Button -->
              ${
                params.actionUrl
                  ? `
                <div style="margin: 28px 0 12px 0; text-align: center;">
                  <a href="${params.actionUrl}" class="cta-button" target="_blank" style="display: inline-block; background: ${theme.ctaGradient}; color: #ffffff !important; font-size: 15px; font-weight: 700; text-decoration: none; padding: 14px 32px; border-radius: 14px; box-shadow: 0 10px 20px ${theme.ctaShadow}; text-align: center;">
                    ${params.actionText || "Continue to EduConnects"} &rarr;
                  </a>
                </div>
              `
                  : ""
              }

            </td>
          </tr>

          <!-- Standardized EduConnects Redesigned Footer -->
          ${generateEmailFooterHtml({ baseUrl, theme: theme.name })}

        </table>

      </td>
    </tr>
  </table>

</body>
</html>`;
}
