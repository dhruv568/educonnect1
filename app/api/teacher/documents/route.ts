export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/guards";
import { apiSuccess, apiError, handleApiError } from "@/lib/api-response";
import { saveDocumentToStorage } from "@/lib/document-storage";
import { logAuditEvent } from "@/lib/audit-logger";

export async function POST(request: NextRequest) {
  try {
    const session = await requireRole(["TEACHER"]);

    const teacher = await prisma.teacherProfile.findUnique({
      where: { userId: session.id },
    });

    if (!teacher) {
      return apiError("Teacher profile not found", 404);
    }

    let fileBuffer: Buffer;
    let fileName: string;
    let mimeType: string;
    let category: string = "IDENTITY";

    const contentType = request.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("file") as File | null;
      category = (formData.get("category") as string) || "IDENTITY";

      if (!file) {
        return apiError("No file provided in request body", 400);
      }

      fileName = file.name;
      mimeType = file.type;
      const arrayBuffer = await file.arrayBuffer();
      fileBuffer = Buffer.from(arrayBuffer);
    } else {
      const body = await request.json();
      if (!body.base64 || !body.fileName || !body.mimeType) {
        return apiError("Required fields: base64, fileName, mimeType", 400);
      }
      category = body.category || "IDENTITY";
      fileName = body.fileName;
      mimeType = body.mimeType;
      // Strip base64 prefix if present
      const base64Clean = body.base64.replace(/^data:[^;]+;base64,/, "");
      fileBuffer = Buffer.from(base64Clean, "base64");
    }

    const validCategories = ["IDENTITY", "QUALIFICATION", "CERTIFICATE", "EXPERIENCE", "CANCELLED_CHEQUE", "OTHER"];
    if (!validCategories.includes(category)) {
      return apiError(`Invalid document category. Allowed: ${validCategories.join(", ")}`, 400);
    }

    // Save to storage
    const savedInfo = await saveDocumentToStorage(fileBuffer, fileName, mimeType);

    // Save DB record
    const documentRecord = await prisma.teacherDocument.create({
      data: {
        teacherId: teacher.id,
        category,
        fileName: savedInfo.fileName,
        fileType: savedInfo.fileType,
        fileSize: savedInfo.fileSize,
        storageKey: savedInfo.storageKey,
        status: "ACTIVE",
      },
    });

    if (category === "CANCELLED_CHEQUE") {
      await prisma.teacherProfile.update({
        where: { id: teacher.id },
        data: {
          cancelledChequeUrl: `/api/documents/${documentRecord.id}`,
        },
      });
    }

    await logAuditEvent(session.id, "DOCUMENT_UPLOADED", {
      documentId: documentRecord.id,
      category: documentRecord.category,
      fileName: documentRecord.fileName,
    });

    return apiSuccess({ document: documentRecord }, "Document uploaded successfully", 201);
  } catch (error: any) {
    return handleApiError(error);
  }
}
