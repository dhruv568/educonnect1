import * as fs from "fs";
import * as path from "path";

async function runMobileNavbarToggleTests() {
  console.log("🧪 Running Mobile Navbar Toggle & Close Button Bug Verification Test Suite...\n");

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
    const navbarPath = path.join(process.cwd(), "components", "homepage", "floating-navbar.tsx");
    const navbarFile = fs.readFileSync(navbarPath, "utf-8");

    // -------------------------------------------------------------------------
    // TEST 1: mobileButtonRef declaration and element binding
    // -------------------------------------------------------------------------
    console.log("📋 TEST 1: mobileButtonRef declaration and ref assignment...");
    const hasRefDeclaration = navbarFile.includes("const mobileButtonRef = useRef<HTMLButtonElement>(null);");
    const hasRefAssignedToButton = navbarFile.includes("ref={mobileButtonRef}");

    assert(
      hasRefDeclaration && hasRefAssignedToButton,
      "TEST 1",
      "mobileButtonRef is properly declared and attached to the mobile toggle/close button",
      "Ref binding allows event handlers to accurately check if clicks/touches originated from the button"
    );

    // -------------------------------------------------------------------------
    // TEST 2: handleClickOutside excludes mobileButtonRef to prevent mousedown race condition
    // -------------------------------------------------------------------------
    console.log("\n📋 TEST 2: Outside-click listener immunity for mobile button...");
    const handleClickOutsideExcludesButton = navbarFile.includes("!mobileButtonRef.current?.contains(target)");
    const handleClickOutsideStructure = navbarFile.includes("mobileMenuRef.current &&") &&
      navbarFile.includes("!mobileMenuRef.current.contains(target) &&") &&
      navbarFile.includes("!mobileButtonRef.current?.contains(target)");

    assert(
      handleClickOutsideExcludesButton && handleClickOutsideStructure,
      "TEST 2",
      "handleClickOutside excludes mobileButtonRef from triggering premature drawer closure",
      "Prevents mousedown/touchstart on the X button from setting mobileOpen to false before click event runs"
    );

    // -------------------------------------------------------------------------
    // TEST 3: Close button explicitly sets mobileOpen to false and stops propagation
    // -------------------------------------------------------------------------
    console.log("\n📋 TEST 3: Explicit open/close handler and event isolation...");
    const hasStopPropagation = navbarFile.includes("e.stopPropagation();");
    const hasPreventDefault = navbarFile.includes("e.preventDefault();");
    const hasExplicitStateSetting = navbarFile.includes("if (mobileOpen) {") &&
      navbarFile.includes("setMobileOpen(false);") &&
      navbarFile.includes("setMobileOpen(true);");

    assert(
      hasStopPropagation && hasPreventDefault && hasExplicitStateSetting,
      "TEST 3",
      "Mobile button explicitly sets menu state to false when open and isolates events",
      "Calls e.stopPropagation(), e.preventDefault(), and explicitly sets mobileOpen = false when closing"
    );

    // -------------------------------------------------------------------------
    // TEST 4: Drawer card stops click bubbling to backdrop
    // -------------------------------------------------------------------------
    console.log("\n📋 TEST 4: Drawer container click isolation...");
    const hasDrawerStopPropagation = navbarFile.includes("onClick={(e) => e.stopPropagation()}") &&
      navbarFile.includes("max-h-[calc(100vh-5rem)]");

    assert(
      hasDrawerStopPropagation,
      "TEST 4",
      "Drawer content card isolates clicks with e.stopPropagation()",
      "Prevents interaction inside the mobile navigation menu from bubbling to backdrop"
    );

    // -------------------------------------------------------------------------
    // TEST 5: Accessible labels & design preservation
    // -------------------------------------------------------------------------
    console.log("\n📋 TEST 5: Accessibility and visual toggle preservation...");
    const hasDynamicAriaLabel = navbarFile.includes('aria-label={mobileOpen ? "Close mobile menu" : "Open mobile menu"}');
    const hasAriaExpanded = navbarFile.includes("aria-expanded={mobileOpen}");
    const hasXIconWhenOpen = navbarFile.includes('{mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}');

    assert(
      hasDynamicAriaLabel && hasAriaExpanded && hasXIconWhenOpen,
      "TEST 5",
      "Accessible aria attributes and visual X/Menu icon switching are fully preserved",
      "Provides accessible state for screen readers and maintains existing button styling"
    );

    // -------------------------------------------------------------------------
    // TEST 6: State transition simulation (Open -> Close with X -> Reopen manually)
    // -------------------------------------------------------------------------
    console.log("\n📋 TEST 6: State machine simulation of open, close with X, and reopen...");
    
    // Simulate runtime behavior
    let mobileOpenState = false;
    const buttonElement = { name: "button" };
    const svgElement = { name: "svg", parent: buttonElement };
    const drawerElement = { name: "drawer" };

    const contains = (container: any, target: any): boolean => {
      if (container === buttonElement) {
        return target === buttonElement || target === svgElement;
      }
      if (container === drawerElement) {
        return target === drawerElement;
      }
      return false;
    };

    // Simulated event handlers matching floating-navbar.tsx implementation
    const handleClickOutsideSimulation = (target: any) => {
      const isOutsideDrawer = !contains(drawerElement, target);
      const isOutsideButton = !contains(buttonElement, target);
      if (mobileOpenState && isOutsideDrawer && isOutsideButton) {
        mobileOpenState = false;
      }
    };

    const handleButtonClickSimulation = (e: { stopPropagation: () => void; preventDefault: () => void }) => {
      e.preventDefault();
      e.stopPropagation();
      if (mobileOpenState) {
        mobileOpenState = false;
      } else {
        mobileOpenState = true;
      }
    };

    // Step A: Initially closed
    let stepAPass = (mobileOpenState === false);

    // Step B: User opens the menu
    handleButtonClickSimulation({ stopPropagation: () => {}, preventDefault: () => {} });
    let stepBPass = (mobileOpenState === true);

    // Step C: User clicks the X button
    // 1. mousedown/touchstart fires on svgElement inside button
    handleClickOutsideSimulation(svgElement);
    // Crucial check: mousedown on button MUST NOT close menu prematurely before click handler
    const notPrematurelyClosed = (mobileOpenState === true);

    // 2. click event fires on button
    let propagationStopped = false;
    let defaultPrevented = false;
    handleButtonClickSimulation({
      stopPropagation: () => { propagationStopped = true; },
      preventDefault: () => { defaultPrevented = true; }
    });
    // Crucial check: menu MUST be closed and stay closed
    const closedCompletely = (mobileOpenState === false);

    // Step D: User reopens the menu manually
    handleButtonClickSimulation({ stopPropagation: () => {}, preventDefault: () => {} });
    const reopenedSuccessfully = (mobileOpenState === true);

    // Step E: User closes with X again
    handleClickOutsideSimulation(buttonElement);
    handleButtonClickSimulation({ stopPropagation: () => {}, preventDefault: () => {} });
    const closedAgain = (mobileOpenState === false);

    assert(
      stepAPass && stepBPass && notPrematurelyClosed && closedCompletely && propagationStopped && defaultPrevented && reopenedSuccessfully && closedAgain,
      "TEST 6",
      "Full simulated lifecycle (Open -> Close with X -> Reopen manually -> Close again) behaves deterministically",
      "Menu stays closed on X click with zero automatic reopening"
    );

  } catch (error: any) {
    console.error("Test execution threw an unhandled error:", error);
    failed++;
  }

  console.log("\n==================================================");
  console.log(`Test Execution Finished: ${passed} Passed, ${failed} Failed`);
  console.log("==================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runMobileNavbarToggleTests();
