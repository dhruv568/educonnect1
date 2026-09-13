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

  if (isEducatorSubdomain && pathname.startsWith("/student")) {
    const targetUrl = new URL(pathname, studentDomainUrl);
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
      if (!pathname.startsWith("/student") && !pathname.startsWith("/api/")) {
        return NextResponse.rewrite(new URL(`/student${pathname}`, request.url));
      }
    }
    if (isEducatorSubdomain) {
      if (pathname === "/") {
        return NextResponse.rewrite(new URL("/teacher", request.url));
      }
      if (!pathname.startsWith("/teacher") && !pathname.startsWith("/api/")) {
        return NextResponse.rewrite(new URL(`/teacher${pathname}`, request.url));
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
    pathname === "/student/login" ||
    pathname === "/teacher/login" ||
    pathname === "/student/register" ||
    pathname === "/teacher/register" ||
    pathname === "/teacher/logout" ||
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
  if (pathname.startsWith("/staff") && pathname !== "/staff/login" && pathname !== "/staff/register") {
    if (userSession.role !== "STAFF" && userSession.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/staff/login", request.url));
    }
  }

  if (pathname.startsWith("/admin") && pathname !== "/admin/login") {
    if (userSession.role !== "ADMIN" && userSession.role !== "STAFF") {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }
  }

  // Protect private teacher subroutes (allow public /teacher, /teacher/login, /teacher/register)
  if (
    pathname.startsWith("/teacher") &&
    pathname !== "/teacher" &&
    pathname !== "/teacher/login" &&
    pathname !== "/teacher/register"
  ) {
    if (userSession.role !== "TEACHER") {
      return NextResponse.redirect(new URL("/teacher/login", request.url));
    }
  }

  // Protect private student subroutes (allow public /student, /student/login, /student/register)
  if (
    pathname.startsWith("/student") &&
    pathname !== "/student" &&
    pathname !== "/student/login" &&
    pathname !== "/student/register"
  ) {
    if (userSession.role !== "STUDENT") {
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
