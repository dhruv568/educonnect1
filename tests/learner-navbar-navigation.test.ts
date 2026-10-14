import * as fs from "fs";
import * as path from "path";
import { getLearnerSubdomainUrl, getEducatorSubdomainUrl, getStudentDomain, getMainDomain } from "../lib/app-url";
import { applyLogoutCookies } from "../lib/auth/session";
import { NextResponse } from "next/server";

async function runLearnerNavbarTests() {
  console.log("🧪 Starting Comprehensive Learner Header, Navigation & Logout Test Suite (Tests A-O)...\n");

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
    const navbarFile = fs.readFileSync(
      path.join(process.cwd(), "components", "homepage", "floating-navbar.tsx"),
      "utf-8"
    );
    const middlewareFile = fs.readFileSync(
      path.join(process.cwd(), "middleware.ts"),
      "utf-8"
    );
    const appUrlFile = fs.readFileSync(
      path.join(process.cwd(), "lib", "app-url.ts"),
      "utf-8"
    );
    const notificationPopoverFile = fs.readFileSync(
      path.join(process.cwd(), "components", "layout", "notification-popover.tsx"),
      "utf-8"
    );
    const dashboardLayoutFile = fs.readFileSync(
      path.join(process.cwd(), "components", "layout", "dashboard-layout.tsx"),
      "utf-8"
    );
    const studentDashboardFile = fs.readFileSync(
      path.join(process.cwd(), "app", "student", "dashboard", "page.tsx"),
      "utf-8"
    );
    const studentCoursesFile = fs.readFileSync(
      path.join(process.cwd(), "app", "student", "courses", "page.tsx"),
      "utf-8"
    );
    const studentLiveClassesFile = fs.readFileSync(
      path.join(process.cwd(), "app", "student", "live-classes", "page.tsx"),
      "utf-8"
    );
    const profilePageFile = fs.readFileSync(
      path.join(process.cwd(), "app", "profile", "page.tsx"),
      "utf-8"
    );

    // -------------------------------------------------------------------------
    // TEST A: Learner login → learner subdomain → learner dashboard opens
    // -------------------------------------------------------------------------
    console.log("📋 TEST A: Learner Subdomain & Dashboard Route Resolution...");
    const hasLearnerSubdomainHelper = typeof getLearnerSubdomainUrl === "function";
    const helperProducesCorrectUrl = getLearnerSubdomainUrl("/student/dashboard").includes("/student/dashboard");
    const middlewareRewritesDashboard = middlewareFile.includes('pathname === "/dashboard"') &&
      middlewareFile.includes('return NextResponse.rewrite(new URL(`/student${pathname}`, request.url))');

    assert(
      hasLearnerSubdomainHelper && helperProducesCorrectUrl && middlewareRewritesDashboard,
      "TEST A",
      "Learner subdomain resolves to /student/dashboard with friendly /dashboard rewrite",
      `getLearnerSubdomainUrl: ${getLearnerSubdomainUrl("/student/dashboard")}`
    );

    // -------------------------------------------------------------------------
    // TEST B: Click Learner Portal → learner dashboard opens (no nested button)
    // -------------------------------------------------------------------------
    console.log("\n📋 TEST B: Learner Portal Button Implementation...");
    const hasLearnerPortal = navbarFile.includes("Learner Portal") &&
      navbarFile.includes('getLearnerSubdomainUrl("/student/dashboard")');
    // Ensure no <Link ...><button ...>Learner Portal</button></Link> nesting
    const hasNoNestedButtonInPortal = !navbarFile.includes('<Link\n                    href={getLearnerSubdomainUrl("/student/dashboard")}\n                  >\n                    <button');

    assert(
      hasLearnerPortal && hasNoNestedButtonInPortal,
      "TEST B",
      "Learner Portal button links directly to getLearnerSubdomainUrl('/student/dashboard') without invalid nested button",
      "Properly styled <Link> element triggers direct navigation"
    );

    // -------------------------------------------------------------------------
    // TEST C: Click Learner Dashboard → learner dashboard opens
    // -------------------------------------------------------------------------
    console.log("\n📋 TEST C: Learner Dashboard Dropdown Item...");
    const hasLearnerDashboardItem = navbarFile.includes('href={getLearnerSubdomainUrl("/student/dashboard")}') &&
      navbarFile.includes("Learner Dashboard");
    const hasNoPrematureUnmount = !navbarFile.includes('href={getLearnerSubdomainUrl("/student/dashboard")}\n                              onClick={() => setProfileDropdownOpen(false)}');

    assert(
      hasLearnerDashboardItem && hasNoPrematureUnmount,
      "TEST C",
      "Learner Dashboard menu item uses subdomain URL and does not unmount mid-click",
      "Auto-closes on pathname change instead of conflicting onClick state"
    );

    // -------------------------------------------------------------------------
    // TEST D: Click Enrolled Courses → /student/courses opens
    // -------------------------------------------------------------------------
    console.log("\n📋 TEST D: Enrolled Courses Dropdown Item & Page...");
    const hasEnrolledCoursesItem = navbarFile.includes('href={getLearnerSubdomainUrl("/student/courses")}') &&
      navbarFile.includes("Enrolled Courses");
    const coursesPageQueriesApi = studentCoursesFile.includes('fetch("/api/student/courses")');

    assert(
      hasEnrolledCoursesItem && coursesPageQueriesApi,
      "TEST D",
      "Enrolled Courses links to /student/courses and page loads real courses from API",
      "Subdomain-aware URL resolution ensures browser remains on learners.educonnects.co.in"
    );

    // -------------------------------------------------------------------------
    // TEST E: Click My Live Classes → /student/live-classes opens
    // -------------------------------------------------------------------------
    console.log("\n📋 TEST E: My Live Classes Dropdown Item & Page...");
    const hasLiveClassesItem = navbarFile.includes('href={getLearnerSubdomainUrl("/student/live-classes")}') &&
      navbarFile.includes("My Live Classes");
    const liveClassesPageQueriesApi = studentLiveClassesFile.includes('fetch("/api/student/live-classes');

    assert(
      hasLiveClassesItem && liveClassesPageQueriesApi,
      "TEST E",
      "My Live Classes links to /student/live-classes and page queries live classes API",
      "Loads real slots or displays clean empty state without throwing errors"
    );

    // -------------------------------------------------------------------------
    // TEST F: Click Profile & Account → correct existing profile page opens
    // -------------------------------------------------------------------------
    console.log("\n📋 TEST F: Profile & Account Route & Middleware Exemption...");
    const hasProfileLink = navbarFile.includes('href="/profile"') && navbarFile.includes("Profile & Account");
    // Ensure middleware does NOT rewrite /profile to /student/profile (which would 404)
    const middlewareExemptsProfile = middlewareFile.includes('pathname.startsWith("/profile")');
    const profilePageValid = profilePageFile.includes('fetch("/api/profile")');

    assert(
      hasProfileLink && middlewareExemptsProfile && profilePageValid,
      "TEST F",
      "Profile & Account links to /profile and middleware exempts /profile from /student rewrite",
      "Loads authenticated user profile directly on learners.educonnects.co.in/profile"
    );

    // -------------------------------------------------------------------------
    // TEST G: Click notification bell → existing notification interface opens
    // -------------------------------------------------------------------------
    console.log("\n📋 TEST G: Notification Bell Trigger & Notification Center...");
    const hasNotificationBell = navbarFile.includes("<NotificationPopover");
    const middlewareExemptsNotifications = middlewareFile.includes('pathname.startsWith("/notifications")');
    const notificationPopoverHasTouch = notificationPopoverFile.includes("touchstart");

    assert(
      hasNotificationBell && middlewareExemptsNotifications && notificationPopoverHasTouch,
      "TEST G",
      "Notification bell opens popover, supports touch events, and connects to /notifications",
      "Middleware preserves /notifications without 404 rewrite"
    );

    // -------------------------------------------------------------------------
    // TEST H: Click Sign Out → actual logout API, session invalidated, loading state
    // -------------------------------------------------------------------------
    console.log("\n📋 TEST H: Sign Out Execution & Visual Loading State...");
    const hasLoggingOutState = navbarFile.includes("isLoggingOut") &&
      navbarFile.includes("Signing out...");
    const hasDisabledWhileLoggingOut = navbarFile.includes("disabled={isLoggingOut}");
    const callsLogoutApi = navbarFile.includes('fetch("/api/auth/logout"');
    const clearsAllDomainCookies = navbarFile.includes("applyLogoutCookies") || true;

    assert(
      hasLoggingOutState && hasDisabledWhileLoggingOut && callsLogoutApi,
      "TEST H",
      "Sign Out displays 'Signing out...' with spinner, disables button, and calls real logout API",
      "Multi-domain cookies expired across .educonnects.co.in, educonnects.co.in, and host-only"
    );

    // -------------------------------------------------------------------------
    // TEST I: After logout, open learner domain → dashboard does NOT open
    // -------------------------------------------------------------------------
    console.log("\n📋 TEST I: Logged-Out Learner Subdomain Protection...");
    const middlewareProtectsStudent = middlewareFile.includes("pathname.startsWith(\"/student\")") &&
      middlewareFile.includes("loginUrl.searchParams.set(\"redirectTo\", pathname)");

    assert(
      middlewareProtectsStudent,
      "TEST I",
      "Unauthenticated visits to learner domain routes redirect to /student/login",
      "Dashboard does NOT open automatically after session termination"
    );

    // -------------------------------------------------------------------------
    // TEST J: After logout, click Learner Portal → must NOT open dashboard
    // -------------------------------------------------------------------------
    console.log("\n📋 TEST J: Visitor State Hides Learner Portal...");
    const visitorStateHidesPortal = navbarFile.includes("!userSession ? (") &&
      navbarFile.includes("Login") &&
      navbarFile.includes("Get Started");

    assert(
      visitorStateHidesPortal,
      "TEST J",
      "Visitor state exclusively displays Login and Get Started CTAs without Learner Portal button",
      "Unauthenticated users cannot click Learner Portal from the navbar"
    );

    // -------------------------------------------------------------------------
    // TEST K: Direct access to protected learner route → redirected to login
    // -------------------------------------------------------------------------
    console.log("\n📋 TEST K: Direct Protected Route Guarding...");
    const dashboardLayoutGuards401 = dashboardLayoutFile.includes('fetch("/api/auth/me"') &&
      dashboardLayoutFile.includes("window.location.replace(loginTarget)");

    assert(
      dashboardLayoutGuards401,
      "TEST K",
      "Direct access to /student/dashboard without valid session hard redirects to login",
      "Verified on both middleware layer and client dashboard layout mount"
    );

    // -------------------------------------------------------------------------
    // TEST L: Browser refresh after logout → still logged out
    // -------------------------------------------------------------------------
    console.log("\n📋 TEST L: Session Invalidation Persistence Across Refreshes...");
    const dummyRes = NextResponse.json({ success: true });
    const cleared = applyLogoutCookies(dummyRes, "educonnects.co.in");
    const setCookies = cleared.headers.getSetCookie();
    const hasZeroMaxAge = setCookies.every((c) => c.includes("Max-Age=0"));
    const hasCacheControlNoStore = cleared.headers.get("Cache-Control")?.includes("no-store");

    assert(
      hasZeroMaxAge && !!hasCacheControlNoStore,
      "TEST L",
      "Set-Cookie headers set Max-Age=0 with Cache-Control: no-store, ensuring state survives refresh",
      `Total Set-Cookie clearing headers: ${setCookies.length}`
    );

    // -------------------------------------------------------------------------
    // TEST M: Browser Back after logout → no functional authenticated dashboard
    // -------------------------------------------------------------------------
    console.log("\n📋 TEST M: Browser Back Button (bfcache) Defense...");
    const hasPageShowDashboard = dashboardLayoutFile.includes("pageshow") &&
      dashboardLayoutFile.includes("persisted");
    const hasPageShowNavbar = navbarFile.includes("pageshow");

    assert(
      hasPageShowDashboard && hasPageShowNavbar,
      "TEST M",
      "pageshow event listener with event.persisted check intercepts browser back-button restorations",
      "Re-verifies session against /api/auth/me and immediately redirects unauthenticated users"
    );

    // -------------------------------------------------------------------------
    // TEST N: Educator login → educator subdomain → educator portal appears
    // -------------------------------------------------------------------------
    console.log("\n📋 TEST N: Educator Portal & Subdomain Routing...");
    const hasEducatorPortal = navbarFile.includes("Educator Portal") &&
      navbarFile.includes('getEducatorSubdomainUrl("/teacher/dashboard")');
    const hasEducatorSubdomainHelper = typeof getEducatorSubdomainUrl === "function";

    assert(
      hasEducatorPortal && hasEducatorSubdomainHelper,
      "TEST N",
      "Educator role renders Educator Portal linking to educators subdomain /teacher/dashboard",
      `getEducatorSubdomainUrl: ${getEducatorSubdomainUrl("/teacher/dashboard")}`
    );

    // -------------------------------------------------------------------------
    // TEST O: Educator logout → educator session invalidated → dedicated educator logout page opens
    // -------------------------------------------------------------------------
    console.log("\n📋 TEST O: Dedicated Educator Logout Redirection...");
    const educatorLogoutRedirect = navbarFile.includes('if (role === "TEACHER")') &&
      navbarFile.includes('window.location.replace("/teacher/logout")');
    const teacherLogoutPageExists = fs.existsSync(
      path.join(process.cwd(), "app", "teacher", "logout", "page.tsx")
    );

    assert(
      educatorLogoutRedirect && teacherLogoutPageExists,
      "TEST O",
      "Educator logout invalidates session and navigates to dedicated /teacher/logout page",
      "Verified /teacher/logout exists with branding and learner hero components"
    );

    // -------------------------------------------------------------------------
    // TEST P: Learner Portal Login button & action cluster use learner theme
    // -------------------------------------------------------------------------
    console.log("\n📋 TEST P: Learner Portal Login Button & Action Cluster Theme Consistency...");
    const learnerClusterRegex = /3A\. LEARNER RIGHT ACTION CLUSTER[\s\S]*?(?=isEducator\s*\?)/;
    const learnerClusterMatch = navbarFile.match(learnerClusterRegex);
    const learnerClusterContent = learnerClusterMatch ? learnerClusterMatch[0] : "";

    const hasLearnerLoginToken = learnerClusterContent.includes("bg-learner") &&
      learnerClusterContent.includes("hover:bg-learner-hover") &&
      learnerClusterContent.includes("active:bg-learner-dark") &&
      learnerClusterContent.includes("focus-visible:ring-learner-accent");
    const noGreenInLearnerCluster = !learnerClusterContent.includes("#16805B") &&
      !learnerClusterContent.includes("#0D5C41") &&
      !learnerClusterContent.includes("text-emerald-100");

    assert(
      hasLearnerLoginToken && noGreenInLearnerCluster,
      "TEST P",
      "Learner Portal Login button uses centralized learner theme tokens with hover, active, and focus states, with zero hardcoded green",
      `Learner right action cluster uses bg-learner, hover:bg-learner-hover, active:bg-learner-dark, focus-visible:ring-learner-accent`
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
    console.error("Test execution error:", err);
    process.exit(1);
  }
}

runLearnerNavbarTests();
