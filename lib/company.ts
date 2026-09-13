/**
 * Official Company Information & Platform Configuration for MyProFunnels Ventures
 * Legal Entity: SHRIVASTAVA PROFUNNELS VENTURES PRIVATE LIMITED
 */

export interface CompanyInfo {
  brandName: string;
  legalName: string;
  cin: string;
  pan: string;
  founder: string;
  authorizedSignatory: string;
  natureOfBusiness: string;
  registeredAddress: string;
  website: string;
  tagline: string;
  governingLaw: string;
  whatsappNumber: string;
  whatsappUrl: string;
  refundPeriod: string;
  paymentGateway: string;
  currency: string;
  currencySymbol: string;
  pricingRange: string;
  pricingStarting: string;
  socials: {
    instagram: string;
    facebook: string;
    youtube: string;
  };
}

export const OFFICIAL_COMPANY_INFO: CompanyInfo = {
  brandName: "EduConnect",
  legalName: "Shrivastava ProFunnels Ventures Pvt Ltd",
  cin: "U85499UP2024PTC212061",
  pan: "ABOCS6783J",
  founder: "Sameer Shrivastava",
  authorizedSignatory: "Sameer Shrivastava",
  natureOfBusiness:
    "Digital business solutions, digital marketing, automation, online education, training, and technology-enabled business services.",
  registeredAddress:
    "Bard No. 8, Basundhara Colony, Chandmari, Lalitpur (UP), 284403",
  website: "https://myprofunnels.com",
  tagline: "Automate • Engage • Grow",
  governingLaw: "India",
  whatsappNumber: "+91 8062181499",
  whatsappUrl: "https://wa.me/918062181499",
  refundPeriod: "Within 24 Hours, subject to applicable terms and conditions.",
  paymentGateway: "Cashfree",
  currency: "INR",
  currencySymbol: "₹",
  pricingRange: "₹99 to ₹2.99 Lakh",
  pricingStarting: "Plans and services starting from ₹99",
  socials: {
    instagram: "myprofunnels",
    facebook: "My Pro Funnels",
    youtube: "myprofunnels",
  },
};

/**
 * 27 Official Company Offerings
 */
export interface ProductServiceItem {
  id: number;
  name: string;
  description: string;
  category: "Digital Solutions" | "Marketing & Growth" | "Education & LMS" | "Development & Media";
  iconName: string;
  startingPrice?: string;
}

