/**
 * Standardized EduConnects Redesigned Email Footer
 * Version: 2.0.0 (Professional Standardized Design)
 * 
 * Features:
 * - Prominent EduConnects branding & logo
 * - Clean horizontal row of social media icons (Instagram, Facebook, YouTube, WhatsApp, LinkedIn)
 * - Navigation links: Privacy Policy, Terms & Conditions, Cancellation / Refund Policy
 * - Support contact details (support@educonnects.co.in, +91 9109019090)
 * - Official registered office address: Bard No. 8, Basundhara Colony, Chandmari, Lalitpur (UP), 284403, India
 * - Corporate business info: Shrivastava ProFunnels Ventures Pvt Ltd (CIN: U85499UP2024PTC212061)
 * - Copyright text: © 2026 EduConnects. All rights reserved.
 * - Clickable link: Powered by MyProFunnels Ventures (https://myprofunnels.com)
 * - Responsive, centered, spacious, and 100% email-client friendly (Gmail, Outlook, Apple Mail)
 */

import { getPublicAppUrl } from "../../app-url";
import { OFFICIAL_COMPANY_INFO } from "../../company";

export interface EmailFooterOptions {
  baseUrl?: string;
  isEducator?: boolean;
}

export function generateEmailFooterHtml(options: EmailFooterOptions = {}): string {
  const baseUrl = options.baseUrl ? options.baseUrl.replace(/\/+$/, "") : getPublicAppUrl();

  const socialLinks = {
    instagram: "https://instagram.com/myprofunnels",
    facebook: "https://facebook.com/myprofunnels",
    youtube: "https://youtube.com/@myprofunnels",
    whatsapp: OFFICIAL_COMPANY_INFO.whatsappUrl || "https://wa.me/919109019090",
    linkedin: "https://wa.me/919109019090",
  };

  return `<!-- Standardized EduConnects Redesigned Email Footer -->
          <tr>
            <td class="footer-padding" style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 36px 32px 28px 32px; text-align: center; font-size: 12px; line-height: 1.6; color: #64748b; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
              
              <!-- 1. EduConnects Branding & Logo -->
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" align="center" style="margin: 0 auto 18px auto;">
                <tr>
                  <td align="center" style="text-align: center;">
                    <a href="${baseUrl}" target="_blank" rel="noopener noreferrer" style="text-decoration: none; display: inline-block;">
                      <table role="presentation" border="0" cellpadding="0" cellspacing="0" align="center">
                        <tr>
                          <td align="center" valign="middle" style="padding-right: 10px;">
                            <img src="${baseUrl}/images/favicon.png" alt="EduConnects Logo" width="32" height="32" style="display: block; width: 32px; height: 32px; border: 0; outline: none; border-radius: 8px;" />
                          </td>
                          <td align="left" valign="middle">
                            <span style="font-size: 18px; font-weight: 900; color: #083F3D; letter-spacing: -0.3px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">EduConnects</span>
                          </td>
                        </tr>
                      </table>
                    </a>
                    <p style="margin: 4px 0 0 0; font-size: 11px; font-weight: 700; color: #0F5C5A; letter-spacing: 0.8px; text-transform: uppercase;">
                      Learn &bull; Grow &bull; Belong
                    </p>
                  </td>
                </tr>
              </table>

              <!-- 2. Clean Horizontal Row of Social Media Icons -->
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" align="center" style="margin: 0 auto 20px auto;">
                <tr>
                  <!-- Instagram -->
                  <td align="center" style="padding: 0 6px;">
                    <a href="${socialLinks.instagram}" target="_blank" rel="noopener noreferrer" title="Follow us on Instagram" style="display: inline-block; width: 34px; height: 34px; text-decoration: none;">
                      <img src="${baseUrl}/images/social/instagram.png" alt="Instagram" width="34" height="34" style="display: block; width: 34px; height: 34px; border: 0; outline: none;" />
                    </a>
                  </td>
                  <!-- Facebook -->
                  <td align="center" style="padding: 0 6px;">
                    <a href="${socialLinks.facebook}" target="_blank" rel="noopener noreferrer" title="Join us on Facebook" style="display: inline-block; width: 34px; height: 34px; text-decoration: none;">
                      <img src="${baseUrl}/images/social/facebook.png" alt="Facebook" width="34" height="34" style="display: block; width: 34px; height: 34px; border: 0; outline: none;" />
                    </a>
                  </td>
                  <!-- YouTube -->
                  <td align="center" style="padding: 0 6px;">
                    <a href="${socialLinks.youtube}" target="_blank" rel="noopener noreferrer" title="Subscribe on YouTube" style="display: inline-block; width: 34px; height: 34px; text-decoration: none;">
                      <img src="${baseUrl}/images/social/youtube.png" alt="YouTube" width="34" height="34" style="display: block; width: 34px; height: 34px; border: 0; outline: none;" />
                    </a>
                  </td>
                  <!-- WhatsApp -->
                  <td align="center" style="padding: 0 6px;">
                    <a href="${socialLinks.whatsapp}" target="_blank" rel="noopener noreferrer" title="Chat on WhatsApp" style="display: inline-block; width: 34px; height: 34px; text-decoration: none;">
                      <img src="${baseUrl}/images/social/whatsapp.png" alt="WhatsApp" width="34" height="34" style="display: block; width: 34px; height: 34px; border: 0; outline: none;" />
                    </a>
                  </td>
                  <!-- LinkedIn -->
                  <td align="center" style="padding: 0 6px;">
                    <a href="${socialLinks.linkedin}" target="_blank" rel="noopener noreferrer" title="Connect with EduConnects" style="display: inline-block; width: 34px; height: 34px; text-decoration: none;">
                      <img src="${baseUrl}/images/social/linkedin.png" alt="LinkedIn" width="34" height="34" style="display: block; width: 34px; height: 34px; border: 0; outline: none;" />
                    </a>
                  </td>
                </tr>
              </table>

              <!-- 3. Policy & Legal Links -->
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" align="center" style="margin: 0 auto 16px auto;">
                <tr>
                  <td align="center" style="font-size: 12px; line-height: 1.6; color: #475569; text-align: center;">
                    <a href="${baseUrl}/privacy-policy" target="_blank" rel="noopener noreferrer" style="color: #475569; text-decoration: none; font-weight: 600; font-size: 12px;">Privacy Policy</a>
                    <span style="color: #cbd5e1; margin: 0 8px; font-weight: normal;">&bull;</span>
                    <a href="${baseUrl}/terms-and-conditions" target="_blank" rel="noopener noreferrer" style="color: #475569; text-decoration: none; font-weight: 600; font-size: 12px;">Terms &amp; Conditions</a>
                    <span style="color: #cbd5e1; margin: 0 8px; font-weight: normal;">&bull;</span>
                    <a href="${baseUrl}/refund-policy" target="_blank" rel="noopener noreferrer" style="color: #475569; text-decoration: none; font-weight: 600; font-size: 12px;">Cancellation &amp; Refund Policy</a>
                  </td>
                </tr>
              </table>

              <!-- 4. Support / Contact Information -->
              <p style="margin: 0 0 10px 0; font-size: 12px; line-height: 1.5; color: #64748b; text-align: center;">
                Need assistance? Contact our support team at <a href="mailto:support@educonnects.co.in" style="color: #0f5c5a; font-weight: 700; text-decoration: underline;">support@educonnects.co.in</a> &nbsp;|&nbsp; WhatsApp: <a href="https://wa.me/919109019090" target="_blank" rel="noopener noreferrer" style="color: #0f5c5a; font-weight: 700; text-decoration: underline;">+91 9109019090</a>
              </p>

              <!-- 5. Official Registered Office Address & Corporate Entity -->
              <p style="margin: 0 0 4px 0; font-size: 11px; line-height: 1.5; color: #94a3b8; text-align: center;">
                Registered Office: Bard No. 8, Basundhara Colony, Chandmari, Lalitpur (UP), 284403, India
              </p>
              <p style="margin: 0 0 14px 0; font-size: 11px; line-height: 1.5; color: #94a3b8; text-align: center;">
                Operated by Shrivastava ProFunnels Ventures Pvt Ltd &bull; CIN: U85499UP2024PTC212061
              </p>

              <!-- 6. Copyright Text -->
              <p style="margin: 0 0 6px 0; font-size: 12px; font-weight: 600; color: #475569; text-align: center;">
                &copy; 2026 EduConnects. All rights reserved.
              </p>

              <!-- 7. Powered by MyProFunnels Ventures -->
              <p style="margin: 0; font-size: 11px; line-height: 1.4; color: #94a3b8; text-align: center;">
                <a href="https://myprofunnels.com" target="_blank" rel="noopener noreferrer" style="color: #0f5c5a; font-weight: 700; text-decoration: underline;">Powered by MyProFunnels Ventures</a>
              </p>

            </td>
          </tr>`;
}
