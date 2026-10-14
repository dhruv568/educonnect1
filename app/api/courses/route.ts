import { NextRequest } from "next/server";
import { LmsService } from "@/services/lms-service";
import { apiSuccess, handleApiError } from "@/lib/api-response";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const search = searchParams.get("search") || undefined;
    const subject = searchParams.get("subject") || undefined;
    const category = searchParams.get("category") || undefined;
    const level = searchParams.get("level") || undefined;
    const academicLevel = searchParams.get("academicLevel") || undefined;
    const gradeLevel = searchParams.get("grade") || searchParams.get("gradeLevel") || undefined;
    const stream = searchParams.get("stream") || undefined;
    const competitiveExam = searchParams.get("exam") || searchParams.get("competitiveExam") || undefined;
    const diplomaBranch = searchParams.get("diplomaBranch") || undefined;
    const priceMax = searchParams.get("priceMax") ? Number(searchParams.get("priceMax")) : undefined;
    const ratingMin = searchParams.get("ratingMin") ? Number(searchParams.get("ratingMin")) : undefined;
    const sortBy = searchParams.get("sortBy") || "recommended";
    const page = searchParams.get("page") ? Number(searchParams.get("page")) : 1;
    const limit = searchParams.get("limit") ? Number(searchParams.get("limit")) : 12;

    const result = await LmsService.getPublicCourses({
      search,
      subject,
      category,
      level,
      academicLevel,
      gradeLevel,
      stream,
      competitiveExam,
      diplomaBranch,
      priceMax,
      ratingMin,
      sortBy,
      page,
      limit,
    });

    return apiSuccess(result);
  } catch (error: any) {
    return handleApiError(error);
  }
}
