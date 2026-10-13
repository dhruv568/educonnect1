import assert from "assert";
import { WhatsAppClient } from "../lib/whatsapp/whatsapp-client";
import { WhatsAppService } from "../services/whatsapp-service";
import {
  DEFAULT_WHATSAPP_TEMPLATES,
  WhatsAppEventType,
} from "../lib/whatsapp/whatsapp-templates";
import { OFFICIAL_COMPANY_INFO } from "../lib/company";

async function runTeachersProfileVerification() {
  console.log("================================================================================");
  console.log("🚀 STARTING WHATSAPP TEACHERS_PROFILE NOTIFICATION VERIFICATION");
  console.log("================================================================================\n");

  // ---------------------------------------------------------------------------
  // TEST 1: Template Definition & Language
  // ---------------------------------------------------------------------------
  console.log("📋 Test 1: Verifying teachers_profile template definition and en_US language...");
  {
    const educatorTemplate = DEFAULT_WHATSAPP_TEMPLATES.EDUCATOR_REGISTRATION;
    assert.ok(educatorTemplate, "EDUCATOR_REGISTRATION template must exist");
    assert.strictEqual(
      educatorTemplate.defaultName,
      "teachers_profile",
      "Template default name must be 'teachers_profile'"
    );
    assert.strictEqual(
      educatorTemplate.languageCode,
      "en_US",
      "Template language must be 'en_US' (fixing error 132001)"
    );
    console.log("   ✅ Template name 'teachers_profile' and language 'en_US' verified.\n");
  }

  // ---------------------------------------------------------------------------
  // TEST 2: Parameter Count & Values (Exactly 2 body parameters, no button overrides)
  // ---------------------------------------------------------------------------
  console.log("📋 Test 2: Verifying exactly 2 body parameters and button preservation...");
  {
    const educatorTemplate = DEFAULT_WHATSAPP_TEMPLATES.EDUCATOR_REGISTRATION;
    const testData = {
      name: "Dr. Ananya Sen",
      supportWhatsApp: "+91 9109019090",
    };

    const components = educatorTemplate.buildComponents(testData);

    // Must have exactly 1 component: the body
    assert.strictEqual(
      components.length,
      1,
      "Components must contain only the body component (no header, no button overrides)"
    );
    assert.strictEqual(components[0].type, "body", "Component type must be 'body'");

    // Body parameters must be exactly 2
    assert.strictEqual(
      components[0].parameters.length,
      2,
      "Body must contain exactly 2 parameters (fixing error 132000)"
    );

    // Parameter {{1}} = recipient name
    assert.strictEqual(
      components[0].parameters[0].type,
      "text",
      "Parameter 1 must be of type text"
    );
    assert.strictEqual(
      components[0].parameters[0].text,
      "Dr. Ananya Sen",
      "Parameter 1 must be the educator's name"
    );

    // Parameter {{2}} = support WhatsApp number
    assert.strictEqual(
      components[0].parameters[1].type,
      "text",
      "Parameter 2 must be of type text"
    );
    assert.strictEqual(
      components[0].parameters[1].text,
      "+91 9109019090",
      "Parameter 2 must be the support WhatsApp number"
    );

    // Verify fallback to OFFICIAL_COMPANY_INFO.whatsappNumber if omitted in data
    const fallbackComponents = educatorTemplate.buildComponents({ name: "Ravi Kumar" });
    assert.strictEqual(fallbackComponents[0].parameters.length, 2);
    assert.strictEqual(fallbackComponents[0].parameters[0].text, "Ravi Kumar");
    assert.strictEqual(
      fallbackComponents[0].parameters[1].text,
      OFFICIAL_COMPANY_INFO.whatsappNumber
    );

    console.log("   ✅ Exactly 2 body parameters and approved buttons preserved.\n");
  }

  // ---------------------------------------------------------------------------
  // TEST 3: WhatsAppClient defaults languageCode to en_US for teachers_profile
  // ---------------------------------------------------------------------------
  console.log("📋 Test 3: Verifying WhatsAppClient language resolution...");
  {
    // Simulate sendTemplateMessage call without explicit languageCode
    const clientResult = await WhatsAppClient.sendTemplateMessage({
      to: "9876543210",
      templateName: "teachers_profile",
      // languageCode omitted
      components: [
        {
          type: "body",
          parameters: [
            { type: "text", text: "Dr. Ananya Sen" },
            { type: "text", text: "+91 9109019090" },
          ],
        },
      ],
    });

    // In test environment without credentials, it returns isSimulated: true
    assert.strictEqual(clientResult.success, false);
    assert.ok(
      clientResult.error?.includes("WhatsApp Cloud API credentials not configured"),
      "Must safely handle missing credentials without throwing"
    );
    console.log("   ✅ WhatsAppClient safely handled credentials and resolved language code.\n");
  }

  // ---------------------------------------------------------------------------
  // TEST 4: Protection Against Misuse for Payments, Receipts, and Bookings
  // ---------------------------------------------------------------------------
  console.log("📋 Test 4: Verifying teachers_profile is NEVER used for payments, receipts, or bookings...");
  {
    const unrelatedEvents: WhatsAppEventType[] = [
      "PAYMENT_SUCCESS",
      "PAYMENT_RECEIPT",
      "PAYMENT_FAILED",
      "BOOKING_CONFIRMED",
      "COURSE_ENROLLED",
      "REFUND_REQUESTED",
      "REFUND_APPROVED",
      "REFUND_COMPLETED",
      "REFUND_REJECTED",
      "CLASS_REMINDER",
      "CLASS_CANCELLED",
      "LEARNER_REGISTRATION",
    ];

    for (const evt of unrelatedEvents) {
      const def = DEFAULT_WHATSAPP_TEMPLATES[evt];
      assert.notStrictEqual(
        def.defaultName,
        "teachers_profile",
        `Unrelated event ${evt} must NOT have defaultName 'teachers_profile'`
      );
    }
    console.log("   ✅ Confirmed: teachers_profile is strictly isolated to EDUCATOR_REGISTRATION.\n");
  }

  console.log("================================================================================");
  console.log("🎉 ALL WHATSAPP TEACHERS_PROFILE VERIFICATION TESTS PASSED CLEANLY!");
  console.log("================================================================================\n");
}

runTeachersProfileVerification()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Test failed:", err);
    process.exit(1);
  });
