import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "How EduConnects Works — Step-by-Step Learning Guide",
  description: "Learn how EduConnects empowers students with interactive live classrooms and verified educators, and helps teachers build their online coaching business.",
  alternates: {
    canonical: "https://educonnects.co.in/how-it-works",
  },
  openGraph: {
    title: "How EduConnects Works — Step-by-Step Learning Guide",
    description: "Learn how EduConnects empowers students with interactive live classrooms and verified educators, and helps teachers build their online coaching business.",
    url: "https://educonnects.co.in/how-it-works",
    siteName: "EduConnects",
    locale: "en_IN",
    type: "website",
  },
};

export default function HowItWorksLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
