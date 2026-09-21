import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiSuccess, handleApiError } from "@/lib/api-response";

export const dynamic = "force-dynamic";

/**
 * Public Endpoint: Returns active, currently scheduled banners matching the website placement.
 * Sanitized to only expose public presentation fields.
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const rawPlacement = searchParams.get("placement")?.trim().toUpperCase();

    const now = new Date();

    // Map placement synonyms to standard placement groups
    let allowedPlacements: string[] | null = null;
    if (rawPlacement) {
      if (["MAIN", "HOME"].includes(rawPlacement)) {
        allowedPlacements = ["ALL", "MAIN"];
      } else if (["LEARNERS", "LEARNER", "STUDENT", "STUDENTS"].includes(rawPlacement)) {
        allowedPlacements = ["ALL", "LEARNERS"];
      } else if (["EDUCATORS", "EDUCATOR", "TEACHER", "TEACHERS"].includes(rawPlacement)) {
        allowedPlacements = ["ALL", "EDUCATORS"];
      } else if (rawPlacement !== "ALL") {
        allowedPlacements = ["ALL", rawPlacement];
      }
    }

    const banners = await prisma.promotionalBanner.findMany({
      where: {
        isActive: true,
        ...(allowedPlacements ? { placement: { in: allowedPlacements } } : {}),
        AND: [
          {
            OR: [
              { startAt: null },
              { startAt: { lte: now } },
            ],
          },
          {
            OR: [
              { endAt: null },
              { endAt: { gte: now } },
            ],
          },
        ],
      },
      orderBy: [
        { displayOrder: "asc" },
        { createdAt: "desc" },
      ],
      select: {
        id: true,
        title: true,
        subtitle: true,
        description: true,
        bannerType: true,
        imageUrl: true,
        imageClickUrl: true,
        imageClickTarget: true,
        ctaText: true,
        ctaUrl: true,
        placement: true,
        displayOrder: true,
      },
    });

    const response = apiSuccess({
      banners,
      count: banners.length,
    });
    response.headers.set("Access-Control-Allow-Origin", "*");
    response.headers.set("Access-Control-Allow-Methods", "GET, OPTIONS");
    response.headers.set("Access-Control-Allow-Headers", "Content-Type");
    response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    return response;
  } catch (error: any) {
    return handleApiError(error);
  }
}
