import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/permissions/permission-engine";
import { AnalyticsService } from "@/services/analytics-service";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    await requirePermission("analytics.export");

    const { searchParams } = new URL(req.url);
    const reportType = searchParams.get("type") || "revenue";

    let csvContent = "";

    if (reportType === "revenue") {
      const transactions = await prisma.paymentTransaction.findMany({
        where: { status: "CAPTURED" },
        include: { user: true, course: true, liveClassSlot: true },
        orderBy: { createdAt: "desc" },
      });

      csvContent = "Transaction ID,Date,User Email,Type,Item Title,Amount (INR),Status\n";
      transactions.forEach((t) => {
        const itemTitle = t.course?.title || t.liveClassSlot?.title || "N/A";
        const amount = (t.amountPaise / 100).toFixed(2);
        csvContent += `"${t.id}","${t.createdAt.toISOString()}","${t.user.email}","${t.type}","${itemTitle}",${amount},"${t.status}"\n`;
      });
    } else if (reportType === "users") {
      const users = await prisma.user.findMany({
        include: { profile: true },
        orderBy: { createdAt: "desc" },
      });

      csvContent = "User ID,Email,Role,First Name,Last Name,Email Verified,Created At\n";
      users.forEach((u) => {
        const fn = u.profile?.firstName || "";
        const ln = u.profile?.lastName || "";
        csvContent += `"${u.id}","${u.email}","${u.role}","${fn}","${ln}",${u.emailVerified},"${u.createdAt.toISOString()}"\n`;
      });
    } else if (reportType === "courses") {
      const courses = await prisma.course.findMany({
        include: { teacher: { include: { user: true } } },
        orderBy: { createdAt: "desc" },
      });

      csvContent = "Course ID,Title,Subject,Level,Price (INR),Enrollments,Rating,Status,Created At\n";
      courses.forEach((c) => {
        csvContent += `"${c.id}","${c.title}","${c.subject}","${c.level}",${c.price},${c.enrollmentCount},${c.rating},"${c.status}","${c.createdAt.toISOString()}"\n`;
      });
    } else {
      csvContent = "Metric,Value\nReport,Default Analytics Summary\nGenerated At," + new Date().toISOString() + "\n";
    }

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename=educonnects-${reportType}-report.csv`,
      },
    });
  } catch (error: any) {
    if (error.message?.startsWith("UNAUTHORIZED")) {
      return new NextResponse(error.message, { status: 401 });
    }
    if (error.message?.startsWith("UNVERIFIED") || error.message?.startsWith("FORBIDDEN")) {
      return new NextResponse(error.message, { status: 403 });
    }
    console.error("[GET /api/admin/analytics/export error]:", error);
    return new NextResponse("Export Failed", { status: 500 });
  }
}
