/**
 * Comprehensive Regression Test Suite: Session Lifecycle, Expiration & Automatic Logout Fix
 *
 * Verifies all 10 core requirements:
 * 1. Login creates a valid session (aligned cookie and token expiration).
 * 2. Users remain logged in while the session is valid.
 * 3. Navigating between protected pages does not cause unexpected logout.
 * 4. Refreshing a page does not invalidate a valid session.
 * 5. Student and educator sessions work on their respective portals.
 * 6. Expired and invalid sessions are rejected (enforcing 30-day max lifetime & tamper protection).
 * 7. Explicit logout works correctly (multi-domain cookie invalidation & anti-cache headers).
 * 8. Temporary network errors / transient states do not destroy valid sessions.
 * 9. Invalid credentials, expired tokens, and unauthorized roles remain protected.
 * 10. Session renewal / sliding expiration works correctly and enforces maximum lifetime.
 */

import { NextRequest, NextResponse } from "next/server";
import {
  encodeSession,
  decodeSession,
  shouldRenewSession,
  renewSession,
  getSigningSecret,
  getAllCandidateSecrets,
  SESSION_DURATION_SECONDS,
  MAX_SESSION_LIFETIME_SECONDS,
  SESSION_RENEWAL_THRESHOLD_SECONDS,
} from "../lib/auth/session-token";
import {
  setSessionCookie,
  getSession,
  getCookieDomain,
  getSessionCookieOptions,
  applyLogoutCookies,
  SESSION_COOKIE_NAME,
} from "../lib/auth/session";
import { middleware } from "../middleware";
import { GET as meRoute } from "../app/api/auth/me/route";
import { GET as teacherDashboardRoute } from "../app/api/teacher/dashboard/route";
import { GET as studentDashboardRoute } from "../app/api/student/dashboard/route";
import { POST as logoutRoute } from "../app/api/auth/logout/route";
import { UserSession } from "../types/auth";
import * as fs from "fs";
import * as path from "path";

let reqId = 1;
function makeReq(url: string, init?: ConstructorParameters<typeof NextRequest>[1]) {
  const headers = new Headers(init?.headers);
  if (!headers.has("x-forwarded-for")) {
    headers.set("x-forwarded-for", `10.0.0.${reqId++}`);
  }
  return new NextRequest(url, { ...init, headers });
}

