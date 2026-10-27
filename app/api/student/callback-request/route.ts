export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@/lib/api-response";
import { trackEvent } from "@/lib/analytics";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { fullName, email, phone, preferredSlot, topic, consent } = body;

    // Explicit consent is required - registration does not imply marketing consent
    if (!consent) {
      return apiError("Explicit consent is required to request a counseling callback.", 400);
    }

    const cleanPhone = (phone || "").replace(/\D/g, "");
    if (cleanPhone.length !== 10) {
      return apiError("Please provide a valid 10-digit mobile number for the callback.", 400);
    }

    if (!fullName || fullName.trim().length < 2) {
      return apiError("Please provide your full name.", 400);
    }

    const refId = `CB-${Math.floor(100000 + Math.random() * 900000)}`;

    trackEvent("learner_counseling_callback_requested", {
      referenceId: refId,
      fullName: fullName.trim(),
      email: email?.trim() || "not_provided",
      phone: cleanPhone,
      preferredSlot: preferredSlot || "Morning (9 AM - 12 PM)",
      topic: topic || "General Academic Counseling",
      consentTimestamp: new Date().toISOString(),
    });

    console.log("\n==================================================");
    console.log("📞 [OPTIONAL LEARNER CALLBACK REQUEST RECEIVED]");
    console.log(`Reference ID: ${refId}`);
    console.log(`Learner Name: ${fullName.trim()}`);
    console.log(`Email: ${email?.trim() || "Not provided"}`);
    console.log(`Phone: +91 ${cleanPhone}`);
    console.log(`Preferred Time: ${preferredSlot || "Morning (9 AM - 12 PM)"}`);
    console.log(`Topic of Interest: ${topic || "General Academic Counseling"}`);
    console.log(`Explicit Consent: Yes (Timestamp: ${new Date().toISOString()})`);
    console.log("==================================================\n");

    return apiSuccess(
      {
        referenceId: refId,
        preferredSlot: preferredSlot || "Morning (9 AM - 12 PM)",
      },
      "Your counseling callback request has been received. An academic advisor will reach out during your preferred time window."
    );
  } catch (error: any) {
    return apiError(error.message || "Failed to submit callback request. Please try again.", 500);
  }
}
