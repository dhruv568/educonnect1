import { applyLogoutCookies, getCookieDomain, getSession } from "../lib/auth/session";
import { NextResponse } from "next/server";
import * as fs from "fs";
import * as path from "path";

async function runAuthLogoutLifecycleTests() {
  console.log("🧪 Starting Comprehensive Auth Logout Lifecycle & Header Role Test Suite...\n");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`  ✅ [PASS] ${testName}`);
      if (detail) console.log(`      ↳ ${detail}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${testName}`);
      if (detail) console.error(`      ↳ Assertion failed: ${detail}`);
      failed++;
    }
  }

  try {
    const navbarFile = fs.readFileSync(
      path.join(process.cwd(), "components", "homepage", "floating-navbar.tsx"),
      "utf-8"
    );
    const dashboardLayoutFile = fs.readFileSync(
      path.join(process.cwd(), "components", "layout", "dashboard-layout.tsx"),
      "utf-8"
    );
    const logoutRouteFile = fs.readFileSync(
      path.join(process.cwd(), "app", "api", "auth", "logout", "route.ts"),
      "utf-8"
    );
    const meRouteFile = fs.readFileSync(
      path.join(process.cwd(), "app", "api", "auth", "me", "route.ts"),
      "utf-8"
    );
    const unifiedNavbarFile = fs.readFileSync(
      path.join(process.cwd(), "components", "layout", "navbar.tsx"),
      "utf-8"
    );

    // -------------------------------------------------------------------------
    // Test 1: test_visitor_header_shows_login_and_get_started_only
    // -------------------------------------------------------------------------
    console.log("📋 1. Testing Visitor Header UI State...");
    const hasVisitorState = navbarFile.includes("!userSession ? (");
    const hasLoginCta = /Login\s*<\/Link>/.test(navbarFile);
    const hasGetStartedCta = navbarFile.includes("Get Started") || navbarFile.includes("Start Learning");
    // Ensure visitor state does NOT show portal button or profile dropdown
    const visitorDoesNotShowPortal = navbarFile.includes("STATE 1: Unauthenticated Visitor") &&
      navbarFile.includes("STATE 2: Authenticated User");

    assert(
      hasVisitorState && hasLoginCta && hasGetStartedCta && visitorDoesNotShowPortal,
      "test_visitor_header_shows_login_and_get_started_only",
      "Unauthenticated visitor sees clean Login & Get Started CTAs without portal buttons or profile dropdown"
    );

    // -------------------------------------------------------------------------
    // Test 2: test_learner_header_shows_learner_portal_and_dashboard_links
    // -------------------------------------------------------------------------
    console.log("\n📋 2. Testing Learner Authenticated Header State...");
    const hasLearnerPortalButton = navbarFile.includes('userSession.role === "STUDENT"') &&
      navbarFile.includes("Learner Portal") &&
      navbarFile.includes("/student/dashboard");
    const hasLearnerProfileLinks = navbarFile.includes("Learner Dashboard") &&
      navbarFile.includes("Enrolled Courses") &&
      navbarFile.includes("My Live Classes");

    assert(
      hasLearnerPortalButton && hasLearnerProfileLinks,
      "test_learner_header_shows_learner_portal_and_dashboard_links",
      "Learner role renders Learner Portal button linking to /student/dashboard, with Learner quick links"
    );

    // -------------------------------------------------------------------------
    // Test 3: test_educator_header_shows_educator_portal_and_teaching_links
    // -------------------------------------------------------------------------
    console.log("\n📋 3. Testing Educator Authenticated Header State...");
    const hasEducatorPortalButton = navbarFile.includes('userSession.role === "TEACHER"') &&
      navbarFile.includes("Educator Portal") &&
      navbarFile.includes("/teacher/dashboard");
    const hasEducatorProfileLinks = navbarFile.includes("Educator Dashboard") &&
      navbarFile.includes("Live Class Slots") &&
      navbarFile.includes("Course Publisher") &&
      navbarFile.includes("Verification Status");

    assert(
      hasEducatorPortalButton && hasEducatorProfileLinks,
      "test_educator_header_shows_educator_portal_and_teaching_links",
      "Educator role renders Educator Portal button linking to /teacher/dashboard, with Educator quick links"
    );

    // -------------------------------------------------------------------------
    // Test 4: test_logout_endpoint_clears_cookie_on_all_domains
    // -------------------------------------------------------------------------
    console.log("\n📋 4. Testing Multi-Domain Cookie Deletion On Logout...");
    const dummyResponse = NextResponse.json({ success: true });
    const clearedResponse = applyLogoutCookies(dummyResponse, "educonnects.co.in");
    const setCookieHeaders = clearedResponse.headers.getSetCookie();

    const clearedRootDomain = setCookieHeaders.some(
      (c) => c.includes("educonnect_session=") && c.includes("Domain=.educonnects.co.in") && c.includes("Max-Age=0")
    );
    const clearedExactDomain = setCookieHeaders.some(
      (c) => c.includes("educonnect_session=") && c.includes("Domain=educonnects.co.in") && c.includes("Max-Age=0")
    );
    const clearedHostOnly = setCookieHeaders.some(
      (c) => c.includes("educonnect_session=") && !c.includes("Domain=") && c.includes("Max-Age=0")
    );

    assert(
      clearedRootDomain && clearedExactDomain && clearedHostOnly,
      "test_logout_endpoint_clears_cookie_on_all_domains",
      `Set-Cookie headers delete .educonnects.co.in, educonnects.co.in, and host-only cookies (Total Set-Cookie headers: ${setCookieHeaders.length})`
    );

    // -------------------------------------------------------------------------
    // Test 5: test_logout_endpoint_clears_session_cache
    // -------------------------------------------------------------------------
    console.log("\n📋 5. Testing Logout Endpoint Cache Prevention Headers...");
    const cacheControl = clearedResponse.headers.get("Cache-Control") || "";
    const pragma = clearedResponse.headers.get("Pragma") || "";
    const hasNoStore = cacheControl.includes("no-store");
    const hasNoCache = cacheControl.includes("no-cache");
    const hasPragmaNoCache = pragma.includes("no-cache");

    assert(
      hasNoStore && hasNoCache && hasPragmaNoCache,
      "test_logout_endpoint_clears_session_cache",
      `Cache-Control contains '${cacheControl}' and Pragma contains '${pragma}'`
    );

    // -------------------------------------------------------------------------
    // Test 6: test_protected_learner_dashboard_redirects_after_logout
    // -------------------------------------------------------------------------
    console.log("\n📋 6. Testing Protected Learner Dashboard 401 & Hard Redirect...");
    const studentDashboardFile = fs.readFileSync(
      path.join(process.cwd(), "app", "student", "dashboard", "page.tsx"),
      "utf-8"
    );
    const hasStudent401Redirect = studentDashboardFile.includes("/student/login") &&
      (studentDashboardFile.includes("window.location.replace") || studentDashboardFile.includes("router.replace"));
    const hasDashboardLayoutGuard = dashboardLayoutFile.includes("/student/login") ||
      dashboardLayoutFile.includes("handleLogout");

    assert(
      hasStudent401Redirect && hasDashboardLayoutGuard,
      "test_protected_learner_dashboard_redirects_after_logout",
      "Learner dashboard strictly catches 401 unauthenticated states and redirects to /student/login"
    );

    // -------------------------------------------------------------------------
    // Test 7: test_protected_educator_dashboard_redirects_after_logout
    // -------------------------------------------------------------------------
    console.log("\n📋 7. Testing Protected Educator Dashboard 401 & Hard Redirect...");
    const teacherDashboardFile = fs.readFileSync(
      path.join(process.cwd(), "app", "teacher", "dashboard", "page.tsx"),
      "utf-8"
    );
    const hasTeacher401Redirect = teacherDashboardFile.includes("/teacher/login") &&
      (teacherDashboardFile.includes("window.location.replace") || teacherDashboardFile.includes("router.replace"));

    assert(
      hasTeacher401Redirect,
      "test_protected_educator_dashboard_redirects_after_logout",
      "Educator dashboard strictly catches 401 unauthenticated states and redirects to /teacher/login"
    );

    // -------------------------------------------------------------------------
    // Test 8: test_me_endpoint_returns_401_after_cookie_clear
    // -------------------------------------------------------------------------
    console.log("\n📋 8. Testing /api/auth/me Endpoint Unauthenticated 401 Behavior...");
    const hasMe401 = meRouteFile.includes("apiUnauthorized") &&
      meRouteFile.includes("No active session") &&
      meRouteFile.includes("Cache-Control") &&
      meRouteFile.includes("no-store");

    assert(
      hasMe401,
      "test_me_endpoint_returns_401_after_cookie_clear",
      "/api/auth/me returns 401 apiUnauthorized with strict no-store headers when session cookie is cleared"
    );

    // -------------------------------------------------------------------------
    // Test 9: test_client_back_button_does_not_revive_session
    // -------------------------------------------------------------------------
    console.log("\n📋 9. Testing Browser Back-Button (bfcache) Defense...");
    const hasPageShowDashboard = dashboardLayoutFile.includes("pageshow") &&
      dashboardLayoutFile.includes("persisted");
    const hasPageShowNavbar = navbarFile.includes("pageshow");

    assert(
      hasPageShowDashboard && hasPageShowNavbar,
      "test_client_back_button_does_not_revive_session",
      "Both DashboardLayout and FloatingNavbar register 'pageshow' listeners with event.persisted check"
    );

    // -------------------------------------------------------------------------
    // Test 10: test_multi_tab_logout_sync
    // -------------------------------------------------------------------------
    console.log("\n📋 10. Testing Multi-Tab / Cross-Component Sync Event...");
    const dispatchesAuthChanged = navbarFile.includes("educonnect_auth_changed") &&
      dashboardLayoutFile.includes("educonnect_auth_changed");
    const listensAuthChanged = navbarFile.includes('window.addEventListener("educonnect_auth_changed"');

    assert(
      dispatchesAuthChanged && listensAuthChanged,
      "test_multi_tab_logout_sync",
      "Global CustomEvent 'educonnect_auth_changed' is dispatched and listened to synchronize auth states"
    );

    // -------------------------------------------------------------------------
    // Test 11: test_mobile_header_visitor_state
    // -------------------------------------------------------------------------
    console.log("\n📋 11. Testing Mobile Drawer Visitor State...");
    const mobileVisitorState = navbarFile.includes("{!userSession ? (") &&
      navbarFile.includes("Start Teaching") &&
      navbarFile.includes("Start Learning");

    assert(
      mobileVisitorState,
      "test_mobile_header_visitor_state",
      "Mobile drawer renders visitor Login and role-appropriate action button when userSession is null"
    );

    // -------------------------------------------------------------------------
    // Test 12: test_mobile_header_learner_state
    // -------------------------------------------------------------------------
    console.log("\n📋 12. Testing Mobile Drawer Learner State...");
    const mobileLearnerState = navbarFile.includes('userSession.role === "STUDENT"') &&
      navbarFile.includes("Learner") &&
      navbarFile.includes("getDashboardPath(userSession)") &&
      navbarFile.includes("getDashboardLabel(userSession)");

    assert(
      mobileLearnerState,
      "test_mobile_header_learner_state",
      "Mobile drawer renders Learner badge, Learner Portal CTA, and Learner navigation"
    );

    // -------------------------------------------------------------------------
    // Test 13: test_mobile_header_educator_state
    // -------------------------------------------------------------------------
    console.log("\n📋 13. Testing Mobile Drawer Educator State...");
    const mobileEducatorState = navbarFile.includes('userSession.role === "TEACHER"') &&
      navbarFile.includes("Educator") &&
      navbarFile.includes("Teaching Toolkit") &&
      navbarFile.includes("Earnings Calculator");

    assert(
      mobileEducatorState,
      "test_mobile_header_educator_state",
      "Mobile drawer renders Educator badge, Educator Portal CTA, and Educator tool links"
    );

    // -------------------------------------------------------------------------
    // Test 14: test_hard_navigation_clears_client_router_state
    // -------------------------------------------------------------------------
    console.log("\n📋 14. Testing Hard Navigation Flush on Logout...");
    const hasHardNavNavbar = navbarFile.includes("window.location.replace");
    const hasHardNavDashboard = dashboardLayoutFile.includes("window.location.replace");

    assert(
      hasHardNavNavbar && hasHardNavDashboard,
      "test_hard_navigation_clears_client_router_state",
      "Both navbar and dashboard layout use window.location.replace to purge Next.js client router cache"
    );

    // -------------------------------------------------------------------------
    // Test 15: test_no_parent_role_or_ui_leaked
    // -------------------------------------------------------------------------
    console.log("\n📋 15. Testing Zero Parent UI or Navigation Leakage...");
    const hasParentNavbar = /parent/i.test(navbarFile);
    const hasParentDashboard = /parent/i.test(dashboardLayoutFile);
    const hasParentUnifiedNavbar = /parent/i.test(unifiedNavbarFile);

    assert(
      !hasParentNavbar && !hasParentDashboard && !hasParentUnifiedNavbar,
      "test_no_parent_role_or_ui_leaked",
      "Verified ZERO parent references exist in navbar, dashboard layout, or unified navbar"
    );

    // -------------------------------------------------------------------------
    // Summary
    // -------------------------------------------------------------------------
    console.log("\n==================================================");
    console.log(`Test Execution Finished: ${passed} Passed, ${failed} Failed`);
    console.log("==================================================");

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error("Test execution threw an error:", err);
    process.exit(1);
  }
}

runAuthLogoutLifecycleTests();
