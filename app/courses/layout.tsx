import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Explore Courses — Live & Self-Paced Learning | EduConnects",
  description: "Browse comprehensive video courses across K-12 School Grades, Senior Secondary Streams, Engineering Diploma, and Competitive Exams taught by verified educators on EduConnects.",
  alternates: {
    canonical: "https://educonnects.co.in/courses",
  },
  openGraph: {
    title: "Explore Courses — Live & Self-Paced Learning | EduConnects",
    description: "Browse comprehensive video courses across K-12 School Grades, Senior Secondary Streams, Engineering Diploma, and Competitive Exams taught by verified educators on EduConnects.",
    url: "https://educonnects.co.in/courses",
    siteName: "EduConnects",
    locale: "en_IN",
    type: "website",
    images: [
      {
        url: "/images/favicon.png",
        width: 512,
        height: 512,
        alt: "EduConnects Courses",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Explore Courses — Live & Self-Paced Learning | EduConnects",
    description: "Browse comprehensive video courses across K-12 School Grades, Senior Secondary Streams, Engineering Diploma, and Competitive Exams taught by verified educators on EduConnects.",
    images: ["/images/favicon.png"],
  },
};

export default function CoursesLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
