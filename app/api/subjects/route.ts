import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const DEFAULT_SUBJECTS = [
  { id: "sub-math", name: "Mathematics", slug: "mathematics", description: "Algebra, Calculus, Geometry, Trigonometry & Statistics" },
  { id: "sub-phys", name: "Physics", slug: "physics", description: "Mechanics, Optics, Thermodynamics, Electromagnetism & Modern Physics" },
  { id: "sub-chem", name: "Chemistry", slug: "chemistry", description: "Organic, Inorganic, Physical & Analytical Chemistry" },
  { id: "sub-bio", name: "Biology", slug: "biology", description: "Botany, Zoology, Genetics, Ecology & Human Physiology" },
  { id: "sub-eng", name: "English", slug: "english", description: "Grammar, Reading Comprehension, Vocabulary & Writing Skills" },
  { id: "sub-cs", name: "Computer Science", slug: "computer-science", description: "Programming in Python, Data Structures, Algorithms & Web Development" },
];

export async function GET() {
  try {
    const subjects = await prisma.courseCategory.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
      },
    });

    const result = subjects && subjects.length > 0 ? subjects : DEFAULT_SUBJECTS;

    return NextResponse.json({
      success: true,
      data: { subjects: result },
    });
  } catch (error: any) {
    console.warn("[Subjects API] Failed to fetch active subjects from DB, returning defaults:", error?.message || error);
    return NextResponse.json({
      success: true,
      data: { subjects: DEFAULT_SUBJECTS },
    });
  }
}
