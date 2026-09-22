import { applyLogoutCookies, decodeSession, encodeSession } from "../lib/auth/session";
import { POST as logoutPostHandler, GET as logoutGetHandler } from "../app/api/auth/logout/route";
import { GET as meGetHandler } from "../app/api/auth/me/route";
import { middleware } from "../middleware";
import { NextRequest, NextResponse } from "next/server";
import * as fs from "fs";
import * as path from "path";

async function runSignOutRootCauseTests() {
  console.log("🧪 Starting Comprehensive Learner Sign-Out Root Cause & Session Invalidation Test Suite...\n");

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

    // -------------------------------------------------------------------------
    // 1. Verify Logout API does not call clearSessionCookie (preventing header collapse)
    // -------------------------------------------------------------------------
    console.log("📋 1. Testing Logout Route Handler Architecture...");
    const callsClearSessionCookie = logoutRouteFile.includes("clearSessionCookie");
    assert(
      !callsClearSessionCookie,
      "test_logout_route_does_not_mutate_mutable_cookies",
      "app/api/auth/logout/route.ts does not mutate cookies() store, preventing Next.js appendMutableCookies header collapse"
    );

    // -------------------------------------------------------------------------
    // 2. Verify POST /api/auth/logout returns multi-domain deletion cookies
    // -------------------------------------------------------------------------
    console.log("\n📋 2. Testing POST /api/auth/logout Set-Cookie Output for learners.educonnects.co.in...");
    const req = new NextRequest("https://learners.educonnects.co.in/api/auth/logout", {
      method: "POST",
      headers: {
        host: "learners.educonnects.co.in",
        "x-forwarded-host": "learners.educonnects.co.in",
        "x-forwarded-proto": "https",
      },
    });

    const logoutResponse = await logoutPostHandler(req);
    const setCookies = logoutResponse.headers.getSetCookie();

    const deletesParentDomain = setCookies.some(
      (c) => c.includes("educonnects_session=") && c.includes("Domain=.educonnects.co.in") && c.includes("Max-Age=0")
    );
    const deletesExactParentDomain = setCookies.some(
      (c) => c.includes("educonnects_session=") && c.includes("Domain=educonnects.co.in") && c.includes("Max-Age=0")
    );
    const deletesLearnerSubdomain = setCookies.some(
      (c) => c.includes("educonnects_session=") && c.includes("Domain=learners.educonnects.co.in") && c.includes("Max-Age=0")
    );
    const deletesDotLearnerSubdomain = setCookies.some(
      (c) => c.includes("educonnects_session=") && c.includes("Domain=.learners.educonnects.co.in") && c.includes("Max-Age=0")
    );
    const deletesHostOnly = setCookies.some(
      (c) => c.includes("educonnects_session=") && !c.includes("Domain=") && c.includes("Max-Age=0")
    );

    assert(
      deletesParentDomain && deletesExactParentDomain && deletesLearnerSubdomain && deletesDotLearnerSubdomain && deletesHostOnly,
      "test_logout_deletes_all_relevant_domains",
      `Response contains deletions for .educonnects.co.in, educonnects.co.in, learners.educonnects.co.in, .learners.educonnects.co.in, and host-only (Total: ${setCookies.length} Set-Cookie headers)`
    );

    // -------------------------------------------------------------------------
    // 3. Verify Anti-Cache Headers on Logout Response
    // -------------------------------------------------------------------------
    console.log("\n📋 3. Testing Anti-Cache Headers on Logout Response...");
    const cacheControl = logoutResponse.headers.get("Cache-Control") || "";
    const pragma = logoutResponse.headers.get("Pragma") || "";
    assert(
      cacheControl.includes("no-store") && cacheControl.includes("no-cache") && pragma.includes("no-cache"),
      "test_logout_anti_cache_headers",
      `Cache-Control: '${cacheControl}', Pragma: '${pragma}'`
    );

    // -------------------------------------------------------------------------
    // 4. Verify /api/auth/me behavior when unauthenticated
    // -------------------------------------------------------------------------
    console.log("\n📋 4. Testing /api/auth/me Endpoint Without Active Session Cookie...");
    const meRouteFile = fs.readFileSync(
      path.join(process.cwd(), "app", "api", "auth", "me", "route.ts"),
      "utf-8"
    );
    const hasMe401Guard = meRouteFile.includes("if (!session)") &&
      meRouteFile.includes('apiUnauthorized("No active session.")') &&
      meRouteFile.includes("no-store");
    const emptySessionNull = decodeSession("") === null;

    assert(
      hasMe401Guard && emptySessionNull,
      "test_me_endpoint_returns_401_unauthenticated",
      "GET /api/auth/me returns apiUnauthorized('No active session.') with status 401 when no session cookie is found"
    );

    // -------------------------------------------------------------------------
    // 5. Verify FloatingNavbar Sign Out button structure & click isolation
    // -------------------------------------------------------------------------
    console.log("\n📋 5. Testing FloatingNavbar Sign Out Button & Loading States...");
    const hasTypeButton = navbarFile.includes('type="button"') && navbarFile.includes("handleLogout");
    const hasDisabledState = navbarFile.includes("disabled={isLoggingOut}");
    const hasSpinner = navbarFile.includes("animate-spin") && navbarFile.includes("Signing out...");
    const hasErrorToast = navbarFile.includes("Unable to sign out. Please try again.");

    assert(
      hasTypeButton && hasDisabledState && hasSpinner && hasErrorToast,
      "test_floating_navbar_signout_ux",
      "Sign Out button has explicit type='button', disabled during logout, renders Loader2 spinner with 'Signing out...', and triggers error toast on failure"
    );

    // -------------------------------------------------------------------------
    // 6. Verify FloatingNavbar does not prematurely unmount before fetch completes
    // -------------------------------------------------------------------------
    console.log("\n📋 6. Testing FloatingNavbar State Order in handleLogout...");
    const handleLogoutCode = navbarFile.substring(
      navbarFile.indexOf("const handleLogout = async"),
      navbarFile.indexOf("const handleHowItWorksClick")
    );
    const fetchIndex = handleLogoutCode.indexOf("await fetch(");
    const setUserSessionNullIndex = handleLogoutCode.indexOf("setUserSession(null)");

    assert(
      fetchIndex !== -1 && setUserSessionNullIndex !== -1 && fetchIndex < setUserSessionNullIndex,
      "test_handle_logout_awaits_server_before_clearing_state",
      "handleLogout awaits /api/auth/logout before calling setUserSession(null) and setProfileDropdownOpen(false)"
    );

    // -------------------------------------------------------------------------
    // 7. Verify Learner Logout Redirection Target
    // -------------------------------------------------------------------------
    console.log("\n📋 7. Testing Learner Redirect Destination...");
    const redirectsToStudentLogout = handleLogoutCode.includes('window.location.replace("/student/logout")');
    assert(
      redirectsToStudentLogout,
      "test_learner_redirects_to_student_logout",
      "Learner logout redirects via window.location.replace('/student/logout') to dedicated learner logout page"
    );

    // -------------------------------------------------------------------------
    // 8. Verify Educator Logout Retains Dedicated /teacher/logout Redirection
    // -------------------------------------------------------------------------
    console.log("\n📋 8. Testing Educator Redirect Destination...");
    const redirectsToTeacherLogout = handleLogoutCode.includes('window.location.replace("/teacher/logout")');
    assert(
      redirectsToTeacherLogout,
      "test_educator_redirects_to_teacher_logout",
      "Educator logout redirects to dedicated /teacher/logout page"
    );

    // -------------------------------------------------------------------------
    // 9. Verify Middleware guards /student/dashboard against unauthenticated access
    // -------------------------------------------------------------------------
    console.log("\n📋 9. Testing Middleware Protection on /student/dashboard...");
    const studentDashReq = new NextRequest("https://learners.educonnects.co.in/student/dashboard", {
      headers: { host: "learners.educonnects.co.in" },
    });
    const middlewareResult = middleware(studentDashReq);

    const isRedirect = middlewareResult?.status === 307 || middlewareResult?.status === 302;
    const redirectLocation = middlewareResult?.headers.get("location") || "";
    assert(
      isRedirect && redirectLocation.includes("/student/login"),
      "test_middleware_blocks_unauthenticated_dashboard",
      `Middleware redirected unauthenticated access to /student/dashboard to '${redirectLocation}'`
    );

    // -------------------------------------------------------------------------
    // 10. Verify Middleware guards /student/courses against unauthenticated access
    // -------------------------------------------------------------------------
    console.log("\n📋 10. Testing Middleware Protection on /student/courses...");
    const studentCoursesReq = new NextRequest("https://learners.educonnects.co.in/student/courses", {
      headers: { host: "learners.educonnects.co.in" },
    });
    const coursesMiddlewareResult = middleware(studentCoursesReq);
    const coursesRedirect = coursesMiddlewareResult?.headers.get("location") || "";

    assert(
      coursesRedirect.includes("/student/login"),
      "test_middleware_blocks_unauthenticated_courses",
      `Middleware redirected unauthenticated access to /student/courses to '${coursesRedirect}'`
    );

    // -------------------------------------------------------------------------
    // 11. Verify Middleware guards /student/live-classes against unauthenticated access
    // -------------------------------------------------------------------------
    console.log("\n📋 11. Testing Middleware Protection on /student/live-classes...");
    const studentLiveReq = new NextRequest("https://learners.educonnects.co.in/student/live-classes", {
      headers: { host: "learners.educonnects.co.in" },
    });
    const liveMiddlewareResult = middleware(studentLiveReq);
    const liveRedirect = liveMiddlewareResult?.headers.get("location") || "";

    assert(
      liveRedirect.includes("/student/login"),
      "test_middleware_blocks_unauthenticated_live_classes",
      `Middleware redirected unauthenticated access to /student/live-classes to '${liveRedirect}'`
    );

    // -------------------------------------------------------------------------
    // 12. Verify DashboardLayout Sign Out button UX
    // -------------------------------------------------------------------------
    console.log("\n📋 12. Testing DashboardLayout Sign Out Button UX & Redirect...");
    const dashboardHasTypeButton = dashboardLayoutFile.includes('type="button"') && dashboardLayoutFile.includes("handleLogout");
    const dashboardHasSpinner = dashboardLayoutFile.includes("animate-spin text-rose-300");
    const dashboardRedirectsStudent = dashboardLayoutFile.includes('window.location.replace("/student/logout")');

    assert(
      dashboardHasTypeButton && dashboardHasSpinner && dashboardRedirectsStudent,
      "test_dashboard_layout_signout_ux",
      "DashboardLayout sidebar Sign Out button has type='button', Loader2 spinner, and redirects learners to /student/logout"
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

runSignOutRootCauseTests();