export const OFFICIAL_SERVICES: ProductServiceItem[] = [
  {
    id: 1,
    name: "Landing Pages & Sales Funnels",
    description: "High-converting custom landing pages and automated multi-step sales funnels tailored for your business.",
    category: "Digital Solutions",
    iconName: "Layout",
  },
  {
    id: 2,
    name: "Website Creation & Hosting",
    description: "Professional, ultra-responsive website design paired with high-performance managed hosting infrastructure.",
    category: "Digital Solutions",
    iconName: "Globe",
  },
  {
    id: 3,
    name: "CRM & Lead Management",
    description: "Centralized lead capture, pipeline tracking, automated tag assignments, and customer relationship management.",
    category: "Digital Solutions",
    iconName: "Users",
  },
  {
    id: 4,
    name: "WhatsApp API & WhatsApp Automation",
    description: "Official Meta WhatsApp Cloud API integration, automated broad broadcasting, and instant lead engagement chat flows.",
    category: "Digital Solutions",
    iconName: "MessageSquare",
  },
  {
    id: 5,
    name: "Email Marketing",
    description: "Strategic email broadcast campaigns, newsletter automation, deliverability optimization, and subscriber lists.",
    category: "Marketing & Growth",
    iconName: "Mail",
  },
  {
    id: 6,
    name: "Marketing Automation",
    description: "Cross-channel workflow automation connecting leads, emails, SMS, and WhatsApp triggers seamlessly.",
    category: "Marketing & Growth",
    iconName: "Zap",
  },
  {
    id: 7,
    name: "Calendar & Appointment Booking",
    description: "Self-service online booking calendar, automated reminder notifications, and conflict-free schedule management.",
    category: "Digital Solutions",
    iconName: "Calendar",
  },
  {
    id: 8,
    name: "LMS / Online Course Platform",
    description: "Full-featured Learning Management System equipped for hosting structured course curriculum and student tracking.",
    category: "Education & LMS",
    iconName: "GraduationCap",
  },
  {
    id: 9,
    name: "Online Course Hosting",
    description: "Secure, high-speed video lesson streaming and content delivery with Mux & Cloud video infrastructure.",
    category: "Education & LMS",
    iconName: "Video",
  },
  {
    id: 10,
    name: "Certificates",
    description: "Automated custom completion certificates with verification credentials for learners upon course finishing.",
    category: "Education & LMS",
    iconName: "Award",
  },
  {
    id: 11,
    name: "Payment Gateway Integration",
    description: "Seamless Cashfree payment gateway setup supporting UPI, Credit/Debit cards, Netbanking, and Wallets.",
    category: "Digital Solutions",
    iconName: "CreditCard",
  },
  {
    id: 12,
    name: "Billing & Payment Collection",
    description: "Automated invoice generation, payment reconciliation, split payments, and customer transaction logs.",
    category: "Digital Solutions",
    iconName: "Receipt",
  },
  {
    id: 13,
    name: "Zoom Integration",
    description: "Automated video conferencing meeting creation, webinar room provisioning, and class link synchronization.",
    category: "Education & LMS",
    iconName: "Video",
  },
  {
    id: 14,
    name: "Contact Management",
    description: "Organized audience database with deep segmentation, activity timelines, and data export capabilities.",
    category: "Digital Solutions",
    iconName: "Contact",
  },
  {
    id: 15,
    name: "Mobile & Web Push Notifications",
    description: "Direct-to-browser and mobile device push notification broadcasts for real-time customer re-engagement.",
    category: "Marketing & Growth",
    iconName: "Bell",
  },
  {
    id: 16,
    name: "Facebook & Instagram Ads Management",
    description: "Performance ad campaign creation, audience targeting, conversion tracking, and Meta ad budget optimization.",
    category: "Marketing & Growth",
    iconName: "TrendingUp",
  },
  {
    id: 17,
    name: "Google Business Optimization",
    description: "Google Business Profile setup, local SEO ranking optimization, review growth, and customer location visibility.",
    category: "Marketing & Growth",
    iconName: "MapPin",
  },
  {
    id: 18,
    name: "SEO Support",
    description: "Comprehensive search engine optimization, keyword research, meta tag structure, and technical search rankings.",
    category: "Marketing & Growth",
    iconName: "Search",
  },
  {
    id: 19,
    name: "Social Media Optimization",
    description: "Profile branding, content calendar creation, organic engagement strategies, and cross-platform growth.",
    category: "Marketing & Growth",
    iconName: "Share2",
  },
  {
    id: 20,
    name: "YouTube / Instagram / Facebook Content Strategy",
    description: "Data-driven video content roadmap, thumbnail design direction, script outline, and channel strategy.",
    category: "Marketing & Growth",
    iconName: "PlaySquare",
  },
  {
    id: 21,
    name: "Affiliate Marketing",
    description: "Affiliate tracking system configuration, commission management, referral link generation, and payout tracking.",
    category: "Marketing & Growth",
    iconName: "Share",
  },
  {
    id: 22,
    name: "Android & iOS App Solutions",
    description: "Custom hybrid mobile applications for Android and iOS tailored for learning, business, and client portals.",
    category: "Development & Media",
    iconName: "Smartphone",
  },
  {
    id: 23,
    name: "Video Creation",
    description: "Professional video editing, motion graphics, promotional video shorts, and educational content production.",
    category: "Development & Media",
    iconName: "Film",
  },
  {
    id: 24,
    name: "Digital Product Selling Solutions",
    description: "Turnkey digital product store setup for ebooks, templates, downloadable guides, and digital assets.",
    category: "Digital Solutions",
    iconName: "ShoppingBag",
  },
  {
    id: 25,
    name: "Done-for-You Digital Services",
    description: "End-to-end done-for-you technical setup, funnel building, system migration, and complete digital deployment.",
    category: "Digital Solutions",
    iconName: "CheckCircle",
  },
  {
    id: 26,
    name: "Business & Sales Guidance",
    description: "Strategic business consulting, sales conversion optimization, offer creation, and digital growth guidance.",
    category: "Marketing & Growth",
    iconName: "Compass",
  },
  {
    id: 27,
    name: "Online Training & Skill Development",
    description: "Comprehensive online training workshops, masterclasses, and skill development programs for modern digital growth.",
    category: "Education & LMS",
    iconName: "BookOpen",
  },
];
