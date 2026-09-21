import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { getLearnerDomain } from "../lib/app-url";

describe("Learner Dashboard Enhancements & 3 New Pages Test Suite", () => {
  it("1. getLearnerDomain() resolves canonical learners subdomain URL", () => {
    const learnerUrl = getLearnerDomain();
    assert.ok(
      learnerUrl.includes("learners.educonnects.co.in") || learnerUrl.includes("localhost"),
      `Expected getLearnerDomain() to be learners domain or localhost: ${learnerUrl}`
    );
  });

  it("2. BackToHomeButton resolves to learners.educonnects.co.in for Learner pages", () => {
    const btnFile = path.resolve(process.cwd(), "components/ui/back-to-home-button.tsx");
    assert.ok(fs.existsSync(btnFile), "components/ui/back-to-home-button.tsx must exist");

    const content = fs.readFileSync(btnFile, "utf-8");
    assert.ok(content.includes("getLearnerDomain"), "Must import getLearnerDomain");
    assert.ok(
      content.includes("pathname?.startsWith(\"/student\")") || content.includes("isLearnerPage"),
      "Must inspect learner path to resolve learners domain"
    );
  });

  it("3. DashboardLayout includes Payment Log, Activity Log, and Attendance in STUDENT sidebar navigation", () => {
    const layoutFile = path.resolve(process.cwd(), "components/layout/dashboard-layout.tsx");
    assert.ok(fs.existsSync(layoutFile), "dashboard-layout.tsx must exist");

    const content = fs.readFileSync(layoutFile, "utf-8");
    assert.ok(content.includes('href: "/student/payments"'), "Must include Payment Log link");
    assert.ok(content.includes('href: "/student/activity"'), "Must include Activity Log link");
    assert.ok(content.includes('href: "/student/attendance"'), "Must include Attendance link");
  });

  it("4. Payment Log page (/student/payments) uses DashboardLayout with STUDENT role", () => {
    const payFile = path.resolve(process.cwd(), "app/student/payments/page.tsx");
    assert.ok(fs.existsSync(payFile), "app/student/payments/page.tsx must exist");

    const content = fs.readFileSync(payFile, "utf-8");
    assert.ok(content.includes('<DashboardLayout role="STUDENT"'), "Payment Log page must use DashboardLayout with role='STUDENT'");
    assert.ok(content.includes("Payment Log & Purchase History"), "Payment Log page must display clear header title");
  });

  it("5. Activity Log page (/student/activity) and API exist and match theme", () => {
    const pageFile = path.resolve(process.cwd(), "app/student/activity/page.tsx");
    const apiFile = path.resolve(process.cwd(), "app/api/student/activity/route.ts");
    assert.ok(fs.existsSync(pageFile), "app/student/activity/page.tsx must exist");
    assert.ok(fs.existsSync(apiFile), "app/api/student/activity/route.ts must exist");

    const pageContent = fs.readFileSync(pageFile, "utf-8");
    assert.ok(pageContent.includes('<DashboardLayout role="STUDENT"'), "Activity Log page must use DashboardLayout");
    assert.ok(pageContent.includes("Learner Activity Log"), "Activity Log page must display header title");
  });

  it("6. Attendance page (/student/attendance) and API exist and match theme", () => {
    const pageFile = path.resolve(process.cwd(), "app/student/attendance/page.tsx");
    const apiFile = path.resolve(process.cwd(), "app/api/student/attendance/route.ts");
    assert.ok(fs.existsSync(pageFile), "app/student/attendance/page.tsx must exist");
    assert.ok(fs.existsSync(apiFile), "app/api/student/attendance/route.ts must exist");

    const pageContent = fs.readFileSync(pageFile, "utf-8");
    assert.ok(pageContent.includes('<DashboardLayout role="STUDENT"'), "Attendance page must use DashboardLayout");
    assert.ok(pageContent.includes("Live Class & Course Attendance"), "Attendance page must display header title");
  });

  it("7. Admin Recommended Educators system & Learner Dashboard integration exist", () => {
    const adminApiFile = path.resolve(process.cwd(), "app/api/admin/recommended-educators/route.ts");
    const analyticsFile = path.resolve(process.cwd(), "services/analytics-service.ts");
    const adminTeachersPage = path.resolve(process.cwd(), "app/admin/teachers/page.tsx");
    const studentDashboardPage = path.resolve(process.cwd(), "app/student/dashboard/page.tsx");

    assert.ok(fs.existsSync(adminApiFile), "Admin recommended-educators API route must exist");
    
    const analyticsContent = fs.readFileSync(analyticsFile, "utf-8");
    assert.ok(analyticsContent.includes("recommended_educators"), "AnalyticsService must check recommended_educators in PlatformConfig");

    const adminPageContent = fs.readFileSync(adminTeachersPage, "utf-8");
    assert.ok(adminPageContent.includes("toggleRecommended"), "Admin Educator Roster must include toggleRecommended handler");

    const studentDashContent = fs.readFileSync(studentDashboardPage, "utf-8");
    assert.ok(studentDashContent.includes("No Recommended Educators Featured"), "Learner Dashboard must render clean empty state when no recommended educators are selected");
  });
});
