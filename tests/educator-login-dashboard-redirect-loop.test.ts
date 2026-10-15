/**
 * Regression Test Suite: Educator Login–Dashboard Redirect Loop Fix
 * 
 * Tests the 8 required scenarios:
 * 1. Valid educator credentials result in a successful login and valid session.
 * 2. An authenticated educator can open and refresh the dashboard.
 * 3. An unauthenticated visitor is redirected to educator login.
 * 4. An invalid or expired session is rejected safely and clears stale cookies.
 * 5. A learner cannot access educator-only pages.
 * 6. An authenticated educator visiting the login page is redirected appropriately.
 * 7. Login and dashboard navigation do not form a redirect loop.
 * 8. Session cookies work correctly in the production HTTPS configuration.
 */

import { NextRequest, NextResponse } from "next/server";
import { encodeSession, decodeSession, computeSignature } from "../lib/auth/session-token";
import {
  setSessionCookie,
  getCookieDomain,
  getSessionCookieOptions,
  applyLogoutCookies,
  SESSION_COOKIE_NAME,
} from "../lib/auth/session";
import { middleware } from "../middleware";
import { GET as meRoute } from "../app/api/auth/me/route";
import { GET as teacherDashboardRoute } from "../app/api/teacher/dashboard/route";
import { UserSession } from "../types/auth";

let reqCounter = 1;
function createReq(url: string, init?: ConstructorParameters<typeof NextRequest>[1]) {
  const headers = new Headers(init?.headers);
  if (!headers.has("x-forwarded-for")) {
    headers.set("x-forwarded-for", `192.168.1.${reqCounter++}`);
  }
  return new NextRequest(url, { ...init, headers });
}

