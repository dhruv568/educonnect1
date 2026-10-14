import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const slug = params?.slug;
  if (!slug) {
    return {
      title: "Course Details | EduConnects",
      description: "Explore online courses on EduConnects.",
    };
  }

  try {
    const course = await prisma.course.findUnique({
      where: { slug },
      select: {
        title: true,
        subtitle: true,
        description: true,
        thumbnailUrl: true,
        subject: true,
        level: true,
        price: true,
      },
    });

    if (!course) {
      return {
        title: "Course Not Found | EduConnects",
        description: "The requested course could not be found.",
      };
    }

    const title = `${course.title} — ${course.subject} | EduConnects`;
    const desc =
      course.subtitle ||
      (course.description
        ? course.description.slice(0, 160)
        : "Comprehensive course on EduConnects.");
    const canonicalUrl = `https://educonnects.co.in/courses/${slug}`;

    return {
      title,
      description: desc,
      alternates: {
        canonical: canonicalUrl,
      },
      openGraph: {
        title,
        description: desc,
        url: canonicalUrl,
        siteName: "EduConnects",
        locale: "en_IN",
        type: "article",
        images: course.thumbnailUrl
          ? [{ url: course.thumbnailUrl, alt: course.title }]
          : [{ url: "/images/favicon.png", alt: "EduConnects" }],
      },
      twitter: {
        card: "summary_large_image",
        title,
        description: desc,
        images: course.thumbnailUrl ? [course.thumbnailUrl] : ["/images/favicon.png"],
      },
    };
  } catch {
    return {
      title: "Course Details | EduConnects",
      description: "Explore online courses on EduConnects.",
    };
  }
}

export default function CourseDetailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
