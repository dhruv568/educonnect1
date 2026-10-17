export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { ContactSchema } from "@/schemas/auth-schemas";
import { apiSuccess, apiBadRequest, apiError, handleApiError } from "@/lib/api-response";
import { trackEvent } from "@/lib/analytics";
import { verifyCaptchaSolution } from "@/lib/auth/captcha";
import { ValidationError } from "@/lib/errors/app-error";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // 1. Verify Security CAPTCHA Solution for Spam Protection
    const captchaCheck = verifyCaptchaSolution(body.captchaToken, body.captchaAnswer);
    if (!captchaCheck.valid) {
      return handleApiError(
        new ValidationError({
          code: "CAPTCHA_FAILED",
          title: "Security Verification Required",
          message: captchaCheck.error || "Security CAPTCHA verification failed. Please try again.",
          why: "The captcha response was incorrect or has expired.",
          resolution: ["Please solve the mathematical captcha and submit again."],
        }),
        undefined,
        400,
        { route: "/api/contact", application: "main" }
      );
    }

    // 2. Validate Contact Form Payload
    const validated = ContactSchema.parse(body);

    trackEvent("contact_form_submitted", {
      email: validated.email,
      roleType: validated.roleType,
    });

    console.log("\n==================================================");
    console.log("📩 [CONTACT FORM INQUIRY RECEIVED]");
    console.log(`From: ${validated.name} <${validated.email}> (${validated.roleType})`);
    console.log(`Subject: ${validated.subject}`);
    console.log(`Message: ${validated.message}`);
    console.log("==================================================\n");

    return apiSuccess(
      { referenceId: `TICKET-${Math.floor(100000 + Math.random() * 900000)}` },
      "Thank you for contacting EduConnects! The EduConnects Support Team will respond to your inquiry within 24 hours.",
      201
    );
  } catch (error: any) {
    if (error.name === "ZodError") {
      const issue = error.errors?.[0];
      return handleApiError(
        new ValidationError({
          code: "INVALID_FORM_DATA",
          title: "Invalid Contact Form",
          message: issue?.message || "Invalid contact form submission.",
          why: `Field '${issue?.path?.join(".") || "form"}' did not satisfy validation rules.`,
          resolution: ["Please check the highlighted fields and correct your inputs."],
          details: { issues: error.errors },
        }),
        undefined,
        400,
        { route: "/api/contact", application: "main" }
      );
    }
    return handleApiError(error, "Failed to process inquiry.", 400, {
      route: "/api/contact",
      application: "main",
    });
  }
}

