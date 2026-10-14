import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About EduConnects — Our Mission, Pedagogy & Vision",
  description: "Learn about EduConnects, India's next-generation educational ecosystem empowering students and educators through transparent, technology-enabled live learning.",
  alternates: {
    canonical: "https://educonnects.co.in/about",
  },
  openGraph: {
    title: "About EduConnects — Our Mission, Pedagogy & Vision",
    description: "Learn about EduConnects, India's next-generation educational ecosystem empowering students and educators through transparent, technology-enabled live learning.",
    url: "https://educonnects.co.in/about",
    siteName: "EduConnects",
    locale: "en_IN",
    type: "website",
  },
};

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
