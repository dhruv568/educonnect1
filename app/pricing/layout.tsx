import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Transparent Pricing & Learning Plans | EduConnects",
  description: "Explore transparent pay-as-you-go pricing for live classes, 1-on-1 mentorship, and self-paced video courses on EduConnects. Zero subscription traps.",
  alternates: {
    canonical: "https://educonnects.co.in/pricing",
  },
  openGraph: {
    title: "Transparent Pricing & Learning Plans | EduConnects",
    description: "Explore transparent pay-as-you-go pricing for live classes, 1-on-1 mentorship, and self-paced video courses on EduConnects. Zero subscription traps.",
    url: "https://educonnects.co.in/pricing",
    siteName: "EduConnects",
    locale: "en_IN",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Transparent Pricing & Learning Plans | EduConnects",
    description: "Explore transparent pay-as-you-go pricing for live classes, 1-on-1 mentorship, and self-paced video courses on EduConnects.",
  },
};

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
