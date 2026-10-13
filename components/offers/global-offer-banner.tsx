"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  Tag,
  X,
  Minus,
  Maximize2,
  ArrowRight,
  Flame,
  Clock,
  CheckCircle2,
} from "lucide-react";

interface ActiveOffer {
  id: string;
  code?: string | null;
  title: string;
  description: string | null;
  discountText: string | null;
  ctaText: string | null;
  ctaLink: string | null;
  startDate: string | null;
  endDate: string | null;
  targetAudience: string;
}

export function GlobalOfferBanner() {
  const pathname = usePathname() || "/";
  const [offer, setOffer] = useState<ActiveOffer | null>(null);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [timeLeft, setTimeLeft] = useState<string | null>(null);

  // Exclude administrative, classroom, payment checkout, and authentication routes
  const isExcluded = useMemo(() => {
    const clean = pathname.toLowerCase();
    if (
      clean.startsWith("/admin") ||
      clean.startsWith("/staff") ||
      clean.startsWith("/classroom") ||
      clean.startsWith("/live/session") ||
      clean.startsWith("/payment/checkout") ||
      clean.startsWith("/checkout") ||
      clean.startsWith("/login") ||
      clean.startsWith("/register") ||
      clean.startsWith("/verify-") ||
      clean.startsWith("/reset-password") ||
      clean.startsWith("/forgot-password")
    ) {
      return true;
    }
    return false;
  }, [pathname]);

  // Determine current website context / theme
  const siteContext = useMemo((): "MAIN" | "LEARNERS" | "EDUCATORS" => {
    if (typeof window !== "undefined") {
      const host = window.location.hostname.toLowerCase();
      if (
        host.startsWith("educators.") ||
        host.startsWith("educator.") ||
        host.startsWith("teachers.") ||
        host.startsWith("teacher.")
      ) {
        return "EDUCATORS";
      }
      if (
        host.startsWith("learners.") ||
        host.startsWith("learner.") ||
        host.startsWith("students.") ||
        host.startsWith("student.")
      ) {
        return "LEARNERS";
      }
    }
    if (pathname.startsWith("/teacher")) return "EDUCATORS";
    if (pathname.startsWith("/student")) return "LEARNERS";
    return "MAIN";
  }, [pathname]);

  // Fetch active offer from API
  useEffect(() => {
    if (isExcluded) return;

    let isMounted = true;
    const fetchActiveOffer = async () => {
      try {
        const res = await fetch(`/api/offers/active?audience=${siteContext}`, {
          cache: "no-store",
        });
        if (res.ok) {
          const json = await res.json();
          if (isMounted && json.success && json.data?.offer) {
            const activeOffer: ActiveOffer = json.data.offer;

            // Check if user previously dismissed this specific offer in the current session
            if (typeof window !== "undefined") {
              const dismissed = sessionStorage.getItem(`edu_dismissed_offer_${activeOffer.id}`);
              if (dismissed === "true") {
                setIsDismissed(true);
              }
            }

            setOffer(activeOffer);
          } else if (isMounted) {
            setOffer(null);
          }
        }
      } catch (err) {
        // Fallback gracefully without breaking page render
      }
    };

    fetchActiveOffer();

    return () => {
      isMounted = false;
    };
  }, [pathname, siteContext, isExcluded]);

  // Real-time countdown timer if offer has an end date
  useEffect(() => {
    if (!offer?.endDate) {
      setTimeLeft(null);
      return;
    }

    const calculateRemaining = () => {
      const end = new Date(offer.endDate!).getTime();
      const now = new Date().getTime();
      const diff = end - now;

      if (diff <= 0) {
        setTimeLeft("Ending soon");
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((diff / (1000 * 60)) % 60);

      if (days > 0) {
        setTimeLeft(`${days}d ${hours}h left`);
      } else if (hours > 0) {
        setTimeLeft(`${hours}h ${minutes}m left`);
      } else {
        setTimeLeft(`${minutes}m left`);
      }
    };

    calculateRemaining();
    const interval = setInterval(calculateRemaining, 60000);
    return () => clearInterval(interval);
  }, [offer?.endDate]);

  const handleDismiss = () => {
    if (offer) {
      if (typeof window !== "undefined") {
        try {
          sessionStorage.setItem(`edu_dismissed_offer_${offer.id}`, "true");
        } catch {}
      }
    }
    setIsDismissed(true);
  };

  if (isExcluded || isDismissed || !offer) {
    return null;
  }

  // Theme visual styles
  const themeStyles = {
    MAIN: {
      cardBg: "bg-gradient-to-br from-[#09422F] via-[#0D5C41] to-[#16805B]",
      border: "border-emerald-400/40",
      shadow: "shadow-2xl shadow-emerald-950/40",
      badgeBg: "bg-[#F2C14E] text-[#09422F]",
      badgeBorder: "border-[#F2C14E]/30",
      titleColor: "text-white",
      descColor: "text-emerald-100/90",
      timeColor: "text-amber-300",
      ctaBg: "bg-[#F2C14E] hover:bg-[#E0B03C] text-[#09422F] shadow-amber-950/30",
      iconColor: "text-[#F2C14E]",
      pillBg: "bg-[#0D5C41] border-[#16805B]",
      pillText: "text-white",
      pillBadge: "bg-[#F2C14E] text-[#09422F]",
    },
    LEARNERS: {
      cardBg: "bg-gradient-to-br from-[#0D5C41] via-[#16805B] to-[#1F9A6C]",
      border: "border-emerald-300/40",
      shadow: "shadow-2xl shadow-emerald-950/40",
      badgeBg: "bg-emerald-100 text-[#0D5C41]",
      badgeBorder: "border-emerald-200/50",
      titleColor: "text-white",
      descColor: "text-emerald-100/90",
      timeColor: "text-emerald-200",
      ctaBg: "bg-white hover:bg-emerald-50 text-[#0D5C41] shadow-emerald-950/30",
      iconColor: "text-emerald-300",
      pillBg: "bg-[#16805B] border-emerald-400/60",
      pillText: "text-white",
      pillBadge: "bg-emerald-100 text-[#0D5C41]",
    },
    EDUCATORS: {
      cardBg: "bg-gradient-to-br from-[#0A4732] via-[#0D5C41] to-[#16805B]",
      border: "border-[#A7F3D0]/40",
      shadow: "shadow-2xl shadow-emerald-950/40",
      badgeBg: "bg-emerald-100 text-[#0D5C41]",
      badgeBorder: "border-emerald-200/50",
      titleColor: "text-white",
      descColor: "text-emerald-100/90",
      timeColor: "text-emerald-200",
      ctaBg: "bg-white hover:bg-emerald-50 text-[#0D5C41] shadow-emerald-950/30",
      iconColor: "text-emerald-300",
      pillBg: "bg-[#0D5C41] border-[#16805B]/60",
      pillText: "text-white",
      pillBadge: "bg-emerald-100 text-[#0D5C41]",
    },
  }[siteContext];

  return (
    <div className="fixed bottom-5 left-4 sm:left-6 z-40 select-none font-sans">
      <AnimatePresence mode="wait">
        {isMinimized ? (
          /* ========================================================================= */
          /* MINIMIZED FLOATING PILL BADGE */
          /* ========================================================================= */
          <motion.div
            key="minimized-pill"
            initial={{ opacity: 0, scale: 0.9, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 15 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className={`flex items-center gap-2 p-1.5 pl-3 rounded-full border shadow-xl backdrop-blur-md cursor-pointer transition-all hover:scale-105 active:scale-95 ${themeStyles.pillBg}`}
            onClick={() => setIsMinimized(false)}
            title="Click to expand offer details"
          >
            <div className="flex items-center gap-2">
              <span
                className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${themeStyles.pillBadge}`}
              >
                {offer.discountText || "OFFER"}
              </span>
              <span className={`text-xs font-bold truncate max-w-[150px] sm:max-w-[200px] ${themeStyles.pillText}`}>
                {offer.title}
              </span>
            </div>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsMinimized(false);
              }}
              className="p-1 rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-colors"
              aria-label="Expand offer banner"
            >
              <Maximize2 className="h-3.5 w-3.5" />
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleDismiss();
              }}
              className="p-1 rounded-full text-white/50 hover:text-white hover:bg-white/10 transition-colors"
              aria-label="Close offer banner"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </motion.div>
        ) : (
          /* ========================================================================= */
          /* EXPANDED PROMOTIONAL CARD */
          /* ========================================================================= */
          <motion.div
            key="expanded-card"
            initial={{ opacity: 0, y: 25, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 25, scale: 0.96 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className={`w-[calc(100vw-2rem)] max-w-sm sm:max-w-md rounded-3xl p-4 sm:p-5 border backdrop-blur-xl ${themeStyles.cardBg} ${themeStyles.border} ${themeStyles.shadow} relative overflow-hidden`}
          >
            {/* Background Decorative Glow */}
            <div className="absolute -top-10 -right-10 w-28 h-28 bg-white/10 rounded-full blur-2xl pointer-events-none" />

            {/* Header / Top controls */}
            <div className="flex items-center justify-between gap-2 mb-2 relative z-10">
              <div className="flex items-center gap-1.5 flex-wrap">
                {offer.discountText ? (
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider shadow-2xs ${themeStyles.badgeBg}`}
                  >
                    <Flame className="h-3 w-3" />
                    <span>{offer.discountText}</span>
                  </span>
                ) : (
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${themeStyles.badgeBg}`}
                  >
                    <Sparkles className="h-3 w-3" />
                    <span>Special Offer</span>
                  </span>
                )}

                {timeLeft && (
                  <span
                    className={`inline-flex items-center gap-1 text-[11px] font-bold ${themeStyles.timeColor}`}
                  >
                    <Clock className="h-3 w-3" />
                    <span>{timeLeft}</span>
                  </span>
                )}
              </div>

              {/* Minimize & Close Action Buttons */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setIsMinimized(true)}
                  className="p-1.5 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                  title="Minimize offer"
                  aria-label="Minimize offer banner"
                >
                  <Minus className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={handleDismiss}
                  className="p-1.5 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                  title="Dismiss for this session"
                  aria-label="Dismiss offer banner"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Offer Content */}
            <div className="space-y-1 relative z-10">
              <h4 className={`text-sm sm:text-base font-black leading-tight tracking-tight ${themeStyles.titleColor}`}>
                {offer.title}
              </h4>
              {offer.description && (
                <p className={`text-xs font-medium line-clamp-2 sm:line-clamp-3 leading-relaxed ${themeStyles.descColor}`}>
                  {offer.description}
                </p>
              )}
            </div>

            {/* Bottom Actions Cluster */}
            <div className="mt-3.5 pt-3 border-t border-white/10 flex items-center justify-between gap-3 relative z-10">
              <span className="text-[10px] text-white/60 font-medium">
                EduConnects Verified Offer
              </span>

              {(() => {
                let targetHref = offer.ctaLink || "/courses";
                if (offer.code && !targetHref.includes("offer=") && !targetHref.includes("code=")) {
                  const sep = targetHref.includes("?") ? "&" : "?";
                  targetHref = `${targetHref}${sep}offer=${encodeURIComponent(offer.code)}`;
                }
                return (
                  <Link
                    href={targetHref}
                    className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all transform hover:scale-[1.03] active:scale-95 flex items-center gap-1.5 cursor-pointer shadow-md ${themeStyles.ctaBg}`}
                  >
                    <span>{offer.ctaText || "Claim Offer"}</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                );
              })()}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default GlobalOfferBanner;