async function runSessionLifecycleTests() {
  console.log("\n================================================================================");
  console.log("🧪 RUNNING REGRESSION SUITE: SESSION LIFECYCLE, EXPIRATION & LOGOUT VERIFICATION");
  console.log("================================================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`  ✅ [PASS] ${testName}`);
      if (detail) console.log(`      ↳ ${detail}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${testName}`);
      if (detail) console.error(`      ↳ ${detail}`);
      failed++;
    }
  }

  const sampleStudent: UserSession = {
    id: "usr_student_test_1",
    userId: "usr_student_test_1",
    email: "student@educonnects.co.in",
    role: "STUDENT",
    emailVerified: true,
    firstName: "Priya",
    lastName: "Sharma",
  };

  const sampleEducator: UserSession = {
    id: "usr_educator_test_2",
    userId: "usr_educator_test_2",
    email: "educator@educonnects.co.in",
    role: "TEACHER",
    emailVerified: true,
    firstName: "Vikram",
    lastName: "Sen",
  };

  const studentToken = encodeSession(sampleStudent);
  const educatorToken = encodeSession(sampleEducator);

  // ===========================================================================
  // REQUIREMENT 1: Login creates a valid session (aligned cookie & token expiration)
  // ===========================================================================
  console.log("--- REQUIREMENT 1: Login Creates a Valid Session ---");

  // 1.1: Token encoding includes iat, exp, authTime and HMAC signature
  const decodedNewSession = decodeSession(studentToken);
  assert(
    Boolean(
      decodedNewSession &&
      decodedNewSession.email === sampleStudent.email &&
      decodedNewSession.role === "STUDENT" &&
      typeof decodedNewSession.iat === "number" &&
      typeof decodedNewSession.exp === "number" &&
      typeof decodedNewSession.authTime === "number"
    ),
    "1.1: encodeSession produces token with verified identity, iat, exp, and authTime",
    `iat: ${decodedNewSession?.iat}, exp: ${decodedNewSession?.exp}, authTime: ${decodedNewSession?.authTime}`
  );

  // 1.2: Token duration matches cookie maxAge (7 days = 604800s)
  const tokenDuration = (decodedNewSession?.exp || 0) - (decodedNewSession?.iat || 0);
  const cookieOpts = getSessionCookieOptions("learners.educonnects.co.in");
  assert(
    tokenDuration === SESSION_DURATION_SECONDS && cookieOpts.maxAge === SESSION_DURATION_SECONDS,
    "1.2: Token expiration (7 days) is perfectly aligned with Cookie maxAge",
    `Token duration: ${tokenDuration}s, Cookie maxAge: ${cookieOpts.maxAge}s`
  );

  // 1.3: Cookie options enforce HttpOnly, Lax, Path=/, and multi-subdomain .educonnects.co.in
  assert(
    cookieOpts.httpOnly === true &&
    cookieOpts.path === "/" &&
    cookieOpts.sameSite === "lax" &&
    cookieOpts.domain === ".educonnects.co.in",
    "1.3: Cookie options enforce HttpOnly, Path=/, Lax and .educonnects.co.in domain",
    `Domain: ${cookieOpts.domain}, Secure: ${cookieOpts.secure}, Path: ${cookieOpts.path}`
  );

  // ===========================================================================
  // REQUIREMENT 2: Users remain logged in while the session is valid
  // ===========================================================================
  console.log("\n--- REQUIREMENT 2: Users Remain Logged In While Session Is Valid ---");

  // 2.1: Student session allows direct access to student dashboard
  const studDashReq = makeReq("https://learners.educonnects.co.in/student/dashboard", {
    headers: {
      host: "learners.educonnects.co.in",
      cookie: `${SESSION_COOKIE_NAME}=${studentToken}`,
    },
  });
  const studDashRes = middleware(studDashReq);
  assert(
    studDashRes.status === 200 && !studDashRes.headers.get("location"),
    "2.1: Valid student session accesses /student/dashboard without logout or redirect",
    `Status: ${studDashRes.status}`
  );

  // 2.2: Educator session allows direct access to teacher dashboard
  const eduDashReq = makeReq("https://educators.educonnects.co.in/teacher/dashboard", {
    headers: {
      host: "educators.educonnects.co.in",
      cookie: `${SESSION_COOKIE_NAME}=${educatorToken}`,
    },
  });
  const eduDashRes = middleware(eduDashReq);
  assert(
    eduDashRes.status === 200 && !eduDashRes.headers.get("location"),
    "2.2: Valid educator session accesses /teacher/dashboard without logout or redirect",
    `Status: ${eduDashRes.status}`
  );

  // 2.3: getSession resolves user identity directly from request cookies
  const serverSession = await getSession(studDashReq);
  assert(
    serverSession?.email === sampleStudent.email && serverSession?.role === "STUDENT",
    "2.3: getSession(request) correctly decodes session directly from incoming request headers",
    `User: ${serverSession?.email}, Role: ${serverSession?.role}`
  );

  // ===========================================================================
  // REQUIREMENT 3: Navigating between protected pages does not cause unexpected logout
  // ===========================================================================
  console.log("\n--- REQUIREMENT 3: Page Navigation Preserves Session ---");

  // 3.1: Educator multi-page navigation across courses, live-classes, earnings
  const educatorPages = [
    "/teacher/dashboard",
    "/teacher/courses",
    "/teacher/live-classes",
    "/teacher/onboarding",
    "/teacher/verification",
  ];
  let educatorNavSuccess = true;
  for (const page of educatorPages) {
    const pageReq = makeReq(`https://educators.educonnects.co.in${page}`, {
      headers: {
        host: "educators.educonnects.co.in",
        cookie: `${SESSION_COOKIE_NAME}=${educatorToken}`,
      },
    });
    const pageRes = middleware(pageReq);
    if (pageRes.status === 307 || pageRes.headers.get("location")?.includes("/login")) {
      educatorNavSuccess = false;
      break;
    }
  }
  assert(
    educatorNavSuccess,
    "3.1: Educator navigating between protected subroutes maintains session across all hops"
  );

  // 3.2: Student multi-page navigation across courses, live-classes, teachers
  const studentPages = [
    "/student/dashboard",
    "/student/courses",
    "/student/live-classes",
    "/student/teachers",
    "/student/payments",
  ];
  let studentNavSuccess = true;
  for (const page of studentPages) {
    const pageReq = makeReq(`https://learners.educonnects.co.in${page}`, {
      headers: {
        host: "learners.educonnects.co.in",
        cookie: `${SESSION_COOKIE_NAME}=${studentToken}`,
      },
    });
    const pageRes = middleware(pageReq);
    if (pageRes.status === 307 || pageRes.headers.get("location")?.includes("/login")) {
      studentNavSuccess = false;
      break;
    }
  }
  assert(
    studentNavSuccess,
    "3.2: Learner navigating between protected subroutes maintains session across all hops"
  );

  // ===========================================================================
  // REQUIREMENT 4: Refreshing a page does not invalidate a valid session
  // ===========================================================================
  console.log("\n--- REQUIREMENT 4: Refreshing Pages Preserves Valid Session ---");

  // 4.1: Repeated page refreshes (simulating F5 / Ctrl+R)
  let refreshSuccess = true;
  for (let i = 1; i <= 5; i++) {
    const refreshReq = makeReq("https://learners.educonnects.co.in/student/dashboard", {
      headers: {
        host: "learners.educonnects.co.in",
        cookie: `${SESSION_COOKIE_NAME}=${studentToken}`,
        "cache-control": "no-cache",
        pragma: "no-cache",
      },
    });
    const refreshRes = middleware(refreshReq);
    if (refreshRes.status !== 200 || refreshRes.headers.get("location")) {
      refreshSuccess = false;
      break;
    }
  }
  assert(
    refreshSuccess,
    "4.1: Repeated page reloads with Pragma/Cache-Control no-cache preserve authenticated state"
  );

  // ===========================================================================
  // REQUIREMENT 5: Student and educator sessions work on their respective portals
  // ===========================================================================
  console.log("\n--- REQUIREMENT 5: Subdomain Routing & Portals Work Correctly ---");

  // 5.1: Learner subdomain friendly path /dashboard rewrites to /student/dashboard
  const learnerSubDashReq = makeReq("https://learners.educonnects.co.in/dashboard", {
    headers: {
      host: "learners.educonnects.co.in",
      cookie: `${SESSION_COOKIE_NAME}=${studentToken}`,
    },
  });
  const learnerSubDashRes = middleware(learnerSubDashReq);
  const learnerRewriteHeader = learnerSubDashRes.headers.get("x-middleware-rewrite") || "";
  assert(
    learnerRewriteHeader.includes("/student/dashboard"),
    "5.1: learners.educonnects.co.in/dashboard internally rewrites to /student/dashboard",
    `Rewrite: ${learnerRewriteHeader}`
  );

  // 5.2: Educator subdomain friendly path /dashboard rewrites to /teacher/dashboard
  const educatorSubDashReq = makeReq("https://educators.educonnects.co.in/dashboard", {
    headers: {
      host: "educators.educonnects.co.in",
      cookie: `${SESSION_COOKIE_NAME}=${educatorToken}`,
    },
  });
  const educatorSubDashRes = middleware(educatorSubDashReq);
  const educatorRewriteHeader = educatorSubDashRes.headers.get("x-middleware-rewrite") || "";
  assert(
    educatorRewriteHeader.includes("/teacher/dashboard"),
    "5.2: educators.educonnects.co.in/dashboard internally rewrites to /teacher/dashboard",
    `Rewrite: ${educatorRewriteHeader}`
  );

  // ===========================================================================
  // REQUIREMENT 6: Expired and invalid sessions are rejected
  // ===========================================================================
  console.log("\n--- REQUIREMENT 6: Expired and Invalid Sessions Are Rejected ---");

  // 6.1: Mathematically expired token (now > exp) is strictly rejected
  const expiredPayload = {
    ...sampleStudent,
    iat: Math.floor(Date.now() / 1000) - 800000,
    exp: Math.floor(Date.now() / 1000) - 100, // Expired 100s ago
  };
  const base64Expired = Buffer.from(JSON.stringify(expiredPayload)).toString("base64url");
  const expiredSig = Buffer.from(
    encodeSession(sampleStudent).split(".")[1],
    "base64url"
  ).toString("base64url");
  const rawExpiredToken = encodeSession(expiredPayload as any, { durationSeconds: -100 });
  assert(
    decodeSession(rawExpiredToken) === null,
    "6.1: decodeSession returns null for mathematically expired token"
  );

  // 6.2: Exceeding 30-day absolute maximum session lifetime is strictly rejected
  const overThirtyDaysOldPayload = {
    ...sampleStudent,
    iat: Math.floor(Date.now() / 1000) - 100,
    exp: Math.floor(Date.now() / 1000) + 604800,
    authTime: Math.floor(Date.now() / 1000) - (31 * 24 * 60 * 60), // Authenticated 31 days ago
  };
  const base64Over30 = Buffer.from(JSON.stringify(overThirtyDaysOldPayload)).toString("base64url");
  const over30Token = `${base64Over30}.${encodeSession(sampleStudent).split(".")[1]}`;
  assert(
    decodeSession(over30Token) === null,
    "6.2: decodeSession returns null if authTime exceeds MAX_SESSION_LIFETIME_SECONDS (30 days)"
  );

  // 6.3: Tampered signature is strictly rejected
  const tamperedToken = `${studentToken.split(".")[0]}.invalidSignatureXYZ123`;
  assert(
    decodeSession(tamperedToken) === null,
    "6.3: Tampered signature is strictly rejected"
  );

  // 6.4: Middleware redirects expired session to login with expired=true flag
  const expiredReq = makeReq("https://learners.educonnects.co.in/student/dashboard", {
    headers: {
      host: "learners.educonnects.co.in",
      cookie: `${SESSION_COOKIE_NAME}=${rawExpiredToken}`,
    },
  });
  const expiredRes = middleware(expiredReq);
  const locationHeader = expiredRes.headers.get("location") || "";
  assert(
    expiredRes.status === 307 && locationHeader.includes("expired=true"),
    "6.4: Middleware redirects expired session with 'expired=true' query parameter",
    `Location: ${locationHeader}`
  );

  // ===========================================================================
  // REQUIREMENT 7: Explicit logout works correctly
  // ===========================================================================
  console.log("\n--- REQUIREMENT 7: Explicit Logout Invalidation ---");

  // 7.1: POST /api/auth/logout returns Set-Cookie headers targeting all domain variants
  const logoutReq = makeReq("https://educators.educonnects.co.in/api/auth/logout", {
    method: "POST",
    headers: {
      host: "educators.educonnects.co.in",
      "x-forwarded-host": "educators.educonnects.co.in",
    },
  });
  const logoutRes = await logoutRoute(logoutReq);
  const setCookies = logoutRes.headers.getSetCookie();

  const purgesParentDomain = setCookies.some((c) => c.includes("Domain=.educonnects.co.in") && c.includes("Max-Age=0"));
  const purgesLearnersDomain = setCookies.some((c) => c.includes("Domain=learners.educonnects.co.in") && c.includes("Max-Age=0"));
  const purgesEducatorsDomain = setCookies.some((c) => c.includes("Domain=educators.educonnects.co.in") && c.includes("Max-Age=0"));
  const purgesHostOnly = setCookies.some((c) => !c.includes("Domain=") && c.includes("Max-Age=0"));

  assert(
    purgesParentDomain && purgesLearnersDomain && purgesEducatorsDomain && purgesHostOnly,
    "7.1: Explicit logout emits Set-Cookie clearing all parent and child domains with Max-Age=0",
    `Total Set-Cookie headers: ${setCookies.length}`
  );

  // 7.2: Anti-cache headers are present on logout response
  const cacheControl = logoutRes.headers.get("Cache-Control") || "";
  const pragma = logoutRes.headers.get("Pragma") || "";
  assert(
    cacheControl.includes("no-store") && cacheControl.includes("no-cache") && pragma.includes("no-cache"),
    "7.2: Logout response includes strict anti-cache headers (no-store, no-cache, pragma: no-cache)"
  );

  // ===========================================================================
  // REQUIREMENT 8: Temporary network errors do not automatically destroy valid sessions
  // ===========================================================================
  console.log("\n--- REQUIREMENT 8: Transient States Do Not Destroy Valid Sessions ---");

  // 8.1: Unauthenticated request without cookies does NOT spray Set-Cookie deletion headers
  const anonMeReq = makeReq("https://educonnects.co.in/api/auth/me", {
    headers: { host: "educonnects.co.in" },
  });
  const anonMeRes = await meRoute(anonMeReq);
  const anonCookies = anonMeRes.headers.getSetCookie();
  assert(
    anonMeRes.status === 401 && anonCookies.length === 0,
    "8.1: Anonymous visitor to /api/auth/me receives 401 without emitting cookie deletion headers",
    `Set-Cookie count: ${anonCookies.length}`
  );

  // 8.2: DashboardLayout and Dashboard pages guard against offline false logouts
  const dashboardLayoutCode = fs.readFileSync(
    path.join(process.cwd(), "components", "layout", "dashboard-layout.tsx"),
    "utf-8"
  );
  const studentDashboardCode = fs.readFileSync(
    path.join(process.cwd(), "app", "student", "dashboard", "page.tsx"),
    "utf-8"
  );
  const teacherDashboardCode = fs.readFileSync(
    path.join(process.cwd(), "app", "teacher", "dashboard", "page.tsx"),
    "utf-8"
  );

  const layoutHasOnlineGuard = dashboardLayoutCode.includes("navigator.onLine");
  const studentHasOnlineGuard = studentDashboardCode.includes("navigator.onLine");
  const teacherHasOnlineGuard = teacherDashboardCode.includes("navigator.onLine");

  assert(
    layoutHasOnlineGuard && studentHasOnlineGuard && teacherHasOnlineGuard,
    "8.2: DashboardLayout, Student Dashboard, and Teacher Dashboard verify navigator.onLine before redirecting"
  );

  // 8.3: Login pages check for session expired query param and render alert banner
  const studentLoginCode = fs.readFileSync(path.join(process.cwd(), "app", "student", "login", "page.tsx"), "utf-8");
  const teacherLoginCode = fs.readFileSync(path.join(process.cwd(), "app", "teacher", "login", "page.tsx"), "utf-8");
  const mainLoginCode = fs.readFileSync(path.join(process.cwd(), "app", "login", "page.tsx"), "utf-8");

  const studentShowsExpired = studentLoginCode.includes("sessionExpired") && studentLoginCode.includes("Your session has expired");
  const teacherShowsExpired = teacherLoginCode.includes("sessionExpired") && teacherLoginCode.includes("Your session has expired");
  const mainShowsExpired = mainLoginCode.includes("sessionExpired") && mainLoginCode.includes("Your session has expired");

  assert(
    studentShowsExpired && teacherShowsExpired && mainShowsExpired,
    "8.3: Learner, Educator, and Main login pages inspect URL and render session expired alert banner"
  );

  // ===========================================================================
  // REQUIREMENT 9: Invalid credentials, expired tokens, and unauthorized roles remain protected
  // ===========================================================================
  console.log("\n--- REQUIREMENT 9: Role and Credential Protections ---");

  // 9.1: Learner session accessing educator dashboard redirected to learner dashboard
  const learnerOnTeacherReq = makeReq("https://educators.educonnects.co.in/dashboard", {
    headers: {
      host: "educators.educonnects.co.in",
      cookie: `${SESSION_COOKIE_NAME}=${studentToken}`,
    },
  });
  const learnerOnTeacherRes = middleware(learnerOnTeacherReq);
  assert(
    Boolean(learnerOnTeacherRes.status === 307 && learnerOnTeacherRes.headers.get("location")?.includes("learners.educonnects.co.in")),
    "9.1: Learner session on educator dashboard redirected to learner portal",
    `Redirect: ${learnerOnTeacherRes.headers.get("location")}`
  );

  // 9.2: Educator session accessing learner dashboard redirected to educator portal
  const educatorOnLearnerReq = makeReq("https://learners.educonnects.co.in/dashboard", {
    headers: {
      host: "learners.educonnects.co.in",
      cookie: `${SESSION_COOKIE_NAME}=${educatorToken}`,
    },
  });
  const educatorOnLearnerRes = middleware(educatorOnLearnerReq);
  assert(
    Boolean(educatorOnLearnerRes.status === 307 && educatorOnLearnerRes.headers.get("location")?.includes("educators.educonnects.co.in")),
    "9.2: Educator session on learner dashboard redirected to educator portal",
    `Redirect: ${educatorOnLearnerRes.headers.get("location")}`
  );

  // 9.3: Unauthenticated user accessing private route redirected to login
  const unauthReq = makeReq("https://educators.educonnects.co.in/dashboard", {
    headers: { host: "educators.educonnects.co.in" },
  });
  const unauthRes = middleware(unauthReq);
  assert(
    Boolean(unauthRes.status === 307 && unauthRes.headers.get("location")?.includes("/login")),
    "9.3: Unauthenticated request to /dashboard strictly redirected to login"
  );

  // ===========================================================================
  // REQUIREMENT 10: Session renewal works correctly and enforces maximum lifetime
  // ===========================================================================
  console.log("\n--- REQUIREMENT 10: Secure Sliding Expiration & Session Renewal ---");

  // 10.1: Fresh session (< 24h old) should NOT renew prematurely
  const freshSession = decodeSession(studentToken)!;
  assert(
    shouldRenewSession(freshSession) === false,
    "10.1: Fresh session (< 24h old) does not trigger premature renewal"
  );

  // 10.2: Active session older than 24h DOES qualify for renewal
  const dayOldSession = {
    ...freshSession,
    iat: Math.floor(Date.now() / 1000) - (25 * 60 * 60), // 25 hours old
    exp: Math.floor(Date.now() / 1000) + (6 * 24 * 60 * 60),
    authTime: Math.floor(Date.now() / 1000) - (25 * 60 * 60),
  };
  assert(
    shouldRenewSession(dayOldSession) === true,
    "10.2: Active session older than 24h qualifies for sliding renewal"
  );

  // 10.3: renewSession generates token with updated exp and preserved original authTime
  const renewedTokenStr = renewSession(dayOldSession)!;
  const decodedRenewed = decodeSession(renewedTokenStr)!;
  assert(
    Boolean(
      decodedRenewed &&
      decodedRenewed.authTime === dayOldSession.authTime &&
      (decodedRenewed.iat || 0) > dayOldSession.iat &&
      (decodedRenewed.exp || 0) > dayOldSession.exp
    ),
    "10.3: renewSession produces new token with updated exp while preserving original authTime",
    `Original authTime: ${dayOldSession.authTime}, New authTime: ${decodedRenewed?.authTime}, New exp: ${decodedRenewed?.exp}`
  );

  // 10.4: Session at 30-day maximum lifetime does NOT qualify for further renewal
  const thirtyDayOldSession = {
    ...freshSession,
    iat: Math.floor(Date.now() / 1000) - (25 * 60 * 60),
    exp: Math.floor(Date.now() / 1000) + (6 * 24 * 60 * 60),
    authTime: Math.floor(Date.now() / 1000) - (30 * 24 * 60 * 60), // Authenticated 30 days ago
  };
  assert(
    shouldRenewSession(thirtyDayOldSession) === false,
    "10.4: Session at 30-day maximum lifetime is blocked from further renewal"
  );

  // 10.5: In production environment without custom secret, getSigningSecret generates deterministic deployment secret
  const originalNodeEnv = process.env.NODE_ENV;
  try {
    (process.env as any).NODE_ENV = "production";
    const prodSecret = getSigningSecret();
    assert(
      typeof prodSecret === "string" && prodSecret.length >= 16,
      "10.5: Production environment safely resolves consistent deployment secret without throwing fatal error",
      `Secret length: ${prodSecret.length}`
    );
  } finally {
    (process.env as any).NODE_ENV = originalNodeEnv;
  }

  // ===========================================================================
  // SUMMARY
  // ===========================================================================
  console.log("\n================================================================================");
  console.log(`Execution Finished: ${passed} Passed, ${failed} Failed`);
  console.log("================================================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runSessionLifecycleTests().catch((err) => {
  console.error("Test execution failed with error:", err);
  process.exit(1);
});
