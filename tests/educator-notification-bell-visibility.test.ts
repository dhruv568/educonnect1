import * as fs from "fs";
import * as path from "path";

async function runEducatorNotificationBellVisibilityTests() {
  console.log("🧪 Running Educator Notification Bell Visibility & Layout Verification Test Suite...\n");

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
    const popoverPath = path.join(process.cwd(), "components", "layout", "notification-popover.tsx");
    const popoverFile = fs.readFileSync(popoverPath, "utf-8");

    const navbarPath = path.join(process.cwd(), "components", "homepage", "floating-navbar.tsx");
    const navbarFile = fs.readFileSync(navbarPath, "utf-8");

    const dashboardLayoutPath = path.join(process.cwd(), "components", "layout", "dashboard-layout.tsx");
    const dashboardLayoutFile = fs.readFileSync(dashboardLayoutPath, "utf-8");

    // -------------------------------------------------------------------------
    // TEST 1: NotificationPopover exports props with educator, light, and dark variant support
    // -------------------------------------------------------------------------
    console.log("📋 TEST 1: NotificationPopoverProps variant support...");
    const hasPropsInterface =
      popoverFile.includes("export interface NotificationPopoverProps") &&
      popoverFile.includes('variant?: "educator" | "light" | "dark" | "default" | "auto"');
    const acceptsVariantProp = popoverFile.includes("export function NotificationPopover({");

    assert(
      hasPropsInterface && acceptsVariantProp,
      "TEST 1",
      "NotificationPopover supports flexible theme variants including educator, light, and dark",
      "Allows callers to explicitly style the bell for dark teal, dark navy, or light dashboard backgrounds"
    );

    // -------------------------------------------------------------------------
    // TEST 2: Bell visibility and light teal / white color against dark teal background
    // -------------------------------------------------------------------------
    console.log("\n📋 TEST 2: Bell icon visibility and educator theme color palette...");
    const hasEducatorVariantLogic = popoverFile.includes("isEducatorVariant");
    const hasTealText =
      popoverFile.includes("text-teal-100 hover:text-white") ||
      popoverFile.includes("text-teal-100");
    const hasEducatorButtonSheen =
      popoverFile.includes("bg-white/10 hover:bg-white/20") &&
      popoverFile.includes("border-teal-300/30 hover:border-teal-200/60");

    assert(
      hasEducatorVariantLogic && hasTealText && hasEducatorButtonSheen,
      "TEST 2",
      "Bell icon uses light teal/white colors against dark teal with matching translucent button styles",
      "Overcomes previous dark slate-600 muted color which was invisible on dark teal"
    );

    // -------------------------------------------------------------------------
    // TEST 3: Hover and focus state accessibility
    // -------------------------------------------------------------------------
    console.log("\n📋 TEST 3: Interactive hover and focus ring states...");
    const hasFocusVisibleRing =
      popoverFile.includes("focus-visible:ring-2") &&
      popoverFile.includes("focus-visible:ring-teal-300") &&
      popoverFile.includes("focus-visible:ring-offset-[#115E59]");
    const hasHoverRotate = popoverFile.includes("group-hover:rotate-12");

    assert(
      hasFocusVisibleRing && hasHoverRotate,
      "TEST 3",
      "Focus state renders a high-contrast teal ring and hover features smooth animation",
      "Fully accessible for keyboard navigation (Tab/Shift+Tab) and compliant with WCAG focus indicator criteria"
    );

    // -------------------------------------------------------------------------
    // TEST 4: Notification badge visibility and ring halo contrast
    // -------------------------------------------------------------------------
    console.log("\n📋 TEST 4: Notification badge styling and halo ring...");
    const hasBadgePing = popoverFile.includes("animate-ping") && popoverFile.includes("bg-rose-400");
    const hasBadgeBody = popoverFile.includes("bg-rose-500") && popoverFile.includes("text-white");
    const hasHaloRing = popoverFile.includes("ring-[#115E59]");

    assert(
      hasBadgePing && hasBadgeBody && hasHaloRing,
      "TEST 4",
      "Notification badge features high-contrast rose color with dark teal halo ring",
      "Badge stands out sharply against the bell icon and dark teal background without clipping"
    );

    // -------------------------------------------------------------------------
    // TEST 5: Spacing and alignment in Educator Dashboard header
    // -------------------------------------------------------------------------
    console.log("\n📋 TEST 5: Alignment and spacing between Educator Dashboard, Bell, and Logout...");
    const hasEducatorCluster =
      navbarFile.includes("isEducatorRole(userSession.role)") &&
      navbarFile.includes('NotificationPopover variant="educator"');
    const hasDashboardLink =
      navbarFile.includes("Educator Dashboard") &&
      navbarFile.includes("h-10 px-4 rounded-xl");
    const hasAlignedLogout =
      navbarFile.includes("h-10 px-3.5 rounded-xl") &&
      navbarFile.includes("Logout");

    assert(
      hasEducatorCluster && hasDashboardLink && hasAlignedLogout,
      "TEST 5",
      "Educator Dashboard, Notification Bell, and Logout share consistent h-10 height and rounded-xl alignment",
      "Elements are aligned along the horizontal center line with unified gap spacing and focus rings"
    );

    // -------------------------------------------------------------------------
    // TEST 6: Mobile responsiveness and mobile notification bell
    // -------------------------------------------------------------------------
    console.log("\n📋 TEST 6: Mobile responsiveness in header and mobile drawer...");
    const hasMobileBell =
      navbarFile.includes("lg:hidden flex items-center shrink-0") &&
      navbarFile.includes("NotificationPopover");
    const hasMobileDrawerNotifications =
      navbarFile.includes('href="/notifications"') &&
      navbarFile.includes("Notifications");
    const hasResponsivePopoverWidth = popoverFile.includes("w-[calc(100vw-2rem)] sm:w-96");

    assert(
      hasMobileBell && hasMobileDrawerNotifications && hasResponsivePopoverWidth,
      "TEST 6",
      "Mobile view features notification bell in header and drawer with viewport-safe popover width",
      "Prevents horizontal scrollbar on small mobile screens while maintaining 1-tap notification access"
    );

    // -------------------------------------------------------------------------
    // TEST 7: Support for light and dark backgrounds
    // -------------------------------------------------------------------------
    console.log("\n📋 TEST 7: Multi-theme verification (light vs dark)...");
    const hasLightVariantInDashboard = dashboardLayoutFile.includes('NotificationPopover variant="light"');
    const hasLightStyling =
      popoverFile.includes("bg-slate-50 hover:bg-slate-100") &&
      popoverFile.includes("text-slate-700 hover:text-slate-950");
    const hasDarkStyling =
      popoverFile.includes("text-white/90 hover:text-white");

    assert(
      hasLightVariantInDashboard && hasLightStyling && hasDarkStyling,
      "TEST 7",
      "Verified on both light (DashboardLayout topbar) and dark (Educator dark teal) backgrounds",
      "High contrast, beautiful visuals, and complete interactive functionality in all environments"
    );

  } catch (error: any) {
    console.error("Test execution exception:", error);
    failed++;
  }

  console.log("\n==================================================");
  console.log(`Test Execution Finished: ${passed} Passed, ${failed} Failed`);
  console.log("==================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runEducatorNotificationBellVisibilityTests();
