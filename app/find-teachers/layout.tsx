import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Find Verified Educators — Book 1-on-1 & Group Classes | EduConnects",
  description: "Discover top-rated, background-verified educators across Mathematics, Science, Engineering, Competitive Exams, and more on EduConnects.",
  alternates: {
    canonical: "https://educonnects.co.in/find-teachers",
  },
  openGraph: {
    title: "Find Verified Educators | EduConnects",
    description: "Discover top-rated, background-verified educators across Mathematics, Science, Engineering, Competitive Exams, and more on EduConnects.",
    url: "https://educonnects.co.in/find-teachers",
    siteName: "EduConnects",
    locale: "en_IN",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Find Verified Educators | EduConnects",
    description: "Discover top-rated, background-verified educators across Mathematics, Science, Engineering, Competitive Exams, and more on EduConnects.",
  },
};

export default function FindTeachersLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
