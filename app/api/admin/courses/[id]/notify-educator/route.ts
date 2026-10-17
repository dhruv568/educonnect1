import { NextRequest } from "next/server";
import { requirePermission } from "@/lib/permissions/permission-engine";
import { apiSuccess, handleApiError } from "@/lib/api-response";
import { AdminService } from "@/services/admin-service";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await requirePermission("courses.approve");
    const result = await AdminService.notifyEducatorMissingLessons(userId, params.id);
    return apiSuccess(result);
  } catch (error: any) {
    return handleApiError(error, "Failed to notify educator.", 400, {
      route: `/api/admin/courses/${params.id}/notify-educator`,
      application: "admin",
    });
  }
}
