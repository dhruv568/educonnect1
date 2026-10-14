import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact Us & Learner Support | EduConnects",
  description: "Get in touch with EduConnects student and educator support, enterprise inquiry desk, and technical assistance.",
  alternates: {
    canonical: "https://educonnects.co.in/contact",
  },
  openGraph: {
    title: "Contact Us & Learner Support | EduConnects",
    description: "Get in touch with EduConnects student and educator support, enterprise inquiry desk, and technical assistance.",
    url: "https://educonnects.co.in/contact",
    siteName: "EduConnects",
    locale: "en_IN",
    type: "website",
  },
};

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
