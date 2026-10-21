import { getPublicAppUrl } from "../../app-url";
import { EmailThemeType, resolveEmailTheme } from "../email-theme";
import { generateNotificationEmailHtml } from "./verification-templates";

export interface WelcomeEmailParams {
  email: string;
  userName?: string;
  role?: string;
  theme?: EmailThemeType;
  appUrl?: string;
  originHost?: string;
  actionUrl?: string;
  actionText?: string;
  subject?: string;
  headline?: string;
  bodyText?: string;
  statusBadgeText?: string;
}

/**
 * Generates modern, role-based, Gmail-compatible HTML template for EduConnects Welcome Emails:
 * - Learner: Official Learner Blue (#2563EB, #1E40AF, #60A5FA, #EFF6FF)
 * - Educator: Official Educator Teal (#0F766E, #115E59, #2DD4BF, #F0FDFA)
 * - Fallback / Main: Official Emerald Green (#16805B, #0D5C41, #35A979, #F0FAF5)
 */
export function generateWelcomeEmailHtml(params: WelcomeEmailParams): string {
  const theme = resolveEmailTheme({
    theme: params.theme,
    role: params.role,
    host: params.originHost || params.appUrl,
    originUrl: params.appUrl,
  });

  const isEducator = theme.name === "educator";
  const defaultRecipient = isEducator ? "Educator" : "Learner";
  const recipientName = params.userName && params.userName.trim() ? params.userName.trim() : defaultRecipient;
  const baseUrl = params.appUrl || getPublicAppUrl();

  const defaultSubject = isEducator
    ? `Welcome to ${theme.portalLabel}! 🎓`
    : `Welcome to ${theme.portalLabel}! 🎓`;

  const defaultHeadline = isEducator
    ? "Welcome to the EduConnects Educator Community!"
    : "Your EduConnects journey starts here!";

  const defaultBody = isEducator
    ? "Welcome to EduConnects! We are thrilled to have you join our educator community. Host interactive live classes, publish courses, manage your earnings, and inspire learners across the nation."
    : "Explore top teachers, host live classes, and master new skills on EduConnects.";

  const defaultActionUrl = params.actionUrl || (isEducator
    ? `${theme.domainUrl}/dashboard`
    : `${theme.domainUrl}/courses`);

  const defaultActionText = params.actionText || (isEducator
    ? "Go to Educator Dashboard"
    : "Explore Courses Now");

  return generateNotificationEmailHtml({
    email: params.email,
    recipientName,
    subject: params.subject || defaultSubject,
    headline: params.headline || defaultHeadline,
    bodyText: params.bodyText || defaultBody,
    statusBadgeText: params.statusBadgeText || "WELCOME",
    statusBadgeVariant: "theme",
    actionUrl: defaultActionUrl,
    actionText: defaultActionText,
    role: params.role,
    theme: theme.name,
    appUrl: baseUrl,
    originHost: params.originHost,
  });
}
