import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const rawHost =
    request.headers.get("x-forwarded-host") ||
    request.headers.get("x-original-host") ||
    request.headers.get("host") ||
    request.nextUrl.hostname ||
    request.nextUrl.host ||
    "";
  const cleanHost = rawHost.split(",")[0].split(":")[0].trim().toLowerCase();

  // Static assets & internal Next.js paths
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // Hostname-based domain detection
  const isLiveSubdomain =
    cleanHost.startsWith("live.") ||
    cleanHost === "live.educonnects.co.in";
  const isStudentSubdomain =
    cleanHost.startsWith("learners.") ||
    cleanHost.startsWith("learner.") ||
    cleanHost.startsWith("students.") ||
    cleanHost.startsWith("student.") ||
    cleanHost === "learners.educonnects.co.in" ||
    cleanHost === "students.educonnects.co.in";
  const isEducatorSubdomain =
    cleanHost.startsWith("educators.") ||
    cleanHost.startsWith("educator.") ||
    cleanHost.startsWith("teacher.") ||
    cleanHost.startsWith("teachers.") ||
    cleanHost === "educators.educonnects.co.in";

  const studentDomainUrl =
    process.env.NEXT_PUBLIC_STUDENT_DOMAIN ||
    process.env.NEXT_PUBLIC_LEARNER_DOMAIN ||
    "https://learners.educonnects.co.in";
  const educatorDomainUrl =
    process.env.NEXT_PUBLIC_EDUCATOR_DOMAIN || "https://educators.educonnects.co.in";

  const isMainDomain =
    cleanHost === "educonnects.co.in" ||
    cleanHost === "www.educonnects.co.in";

  // Prevent domain crosstalk / accidental page display
  if (isStudentSubdomain && pathname.startsWith("/teacher")) {
    const targetUrl = new URL(pathname, educatorDomainUrl);
    return NextResponse.redirect(targetUrl);
  }

  if (isStudentSubdomain && pathname.startsWith("/admin")) {
    const targetUrl = new URL(pathname, "https://educonnects.co.in");
    return NextResponse.redirect(targetUrl);
  }

  if (isEducatorSubdomain && pathname.startsWith("/student")) {
    const targetUrl = new URL(pathname, studentDomainUrl);
    return NextResponse.redirect(targetUrl);
  }

  if (isEducatorSubdomain && (pathname.startsWith("/admin") || pathname.startsWith("/staff") || pathname.startsWith("/governance"))) {
    const targetUrl = new URL(pathname, "https://educonnects.co.in");
    return NextResponse.redirect(targetUrl);
  }

  // Prevent main domain showing learner/educator dashboards directly
  if (isMainDomain && pathname.startsWith("/student")) {
    return NextResponse.redirect(new URL(pathname, studentDomainUrl));
  }

  if (isMainDomain && pathname.startsWith("/teacher") && pathname !== "/teacher/logout") {
    return NextResponse.redirect(new URL(pathname, educatorDomainUrl));
  }

  // Helper for subdomain rewrites
  const getSubdomainRewrite = (): NextResponse | null => {
    if (isLiveSubdomain) {
      if (pathname === "/") {
        return NextResponse.rewrite(new URL("/live", request.url));
      }
    }
    if (isStudentSubdomain) {
      if (pathname === "/") {
        return NextResponse.rewrite(new URL("/student", request.url));
      }
      // Routes that should NOT be rewritten to /student/*
      const isSharedOrExternal =
        pathname.startsWith("/student") ||
        pathname.startsWith("/api/") ||
        pathname.startsWith("/profile") ||
        pathname.startsWith("/notifications") ||
        pathname.startsWith("/settings") ||
        pathname.startsWith("/about") ||
        pathname.startsWith("/contact") ||
        pathname.startsWith("/terms") ||
        pathname.startsWith("/privacy") ||
        pathname.startsWith("/refund") ||
        pathname.startsWith("/verify-") ||
        pathname === "/courses" ||
        pathname.startsWith("/courses/") ||
        pathname.startsWith("/exam") ||
        pathname.startsWith("/find-teachers");

      if (!isSharedOrExternal) {
        // Explicit friendly shortcut mappings
        if (pathname === "/dashboard" || pathname.startsWith("/dashboard/")) {
          return NextResponse.rewrite(new URL(`/student${pathname}`, request.url));
        }
        if (pathname === "/live-classes" || pathname.startsWith("/live-classes/")) {
          return NextResponse.rewrite(new URL(`/student${pathname}`, request.url));
        }
        if (pathname === "/payments" || pathname.startsWith("/payments/")) {
          return NextResponse.rewrite(new URL(`/student${pathname}`, request.url));
        }
        if (pathname === "/teachers" || pathname.startsWith("/teachers/")) {
          return NextResponse.rewrite(new URL(`/student${pathname}`, request.url));
        }
        if (pathname === "/login") {
          return NextResponse.rewrite(new URL("/student/login", request.url));
        }
        if (pathname === "/register") {
          return NextResponse.rewrite(new URL("/student/register", request.url));
        }
        if (pathname === "/logout") {
          return NextResponse.rewrite(new URL("/student/logout", request.url));
        }
      }
    }
    if (isEducatorSubdomain) {
      if (pathname === "/") {
        return NextResponse.rewrite(new URL("/teacher", request.url));
      }
      const isSharedOrExternal =
        pathname.startsWith("/teacher") ||
        pathname.startsWith("/api/") ||
        pathname.startsWith("/profile") ||
        pathname.startsWith("/notifications") ||
        pathname.startsWith("/settings") ||
        pathname.startsWith("/about") ||
        pathname.startsWith("/contact") ||
        pathname.startsWith("/terms") ||
        pathname.startsWith("/privacy") ||
        pathname.startsWith("/refund") ||
        pathname.startsWith("/verify-") ||
        pathname.startsWith("/courses/") ||
        pathname.startsWith("/find-teachers");

      if (!isSharedOrExternal) {
        if (pathname === "/dashboard" || pathname.startsWith("/dashboard/")) {
          return NextResponse.rewrite(new URL(`/teacher${pathname}`, request.url));
        }
        if (pathname === "/courses" || pathname.startsWith("/courses/")) {
          return NextResponse.rewrite(new URL(`/teacher${pathname}`, request.url));
        }
        if (pathname === "/live-classes" || pathname.startsWith("/live-classes/")) {
          return NextResponse.rewrite(new URL(`/teacher${pathname}`, request.url));
        }
        if (pathname === "/earnings" || pathname.startsWith("/earnings/")) {
          return NextResponse.rewrite(new URL(`/teacher${pathname}`, request.url));
        }
        if (pathname === "/onboarding") {
          return NextResponse.rewrite(new URL("/teacher/onboarding", request.url));
        }
        if (pathname === "/verification") {
          return NextResponse.rewrite(new URL("/teacher/verification", request.url));
        }
        if (
          pathname === "/training" ||
          pathname === "/training-program" ||
          pathname === "/teachers-training-program" ||
          pathname.startsWith("/training/")
        ) {
          return NextResponse.rewrite(new URL("/teacher/training", request.url));
        }
        if (pathname === "/login") {
          return NextResponse.rewrite(new URL("/teacher/login", request.url));
        }
        if (pathname === "/register") {
          return NextResponse.rewrite(new URL("/teacher/register", request.url));
        }
        if (pathname === "/logout") {
          return NextResponse.rewrite(new URL("/teacher/logout", request.url));
        }
      }
    }
    return null;
  };

  // Public paths accessible without authentication and accessible to unverified/verified users
  const isPublicPath =
    pathname === "/" ||
    pathname === "/live" ||
    pathname.startsWith("/live/") ||
    pathname === "/student" ||
    pathname === "/teacher" ||
    pathname === "/teacher/training" ||
    pathname.startsWith("/teacher/training") ||
    pathname === "/training" ||
    pathname.startsWith("/training") ||
    pathname === "/training-program" ||
    pathname.startsWith("/training-program") ||
    pathname === "/teachers-training-program" ||
    pathname.startsWith("/teachers-training-program") ||
    pathname === "/student/login" ||
    pathname === "/teacher/login" ||
    pathname === "/student/register" ||
    pathname === "/teacher/register" ||
    pathname === "/teacher/logout" ||
    pathname === "/student/logout" ||
    pathname === "/admin/logout" ||
    pathname === "/logout" ||
    pathname === "/login" ||
    pathname === "/staff/login" ||
    pathname.startsWith("/staff/register") ||
    pathname.startsWith("/register") ||
    pathname.startsWith("/forgot-password") ||
    pathname.startsWith("/reset-password") ||
    pathname.startsWith("/verify-email") ||
    pathname.startsWith("/verify-otp") ||
    pathname.startsWith("/find-teachers") ||
    pathname.startsWith("/courses") ||
    pathname.startsWith("/exam") ||
    pathname.startsWith("/pricing") ||
    pathname.startsWith("/how-it-works") ||
    pathname.startsWith("/about") ||
    pathname.startsWith("/contact") ||
    pathname.startsWith("/terms") ||
    pathname.startsWith("/privacy") ||
    pathname.startsWith("/refund") ||
    pathname === "/admin/login" ||
    pathname.startsWith("/api/");

  const cookie = request.cookies.get("educonnects_session");

  // If no session cookie present
  if (!cookie?.value) {
    if (isPublicPath) {
      // If user has already verified credentials and is waiting for OTP verification:
      // Opening login page returns them to the OTP verification step rather than restarting unless ?restart=true
      const isLoginPath =
        pathname === "/admin/login" ||
        pathname === "/teacher/login" ||
        pathname === "/student/login" ||
        pathname === "/login";

      if (isLoginPath) {
        if (request.nextUrl.searchParams.get("restart")) {
          const res = NextResponse.next();
          res.cookies.delete("admin_pending_otp");
          res.cookies.delete("educonnects_pending_otp");
          return res;
        }

        const pendingAdminOtp = request.cookies.get("admin_pending_otp");
        const pendingOtp = request.cookies.get("educonnects_pending_otp");

        if (pathname === "/admin/login" && pendingAdminOtp?.value) {
          const adminEmail = decodeURIComponent(pendingAdminOtp.value);
          return NextResponse.redirect(
            new URL(`/verify-email?email=${encodeURIComponent(adminEmail)}&redirectTo=/admin`, request.url)
          );
        }

        if (pendingOtp?.value) {
          const pendingEmail = decodeURIComponent(pendingOtp.value);
          let redirectTo = "/student/dashboard";
          if (pathname === "/teacher/login") {
            redirectTo = "/teacher/dashboard";
          } else if (pathname === "/admin/login") {
            redirectTo = "/admin";
          }
          return NextResponse.redirect(
            new URL(`/verify-email?email=${encodeURIComponent(pendingEmail)}&redirectTo=${encodeURIComponent(redirectTo)}`, request.url)
          );
        }
      }

      const rewrite = getSubdomainRewrite();
      return rewrite || NextResponse.next();
    }
    // Unauthenticated user attempting to access protected route
    if (pathname.startsWith("/staff")) {
      return NextResponse.redirect(new URL("/staff/login", request.url));
    }
    if (pathname.startsWith("/admin")) {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }
    if (pathname.startsWith("/student")) {
      const loginUrl = new URL("/student/login", request.url);
      loginUrl.searchParams.set("redirectTo", pathname);
      return NextResponse.redirect(loginUrl);
    }
    if (pathname.startsWith("/teacher")) {
      const loginUrl = new URL("/teacher/login", request.url);
      loginUrl.searchParams.set("redirectTo", pathname);
      return NextResponse.redirect(loginUrl);
    }
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Parse session payload from cookie
  let userSession: { email?: string; role?: string; emailVerified?: boolean } | null = null;
  try {
    const jsonStr = Buffer.from(cookie.value, "base64url").toString("utf-8");
    userSession = JSON.parse(jsonStr);
  } catch {
    userSession = null;
  }

  if (!userSession) {
    if (isPublicPath) {
      const rewrite = getSubdomainRewrite();
      return rewrite || NextResponse.next();
    }
    if (pathname.startsWith("/staff")) {
      return NextResponse.redirect(new URL("/staff/login", request.url));
    }
    if (pathname.startsWith("/admin")) {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Unverified user handling
  if (!userSession.emailVerified) {
    if (isPublicPath) {
      const rewrite = getSubdomainRewrite();
      return rewrite || NextResponse.next();
    }
    const verifyUrl = new URL("/verify-email", request.url);
    if (userSession.email) {
      verifyUrl.searchParams.set("email", userSession.email);
    }
    verifyUrl.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(verifyUrl);
  }

  // Verified user role-protected route guards
  const isEducatorRole = (r?: string) => r === "TEACHER" || r === "EDUCATOR";
  const isLearnerRole = (r?: string) => r === "STUDENT" || r === "LEARNER";

  // If user is already authenticated with a valid session, never show login pages
  const isLoginRoute =
    pathname === "/login" ||
    pathname === "/teacher/login" ||
    pathname === "/educator/login" ||
    pathname === "/student/login" ||
    pathname === "/learner/login" ||
    pathname === "/admin/login" ||
    pathname === "/staff/login";

  if (isLoginRoute) {
    // 1. Learner login route or Learner subdomain login:
    // Only redirect away if ALREADY logged in as a Learner.
    // If user has an Admin or Educator session in cookies, clicking Learner Login must open Learner Login!
    const isLearnerLoginRequest =
      pathname === "/student/login" ||
      pathname === "/learner/login" ||
      (isStudentSubdomain && pathname === "/login");

    if (isLearnerLoginRequest) {
      if (isLearnerRole(userSession.role)) {
        const target = isStudentSubdomain ? "/dashboard" : "/student/dashboard";
        return NextResponse.redirect(new URL(target, request.url));
      }
      // Allow accessing the Learner Login page
      const rewrite = getSubdomainRewrite();
      return rewrite || NextResponse.next();
    }

    // 2. Educator login route or Educator subdomain login:
    const isEducatorLoginRequest =
      pathname === "/teacher/login" ||
      pathname === "/educator/login" ||
      (isEducatorSubdomain && pathname === "/login");

    if (isEducatorLoginRequest) {
      if (isEducatorRole(userSession.role)) {
        const target = isEducatorSubdomain ? "/dashboard" : "/teacher/dashboard";
        return NextResponse.redirect(new URL(target, request.url));
      }
      const rewrite = getSubdomainRewrite();
      return rewrite || NextResponse.next();
    }

    if (isEducatorRole(userSession.role)) {
      const target = isEducatorSubdomain ? "/dashboard" : "/teacher/dashboard";
      return NextResponse.redirect(new URL(target, request.url));
    }
    if (isLearnerRole(userSession.role)) {
      const target = isStudentSubdomain ? "/dashboard" : "/student/dashboard";
      return NextResponse.redirect(new URL(target, request.url));
    }
    if (userSession.role === "ADMIN") {
      return NextResponse.redirect(new URL("/admin", request.url));
    }
    if (userSession.role === "STAFF") {
      return NextResponse.redirect(new URL("/staff/dashboard", request.url));
    }
    return NextResponse.redirect(new URL("/", request.url));
  }

  // Subdomain dashboard cross-role protection
  if (isEducatorSubdomain && (pathname === "/dashboard" || pathname.startsWith("/dashboard/"))) {
    if (!isEducatorRole(userSession.role)) {
      if (isLearnerRole(userSession.role)) {
        return NextResponse.redirect(new URL(pathname, studentDomainUrl));
      }
      return NextResponse.redirect(new URL("/teacher/login", request.url));
    }
  }

  if (isStudentSubdomain && (pathname === "/dashboard" || pathname.startsWith("/dashboard/"))) {
    if (!isLearnerRole(userSession.role)) {
      if (isEducatorRole(userSession.role)) {
        return NextResponse.redirect(new URL(pathname, educatorDomainUrl));
      }
      return NextResponse.redirect(new URL("/student/login", request.url));
    }
  }

  if (pathname.startsWith("/staff") && pathname !== "/staff/login" && pathname !== "/staff/register") {
    if (userSession.role !== "STAFF" && userSession.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/staff/login", request.url));
    }
  }

  if (pathname.startsWith("/admin") && pathname !== "/admin/login" && pathname !== "/admin/logout") {
    if (userSession.role !== "ADMIN" && userSession.role !== "STAFF") {
      if (isEducatorRole(userSession.role)) {
        return NextResponse.redirect(new URL("/teacher/dashboard", request.url));
      }
      if (isLearnerRole(userSession.role)) {
        return NextResponse.redirect(new URL("/student/dashboard", request.url));
      }
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }
  }

  // Protect private teacher subroutes (allow public /teacher, /teacher/login, /teacher/register, /teacher/logout, /teacher/training)
  if (
    pathname.startsWith("/teacher") &&
    pathname !== "/teacher" &&
    pathname !== "/teacher/login" &&
    pathname !== "/teacher/register" &&
    pathname !== "/teacher/logout" &&
    !pathname.startsWith("/teacher/training")
  ) {
    if (!isEducatorRole(userSession.role)) {
      if (isLearnerRole(userSession.role)) {
        return NextResponse.redirect(new URL("/student/dashboard", request.url));
      }
      return NextResponse.redirect(new URL("/teacher/login", request.url));
    }
  }

  // Protect private student subroutes (allow public /student, /student/login, /student/register, /student/logout)
  if (
    pathname.startsWith("/student") &&
    pathname !== "/student" &&
    pathname !== "/student/login" &&
    pathname !== "/student/register" &&
    pathname !== "/student/logout"
  ) {
    if (!isLearnerRole(userSession.role)) {
      if (isEducatorRole(userSession.role)) {
        return NextResponse.redirect(new URL("/teacher/dashboard", request.url));
      }
      return NextResponse.redirect(new URL("/student/login", request.url));
    }
  }

  if (pathname.startsWith("/parent")) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  const rewrite = getSubdomainRewrite();
  return rewrite || NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
