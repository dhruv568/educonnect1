import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_MAIN_DOMAIN || "https://educonnects.co.in";

  return {
    rules: [
      {
        userAgent: "*",
        allow: [
          "/",
          "/courses",
          "/courses/*",
          "/find-teachers",
          "/find-teachers/*",
          "/pricing",
          "/about",
          "/contact",
          "/how-it-works",
          "/terms",
          "/terms-and-conditions",
          "/privacy",
          "/privacy-policy",
          "/refund",
          "/refund-policy",
          "/shipping-policy",
        ],
        disallow: [
          "/admin",
          "/admin/*",
          "/staff",
          "/staff/*",
          "/student",
          "/student/*",
          "/teacher",
          "/teacher/*",
          "/classroom",
          "/classroom/*",
          "/payment",
          "/payment/*",
          "/api/*",
          "/login",
          "/register",
          "/forgot-password",
          "/reset-password",
          "/verify-otp",
          "/verify-email",
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
