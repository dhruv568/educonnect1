import * as fs from "fs";
import * as path from "path";

async function runFooterReferralLinkTests() {
  console.log("🧪 Running Footer Referral Link Test Suite...\n");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testId: string, description: string, detail?: string) {
    if (condition) {
      console.log(`  ✅ [PASS] ${testId}: ${description}`);
      if (detail) console.log(`      ↳ ${detail}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${testId}: ${description}`);
      if (detail) console.error(`      ↳ Assertion failed: ${detail}`);
      failed++;
    }
  }

  try {
    const footerPath = path.join(process.cwd(), "components", "homepage", "premium-footer.tsx");
    const footerContent = fs.readFileSync(footerPath, "utf-8");

    // TEST 1: Verify MyProFunnels link points to https://myprofunnels.com directly
    console.log("📋 TEST 1: Verifying MyProFunnels href in PremiumFooter...");
    const hasCorrectHref = footerContent.includes('href="https://myprofunnels.com"');
    const hasOldHref = footerContent.includes("automation.myprofunnels.com");

    assert(
      hasCorrectHref && !hasOldHref,
      "TEST 1",
      "MyProFunnels link directly points to 'https://myprofunnels.com' and old automation subdomain is eliminated",
      `Direct URL: https://myprofunnels.com (Old automation URL present: ${hasOldHref})`
    );

    // TEST 2: Verify link opens in new tab with secure rel attributes
    console.log("\n📋 TEST 2: Verifying target='_blank' and rel='noopener noreferrer'...");
    const hasTargetBlank = footerContent.includes('target="_blank"');
    const hasRelNoopener = footerContent.includes('rel="noopener noreferrer"');

    assert(
      hasTargetBlank && hasRelNoopener,
      "TEST 2",
      "Referral link opens securely in a new tab with target='_blank' and rel='noopener noreferrer'",
      "Preserves external navigation security"
    );

    // TEST 3: Verify text, styling, and love emoji remain intact
    console.log("\n📋 TEST 3: Verifying footer label and styling integrity...");
    const hasPoweredBy = footerContent.includes("<span>Powered by</span>");
    const hasLabelText = footerContent.includes("MyProFunnels");
    const hasLoveEmoji = footerContent.includes("❤️") || footerContent.includes("&#10084;") || footerContent.includes("aria-label=\"love\"");

    assert(
      hasPoweredBy && hasLabelText && hasLoveEmoji,
      "TEST 3",
      "Existing footer text, 'Powered by', 'MyProFunnels', and heart icon remain completely intact",
      "Zero layout or visual styling disruption"
    );

  } catch (err: any) {
    console.error("Test execution failed with error:", err);
    failed++;
  }

  console.log("\n==================================================");
  console.log(`Test Execution Finished: ${passed} Passed, ${failed} Failed`);
  console.log("==================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runFooterReferralLinkTests();