async function runEducatorRedirectLoopTests() {
  console.log("\n=======================================================");
  console.log("🧪 RUNNING REGRESSION SUITE: EDUCATOR LOGIN-DASHBOARD REDIRECT LOOP");
  console.log("=======================================================\n");

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

  const sampleEducator: UserSession = {
    id: "usr_teacher_101",
    userId: "usr_teacher_101",
    email: "educator@educonnects.co.in",
    role: "TEACHER",
    emailVerified: true,
    firstName: "Rohan",
    lastName: "Sharma",
  };

  const sampleLearner: UserSession = {
    id: "usr_learner_202",
    userId: "usr_learner_202",
    email: "learner@educonnects.co.in",
    role: "STUDENT",
    emailVerified: true,
    firstName: "Aarav",
    lastName: "Patel",
  };

  const educatorToken = encodeSession(sampleEducator);
  const learnerToken = encodeSession(sampleLearner);

  // =========================================================================
  // SCENARIO 1: Valid educator credentials result in successful login & valid session
  // =========================================================================
  console.log("--- SCENARIO 1: Valid Educator Login & Session Issuance ---");

  // 1.1: Token encoding produces valid signed token
  assert(
    typeof educatorToken === "string" && educatorToken.includes("."),
    "1.1: encodeSession produces HMAC-signed session token for educator",
    `Token length: ${educatorToken.length}`
  );

  // 1.2: Decoded token matches educator role and email
  const decodedEducator = decodeSession(educatorToken);
  assert(
    decodedEducator?.role === "TEACHER" && decodedEducator?.email === sampleEducator.email,
    "1.2: decodeSession decodes verified educator identity",
    `Decoded role: ${decodedEducator?.role}, email: ${decodedEducator?.email}`
  );

  // 1.3: setSessionCookie attaches Set-Cookie directly to response
  const dummyRes = NextResponse.json({ success: true });
  await setSessionCookie(sampleEducator, "educators.educonnects.co.in", dummyRes);
  const setCookies = dummyRes.headers.getSetCookie();
  const sessionCookieHeader = setCookies.find((c) => c.startsWith(`${SESSION_COOKIE_NAME}=`));

  assert(
    Boolean(sessionCookieHeader),
    "1.3: setSessionCookie explicitly attaches educonnects_session to response headers",
    `Header: ${sessionCookieHeader?.substring(0, 50)}...`
  );
  assert(
    sessionCookieHeader?.includes("HttpOnly") === true,
    "1.4: Session cookie is marked HttpOnly for XSS security"
  );
  assert(
    sessionCookieHeader?.includes("Path=/") === true,
    "1.5: Session cookie path is /"
  );

  // =========================================================================
  // SCENARIO 2: Authenticated educator can open and refresh the dashboard
  // =========================================================================
  console.log("\n--- SCENARIO 2: Authenticated Educator Dashboard Access & Refresh ---");

  // 2.1: Direct path /teacher/dashboard on localhost with valid session
  const directDashReq = createReq("http://localhost:3000/teacher/dashboard", {
    headers: { cookie: `${SESSION_COOKIE_NAME}=${educatorToken}` },
  });
  const directDashRes = middleware(directDashReq);
  assert(
    directDashRes.status === 200,
    "2.1: Authenticated educator can access /teacher/dashboard directly (status 200 / next)",
    `Status: ${directDashRes.status}`
  );

  // 2.2: Refreshing the dashboard does NOT redirect to login
  const refreshDashReq = createReq("http://localhost:3000/teacher/dashboard", {
    headers: {
      cookie: `${SESSION_COOKIE_NAME}=${educatorToken}`,
      "cache-control": "no-cache",
      pragma: "no-cache",
    },
  });
  const refreshDashRes = middleware(refreshDashReq);
  assert(
    refreshDashRes.status === 200 && !refreshDashRes.headers.get("location"),
    "2.2: Refreshing /teacher/dashboard preserves authenticated session without redirecting",
    `Status: ${refreshDashRes.status}, Location: ${refreshDashRes.headers.get("location") || "none"}`
  );

  // 2.3: Subdomain clean path /dashboard on educators.educonnects.co.in
  const subDashReq = createReq("https://educators.educonnects.co.in/dashboard", {
    headers: {
      host: "educators.educonnects.co.in",
      cookie: `${SESSION_COOKIE_NAME}=${educatorToken}`,
    },
  });
  const subDashRes = middleware(subDashReq);
  const rewriteHeader = subDashRes.headers.get("x-middleware-rewrite");
  assert(
    subDashRes.status === 200 && (rewriteHeader?.includes("/teacher/dashboard") || false),
    "2.3: Subdomain /dashboard rewrites internally to /teacher/dashboard without redirect loop",
    `Status: ${subDashRes.status}, Rewrite: ${rewriteHeader}`
  );

  // =========================================================================
  // SCENARIO 3: Unauthenticated visitor is redirected to educator login
  // =========================================================================
  console.log("\n--- SCENARIO 3: Unauthenticated Visitor Redirects ---");

  // 3.1: Visiting /teacher/dashboard with no cookies
  const unauthDashReq = createReq("http://localhost:3000/teacher/dashboard");
  const unauthDashRes = middleware(unauthDashReq);
  assert(
    Boolean(unauthDashRes.status === 307 && unauthDashRes.headers.get("location")?.includes("/teacher/login")),
    "3.1: Unauthenticated request to /teacher/dashboard redirects to /teacher/login",
    `Location: ${unauthDashRes.headers.get("location")}`
  );

  // 3.2: Visiting subdomain /dashboard with no cookies redirects to subdomain /login
  const unauthSubDashReq = createReq("https://educators.educonnects.co.in/dashboard", {
    headers: { host: "educators.educonnects.co.in" },
  });
  const unauthSubDashRes = middleware(unauthSubDashReq);
  assert(
    Boolean(unauthSubDashRes.status === 307 && unauthSubDashRes.headers.get("location")?.includes("/login")),
    "3.2: Unauthenticated request to educators subdomain /dashboard redirects to /login",
    `Location: ${unauthSubDashRes.headers.get("location")}`
  );

  // =========================================================================
  // SCENARIO 4: Invalid or expired session is rejected safely
  // =========================================================================
  console.log("\n--- SCENARIO 4: Stale / Expired / Tampered Session Handling ---");

  // 4.1: Expired session token
  const expiredPayload = {
    ...sampleEducator,
    iat: Math.floor(Date.now() / 1000) - 86400 * 10,
    exp: Math.floor(Date.now() / 1000) - 86400 * 2, // Expired 2 days ago
  };
  const expiredPayloadBase64 = Buffer.from(JSON.stringify(expiredPayload)).toString("base64url");
  const expiredSig = computeSignature(expiredPayloadBase64);
  const expiredToken = `${expiredPayloadBase64}.${expiredSig}`;

  const decodedExpired = decodeSession(expiredToken);
  assert(
    decodedExpired === null,
    "4.1: decodeSession returns null for mathematically expired token"
  );

  const expiredMwReq = createReq("http://localhost:3000/teacher/dashboard", {
    headers: { cookie: `${SESSION_COOKIE_NAME}=${expiredToken}` },
  });
  const expiredMwRes = middleware(expiredMwReq);
  assert(
    Boolean(expiredMwRes.status === 307 && expiredMwRes.headers.get("location")?.includes("/teacher/login")),
    "4.2: Middleware redirects expired session to /teacher/login instead of opening dashboard",
    `Status: ${expiredMwRes.status}, Location: ${expiredMwRes.headers.get("location")}`
  );

  // 4.3: Tampered role escalation
  const tamperedPayload = { ...sampleEducator, role: "ADMIN" };
  const tamperedBase64 = Buffer.from(JSON.stringify(tamperedPayload)).toString("base64url");
  const tamperedToken = `${tamperedBase64}.${computeSignature(Buffer.from(JSON.stringify(sampleEducator)).toString("base64url"))}`;
  assert(
    decodeSession(tamperedToken) === null,
    "4.3: Tampered signature is strictly rejected by decodeSession"
  );

  // 4.4: Stale cookie rejection clears cookie in API routes
  const staleMeReq = createReq("http://localhost:3000/api/auth/me", {
    headers: { cookie: `${SESSION_COOKIE_NAME}=${expiredToken}` },
  });
  const staleMeRes = await meRoute(staleMeReq);
  assert(
    staleMeRes.status === 401,
    "4.4: /api/auth/me returns 401 for expired/invalid session",
    `Status: ${staleMeRes.status}`
  );

  const staleMeSetCookies = staleMeRes.headers.getSetCookie();
  const clearedSessionCookie = staleMeSetCookies.find(
    (c) => c.startsWith(`${SESSION_COOKIE_NAME}=`) && (c.includes("Max-Age=0") || c.includes("expires=Thu, 01 Jan 1970"))
  );
  assert(
    Boolean(clearedSessionCookie),
    "4.5: /api/auth/me 401 response emits Set-Cookie to purge invalid session from browser",
    `Cleared cookie: ${clearedSessionCookie}`
  );

  // 4.6: Teacher dashboard API also purges stale cookie on 401
  const staleDashApiReq = createReq("http://localhost:3000/api/teacher/dashboard", {
    headers: { cookie: `${SESSION_COOKIE_NAME}=${expiredToken}` },
  });
  const staleDashApiRes = await teacherDashboardRoute(staleDashApiReq);
  assert(
    staleDashApiRes.status === 401,
    "4.6: /api/teacher/dashboard returns 401 for unauthenticated request"
  );
  const clearedDashCookie = staleDashApiRes.headers.getSetCookie().find(
    (c) => c.startsWith(`${SESSION_COOKIE_NAME}=`) && (c.includes("Max-Age=0") || c.includes("expires=Thu, 01 Jan 1970"))
  );
  assert(
    Boolean(clearedDashCookie),
    "4.7: /api/teacher/dashboard 401 response emits Set-Cookie to purge invalid session"
  );

  // =========================================================================
  // SCENARIO 5: Learner cannot access educator-only pages
  // =========================================================================
  console.log("\n--- SCENARIO 5: Cross-Role Protection (Learner -> Educator) ---");

  // 5.1: Learner visiting /teacher/dashboard redirected to /student/dashboard
  const learnerOnTeacherReq = createReq("http://localhost:3000/teacher/dashboard", {
    headers: { cookie: `${SESSION_COOKIE_NAME}=${learnerToken}` },
  });
  const learnerOnTeacherRes = middleware(learnerOnTeacherReq);
  assert(
    Boolean(learnerOnTeacherRes.status === 307 && learnerOnTeacherRes.headers.get("location")?.includes("/student/dashboard")),
    "5.1: Learner session accessing /teacher/dashboard is redirected to /student/dashboard",
    `Location: ${learnerOnTeacherRes.headers.get("location")}`
  );

  // 5.2: Learner visiting educators subdomain /dashboard redirected to learners subdomain
  const learnerOnSubDashReq = createReq("https://educators.educonnects.co.in/dashboard", {
    headers: {
      host: "educators.educonnects.co.in",
      cookie: `${SESSION_COOKIE_NAME}=${learnerToken}`,
    },
  });
  const learnerOnSubDashRes = middleware(learnerOnSubDashReq);
  assert(
    Boolean(learnerOnSubDashRes.status === 307 && learnerOnSubDashRes.headers.get("location")?.includes("learners.educonnects.co.in")),
    "5.2: Learner on educators.educonnects.co.in/dashboard redirected to learners domain",
    `Location: ${learnerOnSubDashRes.headers.get("location")}`
  );

  // =========================================================================
  // SCENARIO 6: Authenticated educator visiting login page is redirected
  // =========================================================================
  console.log("\n--- SCENARIO 6: Authenticated Educator on Login Page ---");

  // 6.1: Educator visiting /teacher/login redirected to /teacher/dashboard
  const eduOnLoginReq = createReq("http://localhost:3000/teacher/login", {
    headers: { cookie: `${SESSION_COOKIE_NAME}=${educatorToken}` },
  });
  const eduOnLoginRes = middleware(eduOnLoginReq);
  assert(
    Boolean(eduOnLoginRes.status === 307 && eduOnLoginRes.headers.get("location")?.includes("/teacher/dashboard")),
    "6.1: Authenticated educator visiting /teacher/login is redirected to /teacher/dashboard",
    `Location: ${eduOnLoginRes.headers.get("location")}`
  );

  // 6.2: Educator visiting educators subdomain /login redirected to /dashboard
  const eduOnSubLoginReq = createReq("https://educators.educonnects.co.in/login", {
    headers: {
      host: "educators.educonnects.co.in",
      cookie: `${SESSION_COOKIE_NAME}=${educatorToken}`,
    },
  });
  const eduOnSubLoginRes = middleware(eduOnSubLoginReq);
  assert(
    Boolean(eduOnSubLoginRes.status === 307 && eduOnSubLoginRes.headers.get("location")?.includes("/dashboard")),
    "6.2: Authenticated educator visiting educators.educonnects.co.in/login is redirected to /dashboard",
    `Location: ${eduOnSubLoginRes.headers.get("location")}`
  );

  // 6.3: Safe returnTo param is preserved
  const eduWithReturnReq = createReq("http://localhost:3000/teacher/login?returnTo=/teacher/courses", {
    headers: { cookie: `${SESSION_COOKIE_NAME}=${educatorToken}` },
  });
  const eduWithReturnRes = middleware(eduWithReturnReq);
  assert(
    Boolean(eduWithReturnRes.status === 307 && eduWithReturnRes.headers.get("location")?.includes("/teacher/courses")),
    "6.3: Authenticated educator with returnTo parameter redirected to intended destination",
    `Location: ${eduWithReturnRes.headers.get("location")}`
  );

  // =========================================================================
  // SCENARIO 7: Login and dashboard navigation do not form a redirect loop
  // =========================================================================
  console.log("\n--- SCENARIO 7: Redirect Loop Prevention & Deterministic Termination ---");

  // Flow A: Authenticated educator opens /teacher/login -> redirected to /teacher/dashboard -> lands on dashboard (200)
  let currentUrl = "http://localhost:3000/teacher/login";
  let hops = 0;
  const visitedUrls = new Set<string>();
  let hasLoop = false;

  while (hops < 5) {
    if (visitedUrls.has(currentUrl)) {
      hasLoop = true;
      break;
    }
    visitedUrls.add(currentUrl);

    const stepReq = createReq(currentUrl, {
      headers: { cookie: `${SESSION_COOKIE_NAME}=${educatorToken}` },
    });
    const stepRes = middleware(stepReq);

    if (stepRes.status === 307 || stepRes.status === 308 || stepRes.status === 302) {
      const loc = stepRes.headers.get("location");
      if (!loc) break;
      currentUrl = new URL(loc, currentUrl).toString();
      hops++;
    } else {
      // Reached 200 / destination
      break;
    }
  }

  assert(
    !hasLoop && hops === 1 && currentUrl.includes("/teacher/dashboard"),
    "7.1: Authenticated login navigation terminates cleanly in 1 hop at /teacher/dashboard (no loop)",
    `Hops: ${hops}, Terminal URL: ${currentUrl}`
  );

  // Flow B: Unauthenticated visitor opens /teacher/dashboard -> redirected to /teacher/login -> lands on login page (200)
  let unauthUrl = "http://localhost:3000/teacher/dashboard";
  let unauthHops = 0;
  const unauthVisited = new Set<string>();
  let unauthHasLoop = false;

  while (unauthHops < 5) {
    if (unauthVisited.has(unauthUrl)) {
      unauthHasLoop = true;
      break;
    }
    unauthVisited.add(unauthUrl);

    const stepReq = createReq(unauthUrl);
    const stepRes = middleware(stepReq);

    if (stepRes.status === 307 || stepRes.status === 308 || stepRes.status === 302) {
      const loc = stepRes.headers.get("location");
      if (!loc) break;
      unauthUrl = new URL(loc, unauthUrl).toString();
      unauthHops++;
    } else {
      break;
    }
  }

  assert(
    !unauthHasLoop && unauthHops === 1 && unauthUrl.includes("/teacher/login"),
    "7.2: Unauthenticated dashboard access terminates cleanly in 1 hop at /teacher/login (no loop)",
    `Hops: ${unauthHops}, Terminal URL: ${unauthUrl}`
  );

  // Flow C: Subdomain educator flow on educators.educonnects.co.in
  let subUrl = "https://educators.educonnects.co.in/login";
  let subHops = 0;
  const subVisited = new Set<string>();
  let subHasLoop = false;

  while (subHops < 5) {
    if (subVisited.has(subUrl)) {
      subHasLoop = true;
      break;
    }
    subVisited.add(subUrl);

    const stepReq = createReq(subUrl, {
      headers: {
        host: "educators.educonnects.co.in",
        cookie: `${SESSION_COOKIE_NAME}=${educatorToken}`,
      },
    });
    const stepRes = middleware(stepReq);

    if (stepRes.status === 307 || stepRes.status === 308 || stepRes.status === 302) {
      const loc = stepRes.headers.get("location");
      if (!loc) break;
      subUrl = new URL(loc, subUrl).toString();
      subHops++;
    } else {
      break;
    }
  }

  assert(
    !subHasLoop && subHops === 1 && subUrl.includes("/dashboard"),
    "7.3: Subdomain educator login terminates cleanly in 1 hop at /dashboard (no loop)",
    `Hops: ${subHops}, Terminal URL: ${subUrl}`
  );

  // Flow D: The original bug scenario (Stale cookie cleared preventing bounce)
  // 1. Browser has stale cookie and calls /api/auth/me -> 401 + Set-Cookie to clear
  const staleApiRes = await meRoute(
    createReq("http://localhost:3000/api/auth/me", {
      headers: { cookie: `${SESSION_COOKIE_NAME}=${expiredToken}` },
    })
  );
  assert(staleApiRes.status === 401, "7.4a: Stale session rejected by auth API");
  
  // 2. Client receives Set-Cookie clearing educonnects_session
  const cookiesCleared = staleApiRes.headers.getSetCookie().some(
    (c) => c.startsWith(`${SESSION_COOKIE_NAME}=`) && c.includes("Max-Age=0")
  );
  assert(cookiesCleared, "7.4b: Stale session is purged from browser cookies via response header");

  // 3. Client navigates to /teacher/login with NO cookie -> middleware serves login page without bouncing
  const postLogoutLoginRes = middleware(createReq("http://localhost:3000/teacher/login"));
  assert(
    postLogoutLoginRes.status === 200,
    "7.4c: Post-expiry login request serves login form (200) without bouncing back to dashboard",
    `Status: ${postLogoutLoginRes.status}`
  );

  // =========================================================================
  // SCENARIO 8: Session cookies work correctly in production HTTPS configuration
  // =========================================================================
  console.log("\n--- SCENARIO 8: Cookie Options & Domain Handling in Dev vs Prod ---");

  // 8.1: Domain determination on educators subdomain
  const eduDomain = getCookieDomain("educators.educonnects.co.in");
  assert(
    eduDomain === ".educonnects.co.in",
    "8.1: getCookieDomain returns .educonnects.co.in for educators subdomain",
    `Domain: ${eduDomain}`
  );

  // 8.2: Domain determination with multi-hop proxy x-forwarded-host
  const proxyDomain = getCookieDomain("educators.educonnects.co.in:443, 10.0.0.1");
  assert(
    proxyDomain === ".educonnects.co.in",
    "8.2: getCookieDomain correctly handles comma-separated multi-hop proxy headers",
    `Domain: ${proxyDomain}`
  );

  // 8.3: Domain determination on localhost (must be undefined)
  const localDomain = getCookieDomain("localhost:3000");
  assert(
    localDomain === undefined,
    "8.3: getCookieDomain returns undefined for localhost (avoids browser cookie drop)",
    `Domain: ${localDomain}`
  );

  // 8.4: getSessionCookieOptions for production domain
  const prodOptions = getSessionCookieOptions("educators.educonnects.co.in");
  assert(
    prodOptions.httpOnly === true &&
    prodOptions.secure === true &&
    prodOptions.sameSite === "lax" &&
    prodOptions.domain === ".educonnects.co.in" &&
    prodOptions.path === "/" &&
    prodOptions.maxAge === 7 * 24 * 60 * 60,
    "8.4: Production cookie options enforce Secure, HttpOnly, SameSite=Lax, 7-day maxAge and .educonnects.co.in domain",
    `Options: ${JSON.stringify(prodOptions)}`
  );

  // 8.5: getSessionCookieOptions for localhost development
  const origNodeEnv = process.env.NODE_ENV;
  (process.env as any).NODE_ENV = "development";
  const devOptions = getSessionCookieOptions("localhost:3000");
  assert(
    devOptions.httpOnly === true &&
    devOptions.secure === false &&
    devOptions.domain === undefined,
    "8.5: Development cookie options allow non-HTTPS on localhost without domain lock",
    `Options: ${JSON.stringify(devOptions)}`
  );
  (process.env as any).NODE_ENV = origNodeEnv;

  // =========================================================================
  // SUMMARY
  // =========================================================================
  console.log("\n=======================================================");
  console.log(`Execution Finished: ${passed} Passed, ${failed} Failed`);
  console.log("=======================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runEducatorRedirectLoopTests().catch((err) => {
  console.error("Test execution failed with unhandled error:", err);
  process.exit(1);
});
